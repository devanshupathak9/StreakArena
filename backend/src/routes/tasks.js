import { Router } from "express";
import { prisma } from "../db.js";
import { loadUser, requireAuth } from "../auth.js";
import { getPlatform, isPlatformId, publicAccount } from "../platforms.js";
import {
  canSync,
  fetchActiveDays,
  fetchActivityDetail,
  fetchDailySuggestion,
  hasDetail,
} from "../sync.js";
import {
  addDays,
  currentStreak,
  dateInTz,
  fromDbDate,
  isValidDateString,
  lastNDays,
  longestStreak,
  toDbDate,
  todayInTz,
} from "../streak.js";

export const tasksRouter = Router();

/**
 * What the dashboard shows next to a task's title. `url` is null when the task is
 * tagged with a platform the user hasn't linked a handle for yet — the UI turns that
 * into a nudge rather than a dead link.
 */
function taskPlatform(id, linked) {
  const platform = id && getPlatform(id);
  if (!platform) return null;
  const account = linked.get(id);
  return {
    id: platform.id,
    label: platform.label,
    emoji: platform.emoji,
    handle: account?.handle ?? null,
    url: account?.url ?? null,
    lastSyncedAt: account?.lastSyncedAt ?? null,
    // Where to go and actually do it, for a task that isn't done yet. Null for
    // GitHub and GitLab: there is no page you visit to make a commit, and a "go do
    // it" link that lands on a profile is worse than none.
    action: platform.action ?? null,
    // Whether this platform can say *what* was done, not just that something was.
    hasDetail: hasDetail(platform.id),
  };
}

const HEATMAP_DAYS = 90;
const DESCRIPTION_MAX = 200;
const MAX_TILE_DAYS = 90;
const RECENT_EVENTS = 12;

/** How far ahead a one-off task may be scheduled. */
const MAX_DUE_AHEAD_DAYS = 365;

tasksRouter.use(requireAuth, loadUser);

/** Everything the dashboard needs, in one request. */
tasksRouter.get("/dashboard", async (req, res) => {
  const requested = Number.parseInt(req.query.days, 10);
  const tileDays = Number.isNaN(requested) ? 30 : Math.min(Math.max(requested, 1), MAX_TILE_DAYS);
  const { timezone } = req.user;
  const today = todayInTz(timezone);

  const [tasks, accounts, latest] = await Promise.all([
    prisma.task.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "asc" },
      include: {
        completions: { select: { localDate: true, source: true } },
        // Which challenge this task is a copy of, so the list can separate your own
        // tasks from the ones a group put there. Null once the group detaches it.
        groupTask: { select: { group: { select: { id: true, name: true } } } },
      },
    }),
    prisma.platformAccount.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "asc" } }),
    // The activity feed wants real instants, not the bare local dates the tiles use —
    // "2 hours ago" can't be recovered from a YYYY-MM-DD.
    prisma.taskCompletion.findMany({
      where: { task: { userId: req.user.id } },
      orderBy: { createdAt: "desc" },
      take: RECENT_EVENTS,
      select: {
        createdAt: true,
        localDate: true,
        source: true,
        task: { select: { id: true, title: true, platform: true } },
      },
    }),
  ]);

  const profiles = accounts.map(publicAccount);
  const linked = new Map(profiles.map((profile) => [profile.platform, profile]));

  const tileWindow = lastNDays(today, tileDays);
  const doneByDate = new Map();

  const summaries = tasks.map((task) => {
    const dates = task.completions.map((c) => fromDbDate(c.localDate));
    const done = new Set(dates);
    // A one-off is a single job, not a habit: it has no streak, no tile row, and it
    // stays out of the heatmap — otherwise a to-do would dilute the picture of how
    // consistently the recurring tasks are being kept.
    const once = task.kind === "once";
    const dueDate = task.dueDate ? fromDbDate(task.dueDate) : null;

    // A day the platform confirmed reads differently from one you ticked yourself,
    // so the tile needs to know which it was.
    const verified = new Set(
      task.completions.filter((c) => c.source === "synced").map((c) => fromDbDate(c.localDate)),
    );
    if (!once) {
      for (const date of done) doneByDate.set(date, (doneByDate.get(date) ?? 0) + 1);
    }

    // A task counts towards a day's total from its creation date — or from its
    // earliest backfilled completion, whichever came first.
    const startedOn = dateInTz(task.createdAt, timezone);
    const activeFrom = dates.reduce((earliest, date) => (date < earliest ? date : earliest), startedOn);

    return {
      activeFrom,
      counts: !once,
      task: {
        id: task.id,
        title: task.title,
        description: task.description ?? null,
        kind: task.kind,
        dueDate,
        startedOn,
        currentStreak: once ? 0 : currentStreak(dates, today),
        longestStreak: once ? 0 : longestStreak(dates),
        totalDays: done.size,
        syncedDays: task.completions.filter((c) => c.source === "synced").length,
        platform: taskPlatform(task.platform, linked),
        group: task.groupTask?.group ?? null,
        doneToday: done.has(today),
        // A one-off is finished the moment it has any completion at all, whichever
        // day that landed on; a habit is only ever done *for today*.
        done: once ? done.size > 0 : done.has(today),
        // Its day has passed and it still isn't done. False for habits, which can't
        // be late — they just break a streak.
        overdue: once && done.size === 0 && dueDate !== null && dueDate < today,
        tiles: once
          ? []
          : tileWindow.map((date) => ({
              date,
              done: done.has(date),
              verified: verified.has(date),
            })),
      },
    };
  });

  // Totals only count tasks that were active by then, so the heatmap doesn't look
  // sparse for days before a task existed. One-offs are excluded entirely.
  const heatmap = lastNDays(today, HEATMAP_DAYS).map((date) => ({
    date,
    completed: doneByDate.get(date) ?? 0,
    total: summaries.filter((entry) => entry.counts && entry.activeFrom <= date).length,
  }));

  const recent = latest.map((completion) => ({
    taskId: completion.task.id,
    title: completion.task.title,
    platform: completion.task.platform ?? null,
    source: completion.source,
    localDate: fromDbDate(completion.localDate),
    at: completion.createdAt.toISOString(),
  }));

  res.json({
    today,
    timezone,
    profiles,
    tasks: summaries.map((entry) => entry.task),
    heatmap,
    recent,
  });
});

tasksRouter.post("/tasks", async (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "Give the task a name" });
  if (title.length > 80) return res.status(400).json({ error: "Keep the name under 80 characters" });

  // The platform is just a tag: the task works whether or not that handle is linked yet.
  const platform = req.body?.platform ? String(req.body.platform) : null;
  if (platform && !isPlatformId(platform)) return res.status(400).json({ error: "Unknown platform" });

  const description = String(req.body?.description ?? "").trim();
  if (description.length > DESCRIPTION_MAX) {
    return res.status(400).json({ error: `Keep the description under ${DESCRIPTION_MAX} characters` });
  }

  /*
   * Two shapes of task. "daily" is the recurring habit the whole streak model is
   * built on and stays the default, so nothing that already posts to this route
   * changes behaviour. "once" is a single job on a single day — it earns no streak
   * and never reaches the heatmap or the leaderboards.
   */
  const kind = req.body?.kind === undefined ? "daily" : String(req.body.kind);
  if (kind !== "daily" && kind !== "once") {
    return res.status(400).json({ error: "A task is either daily or once" });
  }

  let dueDate = null;
  if (kind === "once") {
    const today = todayInTz(req.user.timezone);
    // Defaults to today, because "I just have to do this today" is the whole point.
    const raw = req.body?.dueDate === undefined ? today : String(req.body.dueDate);
    if (!isValidDateString(raw)) return res.status(400).json({ error: "Invalid due date" });
    if (raw < addDays(today, -(HEATMAP_DAYS - 1))) {
      return res.status(400).json({ error: "That day is too far in the past" });
    }
    if (raw > addDays(today, MAX_DUE_AHEAD_DAYS)) {
      return res.status(400).json({ error: "That's more than a year away" });
    }
    dueDate = toDbDate(raw);
  } else if (req.body?.dueDate) {
    // Catching this is kinder than silently dropping it: a daily task with a due
    // date is almost always a one-off the caller forgot to mark.
    return res.status(400).json({ error: "Only a one-off task has a due date" });
  }

  const task = await prisma.task.create({
    data: {
      userId: req.user.id,
      title,
      platform,
      description: description || null,
      kind,
      dueDate,
    },
  });
  res.status(201).json({
    task: {
      id: task.id,
      title: task.title,
      platform: task.platform,
      kind: task.kind,
      dueDate: task.dueDate ? fromDbDate(task.dueDate) : null,
    },
  });
});

/** Rename a task or change its note. The platform stays put — it decides how the
 *  task is proved, and swapping it would strand the history it already collected. */
tasksRouter.patch("/tasks/:id", async (req, res) => {
  const data = {};

  if (req.body?.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title) return res.status(400).json({ error: "Give the task a name" });
    if (title.length > 80) return res.status(400).json({ error: "Keep the name under 80 characters" });
    data.title = title;
  }

  if (req.body?.description !== undefined) {
    const description = String(req.body.description).trim();
    if (description.length > DESCRIPTION_MAX) {
      return res.status(400).json({ error: `Keep the description under ${DESCRIPTION_MAX} characters` });
    }
    data.description = description || null;
  }

  /*
   * A one-off can be moved to another day — "I'll do it tomorrow" is the most
   * ordinary thing to want. `kind` itself is deliberately immutable: flipping a
   * habit with a 40-day streak into a to-do, or the reverse, would reinterpret
   * history that was recorded under different rules.
   */
  if (req.body?.dueDate !== undefined) {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { kind: true },
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });
    if (existing.kind !== "once") {
      return res.status(400).json({ error: "Only a one-off task has a due date" });
    }

    const today = todayInTz(req.user.timezone);
    const raw = String(req.body.dueDate);
    if (!isValidDateString(raw)) return res.status(400).json({ error: "Invalid due date" });
    if (raw < addDays(today, -(HEATMAP_DAYS - 1))) {
      return res.status(400).json({ error: "That day is too far in the past" });
    }
    if (raw > addDays(today, MAX_DUE_AHEAD_DAYS)) {
      return res.status(400).json({ error: "That's more than a year away" });
    }
    data.dueDate = toDbDate(raw);
  }

  if (!Object.keys(data).length) return res.status(400).json({ error: "Nothing to change" });

  // Scoped by userId, so another user's task simply matches nothing.
  const { count } = await prisma.task.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data,
  });
  if (!count) return res.status(404).json({ error: "Task not found" });
  res.json({ ok: true });
});

tasksRouter.delete("/tasks/:id", async (req, res) => {
  // Scoped by userId in the where clause, so another user's id simply matches nothing.
  const { count } = await prisma.task.deleteMany({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!count) return res.status(404).json({ error: "Task not found" });
  res.json({ ok: true });
});

tasksRouter.post("/tasks/:id/complete", async (req, res) => {
  const today = todayInTz(req.user.timezone);
  const date = req.body?.date === undefined ? today : String(req.body.date);

  if (!isValidDateString(date)) return res.status(400).json({ error: "Invalid date" });
  if (date > today) return res.status(400).json({ error: "That day hasn't happened yet" });
  if (date < addDays(today, -(HEATMAP_DAYS - 1))) {
    return res.status(400).json({ error: "That day is too far in the past to edit" });
  }

  const task = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });

  // Idempotent: marking an already-done day is a no-op rather than an error.
  await prisma.taskCompletion.upsert({
    where: { taskId_localDate: { taskId: task.id, localDate: toDbDate(date) } },
    create: { taskId: task.id, localDate: toDbDate(date) },
    update: {},
  });
  res.json({ ok: true, date });
});

tasksRouter.delete("/tasks/:id/complete/:date", async (req, res) => {
  const { date } = req.params;
  if (!isValidDateString(date)) return res.status(400).json({ error: "Invalid date" });

  const task = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });

  await prisma.taskCompletion.deleteMany({ where: { taskId: task.id, localDate: toDbDate(date) } });
  res.json({ ok: true, date });
});


/**
 * Ask each linked platform which days this handle was active, and fill those days in.
 *
 * Additive only: a day you ticked yourself is never touched, and a day the platform
 * no longer reports is left alone rather than revoked — a sync can add to your record
 * but not quietly rewrite it. Platforms are fetched once each, not once per task, and
 * one platform failing doesn't stop the others.
 */
async function runSync(user, taskFilter = null) {
  const today = todayInTz(user.timezone);
  const since = addDays(today, -(HEATMAP_DAYS - 1));

  const [tasks, accounts] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id, platform: { not: null }, ...(taskFilter ?? {}) },
      include: { completions: { select: { localDate: true } } },
    }),
    prisma.platformAccount.findMany({ where: { userId: user.id } }),
  ]);

  const handles = new Map(accounts.map((account) => [account.platform, account.handle]));
  const wanted = [...new Set(tasks.map((task) => task.platform))];
  const results = [];

  for (const platform of wanted) {
    const meta = getPlatform(platform);
    const label = meta?.label ?? platform;
    const handle = handles.get(platform);

    if (!handle) {
      results.push({ platform, label, ok: false, added: 0, error: `Link your ${label} handle first` });
      continue;
    }
    if (!canSync(platform)) {
      results.push({ platform, label, ok: false, added: 0, error: `${label} can't be synced yet` });
      continue;
    }

    try {
      const active = await fetchActiveDays(platform, handle, since, today, user.timezone);
      let added = 0;

      for (const task of tasks.filter((t) => t.platform === platform)) {
        const already = new Set(task.completions.map((c) => fromDbDate(c.localDate)));
        const missing = [...active].filter((date) => !already.has(date));
        if (!missing.length) continue;

        // skipDuplicates covers the race where the same day arrives twice.
        const { count } = await prisma.taskCompletion.createMany({
          data: missing.map((date) => ({ taskId: task.id, localDate: toDbDate(date), source: "synced" })),
          skipDuplicates: true,
        });
        added += count;
      }

      /*
       * Which problems, not just which days. This is a bonus on top of a sync that
       * has already succeeded, so a failure here is logged and swallowed — losing
       * the detail must never turn a working platform into a failed one, and the
       * streak never depends on it.
       */
      let detailAdded = 0;
      if (hasDetail(platform)) {
        try {
          const detail = await fetchActivityDetail(platform, handle, since, today, user.timezone);
          if (detail.length) {
            const written = await prisma.platformActivity.createMany({
              data: detail.map((item) => ({
                userId: user.id,
                platform,
                localDate: toDbDate(item.localDate),
                title: item.title,
                url: item.url ?? null,
                externalId: item.externalId,
              })),
              // The unique key is (user, platform, day, externalId), so re-syncing is
              // a no-op and the same problem solved twice in a day counts once.
              skipDuplicates: true,
            });
            detailAdded = written.count;
          }
        } catch (error) {
          console.error(`${platform} detail sync failed:`, error.message);
        }
      }

      await prisma.platformAccount.updateMany({
        where: { userId: user.id, platform },
        data: { lastSyncedAt: new Date(), lastSyncError: null },
      });
      results.push({
        platform,
        label,
        ok: true,
        added,
        detailAdded,
        activeDays: active.size,
        error: null,
      });
    } catch (error) {
      // An unofficial endpoint changing shape is a normal Tuesday, so it's reported
      // per platform and remembered, not thrown.
      const message = error.message ?? "Sync failed";
      await prisma.platformAccount.updateMany({
        where: { userId: user.id, platform },
        data: { lastSyncedAt: new Date(), lastSyncError: message },
      });
      results.push({ platform, label, ok: false, added: 0, error: message });
    }
  }

  return results;
}

/**
 * What the platform says you actually did, for one task — the problem names behind
 * its green tiles, newest day first, plus today's suggestion for where to go and do
 * it if it isn't done.
 *
 * Only LeetCode can answer the first half today; `supported` says so rather than
 * returning an empty list that reads like "you did nothing".
 */
tasksRouter.get("/tasks/:id/activity", async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true, platform: true },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });

  const platform = task.platform;
  if (!platform) {
    return res.json({ platform: null, supported: false, days: [], suggestion: null });
  }

  const requested = Number.parseInt(req.query.days, 10);
  const window = Number.isNaN(requested) ? 30 : Math.min(Math.max(requested, 1), HEATMAP_DAYS);
  const today = todayInTz(req.user.timezone);
  const since = addDays(today, -(window - 1));

  const rows = hasDetail(platform)
    ? await prisma.platformActivity.findMany({
        where: {
          userId: req.user.id,
          platform,
          localDate: { gte: toDbDate(since), lte: toDbDate(today) },
        },
        orderBy: [{ localDate: "desc" }, { title: "asc" }],
        select: { localDate: true, title: true, url: true },
      })
    : [];

  // Grouped by day, because that's how the tiles are read.
  const byDate = new Map();
  for (const row of rows) {
    const date = fromDbDate(row.localDate);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({ title: row.title, url: row.url });
  }

  // Suggestions are per-platform and cached for the day, so this costs one upstream
  // call a day rather than one a page load.
  let suggestion = null;
  try {
    suggestion = await fetchDailySuggestion(platform);
  } catch (error) {
    // A missing suggestion is a missing nudge, not a failed request.
    console.error(`${platform} suggestion failed:`, error.message);
  }

  res.json({
    platform,
    supported: hasDetail(platform),
    days: [...byDate].map(([date, items]) => ({ date, items })),
    suggestion,
  });
});

tasksRouter.post("/sync", async (req, res) => {
  const results = await runSync(req.user);
  if (!results.length) {
    return res.json({ results, message: "No tasks are tagged with a platform yet" });
  }
  res.json({ results });
});

tasksRouter.post("/tasks/:id/sync", async (req, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.user.id },
    select: { id: true, platform: true },
  });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (!task.platform) return res.status(400).json({ error: "This task isn't tagged with a platform" });

  const results = await runSync(req.user, { id: task.id });
  res.json({ results });
});

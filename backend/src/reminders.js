// The reminder worker. pg-boss is a job queue kept in our own Postgres (its own
// "pgboss" schema), so it needs no Redis, survives restarts, retries failures, and
// runs each scheduled tick exactly once however many app instances are up.
//
//   reminders-tick   cron, every 15 min — finds who is due, enqueues one job each
//   reminders-send   per user — syncs if stale, checks what's still open today, notifies
//
// "Due" is decided in the user's own timezone: their reminder time has passed today
// (default 20:00), or it's 22:30+ and a live streak is still open ("last call").
// Each kind goes out at most once per local day (see notify.js).

import PgBoss from "pg-boss";
import { prisma } from "./db.js";
import { notify } from "./notify.js";
import { runSync } from "./routes/tasks.js";
import { addDays, currentStreak, fromDbDate, todayInTz } from "./streak.js";

const TICK = "reminders-tick";
const SEND = "reminders-send";
const LAST_CALL_AT = "22:30";
// A platform synced more recently than this is trusted as-is; older, and the
// worker syncs before deciding, so nobody is nagged about work they already did.
const SYNC_FRESH_MS = 30 * 60 * 1000;

let boss = null;

/** "HH:MM" on a 24-hour clock in an IANA timezone. */
export function clockInTz(timezone, at = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

/** Which reminder kinds are due for this user right now, before checking tasks. */
export function dueKinds(user, at = new Date()) {
  if (!user.reminderEnabled) return [];
  const now = clockInTz(user.timezone, at);
  // Nothing after 23:45: a reminder with fifteen minutes left is just stress.
  if (now >= "23:45") return [];
  const kinds = [];
  if (now >= user.reminderTime) kinds.push("reminder");
  if (user.lastCallEnabled && now >= LAST_CALL_AT && user.reminderTime < LAST_CALL_AT) kinds.push("last-call");
  return kinds;
}

/** Daily tasks still open today, each with the streak it would extend. */
export async function openToday(user) {
  const today = todayInTz(user.timezone);
  const tasks = await prisma.task.findMany({
    where: { userId: user.id, kind: "daily" },
    select: {
      id: true,
      title: true,
      platform: true,
      completions: {
        where: { localDate: { gte: new Date(`${addDays(today, -400)}T00:00:00Z`) } },
        select: { localDate: true },
      },
    },
  });
  return tasks
    .map((task) => {
      const dates = task.completions.map((c) => fromDbDate(c.localDate));
      return { ...task, doneToday: dates.includes(today), streak: currentStreak(dates, today) };
    })
    .filter((task) => !task.doneToday)
    .sort((a, b) => b.streak - a.streak);
}

function describe(kind, open) {
  const top = open[0];
  const more = open.length - 1;
  const rest = more > 0 ? ` and ${more} more` : "";
  if (kind === "last-call") {
    return {
      title: `⏰ Last call: your ${top.streak}-day streak ends at midnight`,
      body: `“${top.title}”${rest} still open. A few minutes now keeps it alive.`,
    };
  }
  if (top.streak > 0) {
    return {
      title: `🔥 Keep your ${top.streak}-day streak alive`,
      body: `“${top.title}”${rest} still open today.`,
    };
  }
  return {
    title: "Today's streaks are waiting",
    body: `“${top.title}”${rest} still open today. Start a streak tonight.`,
  };
}

/** The whole decision for one user and one kind. Exported for tests and the test button. */
export async function remindUser(userId, kind) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { platformAccounts: { select: { lastSyncedAt: true } } },
  });
  if (!user || !dueKinds(user).includes(kind)) return { skipped: "not-due" };

  const today = todayInTz(user.timezone);
  const already = await prisma.notification.findUnique({
    where: { userId_kind_localDate: { userId, kind, localDate: new Date(`${today}T00:00:00Z`) } },
    select: { id: true },
  });
  if (already) return { skipped: "already-sent" };

  const stale = user.platformAccounts.some(
    (a) => !a.lastSyncedAt || Date.now() - a.lastSyncedAt.getTime() > SYNC_FRESH_MS,
  );
  if (stale) {
    try {
      await runSync(user);
    } catch (error) {
      // A platform being down must not stop the reminder; worst case it's a
      // reminder about something already done, which is better than silence.
      console.error(`pre-reminder sync failed for ${userId}:`, error.message);
    }
  }

  let open = await openToday(user);
  // The last call is only for a streak that would actually break.
  if (kind === "last-call") open = open.filter((task) => task.streak > 0);
  if (!open.length) return { skipped: "nothing-open" };

  const result = await notify(user, {
    kind,
    localDate: today,
    ...describe(kind, open),
    url: "/",
    email: kind === "reminder",
  });
  return result ? { sent: true, channels: result.channels } : { skipped: "already-sent" };
}

async function tick() {
  const at = new Date();
  const users = await prisma.user.findMany({
    where: { reminderEnabled: true, tasks: { some: { kind: "daily" } } },
    select: { id: true, timezone: true, reminderEnabled: true, reminderTime: true, lastCallEnabled: true },
  });
  let queued = 0;
  for (const user of users) {
    for (const kind of dueKinds(user, at)) {
      const today = todayInTz(user.timezone);
      // singletonKey: a user can't have two pending jobs for the same reminder,
      // even if a tick overlaps a slow previous one.
      const id = await boss.send(
        SEND,
        { userId: user.id, kind },
        { singletonKey: `${user.id}:${kind}:${today}`, retryLimit: 3, retryDelay: 60, expireInSeconds: 600 },
      );
      if (id) queued++;
    }
  }
  if (queued) console.log(`reminders tick: queued ${queued}`);
}

/** Starts the queue, the schedule and both workers. REMINDERS_ENABLED=false turns it off. */
export async function startReminders() {
  if (process.env.REMINDERS_ENABLED === "false") {
    console.log("reminders are off (REMINDERS_ENABLED=false)");
    return;
  }
  boss = new PgBoss({ connectionString: process.env.DATABASE_URL, schema: "pgboss" });
  boss.on("error", (error) => console.error("pg-boss:", error.message));
  await boss.start();
  await boss.createQueue(TICK);
  await boss.createQueue(SEND);
  await boss.schedule(TICK, process.env.REMINDER_CRON ?? "*/15 * * * *");

  await boss.work(TICK, async () => tick());
  await boss.work(SEND, { batchSize: 5 }, async (jobs) => {
    for (const job of jobs) {
      const result = await remindUser(job.data.userId, job.data.kind);
      if (result.sent) console.log(`reminder ${job.data.kind} → ${job.data.userId}`, JSON.stringify(result.channels));
    }
  });
  console.log("reminders worker started");
}

export async function stopReminders() {
  await boss?.stop({ graceful: true, timeout: 10_000 });
}

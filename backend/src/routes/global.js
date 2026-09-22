import { Router } from "express";
import { prisma } from "../db.js";
import { loadUser, requireAuth } from "../auth.js";
import { currentStreak, fromDbDate, longestStreak, todayInTz } from "../streak.js";

export const globalRouter = Router();

globalRouter.use(requireAuth, loadUser);

const BOARD_LIMIT = 100;

/**
 * Everyone on this server, ranked by their best running streak.
 *
 * Streaks are computed per user against today in *their* timezone, which means this
 * can't be a SQL aggregate — it reads every user's completions and folds them in JS.
 * Fine at this size; when it stops being fine, the fix is a nightly snapshot table
 * rather than a cleverer query, because the numbers only change once a day anyway.
 */
globalRouter.get("/global", async (req, res) => {
  const users = await prisma.user.findMany({
    include: {
      tasks: {
        include: { completions: { select: { localDate: true, source: true } } },
      },
    },
  });

  const rows = users.map((user) => {
    const today = todayInTz(user.timezone);
    // Both counts are distinct *days*, so "62 verified of 56 days" can't happen.
    const allDates = new Set();
    const verifiedDates = new Set();
    let best = 0;
    let longest = 0;

    for (const task of user.tasks) {
      const dates = task.completions.map((c) => fromDbDate(c.localDate));
      for (const date of dates) allDates.add(date);
      for (const completion of task.completions) {
        if (completion.source === "synced") verifiedDates.add(fromDbDate(completion.localDate));
      }
      best = Math.max(best, currentStreak(dates, today));
      longest = Math.max(longest, longestStreak(dates));
    }

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      isYou: user.id === req.user.id,
      taskCount: user.tasks.length,
      currentStreak: best,
      longestStreak: longest,
      // Distinct days with any activity, so ten tasks in a day is still one day.
      activeDays: allDates.size,
      verifiedDays: verifiedDates.size,
    };
  });

  // Live streak first, then lifetime best, then how much of it a platform confirmed.
  rows.sort(
    (a, b) =>
      b.currentStreak - a.currentStreak ||
      b.longestStreak - a.longestStreak ||
      b.verifiedDays - a.verifiedDays ||
      a.username.localeCompare(b.username),
  );

  const totals = rows.reduce(
    (sum, row) => ({
      members: sum.members + 1,
      tasks: sum.tasks + row.taskCount,
      days: sum.days + row.activeDays,
      verified: sum.verified + row.verifiedDays,
    }),
    { members: 0, tasks: 0, days: 0, verified: 0 },
  );

  const board = rows.slice(0, BOARD_LIMIT);
  const you = rows.findIndex((row) => row.isYou);

  res.json({
    totals,
    board,
    // So you can be told where you stand even when you're off the end of the list.
    yourRank: you === -1 ? null : you + 1,
  });
});

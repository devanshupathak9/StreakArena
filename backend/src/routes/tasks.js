import { Router } from "express";
import { prisma } from "../db.js";
import { loadUser, requireAuth } from "../auth.js";
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

const HEATMAP_DAYS = 90;
const MAX_TILE_DAYS = 90;

tasksRouter.use(requireAuth, loadUser);

/** Everything the dashboard needs, in one request. */
tasksRouter.get("/dashboard", async (req, res) => {
  const requested = Number.parseInt(req.query.days, 10);
  const tileDays = Number.isNaN(requested) ? 30 : Math.min(Math.max(requested, 1), MAX_TILE_DAYS);
  const { timezone } = req.user;
  const today = todayInTz(timezone);

  const tasks = await prisma.task.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "asc" },
    include: { completions: { select: { localDate: true } } },
  });

  const tileWindow = lastNDays(today, tileDays);
  const doneByDate = new Map();

  const summaries = tasks.map((task) => {
    const dates = task.completions.map((c) => fromDbDate(c.localDate));
    const done = new Set(dates);
    for (const date of done) doneByDate.set(date, (doneByDate.get(date) ?? 0) + 1);

    // A task counts towards a day's total from its creation date — or from its
    // earliest backfilled completion, whichever came first.
    const startedOn = dateInTz(task.createdAt, timezone);
    const activeFrom = dates.reduce((earliest, date) => (date < earliest ? date : earliest), startedOn);

    return {
      activeFrom,
      task: {
        id: task.id,
        title: task.title,
        startedOn,
        currentStreak: currentStreak(dates, today),
        longestStreak: longestStreak(dates),
        totalDays: done.size,
        doneToday: done.has(today),
        tiles: tileWindow.map((date) => ({ date, done: done.has(date) })),
      },
    };
  });

  // Totals only count tasks that were active by then, so the heatmap doesn't look
  // sparse for days before a task existed.
  const heatmap = lastNDays(today, HEATMAP_DAYS).map((date) => ({
    date,
    completed: doneByDate.get(date) ?? 0,
    total: summaries.filter((entry) => entry.activeFrom <= date).length,
  }));

  res.json({ today, timezone, tasks: summaries.map((entry) => entry.task), heatmap });
});

tasksRouter.post("/tasks", async (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "Give the task a name" });
  if (title.length > 80) return res.status(400).json({ error: "Keep the name under 80 characters" });

  const task = await prisma.task.create({ data: { userId: req.user.id, title } });
  res.status(201).json({ task: { id: task.id, title: task.title } });
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

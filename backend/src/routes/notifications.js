// The bell's inbox, the reminder schedule, push subscriptions, and a "send me a
// test" button so people can see a notification arrive before trusting it.

import { Router } from "express";
import { prisma } from "../db.js";
import { loadUser, requireAuth } from "../auth.js";
import { mailLimiter } from "../limits.js";
import { mailEnabled } from "../mailer.js";
import { notify, pushEnabled, vapidPublicKey } from "../notify.js";
import { fromDbDate, todayInTz } from "../streak.js";

export const notificationsRouter = Router();
const auth = [requireAuth, loadUser];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function settings(user, subscriptions) {
  return {
    enabled: user.reminderEnabled,
    time: user.reminderTime,
    lastCall: user.lastCallEnabled,
    email: user.reminderEmail,
    push: user.reminderPush,
    // What this deployment and account can actually do, so the UI never offers
    // a channel that would silently go nowhere.
    available: {
      push: pushEnabled,
      email: mailEnabled,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    vapidPublicKey: pushEnabled ? vapidPublicKey : null,
    devices: subscriptions,
  };
}

notificationsRouter.get("/notifications", ...auth, async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  res.json({
    items: items.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      url: n.url,
      localDate: fromDbDate(n.localDate),
      read: Boolean(n.readAt),
      at: n.createdAt,
    })),
    unread: items.filter((n) => !n.readAt).length,
  });
});

notificationsRouter.post("/notifications/read", ...auth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

notificationsRouter.get("/reminders", ...auth, async (req, res) => {
  const devices = await prisma.pushSubscription.count({ where: { userId: req.user.id } });
  res.json(settings(req.user, devices));
});

notificationsRouter.put("/reminders", ...auth, async (req, res) => {
  const body = req.body ?? {};
  const data = {};
  if (body.time !== undefined) {
    if (!TIME_RE.test(String(body.time))) return res.status(400).json({ error: "Time must be HH:MM" });
    data.reminderTime = String(body.time);
  }
  for (const [key, column] of [
    ["enabled", "reminderEnabled"],
    ["lastCall", "lastCallEnabled"],
    ["email", "reminderEmail"],
    ["push", "reminderPush"],
  ]) {
    if (body[key] !== undefined) data[column] = Boolean(body[key]);
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  const devices = await prisma.pushSubscription.count({ where: { userId: user.id } });
  res.json(settings(user, devices));
});

/**
 * Upserts by endpoint and reassigns it to whoever is signed in: on a shared
 * computer the browser's subscription belongs to the person using it now.
 */
notificationsRouter.post("/push/subscriptions", ...auth, async (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: "Push isn't configured on this server" });
  const endpoint = String(req.body?.endpoint ?? "");
  const p256dh = String(req.body?.keys?.p256dh ?? "");
  const authKey = String(req.body?.keys?.auth ?? "");
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !authKey) {
    return res.status(400).json({ error: "Not a valid push subscription" });
  }
  const userAgent = String(req.get("user-agent") ?? "").slice(0, 200);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: req.user.id, endpoint, p256dh, auth: authKey, userAgent },
    update: { userId: req.user.id, p256dh, auth: authKey, userAgent },
  });
  res.status(201).json({ ok: true });
});

notificationsRouter.delete("/push/subscriptions", ...auth, async (req, res) => {
  await prisma.pushSubscription.deleteMany({
    where: { userId: req.user.id, endpoint: String(req.body?.endpoint ?? "") },
  });
  res.json({ ok: true });
});

/** Sends a sample right now on every enabled channel, replacing today's earlier test. */
notificationsRouter.post("/reminders/test", ...auth, mailLimiter, async (req, res) => {
  const today = todayInTz(req.user.timezone);
  await prisma.notification.deleteMany({
    where: { userId: req.user.id, kind: "test", localDate: new Date(`${today}T00:00:00Z`) },
  });
  const result = await notify(req.user, {
    kind: "test",
    localDate: today,
    title: "🔔 Reminders are on",
    body: `This is what you'll get at ${req.user.reminderTime} when a streak is still open.`,
    url: "/",
    email: true,
  });
  res.json({ ok: true, channels: result?.channels ?? { push: 0, email: false } });
});

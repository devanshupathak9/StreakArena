// Delivering a notification: record it (the in-app inbox), then push it to every
// device that subscribed and, for reminders, email it. Recording comes first and is
// what makes delivery at-most-once per kind and local day: the unique key on
// (userId, kind, localDate) means a retried or duplicated job finds the row and stops
// before anything is sent twice.

import webpush from "web-push";
import { prisma } from "./db.js";
import { APP_URL, layout, mailEnabled, sendMail } from "./mailer.js";
import { toDbDate } from "./streak.js";

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

/** Push needs a VAPID key pair; without one the UI doesn't offer it. */
export const pushEnabled = PUBLIC_KEY !== "" && PRIVATE_KEY !== "";
export const vapidPublicKey = PUBLIC_KEY;

if (pushEnabled) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@streakarena.app", PUBLIC_KEY, PRIVATE_KEY);
}

/** Sends one payload to every subscribed device; prunes the ones the browser revoked. */
export async function pushToUser(userId, payload) {
  if (!pushEnabled) return { sent: 0 };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          // A reminder that arrives after midnight is worse than none.
          { TTL: 60 * 60 * 3, urgency: "high" },
        );
        sent++;
        await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } });
      } catch (error) {
        // 404/410: the user revoked permission or the browser dropped the
        // subscription. It will never work again.
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`push to ${sub.endpoint.slice(0, 40)}… failed:`, error?.statusCode ?? error?.message);
        }
      }
    }),
  );
  return { sent };
}

/**
 * Records and delivers. Returns null if this kind was already sent for that day —
 * the caller treats that as success, because it is one.
 */
export async function notify(user, { kind, localDate, title, body, url = "/", email = false }) {
  let notification;
  try {
    notification = await prisma.notification.create({
      data: { userId: user.id, kind, localDate: toDbDate(localDate), title, body, url },
    });
  } catch (error) {
    if (error?.code === "P2002") return null;
    throw error;
  }

  const channels = { push: 0, email: false };
  if (user.reminderPush || kind === "test") {
    channels.push = (await pushToUser(user.id, { title, body, url, tag: kind, id: notification.id })).sent;
  }

  // Only to a confirmed address: mailing unverified signups is how a sender's
  // reputation dies, and it's someone else's inbox as often as not.
  if (email && user.reminderEmail && user.emailVerifiedAt && mailEnabled) {
    try {
      await sendMail({
        to: user.email,
        subject: title,
        ...layout({
          heading: title,
          body,
          cta: "Open StreakArena",
          url: `${APP_URL}${url}`,
          footer: `Reminder emails can be turned off on your profile: ${APP_URL}/profile#reminders`,
        }),
      });
      channels.email = true;
    } catch (error) {
      console.error("reminder mail failed:", error.message);
    }
  }

  return { notification, channels };
}

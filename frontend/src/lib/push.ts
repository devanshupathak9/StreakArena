import { api } from "./api";

/*
 * Browser push, end to end: the service worker (public/sw.js) shows notifications,
 * this file asks permission and hands the browser's subscription to the server.
 * iOS only allows push for an app added to the home screen, which is why there's a
 * web manifest — in a plain Safari tab `supported()` is simply false.
 */

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function permission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** The server key arrives base64url; PushManager wants raw bytes. */
function keyBytes(base64url: string) {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/** Asks permission if needed, subscribes this browser and registers it with the server. */
export async function enablePush(vapidPublicKey: string) {
  if (!pushSupported()) throw new Error("This browser can't receive notifications");
  const result = await Notification.requestPermission();
  if (result !== "granted") {
    throw new Error(
      result === "denied"
        ? "Notifications are blocked for this site — allow them in your browser's site settings"
        : "Notifications weren't allowed",
    );
  }
  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(vapidPublicKey),
    }));
  await api.savePushSubscription(subscription.toJSON());
  return subscription;
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api.deletePushSubscription(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe();
}

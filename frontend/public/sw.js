// StreakArena service worker: shows push notifications and focuses the app when one
// is tapped. Deliberately caches nothing — a stale bundle is worse than a network
// round trip for an app whose whole point is today's numbers.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "StreakArena", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "StreakArena", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      // Same tag replaces rather than stacks: a last call supersedes the evening
      // reminder instead of piling up beside it.
      tag: "streak-reminder",
      renotify: true,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

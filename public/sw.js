self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() ?? "" }; }
  event.waitUntil(self.registration.showNotification(data.title ?? "Lunar Holdmanager", {
    body: data.body ?? "Der er nyt om dit hold.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.href ?? "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const proposed = new URL(event.notification.data?.url ?? "/", self.location.origin);
  const target = proposed.origin === self.location.origin ? proposed.href : new URL("/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((window) => window.url.startsWith(self.location.origin));
    if (existing) return existing.focus().then(() => existing.navigate(target));
    return clients.openWindow(target);
  }));
});

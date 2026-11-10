self.addEventListener("push", (event) => {
  let message = {
    title: "Finance Tracker",
    body: "Your monthly charity ledger has been updated.",
    url: "/charity/monthly-ledger",
    tag: "finance-tracker-update",
  };

  if (event.data) {
    try {
      message = { ...message, ...event.data.json() };
    } catch {
      message.body = event.data.text();
    }
  }

  const notificationUrl = new URL(message.url || "/", self.location.origin);
  const url = notificationUrl.origin === self.location.origin ? notificationUrl.href : self.location.origin;

  event.waitUntil(self.registration.showNotification(message.title, {
    body: message.body,
    icon: "/ft-logo-192.png",
    badge: "/ft-logo-192.png",
    tag: message.tag,
    data: { url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : new URL("/charity/monthly-ledger", self.location.origin).href;

  event.waitUntil((async () => {
    const openWindows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existingWindow = openWindows.find((client) => client.url === targetUrl);
    if (existingWindow && "focus" in existingWindow) {
      await existingWindow.focus();
      return;
    }

    await self.clients.openWindow(targetUrl);
  })());
});

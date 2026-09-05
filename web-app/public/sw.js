/* ==========================================================================
   Vision2Real – Web Push Service Worker
   Handles incoming push notifications, background alerts, and deep links.
   ========================================================================== */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Vision2Real Notification';
    const options = {
      body: data.body || 'New alert from your Founder Workspace.',
      icon: '/assets/logo-CF4EelfE.svg',
      badge: '/assets/logo-CF4EelfE.svg',
      tag: data.id || 'v2r-push-notification',
      data: {
        deep_link: data.deep_link || '/founder/notifications',
        id: data.id,
      },
      renotify: true,
      actions: [
        {
          action: 'open',
          title: data.action_label || 'View Details',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Error parsing push event data:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.deep_link)
    ? event.notification.data.deep_link
    : '/founder/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/founder') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Analytics / dismiss hook if needed
});

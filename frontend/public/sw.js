// ============================================================================
// NAIJAPINS PWA SERVICE WORKER
// Background Push Notifications & Incoming Call Alerts
// ============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Push Event Handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: '📍 NaijaPins',
    body: 'You have a new update.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'naijapins-notification',
    data: { url: '/' },
  };

  try {
    const rawData = event.data.json();
    payload = {
      ...payload,
      ...rawData,
      data: {
        ...payload.data,
        ...(rawData.data || {}),
      },
    };
  } catch (err) {
    payload.body = event.data.text() || payload.body;
  }

  const isCall = payload.type === 'incoming_call';
  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/favicon.png',
    badge: payload.badge || '/favicon.png',
    tag: isCall ? `call-${payload.data?.callId || 'active'}` : (payload.tag || 'naijapins-msg'),
    renotify: true,
    requireInteraction: isCall, // keep on screen for incoming calls until answered/declined
    vibrate: isCall ? [300, 200, 300, 200, 500, 200, 500] : [150, 80, 150],
    data: payload.data,
    actions: isCall
      ? [
          { action: 'answer', title: '📞 Answer' },
          { action: 'decline', title: '✕ Decline' },
        ]
      : [
          { action: 'open', title: '💬 View Message' },
        ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// 2. Notification Click & Action Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  let targetUrl = data.url || '/messages';

  if (action === 'decline' && data.callId) {
    // Decline action: notify any active clients or API
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'CALL_DECLINED_FROM_NOTIFICATION',
            callId: data.callId,
          });
        });
      })
    );
    return;
  }

  // Answer or Open action: focus or open NaijaPins
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NAVIGATE_TO',
            url: targetUrl,
            callId: data.callId,
            callType: data.callType,
            conversationId: data.conversationId,
          });
          return client.navigate(targetUrl);
        }
      }

      // If no open tab, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

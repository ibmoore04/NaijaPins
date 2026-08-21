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
  console.log('[SW PUSH] Push event received');
  if (!event.data) {
    console.warn('[SW PUSH] Push event received with empty data');
    return;
  }

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
    console.log('[SW PUSH] Payload parsed as JSON:', rawData);
    payload = {
      ...payload,
      ...rawData,
      data: {
        ...payload.data,
        ...(rawData.data || {}),
      },
    };
  } catch (err) {
    console.log('[SW PUSH] Payload parsed as raw text:', event.data.text());
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

  const showNotificationPromise = (async () => {
    try {
      console.log(`[SW NOTIFICATION] Attempting showNotification: "${payload.title}" (isCall=${isCall})`);
      await self.registration.showNotification(payload.title, notificationOptions);
      console.log(`[SW NOTIFICATION] showNotification succeeded: "${payload.title}"`);
    } catch (primaryErr) {
      console.error('[SW NOTIFICATION ERROR] showNotification failed with full options:', primaryErr);
      try {
        // Fallback with minimal sanitized options (omits actions and vibrate if unsupported by OS)
        console.log('[SW NOTIFICATION] Retrying with sanitized basic options...');
        await self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: '/favicon.png',
          data: payload.data,
        });
        console.log('[SW NOTIFICATION] Sanitized showNotification fallback succeeded');
      } catch (fallbackErr) {
        console.error('[SW NOTIFICATION ERROR] Sanitized showNotification fallback also failed:', fallbackErr);
      }
    }
  })();

  event.waitUntil(showNotificationPromise);
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

// 3. Message Event Handler (for direct SW notification diagnostics)
self.addEventListener('message', (event) => {
  console.log('[SW MESSAGE] Received message from client:', event.data);
  if (event.data && event.data.type === 'TEST_SW_NOTIFICATION') {
    event.waitUntil(
      self.registration.showNotification('📍 NaijaPins SW Test', {
        body: 'Service Worker notification rendering works directly from SW context',
        icon: '/favicon.png',
        badge: '/favicon.png',
        requireInteraction: true,
        data: { url: '/messages' },
      }).then(() => {
        console.log('[SW MESSAGE] Test notification displayed successfully');
      }).catch((err) => {
        console.error('[SW MESSAGE ERROR] Failed to display test notification:', err);
      })
    );
  }
});

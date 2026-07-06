// sw.js - Service Worker for Push Notifications & PWA Caching

const CACHE_NAME = 'creator-coop-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/landing.html',
  '/about.html',
  '/benefits.html',
  '/privacy.html',
  '/terms.html',
  '/help.html',
  '/contact.html',
  '/dashboard.html',
  '/profile.html',
  '/queue.html',
  '/settings.html',
  '/new-project.html',
  '/admin.html',
  '/handbook.html',
  '/reset-password.html',
  '/manifest.json',
  '/favicon.ico',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0,1',
  'https://cdn.socket.io/4.8.1/socket.io.min.js'
];

// ============================================================
// INSTALL - Cache assets
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      self.skipWaiting(),
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('📦 Opened cache');
          return cache.addAll(urlsToCache).catch((err) => {
            console.error('Cache addAll error:', err);
          });
        })
    ])
  );
});

// ============================================================
// ACTIVATE - Clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// ============================================================
// FETCH - Serve from cache, fallback to network
// ============================================================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone the request
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          // Clone the response
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          return networkResponse;
        }).catch(() => {
          // If both cache and network fail, return a fallback
          return caches.match('/offline.html');
        });
      })
  );
});

// ============================================================
// PUSH NOTIFICATIONS - Handle incoming push messages
// ============================================================
self.addEventListener('push', (event) => {
  let data = {};
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Push data parse error:', e);
  }

  const title = data.title || '🚀 Creator Co-Op';
  const body = data.body || 'New boost notification!';
  const icon = data.icon || '/icons/icon-192.png';
  const badge = data.badge || '/icons/icon-72.png';
  const url = data.url || '/queue.html';
  const tag = data.tag || 'boost-notification';

  const options = {
    body: body,
    icon: icon,
    badge: badge,
    tag: tag,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      url: url,
      date: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: '📱 View Boost'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ============================================================
// NOTIFICATION CLICK - Handle user interaction with notification
// ============================================================
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const url = notification.data?.url || '/queue.html';

  notification.close();

  // Handle different actions
  if (action === 'dismiss') {
    // User dismissed, do nothing
    return;
  }

  // Open the URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (const client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// ============================================================
// BACKGROUND SYNC (Optional - for offline notifications)
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const cache = await caches.open('pending-notifications');
    const requests = await cache.keys();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        // Replay the request when online
        const data = await response.json();
        // Send to server
        await fetch('/api/notifications/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        // Remove from cache after successful sync
        await cache.delete(request);
      }
    }
  } catch (err) {
    console.error('Sync notifications error:', err);
  }
}

// ============================================================
// MESSAGE FROM CLIENT
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🔔 Service Worker loaded with Push Notifications & PWA caching');
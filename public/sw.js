const CACHE_NAME = 'construction-pro-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install Event - Cache initial assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Offline support
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Firebase)
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip POST/PUT/DELETE requests
  if (event.request.method !== 'GET') return;

  // Navigation requests (index.html) - Network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets - Cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});

// Push Notification Support
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Construction Pro';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.url || '/'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification Click Support
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});

// Message Support (for local notifications from main thread)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url } = event.data;
    self.registration.showNotification(title, {
      body: body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: url || '/'
    });
  }
});

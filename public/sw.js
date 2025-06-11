// sw.js - Service Worker for WorkVibe PWA
const CACHE_NAME = ‘workvibe-v1.0.0’;
const urlsToCache = [
‘/’,
‘/static/js/bundle.js’,
‘/static/css/main.css’,
‘/manifest.json’,
‘/icons/icon-192x192.png’,
‘/icons/icon-512x512.png’
];

// Install event - cache resources
self.addEventListener(‘install’, (event) => {
console.log(‘Service Worker installing…’);
event.waitUntil(
caches.open(CACHE_NAME)
.then((cache) => {
console.log(‘Opened cache’);
return cache.addAll(urlsToCache);
})
.catch((error) => {
console.log(‘Cache failed:’, error);
})
);
self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener(‘activate’, (event) => {
console.log(‘Service Worker activating…’);
event.waitUntil(
caches.keys().then((cacheNames) => {
return Promise.all(
cacheNames.map((cacheName) => {
if (cacheName !== CACHE_NAME) {
console.log(‘Deleting old cache:’, cacheName);
return caches.delete(cacheName);
}
})
);
})
);
self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener(‘fetch’, (event) => {
// Skip cross-origin requests
if (!event.request.url.startsWith(self.location.origin)) {
return;
}

event.respondWith(
caches.match(event.request)
.then((response) => {
// Return cached version or fetch from network
if (response) {
console.log(‘Serving from cache:’, event.request.url);
return response;
}

```
    console.log('Fetching from network:', event.request.url);
    return fetch(event.request).then(
      (response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response (can only be consumed once)
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            // Only cache GET requests
            if (event.request.method === 'GET') {
              cache.put(event.request, responseToCache);
            }
          });

        return response;
      }
    );
  })
  .catch(() => {
    // Fallback for offline - return a custom offline page if needed
    if (event.request.destination === 'document') {
      return caches.match('/');
    }
  })
```

);
});

// Background sync for when connection is restored
self.addEventListener(‘sync’, (event) => {
if (event.tag === ‘background-sync’) {
console.log(‘Background sync triggered’);
event.waitUntil(
// Sync any pending data with Firebase when connection is restored
fetch(’/api/sync’, { method: ‘POST’ })
.then(() => console.log(‘Background sync completed’))
.catch(() => console.log(‘Background sync failed’))
);
}
});

// Push notification handler (optional for future features)
self.addEventListener(‘push’, (event) => {
const options = {
body: event.data ? event.data.text() : ‘New WorkVibe notification’,
icon: ‘/icons/icon-192x192.png’,
badge: ‘/icons/icon-72x72.png’,
vibrate: [100, 50, 100],
data: {
dateOfArrival: Date.now(),
primaryKey: 1
},
actions: [
{
action: ‘explore’,
title: ‘Open WorkVibe’,
icon: ‘/icons/icon-192x192.png’
},
{
action: ‘close’,
title: ‘Close notification’,
icon: ‘/icons/icon-192x192.png’
}
]
};

event.waitUntil(
self.registration.showNotification(‘WorkVibe’, options)
);
});

// Notification click handler
self.addEventListener(‘notificationclick’, (event) => {
event.notification.close();

if (event.action === ‘explore’) {
event.waitUntil(
clients.openWindow(’/’)
);
}
});

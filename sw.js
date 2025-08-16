// WorkVibe Service Worker
const CACHE_NAME = 'workvibe-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('🔧 WorkVibe Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ WorkVibe Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 WorkVibe Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ WorkVibe Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle Firebase requests differently
  if (event.request.url.includes('firebaseio.com')) {
    // Let Firebase requests go through normally (don't cache API calls)
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('📦 Serving from cache:', event.request.url);
          return response;
        }

        console.log('🌐 Fetching from network:', event.request.url);
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Show offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Handle background sync (for offline task completion)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-tasks') {
    event.waitUntil(
      // Sync pending tasks when back online
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            tag: event.tag
          });
        });
      })
    );
  }
});

// Handle push notifications (enhanced for inventory notifications)
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received', event.data);
  
  let notificationData = {
    title: 'WorkVibe Notification',
    body: 'New notification from WorkVibe',
    icon: '/hamptownControlPanel/icons/icon-192x192.png',
    badge: '/hamptownControlPanel/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'Open WorkVibe',
        icon: '/hamptownControlPanel/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/hamptownControlPanel/icons/icon-96x96.png'
      }
    ]
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();

  if (event.action === 'explore' || event.action === 'view') {
    // Open the app - adjust URL to handle different contexts
    const url = event.notification.data?.type === 'inventory' 
      ? '/hamptownControlPanel/?tab=inventory' 
      : '/hamptownControlPanel/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('/hamptownControlPanel') && 'focus' in client) {
            return client.focus();
          }
        }
        // If no existing window, open new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Log service worker messages
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

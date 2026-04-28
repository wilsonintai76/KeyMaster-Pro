
const CACHE_NAME = 'smartkey-v2.5-pwa';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Event: Cache core shell
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event: Clean up old caches
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
  self.clients.claim(); // Take control of all clients immediately
});

// Fetch Event: Stale-While-Revalidate strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignore API calls (Firebase, Google Gemini) to ensure fresh data
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebase') || 
      url.hostname.includes('firestore')) {
    return; // Let browser handle network
  }

  // 2. Handle Navigation and Asset requests
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Fetch from network to update cache (background)
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Only cache valid responses
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
             // Network failed
             // If this was a navigation request, serve index.html (SPA Fallback)
             if (event.request.mode === 'navigate') {
                return cache.match('/index.html');
             }
          });

          // Return cached response immediately if available, else wait for network
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});

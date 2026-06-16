/**
 * Haven - PWA Service Worker
 * Implements static asset caching and handles offline capabilities.
 */

const CACHE_NAME = 'haven-static-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/shared.js',
  '/shared.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // HTML, CSS, and JS Screen assets
  '/screens/login.html', '/screens/login.css', '/screens/login.js',
  '/screens/emergency-mode.html', '/screens/emergency-mode.css', '/screens/emergency-mode.js',
  '/screens/home.html', '/screens/home.css', '/screens/home.js',
  '/screens/breathing.html', '/screens/breathing.css', '/screens/breathing.js',
  '/screens/grounding.html', '/screens/grounding.css', '/screens/grounding.js',
  '/screens/sounds.html', '/screens/sounds.css', '/screens/sounds.js',
  '/screens/focus.html', '/screens/focus.css', '/screens/focus.js',
  '/screens/recovery.html', '/screens/recovery.css', '/screens/recovery.js',
  '/screens/support.html', '/screens/support.css', '/screens/support.js',
  '/screens/add-contact.html', '/screens/add-contact.css', '/screens/add-contact.js'
];

// Install Event: cache static resources
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static app shell resources');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Stale-While-Revalidate policy for shell resources, network-only for API requests
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Exclude API server database calls from caching
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background and update the cache
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse);
            });
          }
        }).catch((err) => {
          // Log network connectivity issue silently
        });
        return cachedResponse;
      }

      // If not cached, fetch from network
      return fetch(e.request);
    })
  );
});

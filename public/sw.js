// PRISMAL Dental Platform - Service Worker for Offline Capability & PWA
const CACHE_NAME = 'prismal-portal-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/prismal-logo.svg',
  '/manifest.webmanifest',
];

// Install Event - Precache critical shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PRISMAL SW] Pre-caching warning:', err);
      });
    })
  );
});

// Activate Event - Clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PRISMAL SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Handle offline routing and caching
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests for standard caching (mutations handled via client offline queue)
  if (req.method !== 'GET') {
    return;
  }

  // 1. Navigation requests (HTML Pages) -> Network first, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('/index.html').then((cached) => {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // 2. Static Assets (scripts, styles, images, fonts) -> Stale While Revalidate / Cache First
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then((cachedResp) => {
        const fetchPromise = fetch(req).then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const respClone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          }
          return networkResp;
        }).catch(() => null);

        return cachedResp || fetchPromise;
      })
    );
    return;
  }

  // 3. Studio data API -> Network first with cache fallback
  if (url.pathname.startsWith('/api/studios')) {
    event.respondWith(
      fetch(req).then((networkResp) => {
        if (networkResp && networkResp.status === 200) {
          const respClone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
        }
        return networkResp;
      }).catch(() => {
        return caches.match(req);
      })
    );
    return;
  }

  // Default network with cache fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

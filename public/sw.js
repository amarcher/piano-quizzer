// Minimal offline-first service worker. Vite fingerprints JS/CSS filenames,
// so we cache them on-demand with a stale-while-revalidate strategy: serve
// cached responses instantly, update the cache in the background.
// Navigation requests fall back to the shell (index.html) so deep links work
// offline without relying on the Vercel SPA rewrite.

const VERSION = 'pq-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // SPA navigations always resolve to the cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(r => r || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req);
      const fetchAndUpdate = fetch(req).then(res => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});

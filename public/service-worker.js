/* Basic, safe cache-first service worker for PHStud.
   Keep it conservative while iterating. Put this file in /public so it's served at /service-worker.js
*/
const CACHE_NAME = 'phstud-shell-v1';
const SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // add any small static assets you want cached up-front
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const { request } = event;
  const url = new URL(request.url);

  // image runtime cache (cache-first)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
            return res;
          })
          .catch(() => caches.match('/icons/icon-192.png'));
      })
    );
    return;
  }

  // default network-first but fallback to cache when offline
  event.respondWith(
    fetch(request)
      .then((res) => res)
      .catch(() => caches.match(request))
  );
});

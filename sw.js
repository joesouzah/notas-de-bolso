const CACHE_PREFIX = 'notas-simples-v';
const CACHE = 'notas-simples-v1.4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './LICENSE.txt'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const directCached = await caches.match(request);
    const shellCached = request.mode === 'navigate' ? await caches.match('./index.html') : null;
    const cached = directCached || shellCached;

    // App shell cache-first: abre instantaneamente e continua totalmente offline.
    // Novas versões chegam pelo ciclo normal de atualização do Service Worker.
    if (cached) return cached;

    try {
      const response = await fetch(request, {cache:'no-store'});
      if (response.ok){
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone()).catch(()=>{});
        return response;
      }
      if (request.mode === 'navigate') return (await caches.match('./index.html')) || response;
      return response;
    } catch {
      if (request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});

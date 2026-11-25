// Device Studio service worker: installable app shell plus offline reuse of what was loaded.
// Pages: network first, cached copy when offline. Versioned files (?v=): cache first.
// Everything else from this origin: cached copy now, refreshed in the background.
const CACHE = 'studio-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const keep = (req, res) => { if (res && res.ok && res.type === 'basic') caches.open(CACHE).then(c => c.put(req, res.clone())); return res; };

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('range')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => keep(req, res)).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  if (url.searchParams.has('v')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const fresh = fetch(req).then(res => keep(req, res)).catch(() => hit);
    return hit || fresh;
  }));
});

/* =====================================================================
   Hybrid Work Planner — service worker (app instalable en el celular)
   Siempre pide la versión nueva a internet; la copia guardada solo se usa
   si no hay conexión, para que la app abra aunque sea sin datos nuevos.
   No toca las llamadas a la base de datos (Supabase).
   ===================================================================== */
const CACHE = 'hwp-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok){ const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: r.mode === 'navigate' }).then(m => m || caches.match('./')))
  );
});

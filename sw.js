/* Service worker — Simulasi TKA Sekolah (PWA).
   - Cangkang aplikasi (HTML/CSS/JS/ikon) di-cache → aplikasi terbuka cepat dan tetap terbuka saat offline.
   - Permintaan ke Google Apps Script (POST) TIDAK PERNAH dicegat/di-cache: data & kunci jawaban selalu dari server.
   - Naikkan VERSI setiap kali Anda menerbitkan pembaruan agar cache lama dibuang. */
const VERSI = 'tka-v32';
const SHELL = ['./', './index.html', './css/style.css', './js/config.js', './js/ui.js', './js/api.js', './js/app.js', './js/siswa.js', './js/guru.js', './js/admin.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI && k !== 'tka-font').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Font Google: cache dulu, perbarui di latar belakang
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open('tka-font').then(c => c.match(req).then(hit => { const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // Halaman: jaringan dulu, cadangan dari cache saat offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSI).then(c => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  // config.js: jaringan dulu (agar perubahan URL backend langsung berlaku)
  if (url.pathname.endsWith('/js/config.js')) {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSI).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
    return;
  }
  // Aset statis: stale-while-revalidate
  e.respondWith(caches.open(VERSI).then(c => c.match(req).then(hit => { const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit); return hit || net; })));
});

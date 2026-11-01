// Offline cache. Bump VERSION when files change so phones pick up updates.
var VERSION = 'ats-v5';
var FILES = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/util.js', './js/names.js', './js/data.js', './js/engine.js', './js/military.js', './js/mapdata.js', './js/territory.js', './js/actions.js', './js/events.js', './js/ui.js',
  './img/earth.jpg', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first, fall back to cache when offline.
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () { return caches.match(e.request); }));
});

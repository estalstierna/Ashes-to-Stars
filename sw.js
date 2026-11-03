// Offline cache. Bump VERSION when files change so phones pick up updates.
var VERSION = 'ats-v35';
var FILES = [
  './', './index.html', './css/style.css', './manifest.webmanifest',
  './js/util.js', './js/names.js', './js/data.js', './js/lore.js', './js/flags.js', './js/engine.js', './js/military.js', './js/research.js', './js/laws.js', './js/character.js', './js/mapdata.js', './js/territory.js', './js/actions.js', './js/events.js', './js/events-extra.js', './js/war.js', './js/space.js', './js/cabinet.js', './js/ui/kit.js', './js/ui/home.js', './js/ui/government.js', './js/ui/actions.js', './js/ui/economy.js', './js/ui/military.js', './js/ui/world.js', './js/ui/science.js', './js/ui/space.js', './js/ui/news.js', './js/ui/main.js',
  './img/earth.jpg', './img/flags/USA.jpg', './img/flags/EF.jpg', './img/flags/RUS.jpg', './img/flags/CHN.jpg', './img/flags/IND.jpg', './img/flags/PAC.jpg', './img/flags/PAU.jpg', './img/flags/SAC.jpg', './img/flags/TUR.jpg', './img/flags/GULF.jpg', './img/flags/MESO.jpg', './img/flags/AUS.jpg', './img/flags/CAS.jpg', './img/flags/SIB.jpg', './img/flags/NRD.jpg', './img/flags/SGP.jpg',
  './icons/icon-64.png', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
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

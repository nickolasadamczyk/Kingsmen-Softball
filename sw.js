/* sw.js — offline cache for the app shell */
var CACHE = 'kingsmen-softball-v2';
var ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/store.js',
  './js/utils.js',
  './js/stats.js',
  './js/players.js',
  './js/coaches.js',
  './js/checkin.js',
  './js/games.js',
  './js/live.js',
  './js/statsview.js',
  './js/summary.js',
  './js/settings.js',
  './js/app.js',
  './icons/icon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (resp) {
        return resp;
      }).catch(function () { return cached; });
    })
  );
});

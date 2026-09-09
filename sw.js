var CACHE_NAME = "tavari-hero-v1";
var HERO_URLS = [
  "/Videos/mobileHero.mp4",
  "/Videos/mobileHero.hevc.mp4"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(HERO_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;
  var path = new URL(request.url).pathname;
  if (path.indexOf("/Videos/mobileHero.") !== 0) return;
  var cacheKey = request.url.split("#")[0];
  var cacheRequest = new Request(cacheKey, { method: "GET" });
  event.respondWith(
    caches.match(cacheRequest).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(cacheRequest, copy);
          });
        }
        return response;
      });
    })
  );
});
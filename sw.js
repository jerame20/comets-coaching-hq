const CACHE = "comets-hq-v29";
const ASSETS = ["./", "./index.html", "./styles.css?v=28", "./data.js?v=10", "./changelog.js?v=1", "./app.js?v=28", "./manifest.json?v=2", "./icon.svg", "./comets-icon-v2-180.png", "./comets-icon-v2-192.png", "./comets-icon-v2-512.png", "./soccer-ball.svg"];
self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
});

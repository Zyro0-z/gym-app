// Service worker: la app funciona sin conexión. Cache primero y actualización en segundo plano.
const V = "gym-v4";
const FICHEROS = ["./", "index.html", "app.css", "manifest.webmanifest", "src/app.js", "src/store.js", "src/ui.js", "src/dvshim.js", "src/logger.js", "src/copia.js", "src/dashboard.js",
  "assets/gym-dashboard.css", "vendor/luxon.min.js", "vendor/marked.min.js", "vendor/chart.min.js", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FICHEROS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(r, { ignoreSearch: true });
    const red = fetch(r).then((resp) => { if (resp.ok) c.put(r, resp.clone()); return resp; }).catch(() => hit);
    return hit || red;
  }));
});

// Service worker: la app funciona sin conexión. Cache primero y actualización en segundo plano.
// Cada publicación sube V; todo fichero nuevo de la app va en FICHEROS (lo comprueba tests/core/sw.test.mjs).
const V = "gym-v7";
const FICHEROS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "src/app.js",
  "src/store.js",
  "src/ui/base.css",
  "src/ui/calor.js",
  "src/ui/capas.js",
  "src/ui/componentes.css",
  "src/ui/controles.js",
  "src/ui/cuerpo.js",
  "src/ui/dom.js",
  "src/ui/graficas.js",
  "src/ui/haptica.js",
  "src/ui/iconos.js",
  "src/ui/insignias.js",
  "src/ui/navegacion.js",
  "src/ui/sonido.js",
  "src/ui/teclado.js",
  "src/ui/tema.js",
  "src/ui/textos.js",
  "src/ui/tokens.css",
  "src/views/ajustes.js",
  "src/views/comun.js",
  "src/views/datos.js",
  "src/views/editores.js",
  "src/views/ejercicio.js",
  "src/views/entreno.js",
  "src/views/guia.js",
  "src/views/historial.js",
  "src/views/hoy.js",
  "src/views/indice.js",
  "src/views/ligas.js",
  "src/views/pesaje.js",
  "src/views/progreso.js",
  "src/views/selector.js",
  "src/core/analisis.js",
  "src/core/calidad.js",
  "src/core/constantes.js",
  "src/core/contexto.js",
  "src/core/estancamiento.js",
  "src/core/fechas.js",
  "src/core/formato.js",
  "src/core/legacy.js",
  "src/core/ligas.js",
  "src/core/nombres.js",
  "src/core/peso.js",
  "src/core/progresion.js",
  "src/core/semanal.js",
  "src/core/sesiones.js",
  "src/data/db.js",
  "src/data/espejo.js",
  "src/data/modelo.js",
  "src/data/repos.js",
  "assets/cuerpo-muscular.svg",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];
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

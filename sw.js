// Service worker: la app funciona sin conexión y nunca mezcla ficheros de dos versiones.
//  · install: descarga TODOS los ficheros de FICHEROS en una caché nueva con el nombre de la versión.
//  · fetch: sirve siempre de la caché activa (cache-first) y no escribe nada en ella; lo que no esté
//    cacheado va a la red y, si falla, responde con un error limpio (que no se cachea).
//  · activate: borra las cachés de otras versiones.
// V vale "dev" en el repo: CI la sustituye por el commit y una huella de FICHEROS y de su contenido
// (tools/estampar-version.mjs). Todo fichero que cargue la app va en FICHEROS (lo comprueba
// tests/core/sw.test.mjs).
const V = "dev";
const FICHEROS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "src/app.js",
  "src/store.js",
  "src/core/analisis.js",
  "src/core/calidad.js",
  "src/core/constantes.js",
  "src/core/contexto.js",
  "src/core/estancamiento.js",
  "src/core/fechas.js",
  "src/core/formato.js",
  "src/core/ligas.js",
  "src/core/nombres.js",
  "src/core/peso.js",
  "src/core/presentacion.js",
  "src/core/rpe.js",
  "src/core/discos.js",
  "src/core/gimnasios.js",
  "src/core/musculos.js",
  "src/core/calentamiento.js",
  "src/core/rutinas.js",
  "src/core/volumen.js",
  "src/core/porgimnasio.js",
  "src/core/prescripcion.js",
  "src/core/deriva.js",
  "src/core/sugerencia.js",
  "src/core/fatiga.js",
  "src/core/descarga.js",
  "src/core/comparar.js",
  "src/core/csv.js",
  "src/core/medidas.js",
  "src/ui/instalar.js",
  "src/core/progresion.js",
  "src/core/rehidratar.js",
  "src/core/semanal.js",
  "src/core/sesiones.js",
  "src/data/db.js",
  "src/data/espejo.js",
  "src/data/esquema.js",
  "src/data/modelo.js",
  "src/data/repos.js",
  "src/migracion/claves.js",
  "src/migracion/config-entreno.js",
  "src/migracion/config-resto.js",
  "src/migracion/config.js",
  "src/migracion/conversion.js",
  "src/migracion/index.js",
  "src/migracion/lineas.js",
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
  "src/ui/insignias/graficos.js",
  "src/ui/insignias/montaje.js",
  "src/ui/insignias/registro.js",
  "src/ui/navegacion.js",
  "src/ui/sonido.js",
  "src/ui/teclado.js",
  "src/ui/tema.js",
  "src/ui/textos.js",
  "src/ui/tokens.css",
  "src/ui/version.js",
  "src/ui/bloqueo.js",
  "src/ui/avisos.js",
  "src/views/ajustes.js",
  "src/views/comun.js",
  "src/views/datos.js",
  "src/views/editores.js",
  "src/views/editores/avanzado.js",
  "src/views/editores/bloques.js",
  "src/views/editores/calidad.js",
  "src/views/editores/comun.js",
  "src/views/editores/ejercicios.js",
  "src/views/editores/entrenamiento.js",
  "src/views/editores/grupos.js",
  "src/views/editores/horario.js",
  "src/views/editores/objetivos.js",
  "src/views/editores/peso.js",
  "src/views/editores/rutinas.js",
  "src/views/ejercicio.js",
  "src/views/entreno.js",
  "src/views/entreno/descanso.js",
  "src/views/entreno/ejercicios.js",
  "src/views/entreno/estado.js",
  "src/views/entreno/herramientas.js",
  "src/views/entreno/recuperacion.js",
  "src/views/fatiga.js",
  "src/views/musculos.js",
  "src/views/porgimnasio.js",
  "src/views/comparar.js",
  "src/views/medidas.js",
  "src/views/entreno/pantalla.js",
  "src/views/entreno/resumen.js",
  "src/views/entreno/revision.js",
  "src/views/entreno/serie.js",
  "src/views/guia.js",
  "src/views/historial.js",
  "src/views/hoy.js",
  "src/views/indice.js",
  "src/views/ligas.js",
  "src/views/pesaje.js",
  "src/views/progreso.js",
  "src/views/selector.js",
  "src/worker/analisis.js",
  "assets/cuerpo-muscular.svg",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];
// La primera instalación se activa sola; una actualización espera a que el usuario pulse «Recargar»
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V)
    .then((c) => c.addAll(FICHEROS.map((f) => new Request(f, { cache: "reload" }))))
    .then(async () => { if (!self.registration.active) await self.skipWaiting(); }));
});
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.tipo === "activar") self.skipWaiting();
  else if (d.tipo === "version" && e.ports && e.ports[0]) e.ports[0].postMessage({ version: V });
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Avisos de fin de descanso (servidor opcional): se muestran siempre (iOS lo exige para Web Push)
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {}; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Descanso terminado", {
    body: d.cuerpo || "", tag: d.etiqueta || "descanso", renotify: true, icon: "icons/icon-192.png", badge: "icons/icon-192.png" }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const c = cs.find((x) => new URL(x.url).origin === location.origin);
    if (c) return c.focus();
    return self.clients.openWindow("./");
  })());
});
const sinConexion = () => new Response("Sin conexión", { status: 503, statusText: "Sin conexion", headers: { "content-type": "text/plain; charset=utf-8" } });
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    const hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;
    // La app es una sola página: una navegación sin caché (p. ej. «/?algo») usa index.html cacheado
    if (r.mode === "navigate") { const idx = (await c.match("index.html")) || (await c.match("./")); if (idx) return idx; }
    try { return await fetch(r); } catch (err) { return sinConexion(); }
  })());
});

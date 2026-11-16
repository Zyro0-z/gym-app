// Versión instalada: se la pregunta al service worker que controla la página (la estampa CI).
let cache = null;
export function versionInstalada() {
  if (cache) return cache;
  cache = new Promise((ok) => {
    const sw = "serviceWorker" in navigator && navigator.serviceWorker.controller;
    if (!sw) return ok(null);
    const canal = new MessageChannel();
    const t = setTimeout(() => ok(null), 1500);
    canal.port1.onmessage = (e) => { clearTimeout(t); ok((e.data && e.data.version) || null); };
    try { sw.postMessage({ tipo: "version" }, [canal.port2]); } catch (e) { clearTimeout(t); ok(null); }
  });
  return cache;
}

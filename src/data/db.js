// IndexedDB «gymapp». Versión 1 de la base: almacén «kv». Versión 2: añade «sesiones» (clave id).
// La versión de los DATOS va aparte, en kv.schema (ver modelo.js y migraciones.js).
const NOMBRE = "gymapp", VERSION = 2;
let db = null;

export function abrir() {
  if (db) return Promise.resolve(db);
  return new Promise((ok, ko) => {
    const r = indexedDB.open(NOMBRE, VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
      if (!d.objectStoreNames.contains("sesiones")) d.createObjectStore("sesiones", { keyPath: "id" });
    };
    r.onblocked = () => ko(new Error("Hay otra pestaña con una versión antigua de la app abierta. Ciérrala y vuelve a abrir esta."));
    r.onsuccess = () => {
      db = r.result;
      db.onversionchange = () => { db.close(); db = null; };
      ok(db);
    };
    r.onerror = () => ko(r.error);
  });
}

/** Ejecuta `fn(almacenes)` en una transacción; resuelve con lo que devuelva cuando se confirme. */
export async function tx(almacenes, modo, fn) {
  const d = await abrir();
  return new Promise((ok, ko) => {
    const t = d.transaction(almacenes, modo);
    const st = {};
    for (const a of [].concat(almacenes)) st[a] = t.objectStore(a);
    let res;
    try { res = fn(st, t); } catch (e) { try { t.abort(); } catch (_) {} ko(e); return; }
    t.oncomplete = () => ok(res && typeof res === "object" && "result" in res && res instanceof IDBRequest ? res.result : res);
    t.onerror = () => ko(t.error);
    t.onabort = () => ko(t.error || new Error("Transacción cancelada"));
  });
}

const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

export async function leerKV(clave) { const d = await abrir(); return req(d.transaction("kv").objectStore("kv").get(clave)); }
export async function clavesKV() { const d = await abrir(); return req(d.transaction("kv").objectStore("kv").getAllKeys()); }
export async function todasSesiones() { const d = await abrir(); return req(d.transaction("sesiones").objectStore("sesiones").getAll()); }
export const escribirKV = (clave, valor) => tx("kv", "readwrite", (s) => { s.kv.put(valor, clave); });
export const borrarKV = (clave) => tx("kv", "readwrite", (s) => { s.kv.delete(clave); });
export const ponerSesion = (ses) => tx("sesiones", "readwrite", (s) => { s.sesiones.put(ses); });
export const quitarSesion = (id) => tx("sesiones", "readwrite", (s) => { s.sesiones.delete(id); });

/** Copia JSON sin referencias compartidas (IndexedDB clona, pero así nada externo cambia lo guardado). */
export const plano = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

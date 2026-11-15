// Almacén local (IndexedDB). Todo vive en el iPhone; no hay servidor.
// Esquema versionado: la clave "schema" guarda la versión de los datos. Antes de migrar se guarda
// una copia completa en "backup-esquema-v<n>" para no perder nada si una migración falla.
const DB = "gymapp", ST = "kv";
let db;
const open = () => new Promise((ok, ko) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(ST);
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});
const tx = (mode, fn) => new Promise((ok, ko) => {
  const t = db.transaction(ST, mode), s = t.objectStore(ST), r = fn(s);
  t.oncomplete = () => ok(r && r.result);
  t.onerror = () => ko(t.error);
  t.onabort = () => ko(t.error);
});
const leer = (k) => tx("readonly", (s) => s.get(k));
const escribir = (k, v) => tx("readwrite", (s) => s.put(v, k));

export const S = { sessions: [], templates: [], configs: {}, settings: {}, library: [], draft: null };
const KEYS = ["sessions", "templates", "configs", "settings", "library", "draft"];

export const ESQUEMA = 2;
const MIGRACIONES = {
  // v2: la fecha de la última copia pasa de localStorage a IndexedDB (settings.backup), que es
  // donde están el resto de datos y donde la usa el aviso de copia de seguridad.
  2: async () => {
    let f = null; try { f = localStorage.getItem("gym-ultima-copia"); } catch (e) {}
    if (f && !S.settings.backup) { S.settings.backup = { at: f + "T12:00:00", sessions: S.sessions.length }; await save("settings"); }
  },
};
async function migrar(recienSembrado) {
  const v = (await leer("schema")) || 1;
  if (v >= ESQUEMA) return;
  if (!recienSembrado && !vacio()) {
    const datos = {}; for (const k of KEYS) datos[k] = S[k];
    await escribir("backup-esquema-v" + v, JSON.parse(JSON.stringify({ fecha: new Date().toISOString(), datos })));
  }
  for (let n = v + 1; n <= ESQUEMA; n++) { if (MIGRACIONES[n]) await MIGRACIONES[n](); await escribir("schema", n); }
}

export async function load() {
  db = await open();
  for (const k of KEYS) { const v = await leer(k); if (v !== undefined && v !== null) S[k] = v; }
  let sembrado = false;
  if (vacio() && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    // seed.json solo existe en local (no se publica: lleva datos personales). En GitHub Pages
    // la app arranca vacía y la pantalla de bienvenida pide importar una copia.
    try {
      const r = await fetch("seed.json", { cache: "no-store" });
      if (r.ok) { const seed = await r.json(); for (const k of ["sessions", "templates", "configs", "settings", "library"]) if (seed[k] !== undefined) S[k] = seed[k]; await saveAll(); sembrado = true; }
    } catch (e) {}
  }
  await migrar(sembrado || vacio());
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}
export const vacio = () => !S.sessions.length && !S.templates.length && !Object.keys(S.configs).length;
export const save = (k) => escribir(k, JSON.parse(JSON.stringify(S[k] === undefined ? null : S[k])));
export const saveAll = async () => { for (const k of KEYS) await save(k); };

export const exportJSON = () => JSON.stringify({ version: 1, schema: ESQUEMA, exportado: new Date().toISOString(),
  sessions: S.sessions, templates: S.templates, configs: S.configs, settings: S.settings, library: S.library }, null, 1);
export async function importJSON(txt) {
  let d;
  try { d = JSON.parse(txt); } catch (e) { throw new Error("El archivo no es un JSON válido."); }
  if (!d || !Array.isArray(d.sessions) || !d.configs || typeof d.configs !== "object") throw new Error("No parece una copia de Gym: faltan las sesiones o la configuración.");
  if (d.schema && d.schema > ESQUEMA) throw new Error("La copia es de una versión más nueva de la app. Actualízala antes de importar.");
  for (const k of ["sessions", "templates", "configs", "settings", "library"]) if (d[k] !== undefined) S[k] = d[k];
  // Lo importado viene de un archivo: cuenta como copia hecha ahora.
  S.settings = S.settings || {};
  S.settings.backup = { at: new Date().toISOString(), sessions: S.sessions.length };
  await saveAll();
  await escribir("schema", ESQUEMA);
}

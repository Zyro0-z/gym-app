// Almacén local (IndexedDB). Todo vive en el iPhone; no hay servidor.
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
});

export const S = { sessions: [], templates: [], configs: {}, settings: {}, library: [], draft: null, bodyweightLog: null };
const KEYS = ["sessions", "templates", "configs", "settings", "library", "draft"];

export async function load() {
  db = await open();
  for (const k of KEYS) { const v = await tx("readonly", (s) => s.get(k)); if (v !== undefined) S[k] = v; }
  if (vacio() && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    // seed.json solo existe en local (no se publica: lleva datos personales). En GitHub Pages
    // la app arranca vacía y la pantalla de bienvenida pide importar una copia.
    try {
      const r = await fetch("seed.json", { cache: "no-store" });
      if (r.ok) { const seed = await r.json(); for (const k of ["sessions", "templates", "configs", "settings", "library"]) if (seed[k] !== undefined) S[k] = seed[k]; await saveAll(); }
    } catch (e) {}
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
}
export const vacio = () => !S.sessions.length && !S.templates.length && !Object.keys(S.configs).length;
export const save = (k) => tx("readwrite", (s) => s.put(JSON.parse(JSON.stringify(S[k] === undefined ? null : S[k])), k));
export const saveAll = async () => { for (const k of KEYS) await save(k); };

export const exportJSON = () => JSON.stringify({ version: 1, exportado: new Date().toISOString(),
  sessions: S.sessions, templates: S.templates, configs: S.configs, settings: S.settings, library: S.library }, null, 1);
export async function importJSON(txt) {
  const d = JSON.parse(txt);
  if (!d || !Array.isArray(d.sessions) || !d.configs) throw new Error("Archivo no válido");
  for (const k of ["sessions", "templates", "configs", "settings", "library"]) if (d[k] !== undefined) S[k] = d[k];
  await saveAll();
}

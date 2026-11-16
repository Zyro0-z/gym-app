// Genera una base IndexedDB REAL de la versión 2.0 (tag v2.0) y la vuelca a JSON, para probar
// la migración al esquema 4 con datos escritos por el código de entonces.
//   node tools/fixture-v2.mjs            → tests/fixtures/idb-v2.json (datos sintéticos, se publica)
//   node tools/fixture-v2.mjs --seed     → tests/fixtures/idb-v2-seed.json (seed.json; local, no se publica)
// Pasos: extrae el tag v2.0 a un directorio temporal, lo sirve, crea la base con el formato de
// la versión 1, la abre con `cargar()` de la 2.0 (migra a esquema 3), guarda con la 2.0 una sesión,
// un pesaje y un borrador, y vuelca todos los almacenes.
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, normalize } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { fixture } from "../tests/golden/fixture.mjs";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const conSeed = process.argv.includes("--seed");
const TAG = "v2.0", PUERTO = 8799;
const dir = mkdtempSync(join(tmpdir(), "gym-v2-"));
execSync(`git -C "${RAIZ}" archive ${TAG} | tar -x -C "${dir}"`);
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const srv = createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  if (p === "/__fx.html") { res.writeHead(200, { "content-type": "text/html" }); return res.end('<!doctype html><meta charset="utf-8"><script type="module">import * as R from "/src/data/repos.js"; window.R = R; window.listo = true;</script>'); }
  const f = normalize(join(dir, p));
  try { const b = readFileSync(f); res.writeHead(200, { "content-type": TIPOS[extname(f)] || "application/octet-stream" }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => srv.listen(PUERTO, "127.0.0.1", ok));

let viejo;
if (conSeed) {
  const s = JSON.parse(readFileSync(join(RAIZ, "seed.json"), "utf8"));
  viejo = { sessions: s.sessions, templates: s.templates, configs: s.configs, library: s.library || [], settings: s.settings || {}, schema: s.schema || 2 };
} else {
  const d = fixture();
  viejo = { sessions: d.sessions, templates: d.templates, configs: d.configs, library: d.library,
    settings: { defaultRestDuration: 75, backup: { at: "2026-11-01T10:00:00.000Z", sessions: 60 } }, schema: 2 };
}

const nav = await chromium.launch();
const p = await nav.newPage();
p.on("pageerror", (e) => { console.error("error de página: " + e.message); process.exitCode = 1; });
await p.goto(`http://127.0.0.1:${PUERTO}/__fx.html`);
await p.waitForFunction(() => window.listo);
const volcado = await p.evaluate(async (v) => {
  await new Promise((ok, ko) => {
    const r = indexedDB.open("gymapp", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => { const t = r.result.transaction("kv", "readwrite"); for (const k of Object.keys(v)) t.objectStore("kv").put(v[k], k);
      t.oncomplete = () => { r.result.close(); ok(); }; t.onerror = () => ko(t.error); };
  });
  const e = await window.R.cargar();                       // código 2.0: migra a esquema 3
  await window.R.guardarSesion({ id: "2026-11-14-1763140000000-fx01", rutina: "Torso A", fecha: "2026-11-14", inicio: "18:00", fin: "19:05", duracion: 65,
    ejercicios: [{ ejercicioId: "pressbancabarra", nombre: "Press banca barra", tipo: "peso", nota: "Hombro bien",
      series: [{ peso: 40, reps: 10, tipo: "calentamiento", hecha: true }, { peso: 82.5, reps: 8, tipo: "normal", hecha: true }, { peso: 82.5, reps: 7, tipo: "fallo", hecha: true }] }] });
  await window.R.guardarPesajes(e.pesajes.concat([{ fecha: "2026-11-14", kg: 78.4 }]));
  await window.R.guardarBorrador({ rutina: "Pierna", fecha: "2026-11-15", inicio: 1763226000000,
    ejercicios: [{ ejercicioId: "sentadilla", nombre: "Sentadilla", objetivo: 3, series: [{ peso: "100", reps: "5", tipo: "normal", hecha: true }, { peso: "", reps: "", tipo: "normal", hecha: false }] }], descanso: null });
  const db = await new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => ok(r.result); });
  const todo = (st) => new Promise((ok) => { const t = db.transaction(st); const s = t.objectStore(st); const out = {};
    const k = s.getAllKeys(); k.onsuccess = () => { let n = k.result.length; if (!n) ok(out); for (const c of k.result) { const g = s.get(c); g.onsuccess = () => { out[c] = g.result; if (!--n) ok(out); }; } }; });
  const r = { version: db.version, almacenes: [...db.objectStoreNames], kv: await todo("kv"), sesiones: Object.values(await todo("sesiones")) };
  db.close();
  return r;
}, viejo);
await nav.close(); srv.close(); rmSync(dir, { recursive: true, force: true });
const salida = join(RAIZ, "tests/fixtures", conSeed ? "idb-v2-seed.json" : "idb-v2.json");
writeFileSync(salida, JSON.stringify({ generado: "tag " + TAG + " con tools/fixture-v2.mjs", ...volcado }));
console.log("base v" + volcado.version + " [" + volcado.almacenes + "], esquema " + volcado.kv.schema + ", " + volcado.sesiones.length + " sesiones → " + salida);

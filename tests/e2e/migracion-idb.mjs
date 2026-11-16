// Migración real en IndexedDB: una base con el formato de la versión 1 (almacén kv, versión 1)
// pasa al modelo nuevo sin perder nada; repetir no cambia nada; y lo que escriba después una
// versión antigua se rescata. Uso: node e2e/migracion-idb.mjs [chromium,webkit]
import { chromium, webkit } from "playwright";
import { servir } from "../serve.mjs";
import { fixture } from "../golden/fixture.mjs";

const PUERTO = 8792;
const motores = (process.argv[2] || "chromium").split(",");
const HTML = `<!doctype html><meta charset="utf-8"><script type="module">
import * as R from "/src/data/repos.js";
window.R = R; window.listo = true;
</script>`;
let fallos = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fallos++; };

const srv = await servir(PUERTO);
for (const nombre of motores) {
  const nav = await { chromium, webkit }[nombre].launch();
  const p = await nav.newPage();
  p.on("pageerror", (e) => { console.log("  ✗ error de página: " + e.message); fallos++; });
  await p.route("**/__mig.html", (r) => r.fulfill({ contentType: "text/html", body: HTML }));
  await p.goto(`http://127.0.0.1:${PUERTO}/__mig.html`);
  await p.waitForFunction(() => window.listo);
  console.log(nombre);
  const d = fixture();
  const viejo = { sessions: d.sessions, templates: d.templates, configs: d.configs, library: d.library,
    settings: { defaultRestDuration: 75, backup: { at: "2026-11-01T10:00:00.000Z", sessions: 60 } },
    draft: { template: "Torso A", date: "2026-11-15", start: 1763200000000, editPath: null, exercises: [{ name: "Press banca barra", target: 3, sets: [{ weight: "90", reps: "8", setType: "", done: true }] }] },
    schema: 2 };
  // 1) base antigua: versión 1 con kv
  await p.evaluate((v) => new Promise((ok, ko) => {
    const r = indexedDB.open("gymapp", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => { const t = r.result.transaction("kv", "readwrite"); for (const k of Object.keys(v)) t.objectStore("kv").put(v[k], k);
      t.oncomplete = () => { r.result.close(); ok(); }; t.onerror = () => ko(t.error); };
  }), viejo);
  await p.evaluate(() => localStorage.setItem("gym-tema", "claro"));
  const e1 = await p.evaluate(async () => { const e = await window.R.cargar({ tema: localStorage.getItem("gym-tema") }); return JSON.parse(JSON.stringify(e)); });
  ok(e1.informe && e1.informe.tipo === "migracion", "migra al abrir");
  ok(e1.sesiones.length === d.sessions.length, "todas las sesiones (" + e1.sesiones.length + ")");
  ok(e1.rutinas.length === 3 && e1.catalogo.length > 10 && e1.pesajes.length > 50, "rutinas, catálogo y pesajes");
  ok(e1.ajustes.entreno.descanso === 75 && e1.ajustes.apariencia.tema === "claro", "ajustes y tema conservados");
  ok(e1.borrador && e1.borrador.ejercicios[0].series[0].hecha === true, "entrenamiento a medias conservado");
  const kv = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => {
    const t = r.result.transaction("kv"); const s = t.objectStore("kv"); const out = {};
    const k = s.getAllKeys(); k.onsuccess = () => { let n = k.result.length; for (const c of k.result) { const g = s.get(c); g.onsuccess = () => { out[c] = g.result; if (!--n) { r.result.close(); ok(out); } }; } }; }; }));
  ok(kv.schema === 4, "schema 4 (de la versión 1 se pasa directamente al esquema actual)");
  ok(!("sessions" in kv) && !("configs" in kv), "claves antiguas retiradas del uso");
  ok(kv.legacy && JSON.stringify(kv.legacy.datos.sessions) === JSON.stringify(d.sessions) && JSON.stringify(kv.legacy.datos.configs) === JSON.stringify(d.configs), "copia íntegra en «legacy»");
  ok(kv["backup-esquema-v2"] && kv["backup-esquema-v2"].datos.sessions.length === d.sessions.length, "copia en backup-esquema-v2");
  // 2) abrir otra vez: no cambia nada
  const e2 = await p.evaluate(async () => JSON.parse(JSON.stringify(await window.R.cargar())));
  ok(!e2.informe && e2.sesiones.length === e1.sesiones.length, "segunda apertura idempotente");
  // 3) una versión antigua escribe después de migrar → rescate
  await p.evaluate((s) => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => { const t = r.result.transaction("kv", "readwrite"); t.objectStore("kv").put([s], "sessions"); t.oncomplete = () => { r.result.close(); ok(); }; }; }),
    { path: "Workouts/2026-11-16 Torso A.md", fm: { type: "workout", template: "Torso A", date: "2026-11-16", start: "18:00", end: "19:00", duration: 60, exercises: [{ name: "Press banca barra", sets: [{ weight: 95, reps: 6, unit: "kg" }] }] } });
  await p.reload();
  await p.waitForFunction(() => window.listo);
  const e3 = await p.evaluate(async () => JSON.parse(JSON.stringify(await window.R.cargar())));
  ok(e3.informe && e3.informe.tipo === "rescate" && e3.sesiones.length === e1.sesiones.length + 1, "rescata la sesión nueva");
  // 4) importar reemplaza guardando antes lo actual
  await p.evaluate(async () => { const e = await window.R.cargar(); await window.R.reemplazarTodo({ sesiones: [], catalogo: [], rutinas: [], pesajes: [], ajustes: e.ajustes }, e); });
  const e4 = await p.evaluate(async () => JSON.parse(JSON.stringify(await window.R.cargar())));
  ok(e4.sesiones.length === 0, "importar reemplaza");
  const resp = await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => { const g = r.result.transaction("kv").objectStore("kv").get("respaldo-importacion"); g.onsuccess = () => { r.result.close(); ok(g.result); }; }; }));
  ok(resp && resp.sesiones.length === e3.sesiones.length, "y guarda los datos anteriores en «respaldo-importacion»");
  await nav.close();
}
srv.close();
console.log(fallos ? fallos + " fallos" : "todo bien");
process.exit(fallos ? 1 : 0);

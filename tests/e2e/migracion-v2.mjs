// Migración esquema 3 → 4 sobre una base IndexedDB REAL de la versión 2.0 (tests/fixtures/idb-v2.json,
// generada con el código del tag v2.0 por tools/fixture-v2.mjs; y idb-v2-seed.json si existe en local).
// Comprueba: nada se pierde, copia íntegra en backup-esquema-v3, copia interna «migrar», los números
// del análisis no cambian, abrir otra vez no repite nada y una transacción fallida no deja nada a medias.
// Uso: node e2e/migracion-v2.mjs [chromium,webkit]
import { chromium, webkit } from "playwright";
import { readFileSync, existsSync } from "node:fs";
import { servir } from "../serve.mjs";

const PUERTO = 8793;
const motores = (process.argv[2] || "chromium").split(",");
const fx = (f) => new URL("../fixtures/" + f, import.meta.url);
const FIXTURES = ["idb-v2.json", "idb-v2-seed.json"].filter((f) => existsSync(fx(f)));
const HTML = `<!doctype html><meta charset="utf-8"><script type="module">
import * as R from "/src/data/repos.js";
import { analizar } from "/src/core/analisis.js";
import { aPlano } from "/src/core/rehidratar.js";
window.R = R; window.huella = (m) => JSON.stringify(aPlano(analizar(m, "2026-11-16")), (k, v) => v instanceof Map ? [...v] : v instanceof Set ? [...v] : v);
window.listo = true;
</script>`;
let fallos = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fallos++; };

const cargarBase = (dump) => new Promise((ok, ko) => {
  const r = indexedDB.open("gymapp", dump.version);
  r.onupgradeneeded = () => { for (const a of dump.almacenes) r.result.createObjectStore(a, a === "sesiones" ? { keyPath: "id" } : undefined); };
  r.onsuccess = () => { const t = r.result.transaction(dump.almacenes, "readwrite");
    for (const [k, v] of Object.entries(dump.kv)) t.objectStore("kv").put(v, k);
    for (const s of dump.sesiones) t.objectStore("sesiones").put(s);
    t.oncomplete = () => { r.result.close(); ok(); }; t.onerror = () => ko(t.error); };
});
const leerBase = () => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => { const db = r.result;
  const t = db.transaction(["kv", "sesiones"]); const s = t.objectStore("kv"); const out = { version: db.version, almacenes: [...db.objectStoreNames], kv: {} };
  const k = s.getAllKeys(); k.onsuccess = () => { for (const c of k.result) { const g = s.get(c); g.onsuccess = () => { out.kv[c] = g.result; }; } };
  const q = t.objectStore("sesiones").getAll(); q.onsuccess = () => { out.sesiones = q.result; };
  t.oncomplete = () => { db.close(); ok(out); }; }; });
const porId = (l) => JSON.stringify([...l].sort((a, b) => (a.id < b.id ? -1 : 1)));

const srv = await servir(PUERTO);
for (const nombre of motores) for (const f of FIXTURES) {
  const dump = JSON.parse(readFileSync(fx(f), "utf8"));
  const nav = await { chromium, webkit }[nombre].launch();
  const p = await nav.newPage();
  p.on("pageerror", (e) => { console.log("  ✗ error de página: " + e.message); fallos++; });
  await p.route("**/__m.html", (r) => r.fulfill({ contentType: "text/html", body: HTML }));
  await p.goto(`http://127.0.0.1:${PUERTO}/__m.html`);
  await p.waitForFunction(() => window.listo);
  console.log(nombre + " · " + f + " (" + dump.sesiones.length + " sesiones, esquema " + dump.kv.schema + ")");
  ok(dump.version === 2 && dump.kv.schema === 3, "la base de partida es la de la 2.0 (base 2, esquema 3)");
  await p.evaluate(cargarBase, dump);
  const modeloAntes = { sesiones: dump.sesiones, catalogo: dump.kv.catalogo, rutinas: dump.kv.rutinas, pesajes: dump.kv.pesajes, ajustes: dump.kv.ajustes };
  const huellaAntes = await p.evaluate((m) => window.huella(m), modeloAntes);

  // 1) una transacción que falla a mitad no deja nada escrito
  const fallo = await p.evaluate(async () => {
    const orig = IDBObjectStore.prototype.put; let n = 0;
    IDBObjectStore.prototype.put = function (...a) { if (++n === 3) throw new Error("fallo provocado"); return orig.apply(this, a); };
    try { await window.R.migrar3a4(); return "sin error"; } catch (e) { return String(e.message); } finally { IDBObjectStore.prototype.put = orig; }
  });
  const trasFallo = await p.evaluate(leerBase);
  ok(/fallo provocado|cancelada|abort/i.test(fallo) && trasFallo.kv.schema === 3 && !("backup-esquema-v3" in trasFallo.kv) && !("respaldo-auto-1" in trasFallo.kv),
    "si la migración falla a mitad, no queda nada a medias (" + fallo + ")");

  // 2) migración real al abrir
  const e1 = await p.evaluate(async () => JSON.parse(JSON.stringify(await window.R.cargar())));
  const b = await p.evaluate(leerBase);
  ok(e1.informe && e1.informe.tipo === "esquema4", "migra al esquema 4 al abrir");
  ok(b.version === 2 && b.almacenes.join() === "kv,sesiones", "la base sigue en la versión 2 (una pestaña 2.0 la puede abrir)");
  ok(b.kv.schema === 4, "schema = 4");
  ok(porId(b.sesiones) === porId(dump.sesiones), "sesiones idénticas byte a byte (" + b.sesiones.length + ")");
  for (const k of ["catalogo", "rutinas", "pesajes", "borrador", "legacy", "backup-esquema-v2"])
    if (k in dump.kv) ok(JSON.stringify(b.kv[k]) === JSON.stringify(dump.kv[k]), "«" + k + "» intacto");
  const bk = b.kv["backup-esquema-v3"];
  ok(bk && bk.esquema === 3 && porId(bk.datos.sesiones) === porId(dump.sesiones) && JSON.stringify(bk.datos.ajustes) === JSON.stringify(dump.kv.ajustes)
    && JSON.stringify(bk.datos.catalogo) === JSON.stringify(dump.kv.catalogo), "copia íntegra en backup-esquema-v3");
  ok(b.kv["respaldo-auto-1"] && b.kv["respaldo-auto-1"].motivo === "migrar" && b.kv["respaldo-auto-1"].sesiones === dump.sesiones.length, "copia interna «migrar» en la rotación");
  const aj = b.kv.ajustes;
  ok(aj.entreno.barra === 20 && aj.entreno.discos.length === 8 && aj.descarga.caidaPct === 3 && aj.csv.separador === ";", "ajustes nuevos con sus valores por defecto");
  ok(JSON.stringify(Object.assign({}, aj, { entreno: undefined, descarga: undefined, csv: undefined })) ===
     JSON.stringify(Object.assign({}, require_completo(dump.kv.ajustes, aj), { entreno: undefined, descarga: undefined, csv: undefined })), "los ajustes que ya había no cambian");
  ok(Array.isArray(b.kv.medidas) && b.kv.medidas.length === 0, "medidas vacías");
  const huellaDespues = await p.evaluate(() => window.R.cargar().then((e) => window.huella({ sesiones: e.sesiones, catalogo: e.catalogo, rutinas: e.rutinas, pesajes: e.pesajes, ajustes: e.ajustes })));
  ok(huellaAntes === huellaDespues, "el análisis da exactamente los mismos números antes y después");

  // 3) abrir otra vez no repite nada
  const e2 = await p.evaluate(async () => JSON.parse(JSON.stringify(await window.R.cargar())));
  const b2 = await p.evaluate(leerBase);
  ok(!e2.informe && JSON.stringify(b2.kv["backup-esquema-v3"]) === JSON.stringify(bk) && JSON.stringify(b2.kv["respaldo-auto-2"]) === JSON.stringify(b.kv["respaldo-auto-2"]), "segunda apertura: idempotente");
  const r3 = await p.evaluate(() => window.R.migrar3a4());
  const b3 = await p.evaluate(leerBase);
  ok(r3.sesiones === 0 && JSON.stringify(b3.kv) === JSON.stringify(b2.kv), "migrar3a4 sobre una base ya migrada no toca nada");
  await nav.close();
}
// Los ajustes de la 2.0 quedan como estaban: cada clave antigua conserva su valor
function require_completo(viejo, nuevo) { const o = Object.assign({}, nuevo); for (const k of Object.keys(viejo)) if (typeof viejo[k] !== "object" || viejo[k] === null || Array.isArray(viejo[k])) o[k] = viejo[k]; else o[k] = Object.assign({}, nuevo[k], viejo[k]); return o; }
srv.close();
console.log(fallos ? fallos + " fallos" : "todo bien");
process.exit(fallos ? 1 : 0);

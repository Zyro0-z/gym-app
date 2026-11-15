// La app completa arranca sobre una base de la versión 1 (como la del iPhone antes de actualizar):
// migra, conserva la copia íntegra, respeta el tema antiguo y enseña todas las sesiones.
// Usa seed.json si existe (en local) y, si no, el conjunto sintético. Uso: node e2e/arranque-v1.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { servir } from "../serve.mjs";
import { fixture } from "../golden/fixture.mjs";

const SEED = fileURLToPath(new URL("../../seed.json", import.meta.url));
const d = existsSync(SEED) ? JSON.parse(readFileSync(SEED, "utf8")) : fixture();
const viejo = { sessions: d.sessions, templates: d.templates, configs: d.configs, library: d.library || [], settings: d.settings || {}, schema: 2 };
const nav = { chromium, webkit }[process.argv[2] || "chromium"];
const srv = await servir(8771);
const b = await nav.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
let fallos = 0;
const ok = (c, t) => { console.log((c ? "  ✓ " : "  ✗ ") + t); if (!c) fallos++; };

// una página vacía del mismo origen para preparar la base antigua
await p.route("**/__prep.html", (r) => r.fulfill({ contentType: "text/html", body: "<!doctype html><meta charset=utf-8>" }));
await p.goto("http://127.0.0.1:8771/__prep.html");
await p.evaluate((v) => new Promise((res, rej) => {
  const r = indexedDB.open("gymapp", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("kv");
  r.onsuccess = () => { const t = r.result.transaction("kv", "readwrite"); for (const k of Object.keys(v)) t.objectStore("kv").put(v[k], k);
    t.oncomplete = () => { r.result.close(); res(); }; t.onerror = () => rej(t.error); };
}), viejo);
await p.evaluate(() => localStorage.setItem("gym-tema", "oscuro"));

await p.goto("http://127.0.0.1:8771/");
await p.waitForFunction(() => window.__gym);
await p.waitForTimeout(800);
const r = await p.evaluate(async () => {
  const g = window.__gym, e = g.store.estado;
  const kv = await new Promise((res) => { const q = indexedDB.open("gymapp"); q.onsuccess = () => { const t = q.result.transaction("kv").objectStore("kv").getAllKeys(); t.onsuccess = () => { res(t.result); q.result.close(); }; }; });
  return { sesiones: e.sesiones.length, rutinas: e.rutinas.length, tema: document.documentElement.dataset.theme, claves: kv, toast: document.querySelector(".toast")?.textContent || "" };
});
ok(r.sesiones === viejo.sessions.length, `todas las sesiones migradas (${r.sesiones}/${viejo.sessions.length})`);
ok(r.rutinas === viejo.templates.length, `todas las rutinas (${r.rutinas}/${viejo.templates.length})`);
ok(r.claves.includes("legacy") && r.claves.some((k) => String(k).startsWith("backup-esquema-v")), "conserva la copia íntegra (legacy y backup-esquema)");
ok(r.tema === "dark", "respeta el tema elegido en la versión anterior");
ok(/actualizados/.test(r.toast), "avisa de la actualización");
await p.locator(".tabbar [data-tab=historial]").click(); await p.waitForTimeout(500);
const filas = await p.locator(".pestana.activa .lista .celda").count();
ok(filas === viejo.sessions.length, `Historial enseña todas las sesiones (${filas})`);
await p.reload(); await p.waitForFunction(() => window.__gym); await p.waitForTimeout(500);
ok(await p.evaluate(() => window.__gym.store.estado.sesiones.length) === viejo.sessions.length, "al recargar no migra otra vez ni duplica");
const texto = await p.evaluate(() => document.body.innerText);
for (const malo of ["NaN", "undefined", "[object"]) ok(!texto.includes(malo), "sin «" + malo + "»");
ok(!errores.length, "sin errores de consola" + (errores.length ? ": " + errores.join(" | ") : ""));
await b.close(); srv.close();
console.log(fallos ? fallos + " fallos" : "todo bien");
process.exit(fallos ? 1 : 0);

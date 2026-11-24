// Service worker: un despliegue v1 → v2 nunca sirve una mezcla de ficheros de las dos versiones, y
// sin red la app arranca con todos los datos. Uso: node e2e/sw-versiones.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const FICHEROS = JSON.parse(readFileSync(RAIZ + "sw.js", "utf8").match(/const FICHEROS = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]$/, "]"));
const TEXTO = FICHEROS.filter((f) => /\.(js|css|html|webmanifest)$/.test(f));
let ver = "A";
// Cada versión marca TODOS sus ficheros de texto; así se ve de qué versión viene cada uno
const marca = (p, b) => {
  if (p === "/sw.js") return Buffer.from(String(b).replace(/const V = "[^"]*"/, `const V = "gym-prueba-${ver}"`));
  if (/\.(js|css)$/.test(p)) return Buffer.concat([b, Buffer.from(`\n/* version-${ver} */\n`)]);
  if (/\.html$/.test(p)) return Buffer.concat([b, Buffer.from(`\n<!-- version-${ver} -->\n`)]);
  if (/\.webmanifest$/.test(p)) return Buffer.from(String(b).replace('"name": "Gym"', `"name": "Gym", "x-version": "${ver}"`));
  return b;
};
const srv = await servir(8771, { transformar: marca });
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_INTERNET_DISCONNECTED|503/.test(m.text()) && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const URL0 = "http://127.0.0.1:8771/";
const versiones = () => p.evaluate(async (fs) => {
  const out = {};
  for (const f of fs) { const t = await (await fetch(f)).text(); const m = t.match(/version-([AB])|"x-version": "([AB])"/); out[f] = m ? m[1] || m[2] : "?"; }
  return out;
}, TEXTO);
const unaSola = (v, esperada) => { const vals = new Set(Object.values(v)); assert.deepEqual([...vals], [esperada], "mezcla de versiones: " + JSON.stringify(Object.entries(v).filter(([, x]) => x !== esperada).slice(0, 5))); };

paso("versión A instalada y con datos");
await p.goto(URL0);
await p.waitForFunction(() => window.__gym);
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload(); await p.waitForFunction(() => window.__gym && navigator.serviceWorker.controller);
await p.evaluate(async () => {
  const s = window.__gym.store;
  await s.guardarSesion({ id: "2026-11-02-x", rutina: null, fecha: "2026-11-02", inicio: "18:00", fin: "19:00", duracion: 60,
    ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }] }] });
});
unaSola(await versiones(), "A");

paso("se publica B con un entreno en curso: el aviso espera hasta que termina");
await p.evaluate(() => window.__gym.store.guardarBorrador({ ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", series: [] }], inicio: "10:00", fecha: "2026-11-16" }));
ver = "B";
await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await p.waitForTimeout(2500);
assert.equal(await p.locator(".aviso-actualizacion").count(), 0, "sin aviso durante el entreno");
await p.evaluate(() => window.__gym.store.guardarBorrador(null));
await p.locator(".aviso-actualizacion").waitFor({ timeout: 15000 });
paso("mientras no se pulse Recargar, todo sigue siendo A (varias recargas)");
for (let i = 0; i < 3; i++) {
  await p.reload(); await p.waitForFunction(() => window.__gym);
  await p.waitForTimeout(400);
  unaSola(await versiones(), "A");
}
const cacheA = await p.evaluate(async () => {
  const c = await caches.open("gym-prueba-A"), out = [];
  for (const r of await c.keys()) { const t = await (await c.match(r)).text(); if (t.includes("version-B")) out.push(r.url); }
  return out;
});
assert.deepEqual(cacheA, [], "la caché de A no recibe ficheros de B");

paso("Recargar: todo pasa a B a la vez");
await p.locator(".aviso-actualizacion").waitFor({ timeout: 15000 });
await Promise.all([p.waitForEvent("load", { timeout: 15000 }), p.locator(".aviso-actualizacion button").click()]);
await p.waitForFunction(() => window.__gym);
await p.waitForTimeout(500);
unaSola(await versiones(), "B");
assert.deepEqual(await p.evaluate(() => caches.keys()), ["gym-prueba-B"]);

paso("sin red: arranca con los datos; navegación con parámetros; errores limpios y sin cachear");
await ctx.setOffline(true);
await p.goto(URL0 + "?desde=pantalla-de-inicio"); await p.waitForFunction(() => window.__gym);
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 1);
const r = await p.evaluate(async () => { const x = await fetch("no-existe.json"); return { status: x.status, cacheado: !!(await caches.match("no-existe.json")) }; });
assert.equal(r.status, 503);
assert.equal(r.cacheado, false);
await ctx.setOffline(false);

console.log(motor, "errores:", errores.length ? errores : "ninguno");
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);

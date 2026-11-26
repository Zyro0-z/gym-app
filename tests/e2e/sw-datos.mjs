// Copia de seguridad (exportar e importar), funcionamiento sin conexión y aviso de versión nueva.
// Uso: node e2e/sw-datos.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
let version = null;   // si se fija, el servidor sirve sw.js con otra versión de caché
const srv = await servir(8769, { transformar: (p, b) => (p === "/sw.js" && version ? Buffer.from(String(b).replace(/const V = "[^"]+"/, `const V = "${version}"`)) : b) });
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text()) && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 500) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));
const URL0 = "http://127.0.0.1:8769/";

await p.goto(URL0);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  await s.guardarCatalogo([{ id: "pressbanca", nombre: "Press banca", grupo: "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null }]);
  for (const [i, f] of ["2026-11-02", "2026-11-05", "2026-11-09"].entries())
    await s.guardarSesion({ id: f + "-x" + i, rutina: null, fecha: f, inicio: "18:00", fin: "19:00", duracion: 60,
      ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [{ peso: 60 + i * 2.5, reps: 8, tipo: "normal", hecha: true }] }] });
});
assert.equal((await estado()).sesiones.length, 3);

paso("exportar la copia");
await p.evaluate(() => window.__gym.nav.ir("datos", { pestana: "ajustes" })); await espera(700);
const [descarga] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Guardar copia en Archivos" }).click()]);
const copia = readFileSync(await descarga.path(), "utf8");
const json = JSON.parse(copia);
assert.equal(json.sesiones.length, 3, "la copia tiene las tres sesiones");
assert.ok(copia.includes("Press banca"));
await espera(600);
assert.ok((await estado()).ajustes.copia, "se anota la fecha de la copia");

paso("borrar una sesión e importar la copia");
await p.evaluate(async () => { const s = window.__gym.store; await s.borrarSesion(s.estado.sesiones[0].id); });
assert.equal((await estado()).sesiones.length, 2);
const [elector] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Importar copia").click()]);
await elector.setFiles({ name: "copia.json", mimeType: "application/json", buffer: Buffer.from(copia) });
await espera(600);
await p.locator(".alerta button", { hasText: "Reemplazar" }).click(); await espera(900);
assert.equal((await estado()).sesiones.length, 3, "la importación recupera la sesión");

paso("una copia rota no toca los datos");
const [elector2] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Importar copia").click()]);
await elector2.setFiles({ name: "rota.json", mimeType: "application/json", buffer: Buffer.from("{no es json") });
await espera(600);
assert.equal(await p.locator(".alerta", { hasText: "No se pudo importar" }).count(), 1);
await p.locator(".alerta button").first().click(); await espera(400);
assert.equal((await estado()).sesiones.length, 3);

paso("sin conexión: la app arranca desde la caché con los datos");
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload(); await p.waitForFunction(() => window.__gym && navigator.serviceWorker.controller); await espera();
await ctx.setOffline(true);
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
assert.equal((await estado()).sesiones.length, 3);
await p.locator(".tabbar [data-tab=historial]").click(); await espera(600);
assert.ok(await p.locator(".pestana.activa .fila-sesion", { hasText: "Entrenamiento libre" }).count(), "el historial se ve sin conexión");
await ctx.setOffline(false);

paso("versión nueva: con un entreno en curso el aviso espera; al terminarlo sale y la recarga conserva los datos");
await p.evaluate(() => window.__gym.entreno.empezar(null)); await espera(800);
await p.getByLabel("Minimizar").click(); await espera(500);
version = "gym-prueba-" + Date.now();
await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await p.waitForTimeout(2500);
assert.equal(await p.locator(".aviso-actualizacion").count(), 0, "sin aviso mientras se entrena");
assert.ok((await estado()).borrador, "el entrenamiento sigue en curso");
await p.evaluate(() => window.__gym.store.guardarBorrador(null));
await p.locator(".aviso-actualizacion").waitFor({ timeout: 15000 });
assert.match(await p.locator(".aviso-actualizacion").innerText(), /Actualización disponible/);
await Promise.all([p.waitForEvent("load", { timeout: 15000 }), p.locator(".aviso-actualizacion button").click()]);
await p.waitForFunction(() => window.__gym); await espera(800);
const cachés = await p.evaluate(() => caches.keys());
assert.deepEqual(cachés, [version], "solo queda la caché de la versión nueva");
assert.equal((await estado()).sesiones.length, 3);

console.log(motor, "errores:", errores.length ? errores : "ninguno");
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);

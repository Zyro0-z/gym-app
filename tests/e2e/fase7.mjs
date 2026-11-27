// Anillo de Hoy, tarjeta PNG y guardado al ocultarse la página. Uso: node e2e/fase7.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8795;
const srv = await servir(PUERTO);
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 450) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));
const vista = () => p.evaluate(() => window.__gym.nav.pantalla.el.innerText);
const limpio = async () => { const t = await p.evaluate(() => document.body.innerText); for (const m of ["NaN", "undefined", "[object", "Infinity"]) assert.ok(!t.includes(m), "texto con «" + m + "»"); };
const ir = async (ruta, pestana) => { await p.evaluate(([r, t]) => window.__gym.nav.ir(r, { pestana: t }), [ruta, pestana]); await espera(900); };
// FOTOS=<carpeta>: guarda capturas de las pantallas con datos (revisión visual)
const foto = (n) => process.env.FOTOS ? p.screenshot({ path: process.env.FOTOS + "/" + motor + "-" + n + ".png", fullPage: true }) : null;
const activa = () => p.locator(".pantalla:not([hidden])");

await p.clock.install({ time: new Date("2026-11-16T10:00:00") });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
// 10 semanas con RPE en dos franjas
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo) => ({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho"), ej("remo", "Remo", "Espalda")]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 2 }, { ejercicioId: "remo", series: 2 }] }]);
  const dia = (n) => new Date(Date.UTC(2026, 10, 16 - n)).toISOString().slice(0, 10);
  let k = 0;
  for (let w = 10; w >= 1; w--) for (const d of [0, 3]) {
    const f = dia(7 * w - d), m = k++ % 4, kg = 100 + m * 2, rpe = m < 2 ? 8 : 9;
    const serie = (x) => ({ peso: x, reps: 8, tipo: "normal", hecha: true, rpe });
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60,
      ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [serie(kg), serie(kg)] }, { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [serie(kg - 20)] }] });
  }
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(1000);

paso("Hoy: anillo de la semana con el porcentaje en el centro");
await limpio();
assert.ok(await p.locator(".semana-card .centro-anillo").count() >= 1); await foto("hoy");

let est;
paso("Tarjeta para compartir: PNG de 1080×1350");
const png = await p.evaluate(async () => {
  const { dibujarTarjeta } = await import("/src/ui/tarjeta.js"), { datosTarjeta } = await import("/src/core/tarjeta.js");
  const s = window.__gym.store.estado.sesiones[0];
  const blob = await dibujarTarjeta(datosTarjeta(s, ["Press banca"]));
  const img = await createImageBitmap(blob);
  return { tipo: blob.type, tam: blob.size, w: img.width, h: img.height };
});
assert.deepEqual([png.tipo, png.w, png.h], ["image/png", 1080, 1350]); assert.ok(png.tam > 5000);

paso("Entreno: al ocultarse la página (pagehide) se guarda el borrador al instante");
await p.evaluate(async () => { await window.__gym.entreno.empezar("Torso"); }); await espera(900);
const serie = p.locator(".modal-completo .serie").first();
await serie.locator("input").first().fill("101"); await espera(100);
await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
const espejo = await p.evaluate(() => JSON.parse(localStorage.getItem("gym-espejo") || "null"));
assert.ok(espejo && espejo.borrador, "borrador replicado en localStorage");
assert.match(JSON.stringify(espejo.borrador), /101/);

paso("Un borrador descartado no resucita con un pagehide posterior");
await p.evaluate(() => window.__gym.store.guardarBorrador(null));
await p.evaluate(() => window.dispatchEvent(new Event("pagehide"))); await espera(500);
assert.equal((await estado()).borrador, null);
assert.equal(await p.evaluate(() => (JSON.parse(localStorage.getItem("gym-espejo") || "{}")).borrador), null);

assert.deepEqual(errores, [], "errores de consola: " + errores.join(" | "));
await b.close(); srv.close();
console.log("OK fase7", motor);

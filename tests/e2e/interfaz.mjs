// Arreglos de interfaz (Fase 1.5): comparaciones a inicio de semana, botón de volver sin truncar y
// theme-color en vivo. Uso: node e2e/interfaz.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const srv = await servir(8774);
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
// Lunes 16 de noviembre de 2026, 10:00 (hora local del navegador)
await p.clock.install({ time: new Date(2026, 10, 16, 10, 0) });
await p.goto("http://127.0.0.1:8774/");
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  await s.guardarCatalogo([{ id: "pressbanca", nombre: "Press banca", grupo: "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null }]);
  for (const f of ["2026-11-09", "2026-11-11", "2026-11-13"])
    await s.guardarSesion({ id: f + "-x", rutina: null, fecha: f, inicio: "18:00", fin: "19:00", duracion: 60,
      ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }] }] });
  await s.guardarAjustes((a) => { a.objetivos.seriesSemana = [{ grupo: "Pecho", min: 10, max: 20 }]; });
  await s.analisisFresco();
});

paso("lunes sin series: ni «−100 %» ni «Faltan»");
await p.locator(".tabbar [data-tab=progreso]").click(); await p.waitForTimeout(500);
await p.locator(".pestana.activa .segmentado button", { hasText: "Resumen" }).first().click(); await p.waitForTimeout(400);
let t = await p.locator(".pestana.activa .pantalla:not([hidden])").innerText();
assert.ok(!/−100|-100/.test(t), "sin −100 %");
assert.ok(!/Faltan \d/.test(t), "sin déficit a inicio de semana");
assert.ok(!t.includes("Semana en curso"), "sin etiqueta «Semana en curso»");

paso("botón de volver: solo el chevrón, con el nombre completo para lectores");
await p.evaluate(() => window.__gym.nav.ir("ejercicio/pressbanca")); await p.waitForTimeout(600);
const atras = p.locator(".pestana.activa .pantalla:not([hidden]) .btn-atras");
assert.equal((await atras.innerText()).trim(), "", "sin texto truncado");
assert.equal(await atras.getAttribute("aria-label"), "Volver a Progreso");
const caja = await atras.boundingBox();
assert.ok(caja.width >= 44 && caja.height >= 44, "zona táctil de 44 × 44");

paso("theme-color sigue al tema sin recargar");
const color = () => p.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
assert.equal(await color(), "#F2F2F7");
await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(200);
assert.equal(await color(), "#000000", "cambio del sistema con tema automático");
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.apariencia.tema = "claro"; }, { analitico: false })); await p.waitForTimeout(200);
assert.equal(await color(), "#F2F2F7", "tema manual claro");
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.apariencia.tema = "oscuro"; }, { analitico: false })); await p.waitForTimeout(200);
assert.equal(await color(), "#000000", "tema manual oscuro");

console.log(motor, "errores:", errores.length ? errores : "ninguno");
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);

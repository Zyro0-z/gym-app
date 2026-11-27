// Fase 5: exportación CSV de series. Uso: node e2e/fase5.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8778;
const srv = await servir(PUERTO);
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
// FOTOS=<carpeta>: guarda capturas de las pantallas con datos (revisión visual)
const foto = (n) => process.env.FOTOS ? p.screenshot({ path: process.env.FOTOS + "/" + motor + "-" + n + ".png", fullPage: true }) : null;
const espera = (ms = 450) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));
const vista = () => p.evaluate(() => window.__gym.nav.pantalla.el.innerText);
const limpio = async () => { const t = await p.evaluate(() => document.body.innerText); for (const m of ["NaN", "undefined", "[object", "Infinity"]) assert.ok(!t.includes(m), "texto con «" + m + "»"); };
const ir = async (ruta, pestana) => { await p.evaluate(([r, t]) => window.__gym.nav.ir(r, { pestana: t }), [ruta, pestana]); await espera(900); };
const descarga = async (accion) => { const [d] = await Promise.all([p.waitForEvent("download"), accion()]); const s = await d.createReadStream(); let t = ""; for await (const x of s) t += x; return { nombre: d.suggestedFilename(), texto: t }; };

await p.clock.install({ time: new Date("2026-11-16T10:00:00") });
await p.addInitScript(() => { try { Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true }); } catch (e) {} });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
// 10 semanas de press y remo; las 2 últimas con menos carga, más RPE y poco sueño
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo) => ({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho"), ej("remo", "Remo", "Espalda")]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 2 }, { ejercicioId: "remo", series: 2 }] }]);
  const dia = (n) => new Date(Date.UTC(2026, 10, 16 - n)).toISOString().slice(0, 10);
  for (let w = 10; w >= 1; w--) for (const d of [0, 3]) {
    const f = dia(7 * w - d), kg = w <= 2 ? 95 : 100, rpe = w <= 2 ? 9.5 : 8;
    const serie = (k) => ({ peso: k, reps: 8, tipo: "normal", hecha: true, rpe });
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60,
      ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [serie(kg), serie(kg)] }, { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [serie(kg - 20)] }] });
  }
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(1000);

paso("Ajustes › Datos: CSV de series");
await ir("datos", "ajustes");
const csvS = await descarga(() => p.getByText("Exportar series (CSV)").click());
const l = csvS.texto.split("\r\n");
assert.ok(l[0].startsWith("﻿fecha;hora;rutina;ejercicio;grupo;orden;serie;tipo;peso_kg;reps;segundos;rpe;e1rm_kg"));
assert.equal(l.length, 1 + 20 * 3 + 1);
assert.match(l[1], /^2026-09-07;18:00;Torso;Press banca;Pecho;1;1;normal;100;8;;8;126,7;133,3;/);

await b.close(); srv.close();
assert.deepEqual(errores, [], "errores de consola");
console.log(motor + " errores: ninguno");

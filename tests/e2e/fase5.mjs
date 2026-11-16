// Fase 5: recuperación al entrenar, informe de fatiga y propuesta de descarga (Hoy y Progreso),
// comparar periodos, CSV y medidas corporales. Uso: node e2e/fase5.mjs [chromium|webkit]
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
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60, recuperacion: { sueno: w <= 2 ? 6 : 8, estres: 2, energia: 4 },
      ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [serie(kg), serie(kg)] }, { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [serie(kg - 20)] }] });
  }
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(1000);

paso("Hoy propone una descarga y «Ahora no» la pospone");
const tarjeta = p.locator("[aria-label='Propuesta de descarga']");
await tarjeta.waitFor({ timeout: 5000 });
await foto("hoy-descarga");
assert.match(await tarjeta.innerText(), /semana de descarga/);
await tarjeta.getByRole("button", { name: "Ahora no" }).click(); await espera(800);
assert.equal(await tarjeta.count(), 0);
assert.equal((await estado()).ajustes.descarga.pospuestaHasta, "2026-11-23");
await limpio();

paso("Progreso › Fatiga: semanas, motivos y programar la descarga");
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.descarga.pospuestaHasta = null; }));
await ir("fatiga", "progreso");
let t = await vista();
assert.match(t, /El e1RM ha bajado .* en 2 de 2 ejercicios/);
assert.match(t, /El RPE medio ha subido de 8 a 9,5/);
assert.match(t, /Has dormido 6 h de media/);
assert.match(t, /Semana del 09\/11/);
assert.match(t, /RPE 9,5 · 6 h de sueño/);
await limpio(); await foto("fatiga");
await p.locator(".pantalla:not([hidden]) [aria-label='Propuesta de descarga']").getByRole("button", { name: "Programar descarga" }).click(); await espera(900);
const bl = (await estado()).ajustes.bloques;
assert.deepEqual(bl.map((x) => [x.inicio, x.fin, x.tipo]), [["2026-11-16", "2026-11-22", "deload"]]);
assert.match(await vista(), /Estás en una semana de descarga|Sin propuesta/);

paso("Comparar periodos: 4 semanas y mes en curso");
await ir("comparar", "progreso");
t = await vista();
assert.match(t, /19\/10–15\/11 frente a 21\/09–18\/10|frente a/);
assert.match(t, /Sesiones/); assert.match(t, /Mejor e1RM/); await foto("comparar");
await p.locator(".pantalla:not([hidden])").getByRole("radio", { name: "Mes", exact: true }).click(); await espera(500);
assert.match(await vista(), /mismos 16 primeros días del mes anterior/);
await limpio();

paso("Medidas: validación, guardar, cambio y CSV");
await ir("medidas", "progreso");
assert.match(await vista(), /Sin medidas/);
await p.getByRole("button", { name: "Añadir medidas" }).click(); await espera(600);
await p.getByLabel("Cintura en centímetros").fill("5");
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(500);
assert.match(await p.getByRole("alertdialog").innerText(), /Cintura: entre 10 y 300 cm/);
await p.locator("[role=alertdialog] button").first().click(); await espera(400);
await p.getByLabel("Cintura en centímetros").fill("84");
await p.getByLabel("Fecha").fill("2026-11-02");
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(800);
await p.locator(".pantalla:not([hidden]) .btn-barra", { hasText: "Añadir" }).click(); await espera(600);
await p.getByLabel("Cintura en centímetros").fill("82,5");
await p.getByLabel("Brazo en centímetros").fill("37");
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(800);
assert.deepEqual((await estado()).medidas, [{ fecha: "2026-11-02", cintura: 84 }, { fecha: "2026-11-16", cintura: 82.5, brazo: 37 }]);
t = await vista();
assert.match(t, /82,5 cm/); assert.match(t, /−1,5 cm desde el/); await foto("medidas");
await limpio();
const csvM = await descarga(() => p.locator(".pantalla:not([hidden]) .seccion-cab button", { hasText: "Exportar CSV" }).click());
assert.equal(csvM.nombre, "gym-medidas-2026-11-16.csv");
assert.equal(csvM.texto, "﻿fecha;cintura_cm;pecho_cm;brazo_cm;muslo_cm;cadera_cm;cuello_cm\r\n2026-11-02;84;;;;;\r\n2026-11-16;82,5;;37;;;\r\n");

paso("Ajustes › Datos: CSV de series");
await ir("datos", "ajustes");
const csvS = await descarga(() => p.getByText("Exportar series (CSV)").click());
const l = csvS.texto.split("\r\n");
assert.ok(l[0].startsWith("﻿fecha;hora;rutina;ejercicio;grupo;orden;serie;tipo;peso_kg;reps;segundos;rpe;e1rm_kg"));
assert.equal(l.length, 1 + 20 * 3 + 1);
assert.match(l[1], /^2026-09-07;18:00;Torso;Press banca;Pecho;1;1;normal;100;8;;8;126,7;133,3;/);

paso("recuperación al entrenar: se guarda en la sesión y se ve en Historial");
await p.locator(".tabbar [data-tab=hoy]").click(); await espera();
await p.getByRole("button", { name: /Empezar/ }).first().click(); await espera(600);
if (await p.locator(".hoja").count()) { await p.locator(".hoja .celda", { hasText: "Torso" }).click(); await espera(800); }
await p.getByText("Cómo llegas hoy").click(); await espera(600);
assert.equal(await p.locator(".hoja .segmentado [aria-checked=true]").count(), 0, "sin valor no hay opción marcada");
await p.getByRole("button", { name: "Más horas de sueño" }).click(); await espera(200);
await p.getByRole("radiogroup", { name: "Estrés de 1 a 5" }).getByRole("radio", { name: "3" }).click();
await p.getByRole("radiogroup", { name: "Energía de 1 a 5" }).getByRole("radio", { name: "4" }).click();
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(600);
assert.deepEqual((await estado()).borrador.recuperacion, { sueno: 7.5, estres: 3, energia: 4 });
assert.match(await p.locator(".modal-completo").innerText(), /7,5 h de sueño · estrés 3 · energía 4/);
await p.getByLabel("Peso de la serie 1").first().fill("90"); await p.getByLabel("Repeticiones de la serie 1").first().fill("8");
await p.locator(".modal-completo .serie .check").first().click(); await espera(400);
await p.getByRole("button", { name: "Terminar" }).click(); await espera(700);
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(1200);
const ses = (await estado()).sesiones.find((x) => x.fecha === "2026-11-16");
assert.deepEqual(ses.recuperacion, { sueno: 7.5, estres: 3, energia: 4 });
if (await p.locator(".hoja").count()) { await p.locator(".hoja .btn-barra").first().click(); await espera(500); }
await ir("sesion/" + encodeURIComponent(ses.id), "historial");
assert.match(await vista(), /7,5 h de sueño · estrés 3 · energía 4/);
await limpio();

paso("la copia lleva las medidas");
const copia = await p.evaluate(() => JSON.parse(window.__gym.store.textoCopia()));
assert.equal(copia.version, 3); assert.equal(copia.medidas.length, 2);

await b.close(); srv.close();
assert.deepEqual(errores, [], "errores de consola");
console.log(motor + " errores: ninguno");

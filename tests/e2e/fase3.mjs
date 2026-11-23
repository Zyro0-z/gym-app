// Fase 3 en la pantalla de entrenamiento: RPE por serie (y objetivo de la rutina), sugerencia de
// carga, «Repetir última», superseries con el descanso al acabar la ronda, calculadora de discos y
// nota de la sesión; y cómo se ven después en Historial y en el ejercicio.
// Uso: node e2e/fase3.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8776;
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
const textoMalo = async () => { const t = await p.evaluate(() => document.body.innerText); for (const m of ["NaN", "undefined", "[object"]) assert.ok(!t.includes(m), "texto con «" + m + "»"); };
const descansoVisible = () => p.locator(".barra-descanso:not([hidden])").count();
const saltarDescanso = async () => { if (await descansoVisible()) { await p.locator(".barra-descanso button", { hasText: "Saltar" }).click(); await espera(300); } };

await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo, material) => ({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: material, incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho", "barra"), ej("remoconbarra", "Remo con barra", "Espalda", "barra")]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 2, rpe: 8 }, { ejercicioId: "remoconbarra", series: 2 }] }]);
  for (const [f, kg] of [["2026-11-09", 80], ["2026-11-12", 80]])
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60, ejercicios: [
      { ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [{ peso: kg, reps: 10, tipo: "normal", hecha: true }, { peso: kg, reps: 10, tipo: "normal", hecha: true }] },
      { ejercicioId: "remoconbarra", nombre: "Remo con barra", tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }] }] });
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);

paso("empezar Torso desde Hoy");
await p.getByRole("button", { name: /Empezar/ }).first().click(); await espera(600);
if (await p.locator(".hoja").count()) { await p.locator(".hoja .celda", { hasText: "Torso" }).click(); await espera(800); }
assert.equal(await p.locator(".modal-completo").count(), 1);
const press = p.locator(".modal-completo .ej").nth(0), remo = p.locator(".modal-completo .ej").nth(1);

paso("RPE objetivo de la rutina visible en cada serie");
const rpe1 = press.locator(".rpe-serie").first();
assert.equal((await rpe1.textContent()).trim(), "@8");
assert.match(await rpe1.getAttribute("aria-label"), /sin anotar, objetivo 8/);

paso("sugerencia de carga: tope del rango → sube con el incremento de barra");
const sug = press.locator(".chip-sugerencia");
await sug.waitFor({ timeout: 4000 });
assert.match(await sug.innerText(), /82,5 kg × 6/);
await sug.click(); await espera();
assert.equal(await press.getByLabel("Peso de la serie 1").inputValue(), "82,5");
assert.equal(await press.getByLabel("Peso de la serie 2").inputValue(), "82,5");

paso("anotar el RPE de una serie con los chips");
await rpe1.click(); await espera(300);
assert.equal(await press.locator(".tira-rpe:not([hidden]) .chip-rpe").count(), 7, "la tira de RPE se despliega en línea");
await press.locator(".tira-rpe:not([hidden]) .chip-rpe", { hasText: "8,5" }).click(); await espera(300);
assert.equal((await press.locator(".rpe-serie").first().textContent()).trim(), "8,5");
assert.equal(await press.locator(".tira-rpe:not([hidden])").count(), 0, "la tira se cierra al elegir");

paso("«Repetir última» copia peso, reps y RPE en la siguiente serie");
await press.getByLabel("Repeticiones de la serie 1").fill("7");
await press.locator(".serie .check").first().click(); await espera();
assert.equal(await descansoVisible(), 1, "sin superserie el descanso empieza al marcar");
await saltarDescanso();
await press.getByRole("button", { name: "Repetir última" }).click(); await espera();
let e = await estado();
assert.deepEqual(e.borrador.ejercicios[0].series[1], { peso: "82,5", reps: "7", tipo: "normal", hecha: false, rpe: 8.5 });

paso("superserie: unir press y remo; el descanso espera al final de la ronda");
await press.getByRole("button", { name: /Opciones de Press banca/ }).click(); await espera(500);
await p.getByRole("button", { name: "Unir con el siguiente" }).click(); await espera(500);
assert.equal(await p.locator(".modal-completo .ej.superserie").count(), 2);
assert.equal(await p.locator(".modal-completo .ss-etiqueta").count(), 1);
await press.locator(".serie .check").nth(1).click(); await espera();
assert.equal(await descansoVisible(), 0, "dentro de la ronda no hay descanso");
await remo.getByLabel("Peso de la serie 1").fill("62,5");
await remo.getByLabel("Repeticiones de la serie 1").fill("8");
await remo.locator(".serie .check").first().click(); await espera();
assert.equal(await descansoVisible(), 1, "al acabar la ronda empieza el descanso");
await saltarDescanso();

paso("calculadora de discos");
await press.getByRole("button", { name: /Opciones de Press banca/ }).click(); await espera(500);
await p.getByRole("button", { name: "Calculadora de discos" }).click(); await espera(600);
await p.getByLabel("Peso total en kg").fill("100"); await espera(200);
const hoja = await p.locator(".hoja").innerText();
assert.match(hoja, /25 kg\s*× 1/); assert.match(hoja, /15 kg\s*× 1/);
await p.getByLabel("Peso total en kg").fill("100,4"); await espera(200);
assert.match(await p.locator(".hoja").innerText(), /llegas a 100 kg; faltan 0,4 kg/);
await p.getByLabel("Peso total en kg").fill("10"); await espera(200);
assert.match(await p.locator(".hoja").innerText(), /menor que la barra/);
await textoMalo();
await p.locator(".hoja .btn-barra", { hasText: "Cerrar" }).click(); await espera(500);

paso("terminar con nota de la sesión");
await p.getByRole("button", { name: "Terminar" }).click(); await espera(700);
await p.getByLabel("Nota de la sesión").fill("Buen día; hombro bien");
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(1200);
e = await estado();
const ses = e.sesiones.find((s) => s.fecha === e.sesiones.map((x) => x.fecha).sort().pop() && !s.id.endsWith("-x"));
assert.ok(ses, "sesión guardada");
assert.equal(ses.nota, "Buen día; hombro bien");
assert.deepEqual(ses.ejercicios[0].series.map((s) => [s.peso, s.reps, s.rpe]), [[82.5, 7, 8.5], [82.5, 7, 8.5]]);
assert.ok(ses.ejercicios[0].grupoId && ses.ejercicios[0].grupoId === ses.ejercicios[1].grupoId, "superserie guardada");
assert.equal(ses.ejercicios[1].series[0].rpe, undefined, "sin RPE no se guarda el campo");
for (const k of ["peso", "reps"]) assert.equal(typeof ses.ejercicios[0].series[0][k], "number");
if (await p.locator(".hoja").count()) { await p.locator(".hoja .btn-barra").first().click(); await espera(500); }

paso("Historial: RPE, superserie y nota");
await p.evaluate((id) => window.__gym.nav.ir("sesion/" + encodeURIComponent(id), { pestana: "historial" }), ses.id); await espera(900);
const vista = () => p.evaluate(() => window.__gym.nav.pantalla.el.innerText);
let txt = await vista();
assert.match(txt, /82,5 kg × 7 @8,5/); assert.match(txt, /superserie 1\/2/i); assert.match(txt, /Buen día; hombro bien/);
await textoMalo();

paso("ejercicio: e1RM ajustado por RPE");
await p.evaluate(() => window.__gym.nav.ir("ejercicio/pressbanca", { pestana: "progreso" })); await espera(1200);
txt = await vista();
assert.match(txt, /Ajustado por RPE/);
await textoMalo();

paso("la copia exportada es la versión 3 (esquema 4) y conserva RPE, superserie y nota");
const copia = await p.evaluate(async () => { const m = await import("/src/data/modelo.js"); const c = m.crearCopia(window.__gym.store.estado); const r = m.leerCopia(JSON.stringify(c)); return { version: c.version, esquema: c.esquema, ses: r.sesiones }; });
assert.equal(copia.version, 3); assert.equal(copia.esquema, 4);
const sc = copia.ses.find((s) => s.id === ses.id);
assert.equal(sc.nota, ses.nota); assert.equal(sc.ejercicios[0].series[0].rpe, 8.5);

await b.close(); srv.close();
assert.deepEqual(errores, [], "errores de consola");
console.log(motor + " errores: ninguno");

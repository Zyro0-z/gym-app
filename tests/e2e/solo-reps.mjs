// Ejercicios de solo repeticiones: sin campo de peso en la sala, se guardan con tipo «reps» y repiten sin peso.
// Uso: node e2e/solo-reps.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8794;
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

await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo, tipoAncla) => ({ id, nombre, grupo, unilateral: false, tipoAncla, tipoMaterial: null, incremento: null, rangoReps: null, top: false, estandar: null });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho", "peso"), ej("flexiones", "Flexiones", "Pecho", "reps")]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 1 }, { ejercicioId: "flexiones", series: 2 }] }]);
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);

paso("empezar Torso");
await p.getByRole("button", { name: /Empezar/ }).first().click(); await espera(600);
if (await p.locator(".hoja").count()) { await p.locator(".hoja .celda", { hasText: "Torso" }).click(); await espera(800); }
const press = p.locator(".modal-completo .ej").nth(0), flex = p.locator(".modal-completo .ej").nth(1);
assert.equal(await press.getByLabel("Peso de la serie 1").count(), 1, "con peso: campo de peso");
assert.equal(await flex.getByLabel("Peso de la serie 1").count(), 0, "solo repeticiones: sin campo de peso");
assert.ok(!(await flex.locator(".fila-cab").innerText()).includes("kg"), "ni cabecera de kg");
assert.equal((await estado()).borrador.ejercicios[1].tipo, "reps");

paso("marcar series sin peso");
await flex.getByLabel("Repeticiones de la serie 1").fill("15");
await flex.locator(".serie .check").first().click(); await espera(300);
assert.equal(await flex.locator(".serie.hecha").count(), 1, "se marca sin pedir peso");

paso("añadir un ejercicio de solo repeticiones a mitad de sesión");
await p.evaluate(async () => { const s = window.__gym.store; await s.guardarCatalogo([...s.estado.catalogo, { id: "fondosbanco", nombre: "Fondos en banco", grupo: "Tríceps", unilateral: false, tipoAncla: "reps", tipoMaterial: null, incremento: null, rangoReps: null, top: false, estandar: null }]); });
await p.getByRole("button", { name: /Añadir ejercicio/ }).click(); await espera(600);
await p.locator(".hoja .celda", { hasText: "Fondos en banco" }).first().click(); await espera(700);
assert.equal((await estado()).borrador.ejercicios[2].tipo, "reps");
assert.equal(await p.locator(".modal-completo .ej").nth(2).getByLabel("Peso de la serie 1").count(), 0);

assert.deepEqual(errores, [], "errores de consola: " + errores.join(" | "));
console.log(motor, "errores: ninguno");
await b.close(); srv.close();

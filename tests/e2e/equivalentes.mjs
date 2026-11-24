// Cambiar ejercicio en sala (equivalentes por músculo, tipo del catálogo) y descanso propio por ejercicio.
// Uso: node e2e/equivalentes.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8797;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
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
  const ej = (id, nombre, grupo, p, extra = {}) => Object.assign({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: null, top: false, estandar: null, musculos: { p, s: [] } }, extra);
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho", ["pecho-esternal"], { descanso: 45 }), ej("pressmaquina", "Press en máquina", "Pecho", ["pecho-esternal"], { tipoMaterial: "maquina" }),
    ej("flexiones", "Flexiones", "Pecho", ["pecho-esternal"], { tipoAncla: "reps", tipoMaterial: null }), ej("remo", "Remo con barra", "Espalda", ["dorsal"])]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 3 }] }]);
  await s.guardarAjustes((a) => { a.entreno.descanso = 90; });
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
await p.evaluate(() => window.__gym.entreno.empezar("Torso")); await espera(900);
const press = p.locator(".modal-completo .ej").nth(0);

paso("el descanso propio del ejercicio sustituye al de Ajustes");
await press.getByLabel("Peso de la serie 1").fill("60"); await press.getByLabel("Repeticiones de la serie 1").fill("8");
await press.locator(".serie .check").first().click(); await espera(500);
let e = await estado();
assert.equal(e.borrador.descanso.total, 45, "descanso de 45 s del ejercicio");

paso("Cambiar ejercicio ofrece los del mismo músculo principal, no los de otro");
await press.getByRole("button", { name: /Opciones de Press banca/ }).click(); await espera(500);
await p.getByRole("button", { name: /Cambiar ejercicio/ }).click(); await espera(700);
const hoja = await p.locator(".hoja").last().innerText();
assert.match(hoja, /Mismo músculo principal/);
assert.match(hoja, /Press en máquina/); assert.match(hoja, /Flexiones/);
const cab = hoja.split("Mismo músculo principal")[1].split(/\n(?=Pecho|Espalda)/)[0];
assert.ok(!/Remo con barra/.test(cab), "el remo no es del mismo músculo");

paso("elegir uno de solo repeticiones deja el ejercicio con el tipo del catálogo");
await p.locator(".hoja .celda", { hasText: "Flexiones" }).first().click(); await espera(600);
e = await estado();
assert.equal(e.borrador.ejercicios[0].ejercicioId, "flexiones");
assert.equal(e.borrador.ejercicios[0].tipo, "reps");

paso("y de vuelta a uno de peso se quita el tipo «reps»");
await p.locator(".modal-completo .ej").nth(0).getByRole("button", { name: /Opciones de Flexiones/ }).click(); await espera(500);
await p.getByRole("button", { name: /Cambiar ejercicio/ }).click(); await espera(700);
await p.locator(".hoja .celda", { hasText: "Press en máquina" }).first().click(); await espera(600);
e = await estado();
assert.equal(e.borrador.ejercicios[0].ejercicioId, "pressmaquina");
assert.ok(!e.borrador.ejercicios[0].tipo, "sin tipo «reps»");

assert.deepEqual(errores, [], "errores de consola: " + errores.join(" | "));
console.log(motor, "errores: ninguno");
await b.close(); srv.close();

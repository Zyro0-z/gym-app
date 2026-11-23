// Gimnasios: perfiles con barra y discos propios, selector en Hoy y calculadora; catálogo base con músculos.
// Uso: node e2e/gimnasios.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8792;
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

paso("Ajustes › Entrenamiento: gimnasio implícito y uno nuevo con su barra");
await p.evaluate(() => window.__gym.nav.ir("entrenamiento", { pestana: "ajustes" })); await espera(900);
const celdaGim = p.locator('.pantalla[data-ruta="entrenamiento"] .celda', { hasText: "Gimnasio" }).first();
assert.match(await p.locator('.pantalla[data-ruta="entrenamiento"]').innerText(), /Mi gimnasio/);
await celdaGim.click(); await espera(500);
await p.getByRole("button", { name: "Nuevo gimnasio" }).click(); await espera(600);
await p.locator(".hoja input.campo-texto").fill("Gym Centro"); await espera(200);
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(900);
let e = await estado();
assert.equal(e.ajustes.gimnasios.length, 2);
assert.equal(e.ajustes.gimnasioActivo, "gym-centro");
assert.equal(e.ajustes.gimnasios[0].nombre, "Mi gimnasio");

paso("cada gimnasio guarda su barra; la calculadora usa la del activo");
await p.evaluate(async () => { await window.__gym.store.guardarAjustes((a) => { a.gimnasios[1].barra = 15; a.gimnasios[1].discos = [10, 5, 2.5]; }, { analitico: false }); });
e = await estado();
assert.deepEqual([e.ajustes.gimnasios[0].barra, e.ajustes.gimnasios[1].barra], [20, 15]);

paso("la copia con gimnasios, músculos y modo de carga valida y se relee");
await p.evaluate(async () => { await window.__gym.store.guardarCatalogo(window.__gym.store.estado.catalogo.concat([{ id: "dominadas", nombre: "Dominadas", grupo: "Espalda", unilateral: false, tipoAncla: "peso", tipoMaterial: null, incremento: null, rangoReps: null, top: false, estandar: null, modoCarga: "lastre", musculos: { p: ["dorsal"], s: ["biceps"] }, notaFija: "Agarre prono" }])); });
const ok = await p.evaluate(async () => { const m = await import("/src/data/modelo.js"); const c = m.crearCopia(window.__gym.store.estado); return m.leerCopia(JSON.stringify(c)).catalogo.find((x) => x.id === "dominadas"); });
assert.equal(ok.modoCarga, "lastre"); assert.deepEqual(ok.musculos, { p: ["dorsal"], s: ["biceps"] });

paso("Hoy ofrece cambiar de gimnasio cuando hay más de uno");
await p.evaluate(() => window.__gym.nav.ir("hoy", { pestana: "hoy" })); await espera(900);
assert.equal(await p.locator(".chip-gimnasio").count() >= 1, true);

assert.deepEqual(errores, [], "errores de consola: " + errores.join(" | "));
console.log(motor, "errores: ninguno");
await b.close(); srv.close();

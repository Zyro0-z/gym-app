// Motor: volumen por músculo, récords por rango y en vivo, back-offs, fiabilidad del e1RM y fatiga dentro de la sesión.
// Uso: node e2e/motor.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8793;
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
  const s = window.__gym.store, hoy = s.hoy();
  const dia = (n) => { const d = new Date(hoy + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
  await s.guardarCatalogo([{ id: "pressbanca", nombre: "Press banca", grupo: "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 4, max: 8 }, top: false, estandar: null,
    musculos: { p: ["pecho-esternal"], s: ["triceps-lateral-medial", "deltoide-anterior"] } },
    { id: "remoconbarra", nombre: "Remo con barra", grupo: "Espalda", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: null, top: false, estandar: null }]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 3, rpe: 8 }] }]);
  const pesos = [100, 102.5, 100, 105, 102.5, 100];
  for (let i = 0; i < pesos.length; i++) {
    const f = dia(2 + i * 3), kg = pesos[i];
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60, ejercicios: [
      { ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [{ peso: kg, reps: 5, tipo: "normal", hecha: true, rpe: 8 }, { peso: kg, reps: 5, tipo: "normal", hecha: true, rpe: 8.5 }, { peso: kg - 5, reps: 6, tipo: "normal", hecha: true }] },
      { ejercicioId: "remoconbarra", nombre: "Remo con barra", tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }] }] });
  }
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);

paso("Series por músculo: principales cuentan 1, secundarios 0,5 y el ejercicio sin músculos se avisa");
await p.evaluate(() => window.__gym.nav.ir("musculos", { pestana: "progreso" })); await espera(1000);
const vm = p.locator('.pantalla[data-ruta="musculos"]');
const txt = await vm.innerText();
assert.match(txt, /Pectoral esternal/); assert.match(txt, /Tríceps \(lateral y medial\)/);
assert.match(txt, /Remo con barra/, "sin músculos asignados");
const A = await p.evaluate(() => { const V = window.__gym.store.analisis().volumenMusculos(); return V.filas.map((f) => [f.id, f.actual, f.previa]); });
const pe = A.find((x) => x[0] === "pecho-esternal"), tr = A.find((x) => x[0] === "triceps-lateral-medial");
assert.equal(tr[1] + tr[2], (pe[1] + pe[2]) / 2, "el secundario cuenta la mitad");

paso("cambiar el peso del secundario recalcula");
await p.evaluate(async () => { await window.__gym.store.guardarAjustes((a) => { a.analisis = { fraccionSecundaria: 1 }; }); });
await espera(900);
const B = await p.evaluate(() => window.__gym.store.analisis().volumenMusculos().filas.find((f) => f.id === "triceps-lateral-medial").porSemana.reduce((a, b) => a + b, 0));
assert.equal(B, A.find((x) => x[0] === "pecho-esternal").slice(1).reduce((a, b) => a + b, 0) + (await p.evaluate(() => window.__gym.store.analisis().volumenMusculos().filas.find((f) => f.id === "pecho-esternal").porSemana.slice(0, -2).reduce((a, b) => a + b, 0))));
await p.evaluate(async () => { await window.__gym.store.guardarAjustes((a) => { a.analisis = { fraccionSecundaria: 0.5 }; }); }); await espera(600);

paso("ficha del ejercicio: fiabilidad, ruido personal y récords por repeticiones");
await p.evaluate(() => window.__gym.nav.ir("ejercicio/pressbanca", { pestana: "progreso" })); await espera(1000);
const fx = await p.locator('.pantalla[data-ruta^="ejercicio"]').innerText();
assert.match(fx, /Fiabilidad de la última estimación/); assert.match(fx, /ruido personal/);
assert.match(fx, /Récords por repeticiones/); assert.match(fx, /4–5 reps/);

paso("sala: back-offs y récord en vivo");
await p.evaluate(() => window.__gym.nav.ir("hoy", { pestana: "hoy" })); await espera(600);
await p.evaluate(() => window.__gym.entreno.empezar("Torso")); await espera(900);
const press = p.locator(".modal-completo .ej").nth(0);
assert.match(await press.locator(".ej-info").innerText(), /e1RM \d+ kg/);
await press.getByLabel("Peso de la serie 1").fill("107,5"); await press.getByLabel("Repeticiones de la serie 1").fill("5");
await press.locator(".serie .check").first().click(); await espera(500);
assert.match(await p.locator(".toast").innerText(), /Récord/);
await press.locator(".tira-rpe:not([hidden]) .chip-rpe", { hasText: /^9$/ }).click(); await espera(300);
await press.getByRole("button", { name: /Opciones de Press banca/ }).click(); await espera(500);
await p.getByRole("button", { name: /Añadir back-offs/ }).click(); await espera(600);
let e = await estado();
const sb = e.borrador.ejercicios[0].series;
assert.equal(sb.length, 3);
assert.ok(parseFloat(sb[1].peso.replace(",", ".")) < 107.5 && parseFloat(sb[1].peso.replace(",", ".")) > 90, "back-off algo por debajo de la serie top: " + sb[1].peso);
assert.equal(sb[1].reps, "5");

paso("al terminar, la fatiga dentro de la sesión sale en el resumen");
await press.locator(".serie .check").nth(1).click(); await espera(300);
await press.locator(".tira-rpe:not([hidden]) .chip-rpe", { hasText: /^9$/ }).click(); await espera(300);
await press.locator(".serie .check").nth(2).click(); await espera(300);
await press.locator(".tira-rpe:not([hidden]) .chip-rpe", { hasText: /^9$/ }).click(); await espera(300);
await p.getByRole("button", { name: "Terminar" }).click(); await espera(700);
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(2800);
assert.match(await p.locator(".hoja").innerText(), /Fatiga dentro de la sesión/);

assert.deepEqual(errores, [], "errores de consola: " + errores.join(" | "));
console.log(motor, "errores: ninguno");
await b.close(); srv.close();

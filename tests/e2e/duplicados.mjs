// Unir ejercicios duplicados del catálogo base conservando el historial, y borrar un ejercicio con historial.
// Uso: node e2e/duplicados.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8799;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 500) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));

await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, extra = {}) => Object.assign({ id, nombre, grupo: "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: null, incremento: null, rangoReps: null, top: false, estandar: null }, extra);
  const f = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const ses = (n, ejs) => ({ id: f + "-t-" + n, rutina: "Push", fecha: f, inicio: "10:00", fin: "11:00", duracion: 60,
    ejercicios: ejs.map(([id, nombre]) => ({ ejercicioId: id, nombre, tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }] })) });
  const cat = [ej("pressbanca", "Press banca"), ej("pressbanca(barra)", "Press Banca (Barra)", { rangoReps: { min: 4, max: 4 }, top: true }), ej("raro", "Ejercicio raro")];
  await s.importar({ sesiones: [ses(1, [["pressbanca(barra)", "Press Banca (Barra)"], ["raro", "Ejercicio raro"]]), ses(2, [["raro", "Ejercicio raro"]])], catalogo: cat,
    rutinas: [{ id: "push", nombre: "Push", ejercicios: [{ ejercicioId: "pressbanca(barra)", series: 3 }, { ejercicioId: "raro", series: 3 }] }], pesajes: [], medidas: [], molestias: [], ajustes: s.estado.ajustes }, "borrar");
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
await p.evaluate(() => window.__gym.nav.ir("ejercicios")); await espera(700);

paso("unir duplicados conserva el nombre del catálogo base, el historial y el rango");
await p.getByText("Unir ejercicios duplicados").click(); await espera(500);
await p.getByRole("button", { name: "Unir", exact: true }).click(); await espera(900);
let e = await estado();
assert.deepEqual(e.catalogo.map((c) => c.id).sort(), ["pressbanca", "raro"]);
const pb = e.catalogo.find((c) => c.id === "pressbanca");
assert.deepEqual(pb.rangoReps, { min: 4, max: 4 }); assert.equal(pb.top, true);
assert.equal(e.sesiones.find((s) => s.id.endsWith("-1")).ejercicios[0].ejercicioId, "pressbanca");
assert.equal(e.rutinas[0].ejercicios[0].ejercicioId, "pressbanca");
assert.doesNotMatch(await p.locator("#app").innerText(), /Unir ejercicios duplicados/);

paso("un ejercicio con historial se puede borrar con su historial");
await p.evaluate(() => window.__gym.store.guardarBorrador({ ejercicios: [{ ejercicioId: "raro", nombre: "raro", series: [] }] }));
await p.evaluate(() => window.__gym.nav.ir("ejercicioCat/raro")); await espera(700);
await p.getByText("Borrar ejercicio y su historial").click(); await espera(500);
await p.getByRole("button", { name: "Borrar con su historial" }).click(); await espera(900);
e = await estado();
assert.deepEqual(e.catalogo.map((c) => c.id), ["pressbanca"]);
assert.equal(e.sesiones.length, 1, "la sesión que se quedó sin ejercicios se borra");
assert.deepEqual(e.sesiones[0].ejercicios.map((x) => x.ejercicioId), ["pressbanca"]);
assert.deepEqual(e.rutinas[0].ejercicios.map((x) => x.ejercicioId), ["pressbanca"]);
assert.equal(e.borrador, null, "el entreno en curso se queda sin el ejercicio y vacío desaparece");

assert.deepEqual(errores, [], "sin errores en consola");
console.log("OK duplicados (" + motor + ")");
await b.close(); srv.close && srv.close();

// Sala: RPE en línea al marcar, ejercicio terminado plegado, deshacer al borrar una serie, barra del teclado y nota fija.
// Uso: node e2e/sala.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8791;
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

paso("empezar Torso");
await p.getByRole("button", { name: /Empezar/ }).first().click(); await espera(600);
if (await p.locator(".hoja").count()) { await p.locator(".hoja .celda", { hasText: "Torso" }).click(); await espera(800); }
const press = p.locator(".modal-completo .ej").nth(0), remo = p.locator(".modal-completo .ej").nth(1);

paso("al marcar una serie se despliega el RPE en línea y se anota con un toque");
await press.getByLabel("Repeticiones de la serie 1").fill("8");
await press.getByLabel("Peso de la serie 1").fill("80");
await press.locator(".serie .check").first().click(); await espera(300);
assert.equal(await press.locator(".tira-rpe:not([hidden]) .chip-rpe").count(), 7);
await press.locator(".tira-rpe:not([hidden]) .chip-rpe", { hasText: /^9$/ }).click(); await espera(300);
let e = await estado();
assert.equal(e.borrador.ejercicios[0].series[0].rpe, 9);
assert.equal(await press.locator(".tira-rpe:not([hidden])").count(), 0);

paso("ejercicio terminado: se pliega con su resumen y se despliega al tocarlo");
await press.getByLabel("Repeticiones de la serie 2").fill("8");
await press.getByLabel("Peso de la serie 2").fill("80");
await press.locator(".serie .check").nth(1).click(); await espera(300);
assert.equal(await press.locator(".plegado").count(), 0, "mientras la tira está abierta no se pliega");
await press.locator(".tira-rpe:not([hidden]) .chip-rpe", { hasText: /^8$/ }).click(); await espera(400);
assert.equal(await p.locator(".modal-completo .ej.plegado").count(), 1);
assert.match(await press.locator(".ej-resumen").innerText(), /2 series · 80 × 8/);
await press.locator(".ej-resumen").click(); await espera(300);
assert.equal(await p.locator(".modal-completo .ej.plegado").count(), 0);

paso("borrar una serie permite deshacer");
await p.evaluate(() => document.querySelector(".modal-completo .ej .celda-desliza .borrar button").click()); await espera(300);
assert.equal((await estado()).borrador.ejercicios[0].series.length, 1);
await p.locator(".toast-accion", { hasText: "Deshacer" }).click(); await espera(300);
e = await estado();
assert.equal(e.borrador.ejercicios[0].series.length, 2);
assert.equal(e.borrador.ejercicios[0].series[0].rpe, 9, "la serie vuelve con sus datos");

paso("barra del teclado: sumar con el incremento, Discos y Hecha");
await remo.getByLabel("Peso de la serie 1").focus(); await espera(300);
const barra = p.locator(".barra-teclado:not([hidden])");
assert.equal(await barra.count(), 1);
assert.equal(await barra.getByRole("button", { name: "Calculadora de discos" }).isVisible(), true);
await barra.getByRole("button", { name: "Sumar" }).click(); await espera(200);
assert.equal(await remo.getByLabel("Peso de la serie 1").inputValue(), "62,5");
await barra.getByRole("button", { name: "Marcar la serie como hecha" }).click(); await espera(400);
e = await estado();
assert.equal(e.borrador.ejercicios[1].series[0].hecha, true);
assert.equal(e.borrador.ejercicios[1].series[0].peso, "62,5");

paso("nota fija del ejercicio: se guarda en el catálogo y sale en la sesión");
await press.getByRole("button", { name: /Opciones de Press banca/ }).click(); await espera(500);
await p.getByRole("button", { name: "Nota fija del ejercicio" }).click(); await espera(600);
await p.locator(".hoja textarea").fill("Banco en el 3; escápulas atrás");
await p.locator(".hoja").getByRole("button", { name: "Guardar" }).click(); await espera(600);
assert.match(await press.locator(".ej-nota.fija").innerText(), /Banco en el 3/);
assert.equal((await estado()).catalogo.find((c) => c.id === "pressbanca").notaFija, "Banco en el 3; escápulas atrás");

paso("generar calentamiento: series de aproximación montables con los discos configurados");
await press.getByRole("button", { name: /Opciones de Press banca/ }).click(); await espera(500);
await p.getByRole("button", { name: "Generar calentamiento" }).click(); await espera(500);
e = await estado();
const sp = e.borrador.ejercicios[0].series;
assert.equal(sp[0].tipo, "calentamiento"); assert.equal(sp[0].peso, "20");
assert.ok(sp.filter((x) => x.tipo === "calentamiento").length >= 3);
assert.equal(sp.filter((x) => x.tipo !== "calentamiento").length, 2);

paso("terminar: la sesión se guarda y la rutina se puede actualizar con los cambios");
await p.getByRole("button", { name: "Terminar" }).click(); await espera(700);
assert.match(await p.locator(".hoja").innerText(), /Remo con barra: 2 → 1 series/);
await p.getByLabel("Actualizar la rutina con estos cambios").click(); await espera(300);
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(1200);
e = await estado();
assert.ok(e.sesiones.some((x) => x.fecha === e.sesiones.map((y) => y.fecha).sort().pop() && x.rutina === "Torso" && x.id.includes("-")), "la sesión terminada está guardada");
assert.ok(e.sesiones.every((x) => x.gimnasio === undefined), "las sesiones ya no llevan gimnasio");
assert.equal(e.rutinas[0].ejercicios.find((x) => x.ejercicioId === "remoconbarra").series, 1);
assert.equal(e.rutinas[0].ejercicios.find((x) => x.ejercicioId === "pressbanca").rpe, 8, "conserva el RPE objetivo");

assert.deepEqual(errores, [], "errores de consola: " + errores.join(" | "));
console.log(motor, "errores: ninguno");
await b.close(); srv.close();

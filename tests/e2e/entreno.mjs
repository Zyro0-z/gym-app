// Entrenamiento completo de principio a fin, con recarga a mitad, y edición y borrado de la sesión.
// Uso: node e2e/entreno.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const srv = await servir(8768);
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

await p.goto("http://127.0.0.1:8768/");
await p.waitForFunction(() => window.__gym);
await espera();

paso("instalación vacía: Hoy invita a crear una rutina");
await p.getByRole("button", { name: "Crear rutina" }).click();
await espera(600);
await p.locator(".hoja .campo-texto").fill("Torso");
await p.locator(".hoja .btn-barra.fuerte").click();
await espera(900);
assert.equal((await estado()).rutinas.length, 1);
await p.waitForFunction(() => /rutina\/torso/.test(location.hash), null, { timeout: 5000 }).catch(() => {});
assert.match(await p.evaluate(() => location.hash), /rutina\/torso/);

paso("añadir dos ejercicios nuevos a la rutina");
for (const [n, g] of [["Press banca", "Pecho"], ["Remo con barra", "Espalda"]]) {
  await p.getByText("Añadir ejercicio").click(); await espera(600);
  await p.locator(".hoja input[type=search]").fill(n); await espera(200);
  await p.getByText("Crear «" + n + "»").click(); await espera(500);
  await p.locator(".acciones-grupo button", { hasText: g }).click(); await espera(700);
}
let e = await estado();
assert.deepEqual(e.rutinas[0].ejercicios.map((x) => x.ejercicioId), ["pressbanca", "remoconbarra"]);
assert.equal(e.catalogo.find((c) => c.id === "remoconbarra").grupo, "Espalda");

paso("empezar el entrenamiento desde Hoy");
await p.locator(".tabbar [data-tab=hoy]").click(); await espera();
await p.locator(".tabbar [data-tab=hoy]").click(); await espera();
await p.getByRole("button", { name: /Empezar entrenamiento|Empezar/ }).first().click(); await espera(600);
if (await p.locator(".hoja").count()) { await p.locator(".hoja .celda", { hasText: "Torso" }).click(); await espera(800); }
assert.equal(await p.locator(".modal-completo").count(), 1);

paso("apuntar series: escribir con coma, marcar, descanso");
await p.getByLabel("Peso de la serie 1").first().fill("60,5");
await p.getByLabel("Repeticiones de la serie 1").first().fill("8");
await p.locator(".modal-completo .serie .check").first().click(); await espera();
assert.equal(await p.locator(".barra-descanso:not([hidden])").count(), 1, "el descanso empieza al marcar");
// Foco: solo la serie que toca (la primera sin hacer) lleva el acento; el check marcado rebota
assert.equal(await p.locator(".modal-completo .serie.actual").count(), 1, "una sola serie resaltada");
assert.equal(await p.locator(".modal-completo .serie.actual.hecha").count(), 0, "la resaltada no está hecha");
assert.equal(await p.locator(".modal-completo .serie.hecha .check.pop").count(), 1, "el check marcado anima");
const col = (sel) => p.evaluate((q) => getComputedStyle(document.querySelector(q)).backgroundColor, sel);
assert.notEqual(await col(".modal-completo .serie.actual .check svg"), await col(".modal-completo .serie:not(.actual):not(.hecha) .check svg"), "el check actual se distingue");
// Descanso por defecto «No» (0): marcar una serie no arranca ningún descanso
await p.getByRole("button", { name: "Saltar" }).click(); await espera(300);
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.entreno.descanso = 0; }, { analitico: false })); await espera(300);
await p.getByLabel("Peso de la serie 2").first().fill("60.5");
await p.getByLabel("Repeticiones de la serie 2").first().fill("7");
await p.locator(".modal-completo .serie .check").nth(1).click(); await espera(1200);
assert.equal(await p.locator(".barra-descanso:not([hidden])").count(), 0, "con descanso «No» no se pone en marcha");
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.entreno.descanso = 90; }, { analitico: false })); await espera(300);
e = await estado();
assert.ok(e.borrador, "el borrador se guarda");
assert.equal(e.borrador.ejercicios[0].series.filter((s) => s.hecha).length, 2);

paso("minimizar, recargar y recuperar el entrenamiento");
await p.getByLabel("Minimizar").click(); await espera(600);
assert.equal(await p.locator(".barra-entreno:not([hidden])").count(), 1);
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
assert.equal(await p.locator(".barra-entreno:not([hidden])").count(), 1, "la barra sobrevive a la recarga");
await p.locator(".barra-entreno").click(); await espera(700);
assert.equal(await p.getByLabel("Peso de la serie 1").first().inputValue(), "60,5");

paso("terminar: revisión y resumen");
await p.locator(".modal-completo .btn-barra.fuerte", { hasText: "Terminar" }).click(); await espera(700);
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(1000);
e = await estado();
assert.equal(e.sesiones.length, 1);
assert.equal(e.borrador, null);
const s = e.sesiones[0];
assert.equal(s.rutina, "Torso");
assert.deepEqual(s.ejercicios[0].series.map((x) => [x.peso, x.reps]), [[60.5, 8], [60.5, 7]]);
assert.equal(s.ejercicios.length, 1, "los ejercicios sin series hechas no se guardan");
assert.ok(await p.locator(".hoja", { hasText: "récord" }).count(), "el resumen muestra los récords");
await textoMalo();
await p.locator(".hoja .btn-barra.fuerte", { hasText: "Hecho" }).click(); await espera(600);

paso("Historial: detalle, editar y borrar");
await p.locator(".tabbar [data-tab=historial]").click(); await espera(600);
await p.locator(".pestana.activa .fila-sesion", { hasText: "Torso" }).first().click(); await espera(700);
await textoMalo();
await p.locator(".pestana.activa .barra-nav button", { hasText: "Editar" }).click(); await espera(700);
await p.getByLabel("Repeticiones de la serie 2").first().fill("9");
await p.locator(".modal-completo .btn-barra.fuerte", { hasText: "Guardar" }).click(); await espera(900);
e = await estado();
assert.equal(e.sesiones[0].ejercicios[0].series[1].reps, 9);
await p.locator(".pestana.activa .celda", { hasText: "Borrar sesión" }).click(); await espera(500);
await p.locator(".alerta button", { hasText: "Borrar" }).click(); await espera(900);
assert.equal((await estado()).sesiones.length, 0);

paso("Ajustes: horario y renombrar la rutina");
await p.evaluate(() => window.__gym.nav.ir("horario", { pestana: "ajustes" })); await espera(700);
await p.locator(".pestana.activa .celda", { hasText: "Lunes" }).click(); await espera(500);
await p.locator(".acciones-grupo button", { hasText: "Torso" }).click(); await espera(600);
assert.equal((await estado()).ajustes.horario[1], "Torso");

console.log(motor, "errores:", errores.length ? errores : "ninguno");
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);

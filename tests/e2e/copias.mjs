// Copias (Fase 1.3): rotación interna cada N sesiones y antes de importar, restaurar una copia
// interna, tarjeta de copia pendiente en Hoy con «Posponer». Uso: node e2e/copias.mjs [motor]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const srv = await servir(8775);
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 450) => p.waitForTimeout(ms);
await p.goto("http://127.0.0.1:8775/");
await p.waitForFunction(() => window.__gym);
const sesiones = (n, desde = 1) => p.evaluate(async ([n, desde]) => {
  const s = window.__gym.store;
  if (!s.estado.catalogo.length) await s.guardarCatalogo([{ id: "pressbanca", nombre: "Press banca", grupo: "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null }]);
  for (let i = desde; i < desde + n; i++) {
    const f = "2026-10-" + String(i).padStart(2, "0");
    await s.guardarSesion({ id: f + "-x", rutina: null, fecha: f, inicio: "18:00", fin: "19:00", duracion: 60, ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }] }] });
  }
}, [n, desde]);
const respaldos = () => p.evaluate(() => window.__gym.store.listarRespaldos());

paso("una copia interna al llegar a 5 sesiones nuevas, rotación de 3");
await sesiones(4);
assert.equal((await respaldos()).length, 0);
await sesiones(1, 5);
let r = await respaldos();
assert.equal(r.length, 1); assert.equal(r[0].clave, "respaldo-auto-1"); assert.equal(r[0].sesiones, 5); assert.equal(r[0].motivo, "sesiones");
await sesiones(15, 6);
r = await respaldos();
assert.deepEqual(r.map((x) => [x.clave, x.sesiones]), [["respaldo-auto-1", 20], ["respaldo-auto-2", 15], ["respaldo-auto-3", 10]], "se conservan las 3 últimas");
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 20, "editar una sesión no cuenta como nueva");

paso("Hoy avisa de la copia sin exportar; «Posponer 3 días» la quita");
await p.locator(".tabbar [data-tab=hoy]").click(); await espera(600);
const filaCopia = p.locator(".tira-aviso", { hasText: "Copia pendiente" });
assert.equal(await filaCopia.count(), 1);
await filaCopia.click(); await espera(400);
await p.getByRole("button", { name: "Posponer 3 días" }).click(); await espera(500);
assert.equal(await filaCopia.count(), 0);
assert.ok(await p.evaluate(() => window.__gym.store.estado.ajustes.avisoCopia.pospuestoHasta));

paso("importar guarda antes los datos en la rotación y en respaldo-importacion");
const copia = await p.evaluate(() => window.__gym.store.textoCopia());
await p.evaluate(async (t) => { const s = window.__gym.store; const o = JSON.parse(t); o.sesiones = o.sesiones.slice(0, 2); await s.importar(s.leerCopia(JSON.stringify(o))); }, copia);
r = await respaldos();
assert.deepEqual(r.map((x) => [x.clave, x.motivo, x.sesiones]), [["respaldo-auto-1", "importar", 20], ["respaldo-auto-2", "sesiones", 20], ["respaldo-auto-3", "sesiones", 15], ["respaldo-importacion", "importar", 20]]);
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 2);

paso("Ajustes › Datos: restaurar una copia interna (con confirmación)");
await p.evaluate(() => window.__gym.nav.ir("datos", { pestana: "ajustes" })); await espera(900);
const txt = await p.locator(".pestana.activa .pantalla:not([hidden])").innerText();
assert.ok(/Copias internas/.test(txt) && /Antes de importar/.test(txt));
await p.locator(".pestana.activa .celda", { hasText: "Antes de importar" }).first().click(); await espera(500);
await p.locator(".alerta button", { hasText: "Restaurar" }).click(); await espera(1200);
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 20, "vuelven las 20 sesiones");
r = await respaldos();
assert.equal(r[0].motivo, "restaurar"); assert.equal(r[0].sesiones, 2, "lo que había antes de restaurar queda guardado");
const t2 = await p.evaluate(() => document.body.innerText);
for (const m of ["NaN", "undefined", "[object"]) assert.ok(!t2.includes(m), m);

paso("Ajustes › Datos: borrar solo el historial conserva rutinas, catálogo y tablas");
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.estandares = { squat: [{ pc: 80, niveles: [1, 2, 3, 4, 5] }] }; }));
const antes = await p.evaluate(() => { const s = window.__gym.store.estado; return [s.rutinas.length, s.catalogo.length]; });
await p.evaluate(() => window.__gym.nav.ir("datos", { pestana: "ajustes" })); await espera(900);
await p.locator(".pestana.activa .pantalla:not([hidden]) .celda", { hasText: "Borrar historial" }).click(); await espera(500);
await p.locator(".alerta button", { hasText: "Borrar historial" }).click(); await espera(1200);
const hist = await p.evaluate(() => { const s = window.__gym.store.estado; return [s.sesiones.length, s.pesajes.length, s.rutinas.length, s.catalogo.length, Object.keys(s.ajustes.estandares || {}).join()]; });
assert.deepEqual(hist, [0, 0, antes[0], antes[1], "squat"]);
await p.locator(".pestana.activa .pantalla:not([hidden]) .celda", { hasText: "Antes de borrar" }).first().click(); await espera(500);
await p.locator(".alerta button", { hasText: "Restaurar" }).click(); await espera(1200);
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 20, "se puede deshacer restaurando");

paso("Ajustes › Datos: borrar todos los datos (con copia interna previa)");
await p.evaluate(() => window.__gym.nav.ir("datos", { pestana: "ajustes" })); await espera(900);
await p.locator(".pestana.activa .pantalla:not([hidden]) .celda", { hasText: "Borrar todos los datos" }).click(); await espera(500);
await p.locator(".alerta button", { hasText: "Cancelar" }).click(); await espera(400);
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 20, "cancelar no borra");
await p.locator(".pestana.activa .pantalla:not([hidden]) .celda", { hasText: "Borrar todos los datos" }).click(); await espera(500);
await p.locator(".alerta button", { hasText: "Borrar todo" }).click(); await espera(1200);
const e = await p.evaluate(() => { const s = window.__gym.store.estado; return [s.sesiones.length, s.rutinas.length, s.pesajes.length, s.medidas.length, s.borrador, s.catalogo.length]; });
assert.deepEqual(e, [0, 0, 0, 0, null, 1]);
r = await respaldos();
assert.equal(r[0].motivo, "borrar"); assert.equal(r[0].sesiones, 20, "los datos borrados quedan en una copia interna");
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 0, "sigue vacío tras recargar");
await p.evaluate(() => window.__gym.nav.ir("datos", { pestana: "ajustes" })); await espera(900);
await p.locator(".pestana.activa .pantalla:not([hidden]) .celda", { hasText: "Antes de borrar" }).first().click(); await espera(500);
await p.locator(".alerta button", { hasText: "Restaurar" }).click(); await espera(1200);
assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 20, "se puede deshacer restaurando");

console.log(motor, "errores:", errores.length ? errores : "ninguno");
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);

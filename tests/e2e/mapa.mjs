// Mapa corporal en Progreso › Músculos: vistas Ambas/Frente/Espalda, foco con resumen, toque cercano y enlace con la lista.
// Uso: node e2e/mapa.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8803;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 400) => p.waitForTimeout(ms);

await p.clock.install({ time: new Date(2026, 10, 18, 12, 0) });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo, musculos) => ({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null, musculos });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho", { p: ["pecho-esternal"], s: ["triceps-lateral-medial"] }), ej("remoconbarra", "Remo con barra", "Espalda", { p: ["dorsal"], s: ["biceps"] })]);
  await s.guardarSesion({ id: "2026-11-16-x", rutina: "Torso", fecha: "2026-11-16", inicio: "18:00", fin: "19:00", duracion: 60, ejercicios: [
    { ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [0, 1, 2].map(() => ({ peso: 80, reps: 8, tipo: "normal", hecha: true })) },
    { ejercicioId: "remoconbarra", nombre: "Remo con barra", tipo: "peso", series: [0, 1, 2, 3].map(() => ({ peso: 60, reps: 8, tipo: "normal", hecha: true })) }] });
  localStorage.setItem("gym-periodo-musculos", "all");
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
await p.locator(".tabbar [data-tab=progreso]").click(); await espera(800);
await p.locator(".pestana.activa .segmentado [role=radio]", { hasText: "Músculos" }).click(); await espera(900);
await p.locator(".pestana.activa .segmentado [role=radio]", { hasText: /^Músculos$/ }).nth(1).click(); await espera(1200);

const viewBox = () => p.locator(".diagrama-cuerpo svg").first().getAttribute("viewBox");
const marcadas = () => p.locator(".diagrama-cuerpo path.marcada").count();

paso("por defecto se ven las dos caras y hay selector de vista");
assert.equal(await viewBox(), "38 84 1376 1272");
assert.equal(await p.locator("[aria-label='Vista del mapa'] [role=radio]").count(), 3);

paso("cada zona con datos lleva relieve y textura encima, sin duplicar ids");
const capas = await p.evaluate(() => ({ zonas: document.querySelectorAll(".diagrama-cuerpo path[data-nivel]").length, relieves: document.querySelectorAll(".diagrama-cuerpo path.capa.relieve").length,
  texturas: document.querySelectorAll(".diagrama-cuerpo path.capa.textura").length, ids: document.querySelectorAll(".diagrama-cuerpo svg [id]").length, unicos: new Set([...document.querySelectorAll("[id]")].map((x) => x.id)).size, todos: document.querySelectorAll("[id]").length }));
assert.ok(capas.zonas >= 4);
assert.equal(capas.relieves, capas.zonas); assert.equal(capas.texturas, capas.zonas);
assert.equal(capas.unicos, capas.todos, "ids únicos en el documento");

paso("Frente y Espalda recortan el mapa");
await p.locator("[aria-label='Vista del mapa'] [role=radio]", { hasText: "Frente" }).click(); await espera(300);
assert.equal(await viewBox(), "34 84 660 1272");
await p.locator("[aria-label='Vista del mapa'] [role=radio]", { hasText: "Espalda" }).click(); await espera(300);
assert.equal(await viewBox(), "754 84 660 1272");

paso("tocar una zona enfoca su músculo: resumen, resto atenuado y fila marcada");
const dorsal = p.locator(".diagrama-cuerpo path[data-nivel][id^='m-dorsal']").first();
await dorsal.click({ force: true }); await espera(300);
assert.ok((await marcadas()) >= 1);
assert.match(await p.locator(".diagrama-info .resumen").innerText(), /Dorsal ancho · 4 series/);
assert.equal(await p.locator(".diagrama-cuerpo svg.con-foco").count(), 1);
assert.equal(await p.locator(".celda.enfocada").count(), 1);
assert.match(await p.locator(".celda.enfocada").innerText(), /Dorsal ancho/);
await dorsal.click({ force: true }); await espera(300);
assert.equal(await marcadas(), 0, "volver a tocar lo quita");
assert.equal(await p.locator(".celda.enfocada").count(), 0);

paso("tocar una fila de la lista enfoca el músculo y cambia de cara si hace falta");
await p.locator("[aria-label='Vista del mapa'] [role=radio]", { hasText: "Frente" }).click(); await espera(300);
await p.locator(".celda.pulsable", { hasText: "Dorsal ancho" }).click(); await espera(400);
assert.equal(await viewBox(), "754 84 660 1272", "el dorsal solo está en la espalda");
assert.equal(await p.locator("[aria-label='Vista del mapa'] [role=radio][aria-checked=true]").innerText(), "Espalda");
assert.ok((await marcadas()) >= 1);
await p.locator(".celda.pulsable", { hasText: "Pecho medio e inferior" }).click(); await espera(400);
assert.equal(await viewBox(), "34 84 660 1272");

paso("un toque a pocos píxeles de una zona también la enfoca");
await p.locator("[aria-label='Vista del mapa'] [role=radio]", { hasText: "Ambas" }).click(); await espera(300);
await p.locator(".diagrama-info .resumen").count() && await p.evaluate(() => document.querySelector(".diagrama-cuerpo svg").dispatchEvent(new MouseEvent("click", { clientX: 1, clientY: 1, bubbles: true }))); await espera(200);
assert.equal(await marcadas(), 0, "un toque lejos de todo quita el foco");
const candidatos = await p.evaluate(() => {
  const q = document.querySelector(".diagrama-cuerpo path[data-nivel][id^='m-pecho-esternal']"), r = q.getBoundingClientRect(), out = [];
  for (let x = r.left + 8; x < r.right - 8; x += 8) for (const y of [r.top - 5, r.bottom + 5]) out.push({ x, y });
  return out.filter((c) => !document.elementsFromPoint(c.x, c.y).some((e) => e.matches && e.matches("path[data-nivel]")));
});
assert.ok(candidatos.length, "hay puntos junto a la zona, fuera de cualquier zona con datos");
let acierto = false;
for (const c of candidatos) {
  await p.mouse.click(c.x, c.y); await espera(150);
  const t = (await p.locator(".diagrama-info .resumen").count()) ? await p.locator(".diagrama-info .resumen").innerText() : "";
  if (/Pecho medio e inferior/.test(t)) { acierto = true; break; }
}
assert.ok(acierto, "un toque fuera pero cerca enfoca la zona");

paso("la vista elegida se recuerda al cambiar de periodo");
await p.locator("[aria-label='Vista del mapa'] [role=radio]", { hasText: "Espalda" }).click(); await espera(200);
await p.locator(".pestana.activa [aria-label=Periodo] [role=radio]").first().click(); await espera(900);
assert.equal(await viewBox(), "754 84 660 1272");

paso("ficha del ejercicio: principal con fibras y secundario con puntos; las sesiones abren su detalle");
await p.evaluate(() => window.__gym.nav.ir("ejercicio/pressbanca")); await espera(1200);
const tex = await p.evaluate(() => [...document.querySelectorAll(".diagrama.compacto path.capa.textura")].map((x) => x.style.fill));
assert.ok(tex.some((f) => /-p"?\)/.test(f)), "el secundario lleva puntos");
assert.ok(tex.some((f) => /-[vhd]"?\)/.test(f)), "el principal lleva fibras");
await p.locator(".celda.pulsable", { hasText: /16 nov/i }).first().click(); await espera(600);
assert.match(await p.locator("#app").innerText(), /Torso|Press banca/);

paso("dos sesiones el mismo día: el calendario pregunta cuál abrir");
await p.evaluate(async () => {
  const s = window.__gym.store;
  await s.guardarSesion({ id: "2026-11-16-y", rutina: "Brazos", fecha: "2026-11-16", inicio: "20:00", fin: "20:30", duracion: 30, ejercicios: [
    { ejercicioId: "remoconbarra", nombre: "Remo con barra", tipo: "peso", series: [{ peso: 50, reps: 10, tipo: "normal", hecha: true }] }] });
});
await p.locator(".tabbar [data-tab=historial]").click(); await espera(900);
await p.locator(".calor button.dia", { hasText: /^16$/ }).first().click(); await espera(500);
assert.equal(await p.locator(".acciones-capa .acciones-grupo button").count(), 3, "dos sesiones y Cancelar");
await p.locator(".acciones-capa button", { hasText: "Brazos" }).click(); await espera(600);
assert.match(await p.locator("#app").innerText(), /Brazos/);

assert.deepEqual(errores, []);
await b.close(); srv.close();
console.log("OK mapa");

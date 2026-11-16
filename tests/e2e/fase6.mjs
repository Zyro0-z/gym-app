// Fase 6: Hoy con un bloque principal y «Repetir última», tarjeta de instalación en Safari, mapa
// corporal monocromo con valor al tocar, teclado en hojas y alertas (Escape, foco atrapado y
// devuelto), movimiento reducido, resumen textual de las gráficas y temporizador accesible.
// Uso: node e2e/fase6.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8779;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const srv = await servir(PUERTO);
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: IPHONE, reducedMotion: "reduce" });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 450) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));
const ir = async (ruta, pestana) => { await p.evaluate(([r, t]) => window.__gym.nav.ir(r, { pestana: t }), [ruta, pestana]); await espera(900); };
const activo = () => p.evaluate(() => { const e = document.activeElement; return e ? (e.getAttribute("aria-label") || e.textContent || "").trim() : ""; });

await p.clock.install({ time: new Date("2026-11-16T10:00:00") });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo) => ({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho"), ej("remo", "Remo", "Espalda")]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 2 }, { ejercicioId: "remo", series: 2 }] }]);
  await s.guardarAjustes((a) => { for (let d = 1; d <= 7; d++) a.horario[d] = "Torso"; });
  for (const [f, kg] of [["2026-11-09", 80], ["2026-11-12", 82.5]])
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60, ejercicios: [
      { ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [{ peso: kg, reps: 8, tipo: "normal", hecha: true, rpe: 8 }, { peso: kg, reps: 7, tipo: "normal", hecha: true }] },
      { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [{ peso: 60, reps: 10, tipo: "normal", hecha: true }, { peso: 60, reps: 9, tipo: "normal", hecha: false }] }] });
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(900);

paso("Safari sin instalar: la tarjeta de instalación aparece una vez");
const inst = p.locator("[aria-label='Instalar la app']");
await inst.waitFor({ timeout: 4000 });
assert.match(await inst.innerText(), /Añadir a pantalla de inicio/);
await inst.getByRole("button", { name: "Entendido" }).click(); await espera(500);
assert.equal(await inst.count(), 0);
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(900);
assert.equal(await inst.count(), 0, "no vuelve a salir");

paso("Hoy: un solo botón relleno (Empezar) y «Repetir última» con la última sesión de la rutina");
const principal = p.locator(".hoy-principal");
assert.equal(await p.locator(".pestana.activa .pantalla:not([hidden]) .btn:not(.texto):not(.gris)").count(), 1, "un único botón protagonista");
assert.match(await principal.innerText(), /Repetir última · 12 nov/);
await principal.getByRole("button", { name: /Repetir la última sesión de Torso/ }).click(); await espera(900);
const bor = (await estado()).borrador;
assert.equal(bor.rutina, "Torso");
assert.deepEqual(bor.ejercicios[0].series.map((s) => [s.peso, s.reps, s.hecha, s.rpe]), [["82,5", "8", false, 8], ["82,5", "7", false, undefined]]);
assert.equal(bor.ejercicios[1].series.length, 1, "solo las series hechas");

paso("descanso: role=timer y anuncio polite (sin leer cada segundo)");
await p.locator(".modal-completo .serie .check").first().click(); await espera(500);
assert.equal(await p.locator(".barra-descanso").getAttribute("role"), "timer");
assert.match(await p.locator("[data-anuncio-descanso]").textContent(), /^Descanso de \d:\d\d$/);
assert.equal(await p.locator(".barra-descanso [aria-live]").count(), 0);

paso("modal de entreno: Escape minimiza y el foco no sale del modal con Tab");
for (let i = 0; i < 25; i++) { await p.keyboard.press("Tab"); assert.ok(await p.evaluate(() => !!document.activeElement.closest(".modal-completo")), "foco dentro del modal"); }
await p.keyboard.press("Escape"); await espera(600);
assert.equal(await p.locator(".modal-completo").count(), 0);
await p.evaluate(() => window.__gym.entreno.descartar()); await espera(400);

paso("hoja: Escape la cierra y el foco vuelve al botón que la abrió");
const mas = p.getByRole("button", { name: "Añadir pesaje" });
await mas.focus(); await p.keyboard.press("Enter"); await espera(700);
assert.equal(await p.locator(".hoja").count(), 1);
assert.equal(await p.locator(".hoja").getAttribute("aria-labelledby") !== null, true);
for (let i = 0; i < 12; i++) { await p.keyboard.press("Tab"); assert.ok(await p.evaluate(() => !!document.activeElement.closest(".hoja")), "foco dentro de la hoja"); }
await p.keyboard.press("Escape"); await espera(700);
assert.equal(await p.locator(".hoja").count(), 0);
assert.equal(await activo(), "Añadir pesaje");

paso("alerta: nombre, foco en la acción, Escape = Cancelar");
const r = p.evaluate(() => window.__gym.confirmar("¿Borrar la sesión?", "No se puede deshacer.", "Borrar", true));
await espera(500);
const al = p.getByRole("alertdialog", { name: "¿Borrar la sesión?" });
assert.equal(await al.count(), 1);
assert.equal(await activo(), "Borrar");
await p.keyboard.press("Tab"); await p.keyboard.press("Tab"); await p.keyboard.press("Tab");
assert.ok(await p.evaluate(() => !!document.activeElement.closest(".alerta-capa")));
await p.keyboard.press("Escape");
assert.equal(await r, false);

paso("movimiento reducido: duraciones a 0 y sin animaciones en bucle");
const mov = await p.evaluate(() => ({ dur: getComputedStyle(document.documentElement).getPropertyValue("--dur-2").trim(), btn: getComputedStyle(document.querySelector(".btn")).transitionDuration }));
assert.equal(mov.dur, "0ms"); assert.match(mov.btn, /^0s/);

paso("mapa corporal monocromo: leyenda con rangos, valor al tocar y etiqueta con los grupos");
await p.evaluate(() => { localStorage.setItem("gym-periodo-musculos", "all"); });
await p.locator(".tabbar [data-tab=progreso]").click(); await espera(800);
await p.locator(".pestana.activa .segmentado [role=radio]", { hasText: "Músculos" }).click(); await espera(1200);
const mapa = p.locator(".diagrama-cuerpo");
assert.match(await mapa.getAttribute("aria-label"), /De más a menos: (Pecho|Espalda), \d+ series/);
assert.ok(await p.locator(".leyenda-niveles .nivel").count() >= 1);
const zona = p.locator(".diagrama-cuerpo path[data-nivel]").first();
await zona.click({ force: true }); await espera(300);
assert.match(await p.locator(".diagrama-info").textContent(), /^(Pecho|Espalda): \d+ series$/);
const colores = await p.evaluate(() => new Set([...document.querySelectorAll(".diagrama-cuerpo path[data-nivel]")].map((x) => getComputedStyle(x).fill)).size);
assert.equal(colores, 1, "un solo tono");

paso("gráficas: resumen textual en la etiqueta");
await p.locator(".pestana.activa .segmentado [role=radio]", { hasText: "Resumen" }).click(); await espera(800);
const g = await p.locator(".pestana.activa .grafica").first().getAttribute("aria-label");
assert.match(g, /^Volumen semanal, .*\. (Mínimo|Un dato)/);

await b.close(); srv.close();
assert.deepEqual(errores, [], "errores de consola");
console.log(motor + " errores: ninguno");

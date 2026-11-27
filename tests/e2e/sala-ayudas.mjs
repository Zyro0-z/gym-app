// Ayudas de sala: ajuste del peso tras la primera serie, descarga sin pedir subir y propagación del peso.
// Uso: node e2e/sala-ayudas.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8802;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 450) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));

await p.clock.install({ time: new Date(2026, 10, 18, 18, 0) });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo) => ({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho"), ej("remoconbarra", "Remo con barra", "Espalda")]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 3, rpe: 8 }, { ejercicioId: "remoconbarra", series: 2 }] }]);
  for (const f of ["2026-11-09", "2026-11-12"])
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60, ejercicios: [
      { ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [0, 1, 2].map(() => ({ peso: 90, reps: 8, rpe: 8, tipo: "normal", hecha: true })) },
      { ejercicioId: "remoconbarra", nombre: "Remo con barra", tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }, { peso: 60, reps: 8, tipo: "normal", hecha: true }] }] });
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);

const empezar = async () => {
  await p.getByRole("button", { name: /Empezar/ }).first().click(); await espera(600);
  if (await p.locator(".hoja").count()) { await p.locator(".hoja .celda", { hasText: "Torso" }).click(); await espera(800); }
};
await empezar();
const press = p.locator(".modal-completo .ej").nth(0), remo = p.locator(".modal-completo .ej").nth(1);

paso("propagación: el peso de la serie 1 aparece como ayuda en las vacías sin escribirlo");
await press.getByLabel("Repeticiones de la serie 1").fill("8");
await press.getByLabel("Peso de la serie 1").fill("80");
await espera(300);
const ph = await press.getByLabel("Peso de la serie 2").getAttribute("placeholder");
assert.equal(ph, "80", "ayuda con el peso de la serie anterior");
assert.equal((await estado()).borrador.ejercicios[0].series[1].peso ?? "", "", "no se escribe en la serie");

paso("autorregulación: RPE 10 con 80 × 8 (el habitual era 90 × 8 @8) propone bajar el peso para el RPE objetivo");
await press.locator(".serie .check").first().click(); await espera(300);
await press.locator(".serie .rpe-serie").first().click(); await espera(200);
await press.locator(".tira-rpe:not([hidden]) .chip-rpe", { hasText: /^10$/ }).click(); await espera(500);
const chip = press.locator(".chip-sugerencia");
assert.equal(await chip.count(), 1);
assert.match(await chip.innerText(), /75 kg × 8/);
await chip.click(); await espera(400);
const e = await estado();
assert.equal(String(e.borrador.ejercicios[0].series[1].peso), "75");
assert.equal(String(e.borrador.ejercicios[0].series[2].peso), "75");
assert.equal(String(e.borrador.ejercicios[0].series[0].peso), "80", "la serie hecha no cambia");
assert.equal(await press.locator(".chip-sugerencia").count(), 0, "con las series rellenas el chip desaparece");

paso("semana de descarga: sin «Próxima vez» ni petición de subir, solo mantener");
await p.evaluate(async () => { await window.__gym.store.guardarBorrador(null); await window.__gym.store.guardarAjustes((a) => { a.bloques = [{ inicio: "2026-11-16", fin: "2026-11-22", tipo: "Deload", grupos: [] }]; }); });
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
await empezar();
const press2 = p.locator(".modal-completo .ej").nth(0);
assert.ok(!/Próxima vez/.test(await press2.locator(".ej-info").innerText()), "sin «Próxima vez» en descarga");
const sug = press2.locator(".chip-sugerencia");
assert.equal(await sug.count(), 1);
assert.match(await sug.innerText(), /90/);
assert.match(await sug.getAttribute("aria-label"), /descarga/i);

paso("el ✓ guarda el RPE objetivo sin abrir la tira; «Editar objetivo» cambia series y RPE en la sesión y en la rutina");
await p.evaluate(() => window.__gym.store.guardarBorrador(null)); await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
await empezar();
const press3 = p.locator(".modal-completo .ej").nth(0);
await press3.getByLabel("Repeticiones de la serie 1").fill("8"); await press3.getByLabel("Peso de la serie 1").fill("80");
await press3.locator(".serie .check").first().click(); await espera(300);
assert.equal(await press3.locator(".tira-rpe:not([hidden])").count(), 0, "el ✓ no abre la tira");
assert.equal((await estado()).borrador.ejercicios[0].series[0].rpe, 8, "el ✓ da por buena la serie con el RPE objetivo");
await press3.getByRole("button", { name: /Opciones de Press banca/ }).click(); await espera(500);
await p.getByRole("button", { name: /Editar objetivo/ }).click(); await espera(600);
await p.locator(".hoja").getByRole("button", { name: "Más series" }).click();
await p.locator(".hoja .tira-rpe .chip-rpe", { hasText: /^9$/ }).click();
await p.locator(".hoja").getByRole("button", { name: "Guardar" }).click(); await espera(700);
const bor = (await estado()).borrador.ejercicios[0];
assert.equal(bor.series.length, 4); assert.equal(bor.rpeObjetivo, 9);
const rt = (await estado()).rutinas[0].ejercicios[0];
assert.deepEqual([rt.series, rt.rpe], [4, 9], "queda guardado en la rutina");

assert.deepEqual(errores, []);
await b.close(); srv.close();
console.log("OK sala-ayudas");

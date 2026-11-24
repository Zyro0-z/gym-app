// Fase 4 y 5: vistas nuevas (Rendimiento, Molestias, Mesociclos, Fatiga con miniaturas y RPE), tarjeta PNG,
// copia en la nube con servidor simulado y guardado al ocultarse la página. Uso: node e2e/fase7.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8795;
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
const vista = () => p.evaluate(() => window.__gym.nav.pantalla.el.innerText);
const limpio = async () => { const t = await p.evaluate(() => document.body.innerText); for (const m of ["NaN", "undefined", "[object", "Infinity"]) assert.ok(!t.includes(m), "texto con «" + m + "»"); };
const ir = async (ruta, pestana) => { await p.evaluate(([r, t]) => window.__gym.nav.ir(r, { pestana: t }), [ruta, pestana]); await espera(900); };
// FOTOS=<carpeta>: guarda capturas de las pantallas con datos (revisión visual)
const foto = (n) => process.env.FOTOS ? p.screenshot({ path: process.env.FOTOS + "/" + motor + "-" + n + ".png", fullPage: true }) : null;
const activa = () => p.locator(".pantalla:not([hidden])");

await p.clock.install({ time: new Date("2026-11-16T10:00:00") });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
// 10 semanas; el sueño varía con el rendimiento para que haya algo que correlacionar; RPE en dos franjas
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre, grupo) => ({ id, nombre, grupo, unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null });
  await s.guardarCatalogo([ej("pressbanca", "Press banca", "Pecho"), ej("remo", "Remo", "Espalda")]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 2 }, { ejercicioId: "remo", series: 2 }] }]);
  const dia = (n) => new Date(Date.UTC(2026, 10, 16 - n)).toISOString().slice(0, 10);
  let k = 0;
  for (let w = 10; w >= 1; w--) for (const d of [0, 3]) {
    const f = dia(7 * w - d), m = k++ % 4, kg = 100 + m * 2, rpe = m < 2 ? 8 : 9;
    const serie = (x) => ({ peso: x, reps: 8, tipo: "normal", hecha: true, rpe });
    await s.guardarSesion({ id: f + "-x", rutina: "Torso", fecha: f, inicio: "18:00", fin: "19:00", duracion: 60, recuperacion: { sueno: 5.5 + m, estres: 4 - (m >> 1), energia: 2 + m },
      ejercicios: [{ ejercicioId: "pressbanca", nombre: "Press banca", tipo: "peso", series: [serie(kg), serie(kg)] }, { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [serie(kg - 20)] }] });
  }
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(1000);

paso("Hoy: anillo de la semana con el porcentaje en el centro");
await limpio();
assert.ok(await p.locator(".semana-anillo .centro-anillo").count() >= 1); await foto("hoy");

paso("Progreso › Fatiga: miniaturas de 8 semanas y reparto del RPE");
await ir("fatiga", "progreso");
assert.ok((await activa().locator(".rejilla-mini .mini").count()) >= 3, "miniaturas");
const t = await vista();
assert.match(t, /Intensidad \(RPE\)/); assert.match(t, /Cobertura/); await foto("fatiga");
await limpio();

paso("Progreso › Rendimiento: bandas con n visible y veredicto prudente");
await ir("rendimiento", "progreso");
const tr = await vista();
assert.match(tr, /Sesiones medidas/); assert.match(tr, /n = \d+/);
assert.ok((await activa().locator(".banda-fila").count()) >= 9, "3 factores con 3-4 bandas");
await foto("rendimiento"); assert.match(tr, /Spearman/); assert.match(tr, /sin conclusión|más (sueño|estrés|energía)/);
await limpio();

paso("Molestias: vacío, anotar desde el botón y ver el resumen");
await ir("molestias", "progreso");
assert.match(await vista(), /Sin molestias anotadas/);
await activa().getByRole("button", { name: "Anotar", exact: true }).click(); await espera(700);
const hoja = p.locator(".hoja");
await hoja.getByLabel("Articulación").selectOption("hombro");
await hoja.getByLabel("Ejercicio").selectOption("pressbanca");
await hoja.getByRole("radio", { name: /^3,/ }).click();
await hoja.getByRole("textbox", { name: "Nota" }).fill("al bajar la barra");
await hoja.getByRole("button", { name: "Guardar" }).click(); await espera(900);
let est = await estado();
assert.equal(est.molestias.length, 1);
assert.deepEqual([est.molestias[0].articulacion, est.molestias[0].nivel, est.molestias[0].ejercicioId, est.molestias[0].nota, est.molestias[0].fecha], ["hombro", 3, "pressbanca", "al bajar la barra", "2026-11-16"]);
let tm = await vista();
await foto("molestias"); assert.match(tm, /Hombro/); assert.match(tm, /Nivel 3/); assert.match(tm, /Press banca/); await limpio();

paso("Molestias: sin articulación no guarda y avisa");
await activa().getByRole("button", { name: "Anotar", exact: true }).click(); await espera(700);
await p.locator(".hoja").getByRole("button", { name: "Guardar" }).click(); await espera(500);
assert.ok(await p.locator(".alerta-capa").count(), "alerta de validación");
await p.locator(".alerta-capa button").first().click(); await espera(400);
assert.equal((await estado()).molestias.length, 1);
await p.keyboard.press("Escape"); await espera(500);
if (await p.locator(".hoja").count()) { await p.evaluate(() => window.__gym.cerrarHoja && window.__gym.cerrarHoja()); await espera(300); }

paso("Ficha del ejercicio: sección Molestias con la anotación");
await ir("ejercicio/pressbanca", "progreso");
assert.match(await vista(), /Molestias[\s\S]*Hombro/);
await limpio();

paso("Mesociclos: crear, ver el detalle, descarga programada y borrar");
await ir("mesociclos", "ajustes");
assert.match(await vista(), /Sin mesociclos/);
await activa().getByRole("button", { name: "Nuevo", exact: true }).click(); await espera(700);
await p.locator(".hoja").getByLabel("Nombre").fill("Acumulación");
await p.locator(".hoja").getByRole("button", { name: "Guardar" }).click(); await espera(900);
est = await estado();
assert.equal(est.ajustes.mesociclos.length, 1);
const mz = est.ajustes.mesociclos[0];
assert.deepEqual([mz.nombre, mz.inicio, mz.semanas, mz.descarga], ["Acumulación", "2026-11-16", 6, true]);
assert.deepEqual(est.ajustes.bloques.filter((x) => x.id === "meso-" + mz.id).map((x) => [x.inicio, x.fin, x.tipo]), [["2026-12-21", "2026-12-27", "deload"]]);
assert.match(await vista(), /Acumulación[\s\S]*Semana 1 de 6/);
await p.locator(".tabbar [data-tab=hoy]").click(); await espera(700);
assert.match(await p.locator(".pantalla:not([hidden])").first().innerText(), /Acumulación · semana 1 de 6/, "Hoy muestra el mesociclo en curso");
await p.locator(".tabbar [data-tab=ajustes]").click(); await espera(500);
await ir("mesociclo/" + mz.id, "ajustes");
const td = await vista();
await foto("mesociclo"); assert.match(td, /Semana 1 de 6/); assert.match(td, /Quedan 42 días/); assert.match(td, /Sin sesiones/); await limpio();
await activa().getByText("Borrar mesociclo").click(); await espera(500);
await p.locator(".alerta-capa").getByRole("button", { name: "Borrar" }).click(); await espera(900);
est = await estado();
assert.equal(est.ajustes.mesociclos.length, 0); assert.equal(est.ajustes.bloques.some((x) => x.id.startsWith("meso-")), false);

paso("Mesociclo: no se puede solapar ni empezar en un día que no sea lunes");
await ir("mesociclos", "ajustes");
await activa().getByRole("button", { name: "Nuevo", exact: true }).click(); await espera(700);
await p.locator(".hoja").getByLabel("Nombre").fill("Mal");
await p.locator(".hoja").getByLabel("Primer lunes").fill("2026-11-17");
await p.locator(".hoja").getByRole("button", { name: "Guardar" }).click(); await espera(600);
assert.match(await p.locator(".alerta-capa").innerText(), /lunes/);
await p.locator(".alerta-capa button").first().click(); await espera(400);
assert.equal((await estado()).ajustes.mesociclos.length, 0);
await p.keyboard.press("Escape"); await espera(500);
await p.locator(".acciones-capa").getByRole("button", { name: "Descartar cambios" }).click(); await espera(600);
assert.equal(await p.locator(".hoja").count(), 0);

paso("Tarjeta para compartir: PNG de 1080×1350");
const png = await p.evaluate(async () => {
  const { dibujarTarjeta } = await import("/src/ui/tarjeta.js"), { datosTarjeta } = await import("/src/core/tarjeta.js");
  const s = window.__gym.store.estado.sesiones[0];
  const blob = await dibujarTarjeta(datosTarjeta(s, ["Press banca"]));
  const img = await createImageBitmap(blob);
  return { tipo: blob.type, tam: blob.size, w: img.width, h: img.height };
});
assert.deepEqual([png.tipo, png.w, png.h], ["image/png", 1080, 1350]); assert.ok(png.tam > 5000);

paso("Copia en la nube: servidor simulado, nada en claro, restaurar y borrar");
await p.evaluate(() => {
  const real = window.fetch.bind(window), kv = new Map(); window.__peticiones = [];
  window.fetch = async (url, init = {}) => {
    if (!String(url).startsWith("https://nube.test")) return real(url, init);
    const id = String(url).split("/v1/copia/")[1].replace("/info", ""), tok = (init.headers || {}).Authorization;
    window.__peticiones.push({ m: init.method || "GET", url: String(url), tok, cuerpo: init.body || "" });
    const r = (s, o) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
    const x = kv.get(id);
    if (x && x.tok !== tok) return r(403, { error: "token incorrecto" });
    if (init.method === "PUT") { kv.set(id, { tok, v: init.body }); return r(200, { ok: true, at: Date.now(), bytes: init.body.length }); }
    if (init.method === "DELETE") { kv.delete(id); return r(200, { ok: true }); }
    if (!x) return r(404, { error: "no hay copia" });
    return String(url).endsWith("/info") ? r(200, { bytes: x.v.length, at: 1 }) : new Response(x.v, { status: 200 });
  };
});
await p.evaluate(async () => {
  const s = window.__gym.store;
  await s.guardarAjustes((a) => { a.nube.url = "https://nube.test"; }, { analitico: false });
  await s.guardarClaveNube("frase de prueba para la nube");
});
await ir("nube", "ajustes");
assert.match(await vista(), /Guardada en este iPhone/); await foto("nube");
assert.ok(!(await activa().locator(".clave-nube").innerText()).includes("frase de prueba"), "la clave sale oculta");
await activa().getByRole("button", { name: "Mostrar" }).click(); await espera(400);
assert.equal(await activa().locator(".clave-nube").innerText(), "frase de prueba para la nube");
await activa().getByRole("button", { name: "Ocultar" }).click(); await espera(300);
await activa().getByText("Subir ahora").click();
await p.waitForFunction(() => window.__peticiones.some((x) => x.m === "PUT"), null, { timeout: 20000 });
await espera(1200);
const put = await p.evaluate(() => window.__peticiones.find((x) => x.m === "PUT"));
assert.match(put.tok, /^Bearer [0-9a-f]{64}$/); assert.match(put.url, /\/v1\/copia\/[0-9a-f]{32}$/);
for (const secreto of ["al bajar la barra", "Press banca", "frase de prueba", put.tok.slice(7)]) assert.ok(!put.cuerpo.includes(secreto), "en claro: " + secreto);
est = await estado();
assert.equal(est.ajustes.nube.ultima.sesiones, est.sesiones.length);
const num = est.sesiones.length;
const bajada = await p.evaluate(async () => { const m = await window.__gym.store.bajarNube(); return { sesiones: m.sesiones.length, molestias: m.molestias.length }; });
assert.deepEqual(bajada, { sesiones: num, molestias: 1 });
assert.equal(await p.evaluate(() => window.__gym.store.claveNube()), "frase de prueba para la nube");
assert.ok(!JSON.stringify(await p.evaluate(() => window.__gym.store.textoCopia())).includes("frase de prueba"), "la clave no viaja dentro de la copia");
await p.evaluate(() => window.__gym.store.borrarNube());
assert.equal(await p.evaluate(() => window.__gym.store.infoNube()), null);
await limpio();

paso("Subida automática tras guardar una sesión (con espera de 5 s)");
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.nube.activa = true; a.nube.auto = true; }, { analitico: false }));
const antes = await p.evaluate(() => window.__peticiones.filter((x) => x.m === "PUT").length);
await p.evaluate(() => window.__gym.store.guardarSesion({ id: "2026-11-16-auto", rutina: null, fecha: "2026-11-16", inicio: "09:00", fin: "09:30", duracion: 30,
  ejercicios: [{ ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [{ peso: 60, reps: 8, tipo: "normal", hecha: true }] }] }));
await p.clock.runFor(5200); await espera(2500);
assert.equal(await p.evaluate(() => window.__peticiones.filter((x) => x.m === "PUT").length), antes + 1);

paso("Entreno: al ocultarse la página (pagehide) se guarda el borrador al instante");
await p.evaluate(async () => { await window.__gym.entreno.empezar("Torso"); }); await espera(900);
const serie = p.locator(".modal-completo .serie").first();
await serie.locator("input").first().fill("101"); await espera(100);
await p.evaluate(() => window.dispatchEvent(new Event("pagehide")));
const espejo = await p.evaluate(() => JSON.parse(localStorage.getItem("gym-espejo") || "null"));
assert.ok(espejo && espejo.borrador, "borrador replicado en localStorage");
assert.match(JSON.stringify(espejo.borrador), /101/);

paso("Un borrador descartado no resucita con un pagehide posterior");
await p.evaluate(() => window.__gym.store.guardarBorrador(null));
await p.evaluate(() => window.dispatchEvent(new Event("pagehide"))); await espera(500);
assert.equal((await estado()).borrador, null);
assert.equal(await p.evaluate(() => (JSON.parse(localStorage.getItem("gym-espejo") || "{}")).borrador), null);

assert.deepEqual(errores, [], "errores de consola: " + errores.join(" | "));
await b.close(); srv.close();
console.log("OK fase7", motor);

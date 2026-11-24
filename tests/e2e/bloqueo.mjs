// Fase 4: el descanso con la pantalla bloqueada. Reloj de Playwright para saltar el tiempo sin que
// corran los temporizadores (como un iPhone bloqueado, que congela el JavaScript); Wake Lock, Media
// Session y Push simulados (los navegadores de prueba no los tienen de verdad).
// Uso: node e2e/bloqueo.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8777, SERVIDOR = "https://avisos.example";
const srv = await servir(PUERTO);
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 450) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));
const toasts = () => p.evaluate(() => [...document.querySelectorAll(".toast")].map((t) => t.innerText).join(" | "));

// Simulaciones, antes de cargar la app
await p.addInitScript(() => {
  const w = (window.__sim = { wake: 0, liberados: 0, acciones: {}, metadata: null, posicion: null, sonando: 0 });
  // Wake Lock: iOS lo suelta al bloquear; aquí al ocultarse la página
  const oyentes = [];
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => {
    w.wake++; const l = { released: false, _o: [], addEventListener(t, f) { this._o.push(f); }, release() { if (!this.released) { this.released = true; w.liberados++; this._o.forEach((f) => f()); } } };
    oyentes.push(l); return l; } } });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") oyentes.splice(0).forEach((l) => l.release()); });
  // Media Session
  window.MediaMetadata = class { constructor(o) { Object.assign(this, o); } };
  Object.defineProperty(navigator, "mediaSession", { configurable: true, value: {
    setActionHandler(a, f) { if (f) w.acciones[a] = f; else delete w.acciones[a]; },
    set metadata(m) { w.metadata = m; }, get metadata() { return w.metadata; },
    setPositionState(s) { w.posicion = s || null; }, playbackState: "none" } });
  HTMLMediaElement.prototype.play = function () { w.sonando++; Object.defineProperty(this, "paused", { configurable: true, value: false }); return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () { Object.defineProperty(this, "paused", { configurable: true, value: true }); };
  // Push: permiso concedido y una suscripción de mentira
  // (el WebKit de Linux no tiene ni Notification ni PushManager: se crean)
  if (!window.Notification) window.Notification = { requestPermission: async () => "granted" };
  try { Object.defineProperty(Notification, "permission", { configurable: true, get: () => "granted" }); } catch (e) {}
  if (!window.PushManager) window.PushManager = class {};
  const sub = { getSubscription: async () => ({ toJSON: () => ({ endpoint: "https://web.push.apple.com/QH_sim", keys: { p256dh: "BPsim", auth: "sim" } }) }) };
  if (window.ServiceWorkerRegistration) Object.defineProperty(ServiceWorkerRegistration.prototype, "pushManager", { configurable: true, get: () => sub });
  // Ocultar / mostrar la página como al bloquear el iPhone
  let vis = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => vis });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => vis === "hidden" });
  window.__ver = (v) => { vis = v; document.dispatchEvent(new Event("visibilitychange")); };
});
// Servidor de avisos simulado: se envuelve fetch en la página (Playwright no intercepta con route las
// peticiones de una página controlada por un service worker en WebKit)
await p.addInitScript((SERVIDOR) => {
  const orig = window.fetch.bind(window);
  window.__peticiones = [];
  window.fetch = async (url, init = {}) => {
    const u = String(url);
    if (!u.startsWith(SERVIDOR)) return orig(url, init);
    const ruta = new URL(u).pathname;
    window.__peticiones.push({ ruta, cuerpo: init.body ? JSON.parse(init.body) : null });
    return new Response(ruta === "/v1/clave" ? '{"clave":"BPsim"}' : '{"ok":true,"estado":201}', { status: 200, headers: { "Content-Type": "application/json" } });
  };
}, SERVIDOR);
const pedidas = (ruta) => p.evaluate((r) => window.__peticiones.filter((x) => x.ruta === r), ruta);

await p.clock.install({ time: new Date("2026-11-16T18:00:00") });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  await s.guardarCatalogo([{ id: "pressbanca", nombre: "Press banca", grupo: "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null }]);
  await s.guardarRutinas([{ id: "torso", nombre: "Torso", ejercicios: [{ ejercicioId: "pressbanca", series: 3 }] }]);
  await s.guardarAjustes((a) => { a.entreno.descanso = 90; });
});
const empezar = async () => {
  await p.locator(".tabbar [data-tab=hoy]").click(); await espera();
  await p.getByRole("button", { name: /Empezar/ }).first().click(); await espera(600);
  if (await p.locator(".hoja").count()) { await p.locator(".hoja .celda", { hasText: "Torso" }).click(); await espera(800); }
};
const marcar = async (j, kg = "80", reps = "8") => {
  await p.getByLabel("Peso de la serie " + j).fill(kg); await p.getByLabel("Repeticiones de la serie " + j).fill(reps);
  await p.locator(".modal-completo .serie .check").nth(j - 1).click(); await espera(300);
};
const descartar = async () => { await p.evaluate(() => window.__gym.store.guardarBorrador(null)); await p.reload(); await p.waitForFunction(() => window.__gym); await espera(600); };

paso("4.1 Wake Lock: se pide al empezar y otra vez al volver a la app");
await empezar();
assert.equal(await p.evaluate(() => window.__sim.wake), 1);
await p.evaluate(() => window.__ver("hidden"));
assert.equal(await p.evaluate(() => window.__sim.liberados), 1);
await p.evaluate(() => window.__ver("visible")); await espera(200);
assert.equal(await p.evaluate(() => window.__sim.wake), 2, "se vuelve a pedir al volver");

paso("4.2 descanso con hora absoluta: termina con la página oculta → «hace 30 s» al volver");
await marcar(1);
let e = await estado();
assert.ok(e.borrador.descanso && Math.abs(e.borrador.descanso.fin - (await p.evaluate(() => Date.now())) - 90000) < 2000, "se guarda la hora de fin");
await p.evaluate(() => window.__ver("hidden"));
await p.clock.setSystemTime(new Date((await p.evaluate(() => Date.now())) + 120000));      // 2 min sin que corra nada
await p.evaluate(() => window.__ver("visible")); await espera(300);
assert.match(await toasts(), /Descanso terminado hace (29|30|31) s/);
assert.equal(await p.locator(".barra-descanso:not([hidden])").count(), 0);
e = await estado();
assert.equal(e.borrador.descanso.avisado, true, "no vuelve a avisar");

paso("4.2 al recargar con un descanso vencido hace rato: «hace 3 min»");
// pagehide guarda el estado de la pantalla (espejo síncrono + IndexedDB); este oyente va después y deja como último
// estado «el de antes de que cerraran la app»: un borrador con el descanso vencido y más reciente que cualquier otro
await p.evaluate(() => {
  const d = JSON.parse(JSON.stringify(window.__gym.store.estado.borrador));
  d.descanso = { fin: Date.now() - 185000, total: 90, avisado: false }; d.cambio = Date.now() + 1e8;
  window.addEventListener("pagehide", () => { const e = JSON.parse(localStorage.getItem("gym-espejo") || "{}"); e.borrador = d; localStorage.setItem("gym-espejo", JSON.stringify(e)); });
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
assert.match(await toasts(), /Descanso terminado hace 3 min/);
await descartar();

paso("4.3 controles en la pantalla bloqueada (desactivados por defecto)");
assert.equal((await estado()).ajustes.entreno.controlesBloqueo, false);
await empezar(); await marcar(1);
assert.equal(await p.evaluate(() => Object.keys(window.__sim.acciones).length), 0, "sin activar no toca el reproductor");
await descartar();
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.entreno.controlesBloqueo = true; }));
await empezar();
assert.deepEqual(await p.evaluate(() => Object.keys(window.__sim.acciones).sort()), ["nexttrack", "pause", "play", "previoustrack", "seekbackward", "seekforward"]);
assert.ok(await p.evaluate(() => window.__sim.sonando) > 0, "audio en silencio en marcha");
assert.match(await p.evaluate(() => window.__sim.metadata.title), /Press banca · serie 1 de 3/);
await marcar(1); await espera(1100);
assert.match(await p.evaluate(() => window.__sim.metadata.title), /^Descanso · 1:2\d$/);
assert.match(await p.evaluate(() => window.__sim.metadata.artist), /Después: Press banca · serie 2 de 3/);
assert.equal(await p.evaluate(() => window.__sim.posicion.duration), 90);
await p.evaluate(() => window.__sim.acciones.seekforward()); await espera(200);
assert.equal((await estado()).borrador.descanso.total, 105, "+15 s");
await p.evaluate(() => window.__sim.acciones.seekbackward()); await p.evaluate(() => window.__sim.acciones.seekbackward()); await espera(200);
assert.equal((await estado()).borrador.descanso.total, 75, "−15 s dos veces");
await p.evaluate(() => window.__sim.acciones.nexttrack()); await espera(300);
assert.equal((await estado()).borrador.descanso, null, "siguiente: salta el descanso");
await p.getByLabel("Peso de la serie 2").fill("80"); await p.getByLabel("Repeticiones de la serie 2").fill("7");
await p.evaluate(() => window.__sim.acciones.nexttrack()); await espera(400);
e = await estado();
assert.equal(e.borrador.ejercicios[0].series.filter((s) => s.hecha).length, 2, "siguiente sin descanso: marca la serie");
assert.ok(e.borrador.descanso, "y empieza el descanso");
await p.evaluate(() => window.__sim.acciones.previoustrack()); await espera(200);
assert.equal((await estado()).borrador.descanso.total, 90, "anterior: reinicia el descanso");
// El pitido de fin suena por el reproductor
const antes = await p.evaluate(() => window.__sim.sonando);
await p.evaluate(() => window.__ver("hidden"));
await p.clock.setSystemTime(new Date((await p.evaluate(() => Date.now())) + 95000));
await p.evaluate(() => window.__ver("visible")); await espera(300);
assert.ok(await p.evaluate(() => window.__sim.sonando) > antes, "pitido por el reproductor");
await descartar();
assert.equal(await p.evaluate(() => Object.keys(window.__sim.acciones).length), 0, "sin entrenamiento se retiran los controles");
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.entreno.controlesBloqueo = false; }));

paso("4.4 avisos push: programar al empezar el descanso, cancelar al saltarlo");
await p.evaluate((url) => window.__gym.store.guardarAjustes((a) => { a.entreno.push = { activo: true, url }; }), SERVIDOR);
await empezar(); await marcar(1); await espera(900);
const prog = await pedidas("/v1/programar");
assert.equal(prog.length, 1, "un aviso programado");
assert.ok(Math.abs(prog[0].cuerpo.en - (await estado()).borrador.descanso.fin) < 5, "a la hora de fin");
assert.equal(prog[0].cuerpo.titulo, "Descanso terminado");
assert.match(prog[0].cuerpo.cuerpo, /Press banca · serie 2 de 3/);
assert.match(prog[0].cuerpo.id, /^[0-9a-f]{24}$/);
assert.equal(prog[0].cuerpo.suscripcion.endpoint, "https://web.push.apple.com/QH_sim");
await p.locator(".barra-descanso button", { hasText: "+15" }).click();
await p.locator(".barra-descanso button", { hasText: "+15" }).click(); await espera(900);
const prog2 = await pedidas("/v1/programar");
assert.equal(prog2.length, 2, "dos toques seguidos: una sola reprogramación");
assert.ok(Math.abs(prog2[1].cuerpo.en - prog[0].cuerpo.en - 30000) < 5);
await p.locator(".barra-descanso button", { hasText: "Saltar" }).click(); await espera(900);
assert.equal((await pedidas("/v1/cancelar")).length, 1, "saltar cancela el aviso");
await descartar();

paso("4.4 Ajustes › Entrenamiento: aviso de prueba");
await p.evaluate(() => window.__gym.nav.ir("entrenamiento", { pestana: "ajustes" })); await espera(900);
assert.equal(await p.getByText("Enviar aviso de prueba").count(), 0, "los avisos están plegados en «Avanzado»");
await p.getByText("Opciones avanzadas").click(); await espera(500);
await p.getByText("Enviar aviso de prueba").click(); await espera(600);
assert.equal((await pedidas("/v1/probar")).length, 1);
assert.match(await p.evaluate(() => window.__gym.nav.pantalla.el.innerText), /Enviado/);
const t = await p.evaluate(() => document.body.innerText);
for (const m of ["NaN", "undefined", "[object"]) assert.ok(!t.includes(m), "texto con «" + m + "»");

await b.close(); srv.close();
assert.deepEqual(errores, [], "errores de consola");
console.log(motor + " errores: ninguno");

// Fallos conocidos (fase 3): audio con un único AudioContext creado en un gesto, descanso correcto
// tras bloquear/desbloquear, Wake Lock re-pedido, sesión recuperada si iOS mata la app, peso de hoy
// sin duplicar, aviso de copia de seguridad y migración v1 → v2. Uso: node fase3.mjs [chromium,webkit]
import { chromium, webkit } from "playwright";
import { servir } from "./serve.mjs";

const navs = (process.argv[2] || "chromium,webkit").split(",");
const PUERTO = 8781, URL_ = "http://127.0.0.1:" + PUERTO + "/";
const srv = await servir(PUERTO);
let fallos = 0;

// Espías: cuenta AudioContext creados y tonos, y simula el Wake Lock (que headless no tiene).
const ESPIAS = () => {
  window.__audio = { ctx: 0, tonos: 0 };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) {
    const Esp = class extends AC {
      constructor(...a) { super(...a); window.__audio.ctx++; }
      createOscillator() { const o = super.createOscillator(); const st = o.start.bind(o); o.start = (...a) => { window.__audio.tonos++; return st(...a); }; return o; }
    };
    window.AudioContext = Esp; window.webkitAudioContext = Esp;
  }
  window.__wake = { pedidos: 0, activos: [] };
  const wl = { request: async () => {
    window.__wake.pedidos++;
    const ls = [];
    const s = { released: false, addEventListener: (t, f) => ls.push(f), release: async () => { if (!s.released) { s.released = true; ls.forEach((f) => f()); } } };
    window.__wake.activos.push(s); return s;
  } };
  Object.defineProperty(navigator, "wakeLock", { value: wl, configurable: true });
};
const kv = (p, k) => p.evaluate((k) => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => { const g = r.result.transaction("kv").objectStore("kv").get(k); g.onsuccess = () => { ok(g.result); r.result.close(); }; }; }), k);
const ponerKV = (p, k, v) => p.evaluate(([k, v]) => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => { const t = r.result.transaction("kv", "readwrite"); if (v === undefined) t.objectStore("kv").delete(k); else t.objectStore("kv").put(v, k); t.oncomplete = () => { r.result.close(); ok(); }; }; }), [k, v]);
const visibilidad = (p, estado) => p.evaluate((estado) => {
  Object.defineProperty(document, "visibilityState", { value: estado, configurable: true });
  Object.defineProperty(document, "hidden", { value: estado === "hidden", configurable: true });
  if (estado === "hidden") window.__wake.activos.forEach((s) => s.release());   // iOS suelta el Wake Lock al bloquear
  document.dispatchEvent(new Event("visibilitychange"));
}, estado);
const seg = (t) => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };

for (const nombre of navs) {
  const nav = { chromium, webkit }[nombre];
  let b; try { b = await nav.launch(); } catch (e) { console.log(`✗ [${nombre}] no se pudo lanzar: ${e.message.split("\n")[0]}`); fallos++; continue; }
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: nombre === "chromium" });
  await ctx.addInitScript(ESPIAS);
  let p = await ctx.newPage();
  const errores = [];
  const vigilar = (pg) => { pg.on("pageerror", (e) => errores.push(e.message)); pg.on("console", (m) => m.type() === "error" && errores.push(m.text())); };
  vigilar(p);
  const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + `[${nombre}] ` + m); if (!c) fallos++; };
  const esperar = (ms = 350) => p.waitForTimeout(ms);
  try {
    await p.goto(URL_); await p.waitForSelector("h1.grande"); await esperar(1000);
    ok(await p.evaluate(() => window.__audio.ctx) === 0, "ningún AudioContext antes del primer gesto");

    // ── Aviso de copia de seguridad ──
    ok(await p.locator(".aviso", { hasText: "Aún no has hecho ninguna copia" }).isVisible(), "aviso de copia si nunca se ha exportado");
    const n = (await kv(p, "sessions")).length;
    const st = await kv(p, "settings");
    await ponerKV(p, "settings", { ...st, backup: { at: new Date(Date.now() - 8 * 864e5).toISOString(), sessions: n } }); await p.reload(); await p.waitForSelector("h1.grande"); await esperar(600);
    ok(await p.locator(".aviso", { hasText: "Han pasado 8 días" }).isVisible(), "aviso a los 8 días sin copia");
    await ponerKV(p, "settings", { ...st, backup: { at: new Date().toISOString(), sessions: n - 6 } }); await p.reload(); await p.waitForSelector("h1.grande"); await esperar(600);
    ok(await p.locator(".aviso", { hasText: "6 sesiones nuevas" }).isVisible(), "aviso con 6 sesiones nuevas sin copiar");
    await ponerKV(p, "settings", { ...st, backup: { at: new Date().toISOString(), sessions: n - 5 } }); await p.reload(); await p.waitForSelector("h1.grande"); await esperar(600);
    ok(!(await p.locator(".aviso").count()), "sin aviso con 5 sesiones nuevas y copia reciente");
    await ponerKV(p, "settings", st); await p.reload(); await p.waitForSelector("h1.grande"); await esperar(600);
    const [dl] = await Promise.all([p.waitForEvent("download"), p.locator(".aviso .btn").click()]);
    await esperar(500);
    ok(!!dl && !(await p.locator(".aviso").count()), "«Exportar ahora» descarga la copia y quita el aviso");

    // ── Peso corporal: una línea por día ──
    const pesoTxt = async () => (await kv(p, "configs"))["Gym/Config/peso-corporal.md"];
    const hoy = await p.evaluate(() => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); });
    const lineasHoy = (t) => t.split("\n").filter((l) => l.startsWith(hoy + "::"));
    const pi = p.locator("input[aria-label='Peso de hoy en kg']");
    await pi.fill("80,2"); await p.locator(".btn", { hasText: "Apuntar" }).click(); await esperar(500);
    ok(JSON.stringify(lineasHoy(await pesoTxt())) === JSON.stringify([hoy + ":: 80,2 kg"]), "primer peso de hoy añadido");
    await pi.fill("80.6"); await p.locator(".btn", { hasText: "Apuntar" }).click(); await esperar(300);
    ok(await p.locator(".toast", { hasText: "Peso de hoy actualizado" }).isVisible(), "aviso «Peso de hoy actualizado»");
    const t2 = await pesoTxt();
    ok(JSON.stringify(lineasHoy(t2)) === JSON.stringify([hoy + ":: 80,6 kg"]), "segundo peso de hoy reemplaza (punto aceptado, guardado con coma)");
    ok(t2.includes("2026-09-26:: 81 kg"), "el resto de pesadas no se toca");

    // ── Audio ──
    await p.locator(".grupo .celda", { hasText: /^Pierna/ }).first().click(); await esperar();
    ok(await p.evaluate(() => window.__audio.ctx) === 1, "un único AudioContext tras tocar");
    const pedidos0 = await p.evaluate(() => window.__wake.pedidos);
    ok(pedidos0 >= 1, "Wake Lock pedido al empezar la sesión");

    // ── Descanso con bloqueo / desbloqueo ──
    await p.clock.install();
    await p.locator(".ej").first().locator(".serie .ok").first().click(); await p.clock.runFor(300);
    ok(await p.locator(".descanso").isVisible(), "descanso en marcha");
    await visibilidad(p, "hidden");
    await p.clock.setSystemTime(await p.evaluate(() => Date.now() + 60000));   // 60 s bloqueado: los timers no corren
    await visibilidad(p, "visible");
    const t = await p.locator(".descanso [data-t]").innerText();
    ok(Math.abs(seg(t) - 30) <= 1, "tras 60 s bloqueado el descanso marca ~0:30 (" + t + ")");
    ok((await p.evaluate(() => window.__wake.pedidos)) > pedidos0, "Wake Lock re-pedido al volver a la app");
    const tonos0 = await p.evaluate(() => window.__audio.tonos);
    await p.clock.runFor(31000);
    ok((await p.locator(".descanso [data-t]").innerText()) === "¡Ya!", "el descanso termina");
    ok((await p.evaluate(() => window.__audio.tonos)) >= tonos0 + 2, "pitido al terminar (2 tonos)");
    await p.locator(".ej").first().locator(".serie .ok").nth(1).click(); await p.clock.runFor(91000);
    ok((await p.evaluate(() => window.__audio.tonos)) >= tonos0 + 4 && (await p.evaluate(() => window.__audio.ctx)) === 1, "segundo pitido con el mismo AudioContext");
    await p.clock.runFor(9000);
    ok(!(await p.locator(".descanso").count()), "la barra de descanso se va sola a los 8 s");
    // Al volver tras un descanso ya pasado de largo, no suena tarde
    await p.locator(".ej").first().locator(".serie .ok").nth(2).click(); await p.clock.runFor(300);
    const tonos1 = await p.evaluate(() => window.__audio.tonos);
    await visibilidad(p, "hidden"); await p.clock.setSystemTime(await p.evaluate(() => Date.now() + 200000)); await visibilidad(p, "visible"); await p.clock.runFor(300);
    ok((await p.evaluate(() => window.__audio.tonos)) === tonos1 && !(await p.locator(".descanso").count()), "sin pitido tardío al volver mucho después");

    // ── iOS mata la app a mitad de sesión ──
    await p.locator(".ej").nth(1).locator(".serie input").nth(0).fill("252,5");
    await p.locator(".ej").nth(1).locator(".serie .ok").first().click(); await p.clock.runFor(5000);
    const resto0 = seg(await p.locator(".descanso [data-t]").innerText());
    const reloj0 = seg(await p.locator("[data-reloj]").innerText());
    await p.close();                                         // cierre sin aviso
    p = await ctx.newPage(); vigilar(p);
    await p.goto(URL_); await p.waitForSelector(".nav.sesion");
    await p.clock.runFor(1500);
    ok(await p.locator(".ej").nth(1).locator(".serie input").nth(0).inputValue() === "252,5", "valores recuperados tras matar la app");
    ok((await p.locator(".ej").first().locator(".serie.hecha").count()) === 3, "series hechas recuperadas");
    ok(await p.locator(".descanso").isVisible(), "el descanso sigue tras reabrir");
    const resto1 = seg(await p.locator(".descanso [data-t]").innerText()), reloj1 = seg(await p.locator("[data-reloj]").innerText());
    ok(resto1 <= resto0 && resto1 >= resto0 - 3, `descanso continuo (${resto0}s → ${resto1}s)`);
    ok(reloj1 >= reloj0 && reloj1 <= reloj0 + 3, `reloj de sesión continuo (${reloj0}s → ${reloj1}s)`);
    await p.locator(".nav-btn", { hasText: "Descartar" }).click(); await p.clock.runFor(400);
    await p.locator(".accion-btn", { hasText: "Descartar sesión" }).click(); await p.clock.runFor(500);
    ok(!(await p.locator(".descanso").count()), "descartar quita el descanso");

    // ── Migración de esquema v1 → v2 con copia previa ──
    const ses = (await kv(p, "sessions")).length;
    const st2 = await kv(p, "settings"); delete st2.backup;
    await ponerKV(p, "settings", st2); await ponerKV(p, "schema", undefined);
    await p.evaluate(() => localStorage.setItem("gym-ultima-copia", "2026-11-10"));
    await p.reload(); await p.waitForSelector("h1.grande"); await p.clock.runFor(1000);
    ok(await kv(p, "schema") === 2, "esquema migrado a v2");
    ok(((await kv(p, "settings")).backup || {}).at?.startsWith("2026-11-10"), "fecha de la última copia pasada a IndexedDB");
    const bk = await kv(p, "backup-esquema-v1");
    ok(bk && bk.datos.sessions.length === ses && bk.datos.configs["Gym/Config/peso-corporal.md"], "copia completa guardada antes de migrar");
  } catch (e) { ok(false, "excepción: " + e.message.split("\n")[0]); }
  ok(!errores.length, "consola sin errores" + (errores.length ? ": " + errores.slice(0, 4).join(" | ") : ""));
  await b.close();
}
srv.close();
console.log(fallos ? `\n${fallos} comprobaciones fallidas` : "\nTodo correcto");
process.exitCode = fallos ? 1 : 0;

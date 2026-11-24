// Robustez en iOS: conexión de IndexedDB cerrada, el fondo no se repinta al teclear y la app se pone al día al cruzar la medianoche.
// Uso: node e2e/robustez.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8801;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 400) => p.waitForTimeout(ms);

await p.clock.install({ time: new Date(2026, 10, 16, 23, 50) });
await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await espera(800);
await p.evaluate(() => { const g = window.__gym; g.cuenta = 0; const f = g.nav.refrescar; g.nav.refrescar = (...a) => { g.cuenta++; return f.apply(g.nav, a); }; });
const cuenta = () => p.evaluate(() => window.__gym.cuenta);

paso("si iOS cierra la conexión de IndexedDB, el guardado la reabre y no falla");
await p.evaluate(async () => { const m = await import("./src/data/db.js"); (await m.abrir()).close(); });
await p.evaluate(() => window.__gym.store.guardarPesajes([{ fecha: "2026-11-10", kg: 80 }]));
const guardado = await p.evaluate(async () => { const m = await import("./src/data/db.js"); return m.leerKV("pesajes"); });
assert.deepEqual(guardado, [{ fecha: "2026-11-10", kg: 80 }]);
await p.evaluate(async () => { const m = await import("./src/data/db.js"); (await m.abrir()).close(); });
assert.equal(await p.evaluate(async () => { const m = await import("./src/data/db.js"); return (await m.leerKV("pesajes")).length; }), 1, "la lectura también se recupera");

paso("con el entreno abierto, el autoguardado no repinta el fondo; al cerrarlo sí");
const antes = await cuenta();
await p.evaluate(() => { document.body.classList.add("con-modal"); return window.__gym.store.guardarBorrador({ ejercicios: [{ ejercicioId: "x", nombre: "X", series: [] }], inicio: "10:00", fecha: "2026-11-16" }); });
await p.evaluate(() => window.__gym.store.guardarBorrador({ ejercicios: [{ ejercicioId: "x", nombre: "X", series: [{ peso: 85 }] }], inicio: "10:00", fecha: "2026-11-16" }));
assert.equal(await cuenta(), antes, "ni un repintado mientras el modal está abierto");
await p.evaluate(() => { document.body.classList.remove("con-modal"); return window.__gym.store.guardarBorrador(null); });
assert.ok((await cuenta()) > antes, "sin modal, el cambio sí repinta");

paso("al volver a la app tras cruzar la medianoche, se repinta una sola vez");
const c0 = await cuenta();
await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
assert.equal(await cuenta(), c0, "mismo día: nada que hacer");
await p.clock.fastForward(30 * 60 * 1000);
await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
const c1 = await cuenta();
assert.ok(c1 > c0, "día nuevo: se repinta");
await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
assert.equal(await cuenta(), c1, "y no se repite");

assert.deepEqual(errores, []);
await b.close(); srv.close();
console.log("OK robustez");

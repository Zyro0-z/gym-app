// Con 820 sesiones el hilo principal no se bloquea más de 100 ms: el análisis va en el Worker y las
// pantallas pintan con lo último calculado. Uso: node e2e/rendimiento.mjs [motor]   (COPIAS=1 → 82)
// Medida: PerformanceObserver «longtask» donde existe (Chromium) y, donde no (WebKit), los huecos de
// un latido de 10 ms. En Chromium headless el latido también recoge el rasterizado por software
// del primer pintado de una pestaña (≈ 90 ms, igual con 82 que con 820 sesiones): ahí solo se
// informa y se usa un tope de seguridad más alto.
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";
import { modeloGrande } from "../bench/datos.mjs";
import { crearCopia } from "../../src/data/modelo.js";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const LIMITE = 100;
const srv = await servir(8772);
const b = await nav.launch();
const errores = [];
const paso = (t) => console.log("·", t);

// Una pasada completa con `copias` × 82 sesiones en un contexto nuevo; devuelve las medidas
async function pasada(copias) {
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c2.newPage();
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  await p.goto("http://127.0.0.1:8772/");
  await p.waitForFunction(() => window.__gym);
  const copia = JSON.stringify(crearCopia(modeloGrande(copias), "2026-11-15T10:00:00.000Z"));
  await p.evaluate(async (t) => { const s = window.__gym.store; await s.importar(s.leerCopia(t)); await s.analisisFresco(); }, copia);
  assert.equal(await p.evaluate(() => window.__gym.store.estado.sesiones.length), 82 * copias);
  assert.equal(await p.evaluate(() => window.__gym.store.modoAnalisis), "worker");
  await p.evaluate(() => {
    const m = (window.__medida = { max: 0, largas: [], donde: "" });
    let antes = performance.now();
    const latir = () => { const ahora = performance.now(), g = ahora - antes - 10; if (g > m.max) { m.max = g; m.donde = m.etapa; } antes = ahora; m.t = setTimeout(latir, 10); };
    m.t = setTimeout(latir, 10);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.largas.push([m.etapa, Math.round(e.duration)]); }).observe({ type: "longtask", buffered: false }); } catch (e) {}
  });
  const medir = async (n, fn) => { await p.evaluate((n) => { window.__medida.etapa = n; }, n); await fn(); await p.waitForTimeout(500); };
  await medir("recalcular", () => p.evaluate(async () => { const s = window.__gym.store; await s.guardarPesajes([...s.estado.pesajes, { fecha: "2026-11-14", kg: 80.1 }]); await s.analisisFresco(); }));
  for (const t of ["progreso", "historial", "ajustes", "hoy"]) await medir("pestaña " + t, () => p.locator(`.tabbar [data-tab=${t}]`).click());
  await p.locator(".tabbar [data-tab=progreso]").click(); await p.waitForTimeout(300);
  for (const s of ["Ejercicios", "Músculos", "Cuerpo", "Resumen"]) await medir("progreso " + s, () => p.locator(".pestana.activa .segmentado button", { hasText: s }).first().click());
  const m = await p.evaluate(() => { clearTimeout(window.__medida.t); return window.__medida; });
  m.hayLongtask = await p.evaluate(() => (PerformanceObserver.supportedEntryTypes || []).includes("longtask"));
  m.peor = m.largas.reduce((a, x) => (x[1] > a[1] ? x : a), ["", 0]);
  await c2.close();
  return m;
}

paso("referencia: 82 sesiones");
const base = await pasada(1);
console.log(motor, "82 sesiones: latido máx", Math.round(base.max), "ms en «" + base.donde + "»; tarea larga máx", base.peor[1], "ms");
paso("820 sesiones");
const m = await pasada(10);
console.log(motor, "820 sesiones: latido máx", Math.round(m.max), "ms en «" + m.donde + "»; tarea larga máx", m.peor[1], "ms", m.largas.length ? JSON.stringify(m.largas) : "");
if (m.hayLongtask) assert.ok(m.peor[1] < LIMITE, "tarea larga de " + m.peor[1] + " ms en «" + m.peor[0] + "»");
// Sin «longtask» (WebKit): el latido incluye el pintado de cada pantalla, que no depende de los
// datos; se exige estar por debajo del límite o, como mucho, 30 ms por encima de la referencia
assert.ok(m.max < LIMITE || m.max < base.max + 30, "con 820 sesiones el hilo se bloqueó " + Math.round(m.max) + " ms en «" + m.donde + "» (referencia " + Math.round(base.max) + " ms)");
console.log(motor, "errores:", errores.length ? errores : "ninguno");
await b.close(); srv.close();
process.exit(errores.length ? 1 : 0);

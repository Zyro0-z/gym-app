// Ajustes › Módulos: apagar un módulo quita su entrada de Hoy, Progreso y la Ficha sin borrar datos. Uso: node e2e/modulos.mjs [chromium]
import { chromium } from "playwright";
import { servir } from "../serve.mjs";
import { modeloGrande } from "../bench/datos.mjs";
import { crearCopia } from "../../src/data/modelo.js";

const srv = await servir(8773);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
let fallos = 0;
const ok = (c, t) => { console.log((c ? "  ✓ " : "  ✗ ") + t); if (!c) fallos++; };

await p.goto("http://127.0.0.1:8773/");
await p.waitForFunction(() => window.__gym);
await p.evaluate(async (t) => { const s = window.__gym.store; await s.importar(s.leerCopia(t)); await s.analisisFresco(); }, JSON.stringify(crearCopia(modeloGrande(1), "2026-11-15T10:00:00.000Z")));
const ocultar = (ids) => p.evaluate(async (l) => { await window.__gym.store.guardarAjustes((a) => { a.ocultos = l; }, { analitico: false }); }, ids);
const txt = (sel) => p.evaluate((s) => (document.querySelector(".pestana.activa " + s) || {}).innerText || "", sel);
const ir = async (id) => { await p.locator(".tabbar [data-tab=" + id + "]").click(); await p.waitForTimeout(700); };

await p.waitForTimeout(500);
ok(/Esta semana/i.test(await txt(".cuerpo")), "por defecto Hoy muestra «Esta semana»");
await ocultar(["hoy.semana", "hoy.peso", "hoy.ultima", "hoy.descarga"]);
await p.waitForTimeout(700);
const hoy = await txt(".cuerpo");
ok(!/Esta semana/i.test(hoy) && !/Peso/.test(hoy) && !/Última/.test(hoy), "ocultar módulos de Hoy los quita");

await ir("progreso");
const segs = () => p.evaluate(() => [...document.querySelectorAll(".pestana.activa .segmentado button")].map((x) => x.textContent.trim()));
ok((await segs()).length === 4, "Progreso muestra 4 secciones por defecto");
await ocultar(["progreso.musculos", "progreso.cuerpo", "ligas", "fatiga", "comparar"]);
await p.waitForTimeout(700);
ok(JSON.stringify(await segs()) === JSON.stringify(["Resumen", "Ejercicios"]), "ocultar secciones las quita del selector (" + (await segs()).join(",") + ")");
const res = await txt(".cuerpo");
ok(!/Fatiga y descarga/.test(res) && !/Comparar periodos/.test(res) && /Rendimiento/.test(res), "«Más análisis» solo conserva lo activo");
ok((await p.locator(".pestana.activa .pastilla-liga").count()) === 0, "la pastilla de liga desaparece con Ligas apagado");

await ocultar(["progreso.ejercicios", "progreso.musculos", "progreso.cuerpo"]);
await p.waitForTimeout(700);
ok((await segs()).length === 0, "con una sola sección no se muestra el selector");

await p.evaluate(() => { window.__gym.store.guardarAjustes((a) => { a.ocultos = []; }, { analitico: false }); });
await p.waitForTimeout(500);
await ir("ajustes");
await p.locator(".pestana.activa .celda", { hasText: "Módulos" }).first().click(); await p.waitForTimeout(700);
const filas = await p.locator(".pestana.activa [role=switch]").count();
ok(filas >= 18, "la pantalla Módulos lista los interruptores (" + filas + ")");
await p.locator(".pestana.activa .celda", { hasText: "Mesociclos" }).locator("[role=switch]").click(); await p.waitForTimeout(500);
ok((await p.evaluate(() => window.__gym.store.estado.ajustes.ocultos)).join() === "mesociclos", "apagar un interruptor lo guarda");
await p.locator(".pestana.activa .celda", { hasText: "Mesociclos" }).locator("[role=switch]").click(); await p.waitForTimeout(500);
ok((await p.evaluate(() => window.__gym.store.estado.ajustes.ocultos)).length === 0, "y al encenderlo vuelve");
ok((await p.evaluate(() => window.__gym.store.estado.sesiones.length)) > 0, "los datos siguen intactos");
ok(errores.length === 0, "sin errores de consola" + (errores.length ? ": " + errores[0] : ""));
await b.close(); srv.close?.();
process.exit(fallos ? 1 : 0);

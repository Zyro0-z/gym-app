// Navegación: push/pop con la History API, pilas por pestaña, tocar la pestaña activa, gesto de
// volver desde el borde, hojas y alertas. Sin errores de consola. Uso: node e2e/navegacion.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import { servir } from "../serve.mjs";

const nav = { chromium, webkit }[process.argv[2] || "chromium"];
const srv = await servir(8769);
const b = await nav.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
let fallos = 0;
const ok = (c, t) => { console.log((c ? "  ✓ " : "  ✗ ") + t); if (!c) fallos++; };
const estado = () => p.evaluate(() => ({ hash: location.hash, tab: window.__gym.nav.pestana, prof: window.__gym.nav.profundidad, ruta: window.__gym.nav.pantalla.ruta,
  visibles: [...document.querySelectorAll(".pestana.activa .pantalla:not([hidden])")].length }));
const espera = async () => { await p.waitForTimeout(400); await p.waitForFunction(() => document.querySelectorAll(".pestana.activa .pantalla:not([hidden])").length === 1, null, { timeout: 3000 }).catch(() => {}); };

await p.goto("http://127.0.0.1:8769/");
await p.waitForFunction(() => window.__gym);
let e = await estado();
ok(e.tab === "hoy" && e.prof === 0, "arranca en Hoy");

await p.locator(".tabbar [data-tab=ajustes]").click(); await espera();
await p.getByText("Apariencia").click(); await espera();
e = await estado();
ok(e.hash === "#/apariencia" && e.prof === 1 && e.visibles === 1, "push a Apariencia (hash y una sola pantalla visible) " + JSON.stringify(e));
await p.goBack(); await espera();
e = await estado();
ok(e.hash === "#/ajustes" && e.prof === 0 && e.ruta === "ajustes", "atrás del sistema hace pop");

await p.getByText("Datos").click(); await espera();
await p.locator(".tabbar [data-tab=hoy]").click(); await espera();
e = await estado();
ok(e.tab === "hoy" && e.hash === "#/hoy" && e.prof === 0, "cambiar de pestaña con una pila abierta");
await p.locator(".tabbar [data-tab=ajustes]").click(); await espera();
e = await estado();
ok(e.ruta === "datos" && e.hash === "#/datos" && e.prof === 1, "la pila de Ajustes se conserva");
await p.locator(".tabbar [data-tab=ajustes]").click(); await espera();
e = await estado();
ok(e.ruta === "ajustes" && e.prof === 0, "tocar la pestaña activa vuelve a la raíz");

// gesto de borde
await p.getByText("Apariencia").click(); await espera();
await p.mouse.move(6, 400); await p.mouse.down();
for (let x = 20; x <= 320; x += 30) await p.mouse.move(x, 402);
await p.mouse.up(); await espera();
e = await estado();
ok(e.ruta === "ajustes" && e.prof === 0 && e.hash === "#/ajustes", "gesto desde el borde izquierdo vuelve atrás");
await p.getByText("Apariencia").click(); await espera();
await p.mouse.move(6, 400); await p.mouse.down(); for (const x of [20, 35, 50, 60, 64]) { await p.mouse.move(x, 401); await p.waitForTimeout(60); } await p.mouse.up(); await espera();
e = await estado();
ok(e.ruta === "apariencia" && e.prof === 1, "un gesto corto no vuelve atrás");
const tr = await p.evaluate(() => getComputedStyle(window.__gym.nav.pantalla.el).transform);
ok(tr === "none" || tr === "matrix(1, 0, 0, 1, 0, 0)", "y la pantalla vuelve a su sitio");

// hojas y alertas
await p.evaluate(() => window.__gym.nav.ir("guia")); await espera();
await p.evaluate(() => { const s = [...document.querySelectorAll(".pestana.activa .pantalla:not([hidden]) .scroll")].pop(); s.scrollTo(0, s.scrollHeight); });
await p.getByText("Hoja media").click(); await espera();
ok(await p.locator(".hoja").count() === 1, "abre una hoja");
await p.locator(".hoja .btn-barra", { hasText: "Cancelar" }).click(); await espera();
ok(await p.locator(".hoja").count() === 0, "Cancelar la cierra");
await p.getByText("Hoja media").click(); await espera();
await p.locator(".hoja .stepper button").last().click(); await espera();
await p.locator(".velo").click({ position: { x: 200, y: 60 } }); await espera();
ok(await p.locator(".acciones-capa").count() === 1, "con cambios, cerrar pide descartar");
await p.getByText("Descartar cambios").click(); await espera();
ok(await p.locator(".hoja").count() === 0, "descartar cierra la hoja");
await p.getByText("Alerta").click(); await espera();
await p.locator(".alerta button", { hasText: "Cancelar" }).click(); await espera();
ok(await p.locator(".alerta").count() === 0, "la alerta se cierra");

const texto = await p.evaluate(() => document.body.innerText);
for (const malo of ["NaN", "undefined", "[object"]) ok(!texto.includes(malo), "sin «" + malo + "» en pantalla");
ok(!errores.length, "sin errores de consola" + (errores.length ? ": " + errores.join(" | ") : ""));
await b.close(); srv.close();
console.log(fallos ? fallos + " fallos" : "todo bien");
process.exit(fallos ? 1 : 0);

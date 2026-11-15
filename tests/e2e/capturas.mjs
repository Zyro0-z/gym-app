// Capturas de la interfaz v2 para el bucle visual. Uso:
//   node e2e/capturas.mjs <carpeta> [chromium|webkit] [pantallas separadas por comas]
// Carga seed.json (si existe; si no, el conjunto sintético) e informa de errores de consola.
import { chromium, webkit } from "playwright";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { servir } from "../serve.mjs";

const dir = process.argv[2] || "shots", nav = { chromium, webkit }[process.argv[3] || "chromium"];
const solo = process.argv[4] ? process.argv[4].split(",") : null;
mkdirSync(dir, { recursive: true });
const SEED = fileURLToPath(new URL("../../seed.json", import.meta.url));
const datos = existsSync(SEED) ? readFileSync(SEED, "utf8") : null;
const srv = await servir(8767);
const b = await nav.launch();
let fallos = 0;
for (const [w, hh] of [[390, 844], [430, 932]]) for (const tema of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: 2, colorScheme: tema, hasTouch: true, isMobile: nav === chromium });
  const p = await ctx.newPage(); const errores = [];
  p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  await p.goto("http://127.0.0.1:8767/");
  await p.waitForFunction(() => window.__gym);
  if (datos) await p.evaluate(async (t) => { const g = window.__gym; await g.store.importar(g.store.leerCopia(t)); }, datos);
  await p.waitForTimeout(500);
  const pref = `${dir}/${w}-${tema}-`;
  const foto = async (n) => { if (solo && !solo.includes(n)) return; await p.waitForTimeout(450); await p.screenshot({ path: pref + n + ".png" }); };
  const scrollFoto = async (n, veces) => { for (let i = 0; i < veces; i++) { await foto(n + (i ? "-" + (i + 1) : "")); await p.evaluate(() => { const s = [...document.querySelectorAll(".pestana.activa .pantalla:not([hidden]) .scroll")].pop(); s.scrollBy(0, s.clientHeight - 120); }); } };
  const tab = (id) => p.locator(`.tabbar [data-tab=${id}]`).click();
  await foto("1-hoy");
  await tab("progreso"); await foto("2-progreso");
  await tab("historial"); await foto("3-historial");
  await p.locator(".pestana.activa .lista .celda").first().click(); await p.waitForTimeout(500); await foto("4-sesion");
  await tab("ajustes"); await foto("5-ajustes");
  await p.getByText("Apariencia").click(); await foto("6-apariencia");
  await p.locator(".pestana.activa .btn-atras").click(); await p.waitForTimeout(500);
  await p.getByText("Datos").click(); await foto("7-datos");
  await p.evaluate(() => window.__gym.nav.ir("guia")); await p.waitForTimeout(700);
  await scrollFoto("8-guia", 9);
  await p.evaluate(() => { const s = [...document.querySelectorAll(".pestana.activa .pantalla:not([hidden]) .scroll")].pop(); s.scrollTo(0, s.scrollHeight); });
  await p.getByText("Hoja media").click(); await foto("9-hoja");
  await p.locator(".hoja .btn-barra").first().click(); await p.waitForTimeout(500);
  await p.getByText("Hoja de acciones").click(); await foto("9-acciones");
  await p.locator(".acciones-grupo .fuerte").click(); await p.waitForTimeout(300);
  await p.getByText("Alerta").click(); await foto("9-alerta");
  await p.locator(".alerta button").first().click();
  const texto = await p.evaluate(() => document.body.innerText);
  for (const malo of ["NaN", "undefined", "[object", "Infinity"]) if (texto.includes(malo)) errores.push("texto con «" + malo + "»");
  console.log(w, tema, "errores:", errores.length ? errores : "ninguno");
  fallos += errores.length;
  await ctx.close();
}
await b.close(); srv.close();
process.exit(fallos ? 1 : 0);

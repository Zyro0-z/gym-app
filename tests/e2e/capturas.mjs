// Recorre todas las pantallas con datos (seed.json si existe; si no, el conjunto sintético), hace
// capturas para el bucle visual y falla si hay errores de consola o textos rotos. Uso:
//   node e2e/capturas.mjs <carpeta> [chromium|webkit] [pantallas separadas por comas] [solo390]
import { chromium, webkit } from "playwright";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { servir } from "../serve.mjs";
import { fixture } from "../golden/fixture.mjs";

const dir = process.argv[2] || "shots", motor = process.argv[3] || "chromium", nav = { chromium, webkit }[motor];
const solo = process.argv[4] && process.argv[4] !== "-" ? process.argv[4].split(",") : null;
const tamanos = process.argv[5] ? [[390, 844]] : [[390, 844], [430, 932]];
mkdirSync(dir, { recursive: true });
const SEED = fileURLToPath(new URL("../../seed.json", import.meta.url));
// Sin seed.json (CI, clones nuevos) usa los datos sintéticos del golden master
const datos = existsSync(SEED) ? readFileSync(SEED, "utf8") : JSON.stringify(fixture());
const srv = await servir(8767);
const b = await nav.launch();
let fallos = 0;
const MALOS = ["NaN", "undefined", "[object", "Infinity", "null"];

for (const [w, hh] of tamanos) for (const tema of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: w, height: hh }, deviceScaleFactor: 2, colorScheme: tema, hasTouch: true, isMobile: motor === "chromium" });
  const p = await ctx.newPage(); const errores = [];
  p.on("pageerror", (e) => errores.push(e.message + " " + (e.stack || "").split("\n")[1]));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  await p.goto("http://127.0.0.1:8767/");
  await p.waitForFunction(() => window.__gym);
  if (datos) await p.evaluate(async (t) => { const g = window.__gym; await g.store.importar(g.store.leerCopia(t)); }, datos);
  await p.waitForTimeout(400);
  const pref = `${dir}/${w}-${tema}-`;
  const revisar = async (n) => {
    const t = await p.evaluate(() => [...document.querySelectorAll(".pestana.activa .pantalla:not([hidden]), .hoja, .modal-completo, .barra-entreno")].map((x) => x.innerText).join("\n"));
    for (const m of MALOS) if (new RegExp("(^|[^\\p{L}])" + m.replace("[", "\\[") + "($|[^\\p{L}])", "u").test(t)) errores.push(n + ": texto con «" + m + "»");
  };
  const foto = async (n, scroll = 1) => {
    await p.waitForTimeout(450);
    await revisar(n);
    if (solo && !solo.some((s) => n.startsWith(s))) return;
    for (let i = 0; i < scroll; i++) {
      await p.screenshot({ path: pref + n + (i ? "-" + (i + 1) : "") + ".png" });
      const sigue = await p.evaluate(() => { const s = [...document.querySelectorAll(".pestana.activa .pantalla:not([hidden]) .scroll")].pop(); if (!s || s.scrollTop + s.clientHeight >= s.scrollHeight - 4) return false; s.scrollBy(0, s.clientHeight - 140); return true; });
      if (!sigue) break;
      await p.waitForTimeout(250);
    }
  };
  const ir = (r, pestana) => p.evaluate(([r, pestana]) => window.__gym.nav.ir(r, pestana ? { pestana } : {}), [r, pestana]);
  const tab = async (id) => { await p.locator(`.tabbar [data-tab=${id}]`).click(); await p.waitForTimeout(350); };
  const ids = await p.evaluate(() => {
    const g = window.__gym, A = g.store.analisis(), e = g.store.estado;
    const L = A.liga && A.liga.ok ? [...A.liga.grupos.keys()][0] : null;
    return { ej: A.ejercicios[0] && A.ejercicios[0].k, ses: e.sesiones[0] && e.sesiones[0].id, rut: e.rutinas[0] && e.rutinas[0].id, cat: e.catalogo[0] && e.catalogo[0].id, liga: L, grupo: e.ajustes.grupos[0].nombre };
  });

  await foto("01-hoy", 2);
  await tab("progreso");
  for (const [i, s] of ["Resumen", "Ejercicios", "Músculos", "Cuerpo"].entries()) {
    await p.locator(".pestana.activa .segmentado button", { hasText: s }).first().click();
    await foto("02-progreso-" + (i + 1) + "-" + s.toLowerCase(), 3);
  }
  await p.locator(".pestana.activa .segmentado button", { hasText: "Resumen" }).first().click();
  if (ids.ej) { await ir("ejercicio/" + encodeURIComponent(ids.ej)); await foto("03-ejercicio", 3); }
  await tab("progreso"); await tab("progreso");
  await ir("grupo/" + encodeURIComponent(ids.grupo)); await foto("04-grupo", 2);
  await tab("progreso"); await tab("progreso");
  await ir("ligas"); await foto("05-ligas", 3);
  if (ids.liga) { await ir("liga/grupo/" + encodeURIComponent(ids.liga)); await foto("05-liga", 2); }
  for (const [n, r] of [["05-fatiga", "fatiga"], ["05-comparar", "comparar"], ["05-medidas", "medidas"]]) { await tab("progreso"); await tab("progreso"); await ir(r); await foto(n, 2); }
  await tab("historial"); await foto("06-historial", 2);
  if (ids.ses) { await ir("sesion/" + encodeURIComponent(ids.ses)); await foto("07-sesion", 2); }
  await tab("ajustes"); await tab("ajustes"); await foto("08-ajustes", 2);
  for (const [n, r] of [["09-rutinas", "rutinas"], ["10-rutina", ids.rut && "rutina/" + encodeURIComponent(ids.rut)], ["11-horario", "horario"], ["12-ejercicios", "ejercicios"],
    ["13-ejercicio-cat", ids.cat && "ejercicioCat/" + encodeURIComponent(ids.cat)], ["14-entrenamiento", "entrenamiento"], ["15-objetivos", "objetivos"], ["16-cuerpo", "cuerpo"],
    ["17-bloques", "bloques"], ["18-bloque", "bloque/+"], ["19-grupos", "grupos"], ["20-apariencia", "apariencia"], ["21-datos", "datos"], ["22-calidad", "calidad"], ["23-avanzado", "avanzado"]]) {
    if (!r) continue;
    await tab("ajustes"); await tab("ajustes");
    await ir(r); await foto(n, 2);
  }
  // Entrenamiento: empezar con la primera rutina, marcar una serie, descanso, minimizar
  await tab("hoy");
  await p.evaluate(async (rut) => { const g = window.__gym; const r = g.store.estado.rutinas.find((x) => x.id === rut); await g.entreno.empezar(r ? r.nombre : null); }, ids.rut);
  await p.waitForTimeout(700); await foto("24-entreno", 2);
  const rec = p.locator(".modal-completo .celda", { hasText: "Cómo llegas hoy" });
  if (await rec.count()) { await rec.click(); await p.waitForTimeout(600); await foto("24-recuperacion"); await p.locator(".hoja .btn-barra", { hasText: "Cancelar" }).click(); await p.waitForTimeout(500); }
  const check = p.locator(".modal-completo .serie .check").first();
  if (await check.count()) { await check.click(); await p.waitForTimeout(400); await foto("25-entreno-descanso"); }
  const kgIn = p.locator(".modal-completo .serie input").first();
  if (await kgIn.count()) { await kgIn.click(); await p.waitForTimeout(400); await foto("26-entreno-teclado"); await p.locator(".barra-teclado button", { hasText: "Siguiente" }).click().catch(() => {}); }
  await p.locator(".modal-completo [aria-label=Minimizar]").click(); await p.waitForTimeout(600); await foto("27-barra-entreno");
  await p.locator(".barra-entreno").click(); await p.waitForTimeout(600);
  await p.locator(".modal-completo button", { hasText: "Terminar" }).click(); await p.waitForTimeout(600); await foto("28-terminar");
  await p.evaluate(() => window.__gym.entreno.descartar && window.__gym.entreno.descartar());
  console.log(w, tema, "errores:", errores.length ? errores : "ninguno");
  fallos += errores.length;
  await ctx.close();
}
await b.close(); srv.close();
process.exit(fallos ? 1 : 0);

// Capturas de las pantallas principales para comparar antes/después. Uso: node shots.mjs <carpeta> [chromium|webkit]
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { servir } from "./serve.mjs";
const dir = process.argv[2] || "shots", nav = { chromium, webkit }[process.argv[3] || "chromium"];
mkdirSync(dir, { recursive: true });
const srv = await servir(8766);
const b = await nav.launch();
for (const tema of ["dark", "light"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema, isMobile: nav === chromium, hasTouch: true });
  const p = await ctx.newPage(); const errores = [];
  p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  await p.goto("http://127.0.0.1:8766/"); await p.waitForTimeout(1500);
  const foto = async (n, full = false) => { await p.waitForTimeout(400); await p.screenshot({ path: `${dir}/${tema}-${n}.png`, fullPage: full }); };
  await foto("1-entrenar");
  await p.locator("#tabs [data-v=dashboard]").click(); await p.waitForTimeout(2500); await foto("2-dashboard"); await foto("2-dashboard-full", true);
  await p.locator("#tabs [data-v=historial]").click(); await foto("3-historial");
  await p.locator("#tabs [data-v=ajustes]").click(); await foto("4-ajustes");
  await p.locator("#tabs [data-v=entrenar]").click(); await p.waitForTimeout(300);
  await p.getByText("Pierna", { exact: false }).first().click(); await foto("5-sesion");
  console.log(tema, "errores:", errores.length ? errores : "ninguno");
  await ctx.close();
}
await b.close(); srv.close();

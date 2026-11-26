// Deslizamiento entre pestañas: arrastrar la pantalla, arrastrar el dedo por la tab bar, extremos, scroll vertical,
// pantallas interiores y animación al tocar. Uso: node e2e/deslizar.mjs [chromium]
import { chromium } from "playwright";
import { servir } from "../serve.mjs";

const srv = await servir(8772);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
let fallos = 0;
const ok = (c, t) => { console.log((c ? "  ✓ " : "  ✗ ") + t); if (!c) fallos++; };
const cdp = await ctx.newCDPSession(p);
const tocaEnVivo = async (de, a, pasos, sonda) => {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: de[0], y: de[1] }] });
  for (let i = 1; i <= pasos; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: de[0] + ((a[0] - de[0]) * i) / pasos, y: de[1] }] }); await p.waitForTimeout(20); }
  const r = await sonda();
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(800);
  return r;
};
const toque = async (puntos, { pasos = 8, pausa = 16 } = {}) => {
  const [a, ...resto] = puntos;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a[0], y: a[1] }] });
  for (const q of resto) {
    for (let i = 1; i <= pasos; i++) {
      const x = a[0] + ((q[0] - a[0]) * i) / pasos, y = a[1] + ((q[1] - a[1]) * i) / pasos;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] }); await p.waitForTimeout(pausa);
    }
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await p.waitForTimeout(700);
};
const pestana = () => p.evaluate(() => window.__gym.nav.pestana);
const limpio = () => p.evaluate(() => !document.querySelector(".pestana.deslizando") && [...document.querySelectorAll(".pestana")].every((e) => !e.style.transform));

await p.goto("http://127.0.0.1:8772/");
await p.waitForFunction(() => window.__gym);
await p.waitForTimeout(500);
ok((await pestana()) === "hoy", "arranca en Hoy");

await toque([[320, 300], [60, 300]]);
ok((await pestana()) === "progreso" && await limpio(), "deslizar a la izquierda abre Progreso");
await toque([[60, 300], [330, 300]]);
ok((await pestana()) === "hoy" && await limpio(), "deslizar a la derecha vuelve a Hoy");
await toque([[60, 300], [330, 300]]);
ok((await pestana()) === "hoy" && await limpio(), "en el primer extremo no pasa nada y no queda estado a medias");
await toque([[200, 300], [230, 300]]);
ok((await pestana()) === "hoy" && await limpio(), "un arrastre corto vuelve a su sitio");
await toque([[200, 500], [200, 200]]);
ok((await pestana()) === "hoy", "el scroll vertical no cambia de pestaña");

const vivo = await tocaEnVivo([[60, 780]][0], [200, 780], 6, () => p.evaluate(() => [...document.querySelectorAll(".pestana")].filter((e) => e.classList.contains("deslizando")).map((e) => e.dataset.tab + ":" + Math.round(new DOMMatrix(getComputedStyle(e).transform).m41))));
ok(vivo.length === 2 && vivo.some((x) => !x.endsWith(":0")), "arrastrando por la tab bar las pantallas siguen al dedo a mitad de camino (" + vivo.join(" ") + ")");
await toque([[60, 780], [330, 780]]);
ok((await pestana()) === "ajustes" && await limpio(), "arrastrar por la tab bar de Hoy a Ajustes abre Ajustes");
await toque([[330, 780], [200, 780]]);
ok((await pestana()) === "progreso" || (await pestana()) === "historial", "arrastrar por la tab bar hacia atrás abre la pestaña bajo el dedo (" + (await pestana()) + ")");
await p.locator(".tabbar [data-tab=hoy]").click(); await p.waitForTimeout(700);
ok((await pestana()) === "hoy" && await limpio(), "tocar una pestaña la abre y no deja capas a medias");

await p.locator(".tabbar [data-tab=progreso]").click(); await p.waitForTimeout(700);
const segActual = () => p.evaluate(() => document.querySelector(".pestana.activa .segmentado [aria-checked=true], .pestana.activa .segmentado [aria-pressed=true]")?.textContent);
const s0 = await segActual();
await toque([[320, 400], [60, 400]]);
const s1 = await segActual();
ok((await pestana()) === "progreso" && s0 !== s1, "en Progreso deslizar cambia de sección (" + s0 + " → " + s1 + ")");
await toque([[60, 400], [330, 400]]);
ok((await pestana()) === "progreso" && (await segActual()) === s0, "y al revés vuelve a la anterior");
await toque([[60, 400], [330, 400]]);
ok((await pestana()) === "hoy" && await limpio(), "en la primera sección deslizar a la derecha pasa a la pestaña anterior");

await p.locator(".tabbar [data-tab=ajustes]").click(); await p.waitForTimeout(700);
await p.getByText("Apariencia").click(); await p.waitForTimeout(700);
await toque([[320, 400], [60, 400]]);
ok((await pestana()) === "ajustes" && await p.evaluate(() => window.__gym.nav.profundidad) === 1, "en una pantalla interior no se desliza de pestaña");

ok(errores.length === 0, "sin errores de consola " + errores.join("|"));
await b.close(); srv.close?.();
process.exit(fallos ? 1 : 0);

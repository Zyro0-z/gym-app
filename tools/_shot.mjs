import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { servir } from "../tests/serve.mjs";
const [,, dir, ruta="", ...temas] = process.argv;
mkdirSync(dir,{recursive:true});
const datos = readFileSync("/tmp/seed.json","utf8");
const srv = await servir(8771);
const b = await chromium.launch();
for (const tema of (temas.length?temas:["dark","light"])) {
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, colorScheme:tema, hasTouch:true, isMobile:true });
  const p = await ctx.newPage();
  p.on("pageerror", e=>console.log("ERR",e.message));
  await p.goto("http://127.0.0.1:8771/");
  await p.waitForFunction(()=>window.__gym);
  await p.evaluate(async (t)=>{const g=window.__gym; await g.store.importar(g.store.leerCopia(t));}, datos);
  await p.waitForTimeout(500);
  if (ruta === "entreno") {
    await p.evaluate(async()=>{const g=window.__gym; const r=g.store.estado.rutinas[0]; await g.entreno.empezar(r?r.nombre:null);});
    await p.waitForTimeout(700);
    const c = p.locator(".modal-completo .serie .check").first(); if (await c.count()) { await c.click(); await p.waitForTimeout(500); }
  } else if (ruta === "ej1") {
    await p.evaluate(()=>{const g=window.__gym; const A=g.store.analisis(); const e=A.ejercicios.find(x=>/press banca/i.test(x.nombre))||A.ejercicios[0]; g.nav.ir("ejercicio/"+encodeURIComponent(e.k));});
  } else if (ruta.startsWith("tab:")) {
    const [, id, seg] = ruta.split(":");
    await p.locator(`.tabbar [data-tab=${id}]`).click(); await p.waitForTimeout(500);
    if (seg) { await p.locator(".pestana.activa .segmentado button", { hasText: seg }).first().click(); await p.waitForTimeout(600); }
  } else if (ruta) await p.evaluate((r)=>window.__gym.nav.ir(r), ruta);
  await p.waitForTimeout(600);
  if (process.env.CLICK) { await p.locator(process.env.CLICK).first().click({ force: true }); await p.waitForTimeout(800); }
  await p.screenshot({path:`${dir}/${tema}.png`});
}
await b.close(); srv.close?.();

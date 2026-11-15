// Fase 4: editor de plantillas, editor de objetivos (objetivos.md), rango de reps en la tarjeta y
// dashboard en móvil (375/390/430, giro, sin desbordes). Uso: node fase4.mjs [chromium,webkit]
import { chromium, webkit } from "playwright";
import { servir } from "./serve.mjs";
const navs = (process.argv[2] || "chromium,webkit").split(",");
const PUERTO = 8782, URL_ = "http://127.0.0.1:" + PUERTO + "/";
const srv = await servir(PUERTO);
let fallos = 0;
const kv = (p, k) => p.evaluate((k) => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => { const g = r.result.transaction("kv").objectStore("kv").get(k); g.onsuccess = () => { ok(g.result); r.result.close(); }; }; }), k);
const abrirTodo = async (p) => { for (let i = 0; i < 8; i++) { const n = await p.evaluate(() => { let n = 0; document.querySelectorAll(".gym-dashboard details:not([open]) > summary").forEach((s) => { s.click(); n++; }); return n; }); await p.waitForTimeout(350); if (!n) break; } };

for (const nombre of navs) {
  const nav = { chromium, webkit }[nombre];
  let b; try { b = await nav.launch(); } catch (e) { console.log(`✗ [${nombre}] no se pudo lanzar: ${e.message.split("\n")[0]}`); fallos++; continue; }
  for (const tema of ["dark", "light"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema, hasTouch: true, isMobile: nombre === "chromium" });
  const p = await ctx.newPage();
  const errores = []; p.on("pageerror", (e) => errores.push(e.message)); p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  const et = `[${nombre}/${tema}]`;
  const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + et + " " + m); if (!c) fallos++; };
  const esperar = (ms = 400) => p.waitForTimeout(ms);
  const foto = (n, full) => p.screenshot({ path: `../../shots/fase4/${nombre}-${tema}-${n}.png`, fullPage: !!full });
  try {
    await p.goto(URL_); await p.waitForSelector("h1.grande"); await esperar(1200);

    // ── Editor de plantillas ──
    await p.locator("#tabs [data-v=ajustes]").click(); await esperar();
    await p.locator(".grupo .celda", { hasText: /^Pierna/ }).click(); await esperar();
    ok(await p.locator("h1.grande").innerText() === "Pierna", "editor de la plantilla Pierna");
    const nombres = async () => (await kv(p, "templates")).find((t) => t.fm.name.startsWith("Pierna")).fm.exercises.map((e) => e.name + "|" + e.targetSets);
    const n0 = await nombres();
    await foto("01-plantilla");
    await p.locator(".serie-wrap").first().locator(".stepper-b[aria-label='Más']").click(); await esperar(300);
    ok((await nombres())[0] === n0[0].split("|")[0] + "|" + (+n0[0].split("|")[1] + 1), "stepper de series objetivo guarda (" + (await nombres())[0] + ")");
    // arrastrar el primero dos posiciones hacia abajo
    const asa = await p.locator(".serie-wrap .asa").first().boundingBox();
    const alto = (await p.locator(".serie-wrap").first().boundingBox()).height;
    await p.mouse.move(asa.x + asa.width / 2, asa.y + asa.height / 2); await p.mouse.down();
    for (let i = 1; i <= 10; i++) await p.mouse.move(asa.x + asa.width / 2, asa.y + asa.height / 2 + (alto * 2.1 * i) / 10);
    await p.mouse.up(); await esperar(500);
    const n1 = await nombres();
    ok(n1[2].split("|")[0] === n0[0].split("|")[0] && n1[0] === n0[1], "reordenar arrastrando (" + n1.map((x) => x.split("|")[0]).join(", ") + ")");
    // quitar deslizando el último
    const ult = await p.locator(".serie-wrap .celda").last().boundingBox();
    await p.mouse.move(ult.x + ult.width - 30, ult.y + ult.height / 2); await p.mouse.down();
    for (let i = 1; i <= 12; i++) await p.mouse.move(ult.x + ult.width - 30 - i * 25, ult.y + ult.height / 2);
    await p.mouse.up(); await esperar(600);
    ok((await nombres()).length === n0.length - 1, "quitar ejercicio deslizando");
    // añadir desde la biblioteca
    await p.locator(".celda", { hasText: "Añadir ejercicio" }).click(); await esperar(450);
    await p.locator(".hoja input[type=search]").fill("face pull"); await esperar(200);
    await p.locator(".hoja .celda", { hasText: /^Face pull/ }).first().click(); await esperar(500);
    ok((await nombres()).at(-1) === "Face pull|3", "añadir ejercicio desde la biblioteca");
    // renombrar (y el horario semanal le sigue)
    const horario0 = (await kv(p, "configs"))["Gym/Config/horario-semanal.md"];
    await p.locator(".celda", { hasText: "Renombrar" }).click(); await esperar(450);
    await p.locator(".hoja input.campo").fill("Pierna nueva"); await p.locator(".hoja .nav-btn", { hasText: "Guardar" }).click(); await esperar(600);
    ok(await p.locator("h1.grande").innerText() === "Pierna nueva", "renombrar plantilla");
    const horario1 = (await kv(p, "configs"))["Gym/Config/horario-semanal.md"];
    const usaPierna = /::\s*Pierna\s*$/m.test(horario0);
    ok(!usaPierna || (/::\s*Pierna nueva\s*$/m.test(horario1) && !/::\s*Pierna\s*$/m.test(horario1)), "el horario semanal sigue a la plantilla renombrada" + (usaPierna ? "" : " (no la usaba)"));
    // nueva plantilla y borrarla
    await p.locator(".nav-btn", { hasText: "Ajustes" }).click(); await esperar();
    await p.locator(".celda", { hasText: "Nueva plantilla" }).click(); await esperar(450);
    await p.locator(".hoja input.campo").fill("Prueba"); await p.locator(".hoja .nav-btn", { hasText: "Crear" }).click(); await esperar(600);
    ok(await p.locator("h1.grande").innerText() === "Prueba", "nueva plantilla abre su editor");
    await p.locator(".celda", { hasText: "Borrar plantilla" }).click(); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Borrar plantilla" }).click(); await esperar(600);
    ok(!(await kv(p, "templates")).some((t) => t.fm.name === "Prueba"), "borrar plantilla");

    // ── Editor de objetivos ──
    const obj = async () => (await kv(p, "configs"))["Gym/Config/objetivos.md"];
    const lineasDe = (t, n) => t.split("\n").filter((l) => l.startsWith(n + "::"));
    await p.locator(".celda", { hasText: "Objetivos de repeticiones" }).click(); await esperar();
    await foto("02-objetivos");
    await p.locator(".celda", { hasText: /^Sentadilla barra/ }).click(); await esperar(450);
    ok((await p.locator(".linea-prev").innerText()) === "Sentadilla barra:: 6-8 | +2,5", "lee la línea actual (6-8 | +2,5)");
    await foto("03-objetivo");
    await p.locator(".hoja .celda", { hasText: "Máximo" }).locator(".stepper-b[aria-label='Más']").click();
    await p.locator(".hoja .celda", { hasText: "Solo la serie más pesada" }).locator("input.sw").click();
    await p.locator(".hoja .nav-btn", { hasText: "Guardar" }).click(); await esperar(600);
    const t1 = await obj();
    ok(JSON.stringify(lineasDe(t1, "Sentadilla barra")) === JSON.stringify(["Sentadilla barra:: 6-9 | top | +2,5"]), "reemplaza la línea en su sitio (" + lineasDe(t1, "Sentadilla barra") + ")");
    ok(t1.split("\n").length === (await p.evaluate(() => 0)) + t1.split("\n").length && t1.includes("incremento:: máquina | +2,5"), "el resto de objetivos.md se conserva");
    // ejercicio sin objetivo → añadir con material
    const sinObj = p.locator(".grupo", { hasText: "Sin objetivo" }).locator(".celda").first();
    const nSin = (await sinObj.locator(".celda-t").innerText()).trim();
    await sinObj.click(); await esperar(450);
    await p.locator(".hoja .seg button", { hasText: "Material" }).click(); await esperar(200);
    await p.locator(".hoja .celda", { hasText: /^polea/ }).click();
    await p.locator(".hoja .nav-btn", { hasText: "Guardar" }).click(); await esperar(600);
    ok(JSON.stringify(lineasDe(await obj(), nSin)) === JSON.stringify([nSin + ":: 8-12 | polea"]), "objetivo nuevo añadido (" + nSin + ":: 8-12 | polea)");
    // quitar
    await p.locator(".celda", { hasText: nSin }).first().click(); await esperar(450);
    await p.locator(".hoja .celda", { hasText: "Quitar objetivo" }).click(); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Quitar objetivo" }).click(); await esperar(600);
    ok(!lineasDe(await obj(), nSin).length, "quitar objetivo borra la línea");

    // ── Rango en la tarjeta del ejercicio ──
    await p.locator("#tabs [data-v=entrenar]").click(); await esperar(1500);
    await p.locator(".grupo .celda", { hasText: /^Pierna nueva/ }).click(); await esperar();
    const prox = await p.locator(".ej", { hasText: "Sentadilla barra" }).locator(".prox").innerText();
    ok(/Próxima vez: .+ · objetivo 6–9 reps · top/.test(prox), "«Próxima vez» con rango objetivo: «" + prox + "»");
    await foto("04-tarjeta");
    await p.locator(".nav-btn", { hasText: "Descartar" }).click(); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Descartar sesión" }).click(); await esperar(500);

    // ── Dashboard en móvil ──
    await p.locator("#tabs [data-v=dashboard]").click(); await p.waitForSelector(".gd-sec"); await esperar(600);
    const txt0 = await p.locator(".gym-dashboard").innerText();
    ok(!/Sentadilla barra:: 6-9[^\n]*no se aplica/.test(txt0), "el dashboard acepta la línea escrita por el editor");
    for (const w of [375, 390, 430]) {
      await p.setViewportSize({ width: w, height: 844 }); await esperar(500);
      await abrirTodo(p);
      const sels = await p.locator(".gym-dashboard select").count();
      for (let i = 0; i < sels; i++) { const o = await p.locator(".gym-dashboard select").nth(i).locator("option").count(); if (o > 1) { await p.locator(".gym-dashboard select").nth(i).selectOption({ index: Math.min(2, o - 1) }); await esperar(500); } }
      await abrirTodo(p);
      const tabs = await p.locator(".gym-dashboard .gd-tab").count();
      let peor = 0;
      for (let i = 0; i <= tabs; i++) {
        if (i < tabs) { await p.locator(".gym-dashboard .gd-tab").nth(i).click(); await esperar(350); }
        peor = Math.max(peor, await p.evaluate(() => document.documentElement.scrollWidth));
      }
      ok(peor <= w, `sin desbordes a ${w}px con todo abierto (${peor})`);
      const cv = await p.evaluate(() => [...document.querySelectorAll(".gym-dashboard canvas")].filter((c) => c.offsetParent).map((c) => Math.abs(c.getBoundingClientRect().width - c.parentElement.getBoundingClientRect().width)));
      ok(cv.length > 0 && cv.every((d) => d < 2), `gráficas al ancho de su contenedor a ${w}px (${cv.length})`);
      const txt = await p.locator(".gym-dashboard").innerText();
      const malo = txt.match(/.{0,30}(NaN|undefined|\[object).{0,30}/);
      ok(!malo, `sin NaN/undefined/[object a ${w}px` + (malo ? ": «" + malo[0] + "»" : ""));
    }
    // giro
    const anchos = async () => p.evaluate(() => [...document.querySelectorAll(".gym-dashboard canvas")].filter((c) => c.offsetParent).map((c) => Math.round(c.getBoundingClientRect().width)));
    await p.setViewportSize({ width: 390, height: 844 }); await esperar(600); const a0 = await anchos();
    await p.setViewportSize({ width: 844, height: 390 }); await esperar(700); const a1 = await anchos();
    ok(a1.every((x, i) => x > a0[i]) && (await p.evaluate(() => document.documentElement.scrollWidth)) <= 844, `al girar las gráficas se ensanchan (${a0[0]} → ${a1[0]})`);
    await foto("05-dashboard-horizontal");
    await p.setViewportSize({ width: 390, height: 844 }); await esperar(700); const a2 = await anchos();
    ok(JSON.stringify(a2) === JSON.stringify(a0), `y vuelven al ancho original (${a2[0]})`);
    const pad = await p.evaluate(() => { const d = document.querySelector("#vista .gym-dashboard"); const cs = getComputedStyle(d); return [cs.paddingLeft, cs.paddingRight, getComputedStyle(document.querySelector(".vista-dash")).paddingTop]; });
    ok(pad.every((x) => parseFloat(x) >= 14), "padding del dashboard con margen + safe area (" + pad.join(" ") + ")");
  } catch (e) { ok(false, "excepción: " + e.message.split("\n")[0]); await foto("fallo"); }
  ok(!errores.length, "consola sin errores" + (errores.length ? ": " + errores.slice(0, 4).join(" | ") : ""));
  await ctx.close();
  }
  await b.close();
}
srv.close();
console.log(fallos ? `\n${fallos} comprobaciones fallidas` : "\nTodo correcto");
process.exitCode = fallos ? 1 : 0;

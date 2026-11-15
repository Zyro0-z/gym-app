// Prueba de extremo a extremo. Uso: node run.mjs [chromium,webkit] [--shots carpeta]
// Recorre: arranque sembrado, sesión desde plantilla, series, descanso, barra del teclado, borrar
// serie deslizando, ejercicio nuevo, terminar y guardar, editar y borrar sesión, dashboard con todas
// las secciones abiertas, exportar/importar JSON y recarga a mitad de sesión. En claro y oscuro,
// 390×844 a 2x. Falla ante cualquier error de consola o «NaN», «undefined», «[object» en el dashboard.
import { chromium, webkit } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { servir } from "./serve.mjs";

const args = process.argv.slice(2);
const navs = (args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--shots") || "chromium,webkit").split(",");
const shots = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
if (shots) mkdirSync(shots, { recursive: true });
const PUERTO = 8780, URL_ = "http://127.0.0.1:" + PUERTO + "/";
const srv = await servir(PUERTO);
let fallos = 0;

const leerKV = (p, k) => p.evaluate((k) => new Promise((ok, ko) => {
  const r = indexedDB.open("gymapp"); r.onerror = () => ko(r.error);
  r.onsuccess = () => { const t = r.result.transaction("kv").objectStore("kv").get(k); t.onsuccess = () => { ok(t.result); r.result.close(); }; };
}), k);

function validarSesion(fm) {
  const e = [];
  if (fm.type !== "workout") e.push("type");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date)) e.push("date");
  if (!/^\d{2}:\d{2}$/.test(fm.start) || !/^\d{2}:\d{2}$/.test(fm.end)) e.push("start/end");
  if (!Number.isInteger(fm.duration)) e.push("duration");
  if (typeof fm.template !== "string") e.push("template");
  const claves = Object.keys(fm).sort().join(",");
  if (claves !== "date,duration,end,exercises,start,template,type") e.push("claves: " + claves);
  for (const x of fm.exercises) {
    if (typeof x.name !== "string" || Object.keys(x).sort().join(",") !== "name,sets") e.push("ejercicio");
    for (const s of x.sets) {
      if (typeof s.weight !== "number" || !Number.isInteger(s.reps) || s.unit !== "kg") e.push("serie " + JSON.stringify(s));
      if ("setType" in s && !["warmup", "failure", "drop"].includes(s.setType)) e.push("setType");
      if (Object.keys(s).some((k) => !["weight", "reps", "unit", "setType"].includes(k))) e.push("clave extra en serie");
    }
  }
  return e;
}

async function probar(nombreNav, tema) {
  const nav = { chromium, webkit }[nombreNav];
  let b;
  try { b = await nav.launch(); } catch (e) { console.log(`✗ [${nombreNav}] no se pudo lanzar: ${e.message.split("\n")[0]}`); fallos++; return; }
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema, hasTouch: true, isMobile: nombreNav === "chromium", acceptDownloads: true });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errores.push(m.text()); });
  const et = `[${nombreNav}/${tema}]`;
  const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + et + " " + m); if (!c) fallos++; return c; };
  const foto = async (n, full) => { if (shots) await p.screenshot({ path: `${shots}/${nombreNav}-${tema}-${n}.png`, fullPage: !!full }); };
  const esperar = (ms = 350) => p.waitForTimeout(ms);
  const sinDesborde = async (donde) => { const w = await p.evaluate(() => document.documentElement.scrollWidth); ok(w <= 390, `sin scroll horizontal en ${donde} (${w}px)`); };
  const paso = async (titulo, fn) => { try { await fn(); } catch (e) { ok(false, titulo + ": " + e.message.split("\n")[0]); await foto("fallo-" + titulo.replace(/\W+/g, "_")); } };

  await paso("arranque", async () => {
    await p.goto(URL_); await p.waitForSelector("h1.grande"); await esperar(1200);
    ok(await p.locator("h1.grande").innerText() === "Entrenar", "arranca en Entrenar con datos sembrados");
    ok((await p.locator(".grupo .celda", { hasText: "Pierna" }).count()) >= 1, "plantillas listadas");
    await sinDesborde("Entrenar"); await foto("01-entrenar");
  });

  await paso("empezar sesión", async () => {
    await p.locator(".grupo .celda", { hasText: /^Pierna/ }).first().click(); await esperar();
    ok(await p.locator(".nav.sesion").isVisible(), "pantalla de sesión");
    ok((await p.locator(".ej").count()) === 5, "5 ejercicios de la plantilla Pierna");
    ok(await p.locator("#tabs").isVisible(), "barra de pestañas visible durante la sesión");
    await sinDesborde("sesión"); await foto("02-sesion");
  });

  await paso("marcar serie y descanso", async () => {
    const ej = p.locator(".ej").first();
    await ej.locator(".serie .ok").first().click(); await esperar();
    ok(await ej.locator(".serie").first().evaluate((e) => e.classList.contains("hecha")), "serie marcada");
    ok((await ej.locator(".ej-prog").innerText()) === "1/4", "progreso 1/4");
    ok(await p.locator(".descanso").isVisible(), "barra de descanso visible");
    const t1 = await p.locator(".descanso [data-t]").innerText();
    await p.locator(".descanso button", { hasText: "+15" }).click(); await esperar(300);
    const t2 = await p.locator(".descanso [data-t]").innerText();
    const s = (t) => { const [m, x] = t.split(":").map(Number); return m * 60 + x; };
    ok(s(t2) - s(t1) >= 13, `+15 s (${t1} → ${t2})`);
    const tabs = await p.locator("#tabs").boundingBox(), d = await p.locator(".descanso").boundingBox();
    ok(d.y + d.height <= tabs.y, "el descanso no tapa la barra de pestañas");
    await foto("03-descanso");
    await p.locator(".descanso button", { hasText: "Saltar" }).click(); await esperar();
    ok(!(await p.locator(".descanso").count()), "saltar descanso");
  });

  await paso("barra del teclado", async () => {
    const peso = p.locator(".ej").first().locator(".serie input").nth(2);   // serie 2, peso
    await peso.focus(); await esperar(200);
    ok(await p.locator(".barra-teclado").isVisible(), "barra − / + visible al editar");
    const antes = await peso.inputValue();
    await p.locator(".barra-teclado button[aria-label=Sumar]").click();
    ok(await peso.inputValue() === (Number(antes.replace(",", ".")) + 2.5).toString().replace(".", ","), `+ suma 2,5 kg (${antes} → ${await peso.inputValue()})`);
    await p.locator(".barra-teclado button[aria-label=Restar]").click();
    ok(await peso.inputValue() === antes, "− resta 2,5 kg");
    await p.locator(".barra-teclado .bt-sig").click();
    ok(await p.evaluate(() => document.activeElement.getAttribute("aria-label")) === "Repeticiones, serie 2", "Siguiente: peso → reps");
    await p.locator(".barra-teclado .bt-sig").click();
    ok(await p.evaluate(() => document.activeElement.getAttribute("aria-label")) === "Peso, serie 3", "Siguiente: reps → peso de la serie siguiente");
    await p.keyboard.press("Enter");
    ok(await p.evaluate(() => document.activeElement.getAttribute("aria-label")) === "Repeticiones, serie 3", "Enter = Siguiente");
    await foto("04-teclado");
    await p.evaluate(() => document.activeElement.blur()); await esperar(100);
    ok(!(await p.locator(".barra-teclado").isVisible()), "la barra se oculta al salir del campo");
  });

  await paso("borrar serie deslizando", async () => {
    const ej = p.locator(".ej").nth(1);
    const n0 = await ej.locator(".serie").count();
    const f = await ej.locator(".serie").last().boundingBox();
    await p.mouse.move(f.x + f.width - 70, f.y + f.height / 2); await p.mouse.down();
    for (let i = 1; i <= 12; i++) await p.mouse.move(f.x + f.width - 70 - i * 25, f.y + f.height / 2);
    await p.mouse.up(); await esperar(500);
    ok(await ej.locator(".serie").count() === n0 - 1, `swipe a la izquierda borra la serie (${n0} → ${await ej.locator(".serie").count()})`);
  });

  await paso("ejercicio nuevo", async () => {
    await p.locator(".anadir-ej").click(); await esperar(450);
    await p.locator(".hoja input[type=search]").fill("Hip thrust prueba");
    await p.locator(".hoja .celda", { hasText: "Crear «Hip thrust prueba»" }).click(); await esperar(450);
    const anadir = p.locator(".hoja .nav-btn", { hasText: "Añadir" });
    ok(await anadir.isDisabled(), "grupo muscular sin preseleccionar: «Añadir» desactivado");
    ok(!(await p.locator(".hoja .celda.elegida").count()), "ningún grupo marcado al abrir");
    await foto("05-grupo");
    await p.locator(".hoja .celda", { hasText: /^Pierna$/ }).click();
    ok(!(await anadir.isDisabled()), "«Añadir» activo tras elegir grupo");
    await anadir.click(); await esperar(900);
    const ult = p.locator(".ej").last();
    ok((await ult.locator(".ej-n").innerText()).startsWith("Hip thrust prueba"), "ejercicio añadido a la sesión");
    const cfg = await leerKV(p, "configs");
    ok(/^Hip thrust prueba:: Pierna$/m.test(cfg["Gym/Config/grupos-musculares.md"]), "línea añadida a grupos-musculares");
    const ins = ult.locator(".serie input");
    await ins.nth(0).fill("60,5"); await ins.nth(1).fill("10");
    await ult.locator(".serie .ok").first().click(); await esperar();
    await p.locator(".descanso button", { hasText: "Saltar" }).click();
  });

  let sesiones0 = (await leerKV(p, "sessions")).length;
  await paso("terminar y guardar", async () => {
    await p.locator(".nav-btn", { hasText: "Terminar" }).click(); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Terminar sesión" }).click(); await esperar(700);
    ok(await p.locator(".hoja h1", { hasText: "Sesión guardada" }).isVisible(), "hoja de resumen"); await esperar(400);
    await foto("06-resumen");
    // cerrar arrastrando hacia abajo desde el grabber
    const g = await p.locator(".hoja .grabber").boundingBox();
    await p.mouse.move(g.x + g.width / 2, g.y + 5); await p.mouse.down();
    for (let i = 1; i <= 10; i++) await p.mouse.move(g.x + g.width / 2, g.y + 5 + i * 30);
    await p.mouse.up(); await esperar(600);
    ok(!(await p.locator(".hoja").count()), "el resumen se cierra arrastrando");
    const ss = await leerKV(p, "sessions");
    ok(ss.length === sesiones0 + 1, "sesión guardada en IndexedDB");
    const nueva = ss[ss.length - 1].fm;
    const err = validarSesion(nueva);
    ok(!err.length, "formato de sesión intacto " + (err.length ? err.join("; ") : ""));
    const hip = nueva.exercises.find((x) => x.name === "Hip thrust prueba");
    ok(hip && hip.sets[0].weight === 60.5 && hip.sets[0].reps === 10, "coma decimal guardada como número (60,5 → 60.5)");
    ok(!(await leerKV(p, "draft")), "borrador limpio tras terminar");
  });

  await paso("editar y borrar sesión", async () => {
    await p.locator("#tabs [data-v=historial]").click(); await esperar();
    await sinDesborde("Historial"); await foto("07-historial");
    await p.locator(".grupo .celda").first().click(); await esperar(450);
    await foto("08-detalle");
    await p.locator(".hoja .celda", { hasText: "Editar sesión" }).click(); await esperar(500);
    ok((await p.locator(".nav-t").innerText()).startsWith("Editar"), "modo edición");
    const r = p.locator(".ej").first().locator(".serie input").nth(1);
    await r.fill("12");
    await p.locator(".nav-btn", { hasText: "Guardar" }).click(); await esperar(700);
    ok(await p.locator(".hoja h1", { hasText: "Sesión actualizada" }).isVisible(), "sesión editada guardada");
    await p.locator(".hoja .btn", { hasText: "Cerrar" }).click(); await esperar(450);
    const ss = await leerKV(p, "sessions");
    ok(ss.length === sesiones0 + 1 && ss[ss.length - 1].fm.exercises[0].sets[0].reps === 12, "la edición cambia la sesión sin duplicarla");
    await p.locator("#tabs [data-v=historial]").click(); await esperar();
    await p.locator(".grupo .celda").first().click(); await esperar(450);
    await p.locator(".hoja .celda", { hasText: "Borrar sesión" }).click(); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Borrar sesión" }).click(); await esperar(700);
    ok((await leerKV(p, "sessions")).length === sesiones0, "sesión borrada");
  });

  await paso("dashboard", async () => {
    await p.locator("#tabs [data-v=dashboard]").click();
    await p.waitForSelector(".gym-dashboard .gd-sec", { timeout: 15000 }); await esperar(800);
    await foto("09-dashboard");
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      const n = await p.evaluate(() => { let n = 0; document.querySelectorAll(".gym-dashboard details:not([open]) > summary").forEach((s) => { s.click(); n++; }); return n; });
      await esperar(400); if (!n) break;
    }
    const cerradas = await p.evaluate(() => document.querySelectorAll(".gym-dashboard details:not([open])").length);
    ok(cerradas === 0, "todas las secciones abiertas (" + cerradas + " cerradas)");
    const txt = await p.locator(".gym-dashboard").innerText();
    const malo = txt.match(/.{0,40}(NaN|undefined|\[object).{0,40}/);
    ok(!malo, "dashboard sin NaN/undefined/[object" + (malo ? ": «" + malo[0] + "»" : ""));
    ok(txt.length > 500, "dashboard con contenido (" + txt.length + " caracteres)");
    await sinDesborde("dashboard");
    await foto("10-dashboard-abierto", true);
  });

  await paso("exportar e importar", async () => {
    await p.locator("#tabs [data-v=ajustes]").click(); await esperar();
    await sinDesborde("Ajustes"); await foto("11-ajustes");
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }), p.locator(".celda", { hasText: "Exportar copia" }).click()]);
    const ruta = await dl.path();
    const j = JSON.parse(readFileSync(ruta, "utf8"));
    ok(Array.isArray(j.sessions) && j.sessions.length === sesiones0 && j.configs, "exportación JSON con " + j.sessions.length + " sesiones");
    // modificar algo para comprobar que importar lo restaura
    await p.evaluate(() => new Promise((ok) => { const r = indexedDB.open("gymapp"); r.onsuccess = () => { const t = r.result.transaction("kv", "readwrite"); t.objectStore("kv").put([], "sessions"); t.oncomplete = () => { r.result.close(); ok(); }; }; }));
    await p.locator("input[type=file]").setInputFiles(ruta); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Importar y reemplazar" }).click(); await esperar(900);
    ok((await leerKV(p, "sessions")).length === sesiones0, "importación restaura las sesiones");
    await p.locator("input[type=file]").setInputFiles({ name: "malo.json", mimeType: "application/json", buffer: Buffer.from("{nope") }); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Importar y reemplazar" }).click(); await esperar(600);
    ok(await p.locator(".accion-msg", { hasText: "No se pudo importar" }).isVisible(), "error de importación en hoja propia (sin alert)");
    await p.locator(".accion-btn", { hasText: "OK" }).click(); await esperar(450);
  });

  await paso("recarga a mitad de sesión", async () => {
    await p.locator("#tabs [data-v=entrenar]").click(); await esperar();
    await p.locator(".grupo .celda", { hasText: /^Espalda-Bíceps A/ }).click(); await esperar();
    const ej = p.locator(".ej").first();
    await ej.locator(".serie input").nth(0).fill("47,5"); await ej.locator(".serie input").nth(1).fill("9");
    await ej.locator(".serie .ok").first().click(); await esperar(300);
    await p.waitForTimeout(2200);
    await p.reload(); await p.waitForSelector(".nav.sesion"); await esperar(800);
    const ej2 = p.locator(".ej").first();
    ok(await ej2.locator(".serie input").nth(0).inputValue() === "47,5" && await ej2.locator(".serie input").nth(1).inputValue() === "9", "valores recuperados tras recargar");
    ok(await ej2.locator(".serie").first().evaluate((e) => e.classList.contains("hecha")), "serie hecha recuperada");
    const reloj = await p.locator("[data-reloj]").innerText();
    ok(reloj !== "0:00" && /^\d+:\d\d$/.test(reloj), "el reloj de la sesión sigue contando (" + reloj + ")");
    await p.locator(".nav-btn", { hasText: "Descartar" }).click(); await esperar(450);
    await p.locator(".accion-btn", { hasText: "Descartar sesión" }).click(); await esperar(500);
    ok(!(await leerKV(p, "draft")), "descartar limpia el borrador");
  });

  ok(!errores.length, "consola sin errores" + (errores.length ? ": " + errores.slice(0, 5).join(" | ") : ""));
  await b.close();
}

for (const n of navs) for (const t of ["dark", "light"]) await probar(n, t);
srv.close();
console.log(fallos ? `\n${fallos} comprobaciones fallidas` : "\nTodo correcto");
process.exitCode = fallos ? 1 : 0;

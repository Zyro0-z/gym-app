// Auditoría automática de accesibilidad (Fase 6.7). Recorre todas las pantallas y estados (hojas,
// alertas, entrenamiento con descanso) en claro y oscuro y comprueba, con los estilos resueltos:
//   · contraste: texto 4,5:1 (3:1 si es grande) y controles/gráficos 3:1
//   · objetivo táctil ≥ 44×44 px (cuenta la zona ampliada con ::before/::after)
//   · nombre accesible en botones, campos, interruptores, imágenes (árbol de accesibilidad, Chromium)
//   · orden de foco lógico (en orden visual y atrapado en hojas y alertas) y foco visible
//   · roles y aria-live: temporizador de descanso, avisos (toast), hojas y alertas
//   · cero saltos de layout (layout-shift sin interacción) y textos sin «NaN/undefined/[object»
// y, con texto grande (Dynamic Type de accesibilidad, 28 px de cuerpo), que nada se corta, se
// solapa ni desborda en horizontal.
// Uso: node tools/auditoria-a11y.mjs [chromium|webkit] [--fotos carpeta] [--solo grande|normal]
// Sale con código 1 si hay incumplimientos. Datos: los sintéticos del golden master.
import { chromium, webkit } from "playwright";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { servir } from "../tests/serve.mjs";
import { crearCopia } from "../src/data/modelo.js";
import { instalar, auditarVista, auditarGrande, focoActual, focoAlPrincipio, ROLES_CON_NOMBRE } from "./a11y-pagina.mjs";

const args = process.argv.slice(2);
const motor = args.find((a) => a === "chromium" || a === "webkit") || "chromium";
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const fotos = opt("--fotos"), solo = opt("--solo");
if (fotos) mkdirSync(fotos, { recursive: true });
const datos = JSON.stringify(crearCopia(JSON.parse(readFileSync(new URL("../tests/golden/modelo-sintetico.json", import.meta.url), "utf8")), "2026-11-15T12:00:00.000Z"));
const PUERTO = 8791;
const srv = await servir(PUERTO);
const nav = { chromium, webkit }[motor];
const b = await nav.launch();
const fallos = new Map(), avisos = new Map();
const cuenta = { pantallas: 0, focos: 0, nodos: 0 };
const anotar = (mapa, pantalla, x) => { const k = x.tipo + "|" + x.donde + "|" + (x.texto || ""); if (!mapa.has(k)) mapa.set(k, { ...x, pantallas: [] }); const e = mapa.get(k); if (!e.pantallas.includes(pantalla)) e.pantallas.push(pantalla); };

/** Pasos del recorrido: [nombre, abrir(p, g)] con g = utilidades. Los estados con capas al final. */
function recorrido(ids) {
  const P = [["hoy", (g) => g.tab("hoy")]];
  for (const s of ["Resumen", "Ejercicios", "Músculos", "Cuerpo"]) P.push(["progreso-" + s.toLowerCase(), async (g) => { await g.tab("progreso"); await g.seg(s); }]);
  P.push(["historial", (g) => g.tab("historial")], ["ajustes", (g) => g.tab("ajustes")]);
  const rutas = [["ejercicio", ids.ej && "ejercicio/" + encodeURIComponent(ids.ej), "progreso"], ["grupo", "grupo/" + encodeURIComponent(ids.grupo), "progreso"], ["ligas", "ligas", "progreso"],
    ["liga", ids.liga && "liga/grupo/" + encodeURIComponent(ids.liga), "progreso"], ["fatiga", "fatiga", "progreso"], ["musculos", "musculos", "progreso"], ["porGimnasio", "porGimnasio", "progreso"], ["comparar", "comparar", "progreso"], ["medidas", "medidas", "progreso"], ["rendimiento", "rendimiento", "progreso"], ["molestias", "molestias", "progreso"],
    ["sesion", ids.ses && "sesion/" + encodeURIComponent(ids.ses), "historial"], ["rutinas", "rutinas", "ajustes"], ["rutina", ids.rut && "rutina/" + encodeURIComponent(ids.rut), "ajustes"],
    ["horario", "horario", "ajustes"], ["ejercicios", "ejercicios", "ajustes"], ["ejercicio-cat", ids.cat && "ejercicioCat/" + encodeURIComponent(ids.cat), "ajustes"],
    ["entrenamiento", "entrenamiento", "ajustes"], ["objetivos", "objetivos", "ajustes"], ["cuerpo", "cuerpo", "ajustes"], ["bloques", "bloques", "ajustes"], ["bloque", "bloque/+", "ajustes"],
    ["grupos", "grupos", "ajustes"], ["mesociclos", "mesociclos", "ajustes"], ["nube", "nube", "ajustes"], ["apariencia", "apariencia", "ajustes"], ["modulos", "modulos", "ajustes"], ["datos", "datos", "ajustes"], ["calidad", "calidad", "ajustes"], ["avanzado", "avanzado", "ajustes"], ["guia", "guia", "ajustes"]];
  for (const [n, r, t] of rutas) if (r) P.push([n, async (g) => { await g.tab(t); await g.tab(t); await g.ir(r, t); }]);
  P.push(
    ["hoja-pesaje", async (g) => { await g.tab("hoy"); await g.p.getByRole("button", { name: "Añadir pesaje" }).click(); await g.espera(600); }, { capa: ".hoja", rol: "dialog" }],
    ["hoja-molestia", async (g) => { await g.cerrarCapas(); await g.tab("progreso"); await g.ir("molestias", "progreso"); await g.p.getByRole("button", { name: "Anotar molestia" }).first().click(); await g.espera(600); }, { capa: ".hoja", rol: "dialog" }],
    ["alerta", async (g) => { await g.cerrarCapas(); g.p.evaluate(() => { window.__alerta = window.__gym.confirmar("¿Borrar la sesión?", "No se puede deshacer.", "Borrar", true); }); await g.espera(600); }, { capa: ".alerta-capa", rol: "alertdialog" }],
    ["toast", async (g) => { await g.cerrarCapas(); await g.p.evaluate(() => window.__gym.toast("Copia exportada")); await g.espera(300); }, { toast: true }],
    ["entreno", async (g) => { await g.cerrarCapas(); await g.p.evaluate(async (rut) => { const x = window.__gym; const r = x.store.estado.rutinas.find((y) => y.id === rut); await x.entreno.empezar(r ? r.nombre : null); }, ids.rut); await g.espera(900); }, { capa: ".modal-completo" }],
    ["entreno-descanso", async (g) => { const c = g.p.locator(".modal-completo .serie .check").first(); if (await c.count()) await c.click(); await g.espera(600); }, { capa: ".modal-completo", descanso: true }],
  );
  return P;
}

async function pasada(tema, grande) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema, hasTouch: true, isMobile: motor === "chromium" });
  const p = await ctx.newPage();
  const errores = [];
  p.on("pageerror", (e) => errores.push(e.message));
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  await p.addInitScript(instalar);
  await p.addInitScript((grande) => {
    window.__cambios = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cambios.push({ v: e.value, t: e.startTime, src: (e.sources || []).map((s) => s.node && s.node.nodeType === 1 ? s.node.tagName.toLowerCase() + "." + [...s.node.classList].join(".") : "?") }); }).observe({ type: "layout-shift", buffered: true }); } catch (e) {}
    if (grande) document.addEventListener("DOMContentLoaded", () => document.head.append(Object.assign(document.createElement("style"), { textContent: "html{font-size:28px!important}" })));
  }, grande);
  await p.goto(`http://127.0.0.1:${PUERTO}/`);
  await p.waitForFunction(() => window.__gym);
  await p.evaluate(async (t) => { const g = window.__gym; await g.store.importar(g.store.leerCopia(t)); }, datos);
  await p.reload(); await p.waitForFunction(() => window.__gym); await p.waitForTimeout(1200);
  const ids = await p.evaluate(() => {
    const g = window.__gym, A = g.store.analisis(), e = g.store.estado;
    const L = A.liga && A.liga.ok ? [...A.liga.grupos.keys()][0] : null;
    return { ej: A.ejercicios[0] && A.ejercicios[0].k, ses: e.sesiones[0] && e.sesiones[0].id, rut: e.rutinas[0] && e.rutinas[0].id, cat: e.catalogo[0] && e.catalogo[0].id, liga: L, grupo: e.ajustes.grupos[0].nombre };
  });
  const g = {
    p, espera: (ms = 450) => p.waitForTimeout(ms),
    tab: async (id) => { await p.locator(`.tabbar [data-tab=${id}]`).click(); await p.waitForTimeout(350); },
    seg: async (s) => { await p.locator(".pestana.activa .segmentado [role=radio]", { hasText: s }).first().click(); await p.waitForTimeout(400); },
    ir: (r, t) => p.evaluate(([r, t]) => window.__gym.nav.ir(r, { pestana: t }), [r, t]),
    cerrarCapas: async () => { for (let i = 0; i < 3 && await p.locator(".hoja, .alerta-capa").count(); i++) { await p.keyboard.press("Escape"); await p.waitForTimeout(400); } },
  };
  const cdp = motor === "chromium" && !grande ? await ctx.newCDPSession(p) : null;
  for (const [nombre, abrir, extra = {}] of recorrido(ids)) {
    const marca = await p.evaluate(() => performance.now());
    await abrir(g); await p.waitForTimeout(900);
    const id = tema + (grande ? "-grande" : "") + " · " + nombre;
    cuenta.pantallas++;
    if (fotos) await p.screenshot({ path: `${fotos}/${motor}-${tema}${grande ? "-grande" : ""}-${nombre}.png` });
    if (grande) {
      for (const x of await p.evaluate(auditarGrande)) anotar(x.grave ? fallos : avisos, id, x);
      continue;
    }
    for (const x of await p.evaluate(auditarVista, { ...extra, estructura: tema === "light" })) anotar(x.grave === false ? avisos : fallos, id, x);
    // Saltos de layout desde que se abrió la pantalla
    const cambios = await p.evaluate((m) => window.__cambios.filter((c) => c.t >= m), marca);
    const total = cambios.reduce((a, c) => a + c.v, 0);
    if (total > 0.01) anotar(fallos, id, { tipo: "salto de layout", donde: [...new Set(cambios.flatMap((c) => c.src))].join(", "), texto: "CLS " + total.toFixed(3) });
    if (tema !== "light") continue;
    // Nombres accesibles (árbol de accesibilidad de Chromium)
    if (cdp) {
      const { nodes } = await cdp.send("Accessibility.getFullAXTree");
      for (const n of nodes) {
        const rol = n.role && n.role.value;
        if (!n.ignored && ROLES_CON_NOMBRE.includes(rol)) cuenta.nodos++;
        if (n.ignored || !ROLES_CON_NOMBRE.includes(rol) || (n.name && String(n.name.value || "").trim())) continue;
        let donde = rol;
        try { const d = await cdp.send("DOM.describeNode", { backendNodeId: n.backendDOMNodeId }); const a = d.node.attributes || []; const c = a[a.indexOf("class") + 1]; donde = rol + " <" + d.node.localName + (a.includes("class") ? "." + c.split(" ").join(".") : "") + ">"; } catch (e) {}
        anotar(fallos, id, { tipo: "sin nombre accesible", donde });
      }
    }
    // Orden y visibilidad del foco con el teclado
    await p.evaluate(() => { const s = [...document.querySelectorAll(".pestana.activa .pantalla:not([hidden]) .scroll")].pop(); if (s) s.scrollTop = 0; });
    await p.evaluate(focoAlPrincipio);
    const vistos = [];
    for (let i = 0; i < 70; i++) {
      await p.keyboard.press("Tab");
      const f = await p.evaluate(focoActual, extra.capa || null);
      if (!f || (vistos.length && f.clave === vistos[0].clave)) break;
      if (!f.visible) anotar(fallos, id, { tipo: "foco invisible o en elemento oculto", donde: f.donde });
      else if (!f.marcado) anotar(fallos, id, { tipo: "foco sin indicador visible", donde: f.donde });
      if (f.fuera) anotar(fallos, id, { tipo: "foco fuera de la capa abierta", donde: f.donde });
      const ant = vistos[vistos.length - 1];
      if (ant && !f.fijo && !ant.fijo && f.contenedor === ant.contenedor && f.y < ant.y - 24) anotar(fallos, id, { tipo: "orden de foco no visual", donde: ant.donde + " → " + f.donde });
      vistos.push(f);
      cuenta.focos++;
    }
  }
  if (errores.length) for (const e of errores) anotar(fallos, tema + (grande ? "-grande" : ""), { tipo: "error de consola", donde: e.slice(0, 160) });
  await ctx.close();
}

for (const tema of ["light", "dark"]) {
  if (solo !== "grande") await pasada(tema, false);
  if (solo !== "normal" && tema === "light") await pasada(tema, true);
}
if (solo !== "normal") await pasada("dark", true);
await b.close(); srv.close();

const linea = (x) => "  · " + x.tipo + ": " + x.donde + (x.texto ? " — " + x.texto : "") + "\n      en " + x.pantallas.slice(0, 4).join(", ") + (x.pantallas.length > 4 ? " y " + (x.pantallas.length - 4) + " más" : "");
const porTipo = (m) => [...m.values()].reduce((a, x) => ((a[x.tipo] = (a[x.tipo] || 0) + 1), a), {});
console.log("Auditoría de accesibilidad · " + motor + " · 390×844 · claro y oscuro · texto normal y grande");
console.log("Comprobado: " + cuenta.pantallas + " vistas · " + cuenta.nodos + " controles con nombre · " + cuenta.focos + " pasos de foco");
console.log("Incumplimientos: " + fallos.size + (fallos.size ? " " + JSON.stringify(porTipo(fallos)) : ""));
for (const x of fallos.values()) console.log(linea(x));
console.log("Avisos (no bloquean): " + avisos.size + (avisos.size ? " " + JSON.stringify(porTipo(avisos)) : ""));
for (const x of avisos.values()) console.log(linea(x));
const SALIDA = fileURLToPath(new URL("../tests/salida/", import.meta.url));
mkdirSync(SALIDA, { recursive: true });
writeFileSync(SALIDA + "a11y-" + motor + ".json", JSON.stringify({ fallos: [...fallos.values()], avisos: [...avisos.values()] }, null, 1));
process.exit(fallos.size ? 1 : 0);

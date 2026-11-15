// Editores con interfaz real: plantillas y objetivos de doble progresión (objetivos.md).
import { S, save } from "./store.js";
import { h, toast, hoja, confirmar, alerta, pedirTexto, canon, num, kg, haptic, icono, pantalla, grupo, fila, cabeceraHoja, stepper, interruptor, segmentado, deslizable, reordenable } from "./ui.js";
import { elegirEjercicio, refrescarAnalisis } from "./logger.js";

const OBJ = "Gym/Config/objetivos.md", HORARIO = "Gym/Config/horario-semanal.md";
const grupoDe = (n) => { try { return window.__gym ? window.__gym.grupoDe(n) : ""; } catch (e) { return ""; } };

// ═════════ Objetivos (doble progresión) ═════════
// Sintaxis (la del dashboard): «Ejercicio:: min-max [| top] [| tipo] [| +N]», una línea por
// ejercicio pegada al margen; «incremento:: tipo | +N» declara los tipos de material.
const RE_LINEA = /^([^:\n>`\s][^:\n`]*?)::[ \t]*(.*)$/;
const parseKgMas = (s) => { const m = String(s).trim().match(/^\+\s*(\d+(?:[.,]\d+)?)\s*(kg)?$/i); const n = m ? parseFloat(m[1].replace(",", ".")) : NaN; return n > 0 ? n : null; };

export function tiposIncremento() {
  const out = [];
  for (const l of (S.configs[OBJ] || "").split("\n")) {
    const m = l.match(RE_LINEA); if (!m || canon(m[1]) !== "incremento") continue;
    const p = m[2].split("|").map((x) => x.trim()); const kgv = p.length === 2 ? parseKgMas(p[1]) : null;
    if (p[0] && kgv != null) out.push({ tipo: p[0], kg: kgv });
  }
  return out;
}
// Objetivo actual de un ejercicio (la última línea gana, igual que en el dashboard).
export function objetivoDe(nombre) {
  const k = canon(nombre); let o = null;
  const tipos = tiposIncremento();
  for (const l of (S.configs[OBJ] || "").split("\n")) {
    const m = l.match(RE_LINEA); if (!m || canon(m[1]) !== k || canon(m[1]) === "incremento") continue;
    const p = m[2].split("|").map((x) => x.trim());
    const r = p[0].match(/^(\d+)\s*-\s*(\d+)$/); if (!r) continue;
    o = { nombre: m[1].trim(), min: +r[1], max: +r[2], top: false, tipo: null, inc: null };
    for (const c of p.slice(1)) {
      if (canon(c) === "top") o.top = true;
      else if (/^\+/.test(c)) o.inc = parseKgMas(c);
      else { const t = tipos.find((x) => canon(x.tipo) === canon(c)); if (t) o.tipo = t.tipo; }
    }
  }
  return o;
}
export const textoObjetivo = (o) => o ? o.min + "–" + o.max + " reps" + (o.top ? " · top" : "") : "";
export function lineaObjetivo(nombre, o) {
  const p = [o.min + "-" + o.max];
  if (o.top) p.push("top");
  if (o.tipo) p.push(o.tipo);
  if (o.inc) p.push("+" + kg(o.inc));
  return nombre + ":: " + p.join(" | ");
}
// Escribe (o quita, con linea = null) la línea del ejercicio. Reemplaza en su sitio la primera,
// quita las repetidas y, si no había, la añade al final.
export async function escribirObjetivo(nombre, linea) {
  const k = canon(nombre), lineas = (S.configs[OBJ] || "").split("\n");
  const es = (l) => { const m = l.match(RE_LINEA); return m && canon(m[1]) === k && canon(m[1]) !== "incremento"; };
  const res = []; let puesta = false;
  for (const l of lineas) { if (!es(l)) res.push(l); else if (!puesta && linea) { res.push(linea); puesta = true; } }
  let t = res.join("\n");
  if (linea && !puesta) t = t.replace(/\s*$/, "") + "\n" + linea + "\n";
  S.configs[OBJ] = t;
  await save("configs");
  refrescarAnalisis();
}

// Hoja de edición del objetivo de un ejercicio. alGuardar() tras guardar o quitar.
export function editarObjetivo(nombre, alGuardar) {
  const prev = objetivoDe(nombre);
  const o = prev ? { ...prev } : { min: 8, max: 12, top: false, tipo: null, inc: null };
  const tipos = tiposIncremento();
  let modo = o.inc ? "propio" : (o.tipo ? "tipo" : "auto");
  hoja((c) => {
    const vista = h("div", { class: "linea-prev seleccionable" });
    const zonaInc = h("div");
    const pintarPrev = () => { vista.textContent = lineaObjetivo(nombre, { ...o, tipo: modo === "tipo" ? o.tipo : null, inc: modo === "propio" ? o.inc : null }); };
    const auto = () => { const k = canon(nombre); const t = tipos.find((x) => k.includes(canon(x.tipo))); return t ? t.tipo + " (+" + kg(t.kg) + " kg), por el nombre" : "el salto más pequeño que hayas usado"; };
    let stMin, stMax;
    const rehacerRango = () => {
      stMin.replaceWith(stMin = stepper({ valor: o.min, min: 1, max: 50, paso: 1, alCambiar: (v) => { o.min = v; if (o.max < v) { o.max = v; rehacerRango(); } pintarPrev(); } }));
      stMax.replaceWith(stMax = stepper({ valor: o.max, min: 1, max: 60, paso: 1, alCambiar: (v) => { o.max = v; if (o.min > v) { o.min = v; rehacerRango(); } pintarPrev(); } }));
    };
    stMin = stepper({ valor: o.min, min: 1, max: 50, paso: 1, alCambiar: (v) => { o.min = v; if (o.max < v) { o.max = v; rehacerRango(); } pintarPrev(); } });
    stMax = stepper({ valor: o.max, min: 1, max: 60, paso: 1, alCambiar: (v) => { o.max = v; if (o.min > v) { o.min = v; rehacerRango(); } pintarPrev(); } });
    const pintarInc = () => {
      if (modo === "auto") zonaInc.replaceChildren(h("p", { class: "pie" }, "Se usa " + auto() + "."));
      else if (modo === "tipo") {
        if (!o.tipo && tipos.length) o.tipo = tipos[0].tipo;
        const filas = tipos.map((t) => { const f = fila({ texto: t.tipo, detalle: "+" + kg(t.kg) + " kg", der: icono("check", "ico marca"), clase: t.tipo === o.tipo ? "elegida" : "", sinChevron: true, onclick: () => { o.tipo = t.tipo; haptic(); f.parentElement.querySelectorAll(".celda").forEach((x) => x.classList.toggle("elegida", x === f)); pintarPrev(); } }); return f; });
        zonaInc.replaceChildren(filas.length ? h("div", { class: "celdas", style: { marginTop: "8px" } }, filas) : h("p", { class: "pie" }, "No hay tipos declarados con «incremento::» en objetivos."));
      } else {
        if (!o.inc) o.inc = 2.5;
        zonaInc.replaceChildren(h("div", { class: "celdas", style: { marginTop: "8px" } }, fila({ texto: "Subir", der: stepper({ valor: o.inc, min: 0.5, max: 50, paso: 0.5, formato: (v) => "+" + kg(v) + " kg", alCambiar: (v) => { o.inc = v; pintarPrev(); } }) })));
      }
      pintarPrev();
    };
    pintarInc();
    const guardar = async () => {
      const fin = { min: o.min, max: o.max, top: o.top, tipo: modo === "tipo" ? o.tipo : null, inc: modo === "propio" ? o.inc : null };
      c(); await escribirObjetivo(nombre, lineaObjetivo(nombre, fin)); haptic(); toast("Objetivo guardado"); alGuardar && alGuardar();
    };
    return h("div", { class: "editor-obj" },
      cabeceraHoja(nombre, h("button", { class: "nav-btn", onclick: () => c() }, "Cancelar"), h("button", { class: "nav-btn fuerte", onclick: guardar }, "Guardar")),
      grupo("Rango de repeticiones", [fila({ texto: "Mínimo", der: stMin }), fila({ texto: "Máximo", der: stMax })],
        "Cuando todas las series de trabajo llegan al máximo con el mismo peso, toca subir."),
      grupo(null, [fila({ texto: "Solo la serie más pesada (top)", der: interruptor(o.top, (v) => { o.top = v; pintarPrev(); }, "Solo la serie más pesada") })],
        "Ejercicio ancla: solo cuenta la serie más pesada; el resto puede ser más ligero."),
      h("section", { class: "grupo" }, h("h2", { class: "grupo-cab" }, "Incremento al subir"),
        segmentado([["auto", "Automático"], ["tipo", "Material"], ["propio", "Propio"]], modo, (k) => { modo = k; pintarInc(); }), zonaInc),
      h("section", { class: "grupo" }, h("h2", { class: "grupo-cab" }, "Línea en objetivos.md"), vista),
      prev ? grupo(null, [fila({ texto: "Quitar objetivo", peligro: true, onclick: async () => {
        if (!(await confirmar("¿Quitar el objetivo de «" + nombre + "»? El dashboard dejará de calcular su doble progresión.", "Quitar objetivo", true))) return;
        c(); await escribirObjetivo(nombre, null); toast("Objetivo quitado"); alGuardar && alGuardar();
      } })]) : null);
  });
}

// Lista de ejercicios con su objetivo (Ajustes → Objetivos).
export function vistaObjetivos(montar, volver) {
  const { raiz, cuerpo } = pantalla("Objetivos", { izq: h("button", { class: "nav-btn", onclick: volver }, icono("atras"), "Ajustes") });
  const nombres = new Map();
  for (const l of S.library) nombres.set(canon(l.name), l.name);
  for (const l of (S.configs[OBJ] || "").split("\n")) { const m = l.match(RE_LINEA); if (m && canon(m[1]) !== "incremento" && /^\d+\s*-\s*\d+/.test(m[2].trim()) && !nombres.has(canon(m[1]))) nombres.set(canon(m[1]), m[1].trim()); }
  const lista = Array.from(nombres.values()).sort((a, b) => a.localeCompare(b, "es"));
  const con = lista.filter((n) => objetivoDe(n)), sin = lista.filter((n) => !objetivoDe(n));
  const repintar = () => vistaObjetivos(montar, volver);
  cuerpo.append(h("p", { class: "pie", style: { margin: "0 32px 16px" } }, "Rango de repeticiones de la doble progresión. Se guarda en objetivos.md, la misma línea que escribirías a mano."));
  if (con.length) cuerpo.append(grupo("Con objetivo", con.map((n) => fila({ texto: n, detalle: textoObjetivo(objetivoDe(n)), onclick: () => editarObjetivo(n, repintar) }))));
  if (sin.length) cuerpo.append(grupo("Sin objetivo", sin.map((n) => fila({ texto: n, detalle: "—", onclick: () => editarObjetivo(n, repintar) }))));
  montar(raiz);
}

// ═════════ Plantillas ═════════
export function vistaPlantilla(t, montar, volver, editarTexto) {
  const repintar = () => vistaPlantilla(t, montar, volver, editarTexto);
  const guardar = () => save("templates");
  const { raiz, cuerpo } = pantalla(t.fm.name, { izq: h("button", { class: "nav-btn", onclick: volver }, icono("atras"), "Ajustes") });
  const exs = t.fm.exercises;
  const celdas = h("div", { class: "celdas" });
  exs.forEach((e) => {
    const wrap = h("div", { class: "serie-wrap" });
    const asa = h("button", { class: "asa", type: "button", "aria-label": "Mover " + e.name }, icono("asas"));
    const g = grupoDe(e.name);
    const celda = fila({ texto: e.name, sub: g && g !== "Sin categorizar" ? g : null, izq: asa, clase: "desliza",
      der: stepper({ valor: e.targetSets || 3, min: 1, max: 10, paso: 1, formato: (v) => String(v), alCambiar: (v) => { e.targetSets = v; guardar(); } }) });
    const borrar = async () => { exs.splice(exs.indexOf(e), 1); await guardar(); haptic(); toast("Quitado de la plantilla", 1000); repintar(); };
    wrap.append(h("button", { class: "serie-borrar", type: "button", tabindex: "-1", onclick: borrar }, icono("papelera"), "Quitar"), celda);
    deslizable(celda, borrar);
    reordenable(wrap, asa, async (a, b) => { const [x] = exs.splice(a, 1); exs.splice(b, 0, x); await guardar(); repintar(); });
    celdas.append(wrap);
  });
  cuerpo.append(h("section", { class: "grupo" }, h("h2", { class: "grupo-cab" }, exs.length + (exs.length === 1 ? " ejercicio" : " ejercicios")),
    exs.length ? celdas : h("div", { class: "celdas" }, h("div", { class: "celda centro muted" }, "Sin ejercicios todavía")),
    h("p", { class: "pie" }, "El número es de series objetivo. Arrastra ☰ para cambiar el orden y desliza a la izquierda para quitar.")));
  cuerpo.append(grupo(null, [fila({ texto: "Añadir ejercicio", clase: "tinte", izq: icono("mas"), sinChevron: true, onclick: () => elegirEjercicio((n) => {
    if (exs.some((x) => canon(x.name) === canon(n))) { toast("Ya está en la plantilla"); return; }
    exs.push({ name: n, targetSets: 3 }); guardar(); haptic(); repintar();
  }) })]));
  cuerpo.append(grupo(null, [
    fila({ texto: "Renombrar", onclick: async () => {
      const n = await pedirTexto("Renombrar plantilla", { valor: t.fm.name, boton: "Guardar", ayuda: "Las sesiones ya guardadas conservan el nombre antiguo. Si aparece en el horario semanal, se actualiza también." });
      if (!n || n === t.fm.name) return;
      if (S.templates.some((x) => x !== t && canon(x.fm.name) === canon(n))) { await alerta("Ya existe", "Hay otra plantilla llamada «" + n + "»."); return; }
      const viejo = t.fm.name;
      t.fm.name = n; t.path = "Workout Templates/" + n + ".md"; await guardar();
      if (S.configs[HORARIO]) {
        const nuevo = S.configs[HORARIO].split("\n").map((l) => { const m = l.match(/^([^:\n>`]+)::[ \t]*(.+)$/); return m && canon(m[2]) === canon(viejo) ? m[1] + ":: " + n : l; }).join("\n");
        if (nuevo !== S.configs[HORARIO]) { S.configs[HORARIO] = nuevo; await save("configs"); refrescarAnalisis(); }
      }
      haptic(); repintar();
    } }),
    fila({ texto: "Editar como texto", onclick: () => editarTexto(t) }),
  ]));
  cuerpo.append(grupo(null, [fila({ texto: "Borrar plantilla", peligro: true, onclick: async () => {
    if (!(await confirmar("¿Borrar la plantilla «" + t.fm.name + "»? Las sesiones guardadas no se tocan.", "Borrar plantilla", true))) return;
    S.templates.splice(S.templates.indexOf(t), 1); await guardar(); toast("Plantilla borrada"); volver();
  } })]));
  montar(raiz);
}

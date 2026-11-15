// Controles básicos: secciones y listas inset grouped, celdas (con deslizar para borrar),
// interruptor, segmentado, stepper, chip, estado vacío, anillo y barra fina.
import { h, s } from "./dom.js";
import { icono } from "./iconos.js";
import { seleccion } from "./haptica.js";

/** Sección: cabecera opcional (texto o nodo), contenido y pie de una línea. */
export function seccion({ cab = null, pie = null, accion = null, grande = false, clase = null } = {}, ...hijos) {
  return h("section", { class: ["seccion", clase] },
    cab || accion ? h("div", { class: ["seccion-cab", grande && "grande"] }, h("span", null, cab), accion ? h("button", { class: "accion", onClick: accion.alPulsar }, accion.texto) : null) : null,
    hijos,
    pie ? h("div", { class: "seccion-pie" }, pie) : null);
}

/** Lista inset grouped. */
export function lista(celdas, { iconos = false } = {}) {
  return h("div", { class: ["lista", iconos && "con-iconos"], role: "list" }, celdas);
}

/**
 * Celda. Opciones:
 *   icono, colorIcono      icono en cuadro de color (29 pt)
 *   punto                  color de un punto de 10 pt (grupo)
 *   titulo, sub            texto y detalle
 *   valor                  texto o nodo a la derecha
 *   chevron, check         accesorios
 *   control                nodo a la derecha (interruptor, stepper)
 *   alPulsar               la hace pulsable
 *   estilo                 "destructiva" | "accion" | "centrada"
 *   alBorrar               activa deslizar para borrar
 */
export function celda(o) {
  const pulsable = !!o.alPulsar;
  const el = h(pulsable ? "button" : "div", {
    class: ["celda", pulsable && "pulsable", o.estilo], role: pulsable ? undefined : "listitem",
    onClick: pulsable ? (e) => o.alPulsar(e) : null, "aria-disabled": o.deshabilitada ? "true" : null, dataset: o.dataset,
  },
    o.icono ? h("span", { class: "celda-icono", style: { background: o.colorIcono || "var(--tab-off)" } }, icono(o.icono)) : null,
    o.punto ? h("span", { class: "celda-punto", style: { background: o.punto } }) : null,
    o.izquierda || null,
    h("span", { class: ["celda-texto", o.sub && "dos"] },
      h("div", { class: "celda-titulo" }, o.titulo),
      o.sub ? h("div", { class: "celda-sub" }, o.sub) : null),
    o.valor !== undefined && o.valor !== null ? h("span", { class: "celda-valor" }, o.valor) : null,
    o.control || null,
    o.check ? h("span", { class: "celda-check" }, icono("check", { grosor: 2.4 })) : null,
    o.chevron ? h("span", { class: "celda-chevron" }, icono("chevron")) : null);
  if (!o.alBorrar) return el;
  return deslizable(el, o.alBorrar, o.textoBorrar || "Borrar");
}

/** Envuelve una celda para poder deslizarla a la izquierda y borrarla. */
export function deslizable(celdaEl, alBorrar, texto = "Borrar") {
  const boton = h("button", { onClick: (e) => { e.stopPropagation(); alBorrar(); } }, texto);
  const fondo = h("div", { class: "borrar" }, boton);
  const cont = h("div", { class: "celda-desliza" }, fondo, celdaEl);
  const ANCHO = 88;
  let g = null, abierta = false;
  const fijar = (x, anim) => { celdaEl.style.transition = anim ? "" : "none"; celdaEl.style.transform = x ? `translateX(${x}px)` : ""; };
  cont.addEventListener("pointerdown", (e) => { if (e.target.closest(".borrar")) return; g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: abierta ? -ANCHO : 0, decidido: false, x: 0 }; });
  cont.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (!g.decidido) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
      if (Math.abs(dx) < 8) return;
      g.decidido = true; try { cont.setPointerCapture(e.pointerId); } catch (_) {}
    }
    g.x = Math.min(0, g.base + dx);
    const w = cont.clientWidth;
    fijar(g.x < -ANCHO ? -ANCHO + (g.x + ANCHO) * (g.x < -w * 0.6 ? 1 : 0.9) : g.x);
  });
  const soltar = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const { x, decidido } = g; g = null;
    if (!decidido) { if (abierta) { e.preventDefault(); abierta = false; fijar(0, true); } return; }
    const w = cont.clientWidth;
    if (x < -w * 0.6) { fijar(-w, true); setTimeout(alBorrar, 200); return; }
    abierta = x < -ANCHO / 2;
    fijar(abierta ? -ANCHO : 0, true);
  };
  cont.addEventListener("pointerup", soltar);
  cont.addEventListener("pointercancel", soltar);
  // un toque con la celda abierta la cierra sin activarla
  cont.addEventListener("click", (e) => { if (abierta && !e.target.closest(".borrar")) { e.stopPropagation(); e.preventDefault(); abierta = false; fijar(0, true); } }, true);
  return cont;
}

/** Interruptor de iOS. */
export function interruptor(valor, alCambiar, etiqueta = "") {
  const input = h("input", { type: "checkbox", role: "switch", "aria-label": etiqueta, checked: !!valor,
    onChange: (e) => { seleccion(); alCambiar(e.target.checked); } });
  return h("span", { class: "interruptor" }, input, h("span", { class: "pista" }), h("span", { class: "pomo" }));
}

/** Control segmentado de hasta 5 opciones [{ valor, texto }]. */
export function segmentado(opciones, valor, alCambiar, { etiqueta = "" } = {}) {
  const pildora = h("span", { class: "pildora", "aria-hidden": "true" });
  const el = h("div", { class: "segmentado", role: "radiogroup", "aria-label": etiqueta }, pildora);
  let actual = valor;
  const botones = opciones.map((o) => h("button", { role: "radio", "aria-checked": String(o.valor === valor),
    onClick: () => { if (o.valor === actual) return; actual = o.valor; seleccion(); marcar(true); alCambiar(o.valor); } }, o.texto));
  el.append(...botones);
  function marcar(anim) {
    const i = Math.max(0, opciones.findIndex((o) => o.valor === actual));
    botones.forEach((b, j) => b.setAttribute("aria-checked", String(i === j)));
    pildora.style.width = `calc((100% - 4px) / ${opciones.length})`;
    if (!anim) pildora.style.transition = "none";
    pildora.style.transform = `translateX(${i * 100}%)`;
    if (!anim) requestAnimationFrame(() => { pildora.style.transition = ""; });
  }
  marcar(false);
  return el;
}

/** Stepper − valor +, con pulsación larga para repetir. */
export function stepper({ valor, min = -Infinity, max = Infinity, paso = 1, formato = (v) => String(v), alCambiar, sinValor = false, etiqueta = "" }) {
  let v = valor;
  const txt = h("span", { class: "valor num", "aria-live": "polite" });
  const menos = h("button", { "aria-label": "Menos " + etiqueta }, icono("menos"));
  const mas = h("button", { "aria-label": "Más " + etiqueta }, icono("mas"));
  const pintar = () => { txt.textContent = sinValor ? "" : formato(v); menos.disabled = v - paso < min - 1e-9; mas.disabled = v + paso > max + 1e-9; };
  const cambiar = (d) => {
    const n = Math.round((v + d) * 1000) / 1000;
    if (n < min - 1e-9 || n > max + 1e-9) return false;
    v = n; seleccion(); pintar(); alCambiar(v); return true;
  };
  for (const [b, d] of [[menos, -paso], [mas, paso]]) {
    let t1 = 0, t2 = 0, repetido = false;
    const parar = () => { clearTimeout(t1); clearInterval(t2); };
    b.addEventListener("pointerdown", () => { repetido = false; parar(); t1 = setTimeout(() => { t2 = setInterval(() => { repetido = true; if (!cambiar(d)) parar(); }, 90); }, 450); });
    b.addEventListener("pointerup", parar); b.addEventListener("pointercancel", parar); b.addEventListener("pointerleave", parar);
    b.addEventListener("click", () => { if (!repetido) cambiar(d); repetido = false; });
  }
  pintar();
  const el = h("div", { class: ["stepper", sinValor && "sin-valor"], role: "group", "aria-label": etiqueta }, menos, txt, mas);
  el.fijar = (n) => { v = n; pintar(); };
  return el;
}

/** Etiqueta de estado: punto (o icono) y texto. estado: "ok" | "warn" | "bad" | "accent" | null. */
export function chip(texto, estado = null, { icono: ic = null, relleno = false } = {}) {
  return h("span", { class: ["chip", estado, relleno && "relleno"] }, ic ? icono(ic) : h("span", { class: "punto" }), h("span", null, texto));
}

/** Estado vacío: icono de 48, título, una línea y acciones [{ texto, alPulsar, estilo }]. */
export function vacio({ icono: ic = "info", titulo, texto = "", acciones = [] }) {
  return h("div", { class: "vacio" },
    h("div", { class: "ico" }, icono(ic)),
    h("h2", null, titulo),
    texto ? h("p", null, texto) : null,
    acciones.length ? h("div", { class: "acciones" }, acciones.map((a, i) =>
      h("button", { class: ["btn", "peq", "tap", i > 0 || a.estilo === "texto" ? "texto" : null], onClick: a.alPulsar }, a.texto))) : null);
}

/** Botón: estilo "" (relleno de acento) | "gris" | "texto" | "peligro"; peq para cápsula. */
export function boton(texto, alPulsar, { estilo = "", peq = false, icono: ic = null, deshabilitado = false, etiqueta = null } = {}) {
  return h("button", { class: ["btn", estilo, peq && "peq"], onClick: alPulsar, disabled: deshabilitado, "aria-label": etiqueta },
    ic ? icono(ic) : null, texto ? h("span", null, texto) : null);
}

/** Anillo de progreso. frac 0..1 (se recorta). `ok` lo pinta en verde. `centro`: nodo. */
export function anillo({ frac, tam = 64, grosor = 8, ok = false, centro = null, etiqueta = "" }) {
  const r = (tam - grosor) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  return h("div", { class: ["anillo", ok && "ok"], style: { width: tam + "px", height: tam + "px" }, role: "img", "aria-label": etiqueta },
    s("svg", { width: tam, height: tam, viewBox: `0 0 ${tam} ${tam}` },
      s("circle", { class: "fondo", cx: tam / 2, cy: tam / 2, r, "stroke-width": grosor }),
      f > 0 ? s("circle", { class: "hecho", cx: tam / 2, cy: tam / 2, r, "stroke-width": grosor, "stroke-dasharray": c, "stroke-dashoffset": c * (1 - f) }) : null),
    centro ? h("div", { class: "centro" }, centro) : null);
}

/** Barra fina de progreso (4 pt). */
export function barrita(frac, color = null) {
  const f = Math.max(0, Math.min(1, frac || 0));
  return h("div", { class: "barrita", role: "presentation" }, h("i", { style: { width: (f * 100).toFixed(1) + "%", background: color } }));
}

/**
 * Hace reordenable una lista: se arrastra desde el asa (.asa) de cada fila. Al soltar llama a
 * alMover(desde, hasta) con los índices de las filas hijas de `listaEl`.
 */
export function reordenable(listaEl, alMover) {
  listaEl.addEventListener("pointerdown", (e) => {
    const asa = e.target.closest(".asa");
    if (!asa || !listaEl.contains(asa)) return;
    const filas = [...listaEl.children];
    const fila = filas.find((f) => f.contains(asa));
    if (!fila) return;
    e.preventDefault();
    const desde = filas.indexOf(fila), rects = filas.map((f) => f.getBoundingClientRect());
    const alto = rects[desde].height, y0 = e.clientY;
    let hasta = desde;
    fila.classList.add("arrastrando");
    try { asa.setPointerCapture(e.pointerId); } catch (_) {}
    const mover = (ev) => {
      const dy = ev.clientY - y0;
      fila.style.transform = `translateY(${dy}px)`;
      const centro = rects[desde].top + alto / 2 + dy;
      let n = 0;
      rects.forEach((r, i) => { if (i !== desde && r.top + r.height / 2 < centro) n++; });
      if (n !== hasta) { hasta = n; seleccion(); }
      filas.forEach((f, i) => {
        if (i === desde) return;
        const t = desde < hasta && i > desde && i <= hasta ? -alto : hasta < desde && i >= hasta && i < desde ? alto : 0;
        f.style.transform = t ? `translateY(${t}px)` : "";
      });
    };
    const fin = () => {
      asa.removeEventListener("pointermove", mover); asa.removeEventListener("pointerup", fin); asa.removeEventListener("pointercancel", fin);
      fila.classList.remove("arrastrando");
      filas.forEach((f) => { f.style.transform = ""; });
      if (hasta !== desde) alMover(desde, hasta);
    };
    asa.addEventListener("pointermove", mover); asa.addEventListener("pointerup", fin); asa.addEventListener("pointercancel", fin);
  });
}

/** Hoja con un campo de texto. Devuelve el texto (recortado) o null. */
export function pedirTexto(app, { titulo, valor = "", placeholder = "", accion = "Guardar" }) {
  return new Promise((res) => {
    let r = null;
    const input = h("input", { type: "text", class: "campo-texto", value: valor, placeholder, autocomplete: "off", "aria-label": titulo,
      onKeydown: (e) => { if (e.key === "Enter" && input.value.trim()) { r = input.value.trim(); hoja.cerrar(); } } });
    const hoja = app.abrirHoja({
      titulo, alturas: ["media"],
      accion: { texto: accion, alPulsar: () => { if (!input.value.trim()) return false; r = input.value.trim(); } },
      sucio: () => input.value.trim() !== valor,
      render(c) { c.replaceChildren(h("div", { class: "seccion" }, input)); setTimeout(() => { input.focus(); input.select(); }, 380); },
      alCerrar: () => res(r),
    });
  });
}

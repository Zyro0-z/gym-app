// Utilidades de interfaz: DOM, formato, hojas modales, háptica, viewport visual y piezas iOS.
export function h(tag, attrs, ...hijos) {
  const el = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of hijos.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const $ = (s, r = document) => r.querySelector(s);
export const fmt = (n, d = 0) => {
  const v = Number(n) || 0, p = Math.abs(v).toFixed(d).split(".");
  return (v < 0 ? "-" : "") + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (p[1] ? "," + p[1] : "");
};
export const kg = (n) => fmt(n, Number.isInteger(+n) ? 0 : (Number.isInteger(+n * 10) ? 1 : 2));
// Número para un campo editable: coma decimal, sin ceros sobrantes (102,5 · 80 · 1,25).
export const numTxt = (n) => String(Math.round(n * 1000) / 1000).replace(".", ",");
export const iso = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const hhmm = (d = new Date()) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
export const canon = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_\-.]+/g, "").trim();
export const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
export const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ───────── iconos (SVG propios) ─────────
const SVGNS = "http://www.w3.org/2000/svg";
export function icono(nombre, clase = "ico") {
  const d = {
    chevron: '<path d="M9 5l7 7-7 7"/>',
    atras: '<path d="M15 5l-7 7 7 7"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    puntos: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    papelera: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
    asas: '<path d="M5 9h14M5 15h14"/>',
    aviso: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.2v.1"/>',
    siguiente: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    teclado: '<path d="M6 9l6 6 6-6"/>',
  }[nombre] || "";
  const s = document.createElementNS(SVGNS, "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", clase); s.setAttribute("aria-hidden", "true");
  s.innerHTML = d; return s;
}

// ───────── háptica ─────────
// iOS no implementa navigator.vibrate. Safari 17.4+ da un toque háptico al cambiar un
// <input type="checkbox" switch>; activarlo con label.click() lo dispara (solo dentro de un gesto
// del usuario). Si no funciona, no pasa nada.
let hapLabel = null;
export function haptic() {
  try { if (navigator.vibrate) { navigator.vibrate(12); return; } } catch (e) {}
  try {
    if (!hapLabel) {
      const inp = h("input", { type: "checkbox", switch: true, id: "hap-sw", tabindex: "-1" });
      hapLabel = h("label", { for: "hap-sw", class: "hap", "aria-hidden": "true" }, inp);
      document.body.append(hapLabel);
    }
    hapLabel.click();
  } catch (e) {}
}

// ───────── viewport visual (teclado) ─────────
// Variables CSS --vv-top, --vvh y --kb para colocar barras y hojas sobre el teclado de iOS,
// y la clase body.teclado mientras está abierto.
const vvSubs = new Set();
export const alCambiarViewport = (fn) => { vvSubs.add(fn); return () => vvSubs.delete(fn); };
export const tecladoAbierto = () => document.body.classList.contains("teclado");
function actualizarViewport() {
  const vv = window.visualViewport, alto = document.documentElement.clientHeight;
  const top = vv ? vv.offsetTop : 0, vh = vv ? vv.height : window.innerHeight;
  const st = document.documentElement.style;
  st.setProperty("--vv-top", top + "px"); st.setProperty("--vvh", vh + "px");
  st.setProperty("--kb", Math.max(0, alto - vh - top) + "px");
  const editando = document.activeElement && document.activeElement.matches && document.activeElement.matches("input:not([type=checkbox]):not([type=file]), textarea");
  document.body.classList.toggle("teclado", !!editando && alto - vh > 120);
  for (const f of vvSubs) try { f(); } catch (e) {}
}
if (window.visualViewport) { visualViewport.addEventListener("resize", actualizarViewport); visualViewport.addEventListener("scroll", actualizarViewport); }
window.addEventListener("resize", actualizarViewport);
document.addEventListener("focusin", () => setTimeout(actualizarViewport, 50));
document.addEventListener("focusout", () => setTimeout(actualizarViewport, 50));
actualizarViewport();

// ───────── avisos ─────────
export function toast(msg, ms = 1800) {
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t);
  setTimeout(() => { t.classList.add("fuera"); setTimeout(() => t.remove(), 250); }, ms);
}

// ───────── hojas modales ─────────
// construir(cerrar) devuelve el contenido. Se cierran con el grabber/arrastre hacia abajo, pulsando
// fuera o con cerrar(valor). Devuelve cerrar. o.alCerrar(valor) se llama siempre al cerrar.
const pilaHojas = [];
export function hoja(construir, o = {}) {
  const fondo = h("div", { class: "hoja-fondo" + (o.clase ? " " + o.clase : "") });
  const c = h("div", { class: "hoja", role: "dialog", "aria-modal": "true" });
  let cerrada = false;
  const cerrar = (v) => {
    if (cerrada) return; cerrada = true;
    pilaHojas.splice(pilaHojas.indexOf(cerrar), 1);
    if (document.activeElement && c.contains(document.activeElement)) document.activeElement.blur();
    c.style.transition = ""; c.style.transform = "";
    fondo.classList.remove("abierta");
    const fin = () => { fondo.remove(); o.alCerrar && o.alCerrar(v); };
    if (reducido()) fin(); else setTimeout(fin, 300);
  };
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  c.append(h("div", { class: "grabber", "aria-label": "Cerrar", role: "button", onclick: () => cerrar() }), construir(cerrar));
  fondo.append(c); document.body.append(fondo);
  pilaHojas.push(cerrar);
  c.getBoundingClientRect();
  requestAnimationFrame(() => fondo.classList.add("abierta"));
  arrastrable(c, cerrar);
  return cerrar;
}
export const hayHoja = () => pilaHojas.length > 0;
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pilaHojas.length) pilaHojas[pilaHojas.length - 1](); });

function arrastrable(c, cerrar) {
  let y0 = null, dy = 0, t0 = 0, activo = false;
  const ini = (y, target) => {
    if (c.scrollTop > 2 && !target.closest(".grabber")) return;
    y0 = y; dy = 0; t0 = performance.now(); activo = false;
  };
  const mov = (y, ev) => {
    if (y0 == null) return;
    const d = y - y0;
    if (!activo) {
      if (d > 8) { activo = true; c.style.transition = "none"; y0 = y; }
      else if (d < -8) { y0 = null; return; }
      else return;
    }
    dy = Math.max(0, y - y0);
    c.style.transform = "translateY(" + dy + "px)";
    if (ev.cancelable) ev.preventDefault();
  };
  const fin = () => {
    if (y0 == null) return; y0 = null;
    if (!activo) return; activo = false;
    const v = dy / Math.max(1, performance.now() - t0);
    c.style.transition = "";
    if (dy > Math.min(140, c.offsetHeight * 0.3) || v > 0.6) cerrar(); else c.style.transform = "";
  };
  c.addEventListener("touchstart", (e) => ini(e.touches[0].clientY, e.target), { passive: true });
  c.addEventListener("touchmove", (e) => mov(e.touches[0].clientY, e), { passive: false });
  c.addEventListener("touchend", fin); c.addEventListener("touchcancel", fin);
  c.addEventListener("mousedown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    ini(e.clientY, e.target);
    const mm = (ev) => mov(ev.clientY, ev);
    const mu = () => { fin(); removeEventListener("mousemove", mm); removeEventListener("mouseup", mu); };
    addEventListener("mousemove", mm); addEventListener("mouseup", mu);
  });
}

// Hoja de acción al estilo iOS: mensaje + acción, y «Cancelar» aparte.
export function confirmar(texto, si = "Aceptar", peligro = false) {
  return new Promise((ok) => {
    let r = false;
    hoja((c) => h("div", { class: "accion" },
      h("div", { class: "accion-grupo" },
        h("div", { class: "accion-msg" }, texto),
        h("button", { class: "accion-btn" + (peligro ? " peligro" : ""), onclick: () => { r = true; c(); } }, si)),
      h("button", { class: "accion-btn cancelar", onclick: () => c() }, "Cancelar")), { clase: "transparente", alCerrar: () => ok(r) });
  });
}
export function alerta(titulo, texto) {
  return new Promise((ok) => {
    hoja((c) => h("div", { class: "accion" },
      h("div", { class: "accion-grupo" },
        h("div", { class: "accion-msg" }, h("b", null, titulo), texto ? h("div", { style: { marginTop: "4px" } }, texto) : null),
        h("button", { class: "accion-btn", onclick: () => c() }, "OK"))), { clase: "transparente", alCerrar: () => ok() });
  });
}
// Pide un texto en una hoja. Devuelve el texto (recortado) o null si se cancela.
export function pedirTexto(titulo, { valor = "", placeholder = "", boton = "Guardar", ayuda = "" } = {}) {
  return new Promise((ok) => {
    let r = null;
    hoja((c) => {
      const inp = h("input", { class: "campo", value: valor, placeholder, autocomplete: "off", enterkeyhint: "done" });
      const listo = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } r = v; c(); };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); listo(); } });
      setTimeout(() => inp.focus(), 320);
      return h("div", null,
        cabeceraHoja(titulo, h("button", { class: "nav-btn", onclick: () => c() }, "Cancelar"), h("button", { class: "nav-btn fuerte", onclick: listo }, boton)),
        h("div", { class: "hoja-cuerpo" }, inp, ayuda ? h("p", { class: "pie" }, ayuda) : null));
    }, { alCerrar: () => ok(r) });
  });
}
export const cabeceraHoja = (titulo, izq, der) => h("div", { class: "hoja-cab" }, h("div", { class: "hoja-cab-l" }, izq || null), h("div", { class: "hoja-tit" }, titulo), h("div", { class: "hoja-cab-r" }, der || null));

// ───────── pantallas con título grande ─────────
// Devuelve { raiz, cuerpo }. La barra superior muestra el título pequeño cuando el grande sale.
let navActual = null;
export function pantalla(titulo, { izq = null, der = null, grande = true, sub = null } = {}) {
  const nav = h("header", { class: "nav" + (grande ? "" : " compacta fija") },
    h("div", { class: "nav-l" }, izq), h("div", { class: "nav-t" }, titulo, sub ? h("div", { class: "nav-sub" }, sub) : null), h("div", { class: "nav-r" }, der));
  const cuerpo = h("div", { class: "cuerpo" });
  const raiz = h("div", { class: "pantalla" + (grande ? "" : " sin-grande") }, nav, grande ? h("h1", { class: "grande" }, titulo) : null, cuerpo);
  navActual = grande ? nav : null;
  requestAnimationFrame(compactar);
  return { raiz, cuerpo, nav };
}
function compactar() {
  if (!navActual || !navActual.isConnected) return;
  const g = navActual.parentElement.querySelector("h1.grande");
  if (!g) return;
  navActual.classList.toggle("compacta", g.getBoundingClientRect().bottom < navActual.getBoundingClientRect().bottom - 4);
}
addEventListener("scroll", compactar, { passive: true });

// ───────── listas «inset grouped» ─────────
export function grupo(cab, filas, pie) {
  return h("section", { class: "grupo" }, cab ? h("h2", { class: "grupo-cab" }, cab) : null,
    h("div", { class: "celdas" }, filas), pie ? h("p", { class: "pie" }, pie) : null);
}
// fila({ texto, detalle, sub, onclick, chevron, der, clase, peligro })
export function fila(o) {
  const tag = o.onclick ? "button" : "div";
  return h(tag, { class: "celda" + (o.onclick ? " pulsable" : "") + (o.clase ? " " + o.clase : "") + (o.peligro ? " peligro" : ""), onclick: o.onclick || null, type: o.onclick ? "button" : null },
    o.izq || null,
    h("div", { class: "celda-txt" }, h("div", { class: "celda-t" }, o.texto), o.sub ? h("div", { class: "celda-sub" }, o.sub) : null),
    o.detalle != null ? h("div", { class: "celda-det" }, o.detalle) : null,
    o.der || null,
    o.chevron !== false && o.onclick && !o.peligro && !o.sinChevron ? icono("chevron", "ico chev") : null);
}
// Stepper − valor +. o: { valor, min, max, paso, formato, alCambiar }
export function stepper(o) {
  let v = o.valor;
  const etq = h("span", { class: "stepper-v" });
  const pintar = () => { etq.textContent = o.formato ? o.formato(v) : String(v); menos.disabled = v <= o.min; mas.disabled = v >= o.max; };
  const cambiar = (d) => { const n = Math.min(o.max, Math.max(o.min, Math.round((v + d) * 1000) / 1000)); if (n === v) return; v = n; haptic(); pintar(); o.alCambiar(v); };
  const menos = h("button", { class: "stepper-b", type: "button", "aria-label": "Menos", onclick: () => cambiar(-o.paso) }, icono("menos"));
  const mas = h("button", { class: "stepper-b", type: "button", "aria-label": "Más", onclick: () => cambiar(o.paso) }, icono("mas"));
  pintar();
  return h("div", { class: "stepper" }, etq, h("div", { class: "stepper-bs" }, menos, mas));
}
export function interruptor(activo, alCambiar, etiqueta) {
  const i = h("input", { type: "checkbox", class: "sw", "aria-label": etiqueta || "" });
  i.checked = !!activo;
  i.addEventListener("change", () => { haptic(); alCambiar(i.checked); });
  return i;
}
export function segmentado(opciones, valor, alCambiar) {
  const c = h("div", { class: "seg", role: "radiogroup" });
  for (const [k, t] of opciones) c.append(h("button", { type: "button", role: "radio", "aria-checked": String(k === valor), class: k === valor ? "on" : "", onclick: (e) => {
    c.querySelectorAll("button").forEach((b) => { b.classList.remove("on"); b.setAttribute("aria-checked", "false"); });
    e.currentTarget.classList.add("on"); e.currentTarget.setAttribute("aria-checked", "true"); haptic(); alCambiar(k);
  } }, t));
  return c;
}

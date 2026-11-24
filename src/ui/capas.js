// Capas sobre la navegación: hoja (sheet) con alturas media y grande, alerta, hoja de acciones y
// toast. Solo hay una hoja a la vez. Ninguna depende del hover.
import { h, poner, animar, reducirMovimiento } from "./dom.js";
import { icono } from "./iconos.js";

const CURVA = "cubic-bezier(.32,.72,0,1)";
let hojaAbierta = null, capasModales = 0;

export const hayCapaAbierta = () => !!hojaAbierta || capasModales > 0;

/* ── Foco en las capas: Tab da la vuelta dentro de la de arriba, Escape la cancela y, al cerrarla,
   el foco vuelve a donde estaba. Pila: solo manda la última abierta. ── */
const ENFOCABLES = "button:not([disabled]), [href], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const trampas = [];
let nId = 0;
export const idUnico = (p = "c") => p + "-" + ++nId;
document.addEventListener("keydown", (e) => {
  const t = trampas[trampas.length - 1];
  if (!t) return;
  if (e.key === "Escape") { e.preventDefault(); t.alEscape(); return; }
  if (e.key !== "Tab") return;
  const l = [...t.el.querySelectorAll(ENFOCABLES)].filter((x) => x.getClientRects().length && getComputedStyle(x).visibility !== "hidden");
  if (!l.length) { e.preventDefault(); t.el.focus({ preventScroll: true }); return; }
  const i = l.indexOf(document.activeElement);
  if (e.shiftKey && i <= 0) { e.preventDefault(); l[l.length - 1].focus(); }
  else if (!e.shiftKey && (i === l.length - 1 || i < 0)) { e.preventDefault(); l[0].focus(); }
}, true);

/** Atrapa el foco en `el` hasta llamar a la función devuelta. inicial: elemento a enfocar. */
export function atraparFoco(el, alEscape, inicial = null) {
  const previo = document.activeElement;
  const t = { el, alEscape };
  trampas.push(t);
  if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
  requestAnimationFrame(() => { if (!el.contains(document.activeElement)) (inicial || el).focus({ preventScroll: true }); });
  return () => {
    const i = trampas.indexOf(t);
    if (i >= 0) trampas.splice(i, 1);
    if (previo && previo.isConnected && typeof previo.focus === "function" && (!document.activeElement || document.activeElement === document.body || el.contains(document.activeElement))) previo.focus({ preventScroll: true });
  };
}

/**
 * Abre una hoja.
 *   titulo, cancelar ("Cancelar" | null), accion { texto, alPulsar, deshabilitada() }
 *   alturas: ["media", "grande"] (la primera es la inicial)
 *   render(cuerpo, hoja), sucio() → hay cambios sin guardar, alCerrar()
 * Devuelve { cerrar(), repintar(), el }.
 */
export function abrirHoja(op) {
  if (hojaAbierta) hojaAbierta.cerrar(true);
  const alturas = op.alturas && op.alturas.length ? op.alturas : ["grande"];
  const velo = h("div", { class: "velo" });
  const cuerpo = h("div", { class: "hoja-cuerpo" });
  const izq = h("div", { class: "izq" }), der = h("div", { class: "der" });
  const tit = h("h2", { class: "titulo", id: idUnico("hoja") });
  const cab = h("div", { class: "hoja-cab" }, izq, tit, der);
  const grabber = h("div", { class: "grabber", "aria-hidden": "true" });
  const el = h("div", { class: "hoja", role: "dialog", "aria-modal": "true", "aria-labelledby": tit.id }, grabber, cab, cuerpo);
  document.body.append(velo, el);
  const hoja = { el, cuerpo, cerrar, repintar, intentarCerrar, cerrada: false, altura: alturas[0] };
  hojaAbierta = hoja;
  const soltarFoco = atraparFoco(el, () => intentarCerrar());

  const offset = (a) => (a === "media" ? Math.max(0, el.offsetHeight - Math.round(window.innerHeight * 0.52)) : 0);
  let y = 0;
  const mover = (v, anim) => {
    y = v;
    if (!anim) { el.style.transform = `translateY(${v}px)`; return Promise.resolve(); }
    const desde = getComputedStyle(el).transform;
    return animar(el, [{ transform: desde === "none" ? "translateY(0)" : desde }, { transform: `translateY(${v}px)` }],
      { duration: reducirMovimiento() ? 1 : 380, easing: CURVA, fill: "none" }).then(() => { el.style.transform = `translateY(${v}px)`; });
  };

  function repintar() {
    tit.textContent = typeof op.titulo === "function" ? op.titulo() : op.titulo || "";
    poner(izq, op.cancelar === null ? null : h("button", { class: "btn-barra", onClick: () => intentarCerrar() }, op.cancelar || "Cancelar"));
    const acc = op.accion;
    poner(der, acc ? h("button", { class: "btn-barra fuerte", disabled: acc.deshabilitada ? !!acc.deshabilitada() : false,
      onClick: async () => { const r = await acc.alPulsar(hoja); if (r !== false) cerrar(); } }, acc.texto) : null);
    if (op.render) op.render(cuerpo, hoja);
  }

  async function intentarCerrar() {
    if (op.sucio && op.sucio()) {
      const r = await hojaAcciones({ opciones: [{ texto: "Descartar cambios", peligro: true, valor: "s" }] });
      if (r !== "s") { mover(offset(hoja.altura), true); return false; }
    }
    cerrar();
    return true;
  }

  function cerrar(inmediato) {
    if (hoja.cerrada) return;
    hoja.cerrada = true;
    if (hojaAbierta === hoja) hojaAbierta = null;
    soltarFoco();
    velo.classList.remove("visible");
    const fin = () => { el.remove(); velo.remove(); if (op.alCerrar) op.alCerrar(); };
    if (inmediato) return fin();
    mover(el.offsetHeight + 20, true).then(fin);
  }

  velo.addEventListener("click", () => intentarCerrar());

  // arrastre: desde el tirador o la cabecera, o desde el cuerpo si está arriba del todo
  let g = null;
  el.addEventListener("pointerdown", (e) => {
    const enCab = grabber.contains(e.target) || (cab.contains(e.target) && !e.target.closest("button"));
    const enCuerpo = cuerpo.contains(e.target) && cuerpo.scrollTop <= 0 && !e.target.closest("input,textarea,select,.grafica,.celda-desliza");
    if (!enCab && !enCuerpo) return;
    g = { id: e.pointerId, y0: e.clientY, base: y, t: performance.now(), v: 0, ult: e.clientY, activo: enCab };
  });
  el.addEventListener("pointermove", (e) => {
    if (!g || e.pointerId !== g.id) return;
    const dy = e.clientY - g.y0;
    if (!g.activo) { if (dy > 8) { g.activo = true; try { el.setPointerCapture(e.pointerId); } catch (_) {} } else if (dy < -4) { g = null; return; } else return; }
    const ahora = performance.now();
    g.v = (e.clientY - g.ult) / Math.max(1, ahora - g.t); g.t = ahora; g.ult = e.clientY;
    let ny = g.base + dy;
    if (ny < 0) ny = ny / 3;            // resistencia por arriba
    mover(ny);
    velo.style.opacity = String(Math.max(0, 1 - Math.max(0, ny - offset("media")) / el.offsetHeight));
  });
  const soltar = (e) => {
    if (!g || e.pointerId !== g.id) return;
    const activo = g.activo, v = g.v; g = null;
    velo.style.opacity = "";
    if (!activo) return;
    const opciones = alturas.map((a) => ({ a, y: offset(a) }));
    const cierre = el.offsetHeight;
    const masBaja = opciones.reduce((m, o) => Math.max(m, o.y), 0);
    if ((v > 0.8 && y > masBaja - 40) || y > masBaja + Math.max(80, (cierre - masBaja) * 0.3)) { intentarCerrar(); return; }
    let mejor = opciones[0];
    for (const o of opciones) if (Math.abs(o.y - y - v * 120) < Math.abs(mejor.y - y - v * 120)) mejor = o;
    hoja.altura = mejor.a;
    mover(mejor.y, true);
  };
  el.addEventListener("pointerup", soltar);
  el.addEventListener("pointercancel", soltar);

  repintar();
  el.style.transform = `translateY(${window.innerHeight}px)`;
  requestAnimationFrame(() => { velo.classList.add("visible"); mover(offset(hoja.altura), true); });
  return hoja;
}

/** Cierra la hoja abierta (si hay). Devuelve true si había una. */
export function cerrarHojaAbierta() { if (!hojaAbierta) return false; hojaAbierta.cerrar(); return true; }

function capaModal(contenido, clase, { rol = "alertdialog", etiqueta = null, titulo = null, descripcion = null, alEscape, inicial = null }) {
  capasModales++;
  const capa = h("div", { class: clase, role: rol, "aria-modal": "true", "aria-label": etiqueta, "aria-labelledby": titulo, "aria-describedby": descripcion }, contenido);
  document.body.append(capa);
  const soltar = atraparFoco(capa, alEscape, inicial);
  const r = reducirMovimiento();
  animar(capa, [{ opacity: 0 }, { opacity: 1 }], { duration: r ? 1 : 200 });
  return {
    capa,
    quitar: () => { soltar(); return animar(capa, [{ opacity: 1 }, { opacity: 0 }], { duration: r ? 1 : 180 }).then(() => { capa.remove(); capasModales--; }); },
  };
}

/**
 * Alerta centrada. botones: [{ texto, valor, estilo: "cancelar" | "peligro" | "fuerte" }].
 * Devuelve una promesa con el valor del botón.
 */
export function alerta({ titulo, mensaje = "", botones = [{ texto: "Aceptar", valor: true, estilo: "fuerte" }] }) {
  return new Promise((res) => {
    let m;
    const fila = h("div", { class: ["botones", (botones.length > 2 || botones.some((b) => String(b.texto).length > 13)) && "vertical"] }, botones.map((b) =>
      h("button", { class: [b.estilo === "peligro" && "peligro", (b.estilo === "fuerte" || b.estilo === "cancelar" && botones.length === 1) && "fuerte"],
        onClick: () => { m.quitar(); res(b.valor); } }, b.texto)));
    const idT = idUnico("alerta"), idM = mensaje ? idUnico("alerta") : null;
    const caja = h("div", { class: "alerta" }, h("div", { class: "cuerpo" }, h("h2", { id: idT }, titulo), mensaje ? h("p", { id: idM }, mensaje) : null), fila);
    // Escape = el botón de cancelar (o el único que haya)
    const cancelar = botones.find((b) => b.estilo === "cancelar") || (botones.length === 1 ? botones[0] : null);
    const pref = fila.querySelector(".fuerte") || fila.lastChild;
    m = capaModal(caja, "alerta-capa", { titulo: idT, descripcion: idM, inicial: pref, alEscape: () => { if (cancelar) { m.quitar(); res(cancelar.valor); } } });
    animar(caja, [{ transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: reducirMovimiento() ? 1 : 250, easing: CURVA });
  });
}

/** Confirmación con Cancelar y una acción (en rojo si es destructiva). Devuelve true/false. */
export const confirmar = (titulo, mensaje, texto = "Aceptar", peligro = false) =>
  alerta({ titulo, mensaje, botones: [{ texto: "Cancelar", valor: false, estilo: "cancelar" }, { texto, valor: true, estilo: peligro ? "peligro" : "fuerte" }] });

/** Hoja de acciones (abajo). opciones: [{ texto, valor, peligro }]. Devuelve el valor o null. */
export function hojaAcciones({ mensaje = null, opciones }) {
  return new Promise((res) => {
    let m;
    const fin = (v) => { m.quitar(); res(v); };
    const g1 = h("div", { class: "acciones-grupo" }, mensaje ? h("div", { class: "msj" }, mensaje) : null,
      opciones.map((o) => h("button", { class: o.peligro && "peligro", onClick: (e) => { e.stopPropagation(); fin(o.valor); } }, o.texto)));
    const g2 = h("div", { class: "acciones-grupo" }, h("button", { class: "fuerte", onClick: (e) => { e.stopPropagation(); fin(null); } }, "Cancelar"));
    const cont = h("div", null, g1, g2);
    m = capaModal(cont, "acciones-capa", { rol: "dialog", etiqueta: mensaje || "Opciones", alEscape: () => fin(null), inicial: g1.querySelector("button") });
    m.capa.addEventListener("click", (e) => { if (e.target === m.capa) fin(null); });
    animar(cont, [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: reducirMovimiento() ? 1 : 350, easing: CURVA });
  });
}

let toastEl = null, toastT = 0;
/** Píldora breve sobre la tab bar (2 s; 4 s si lleva una acción, p. ej. «Deshacer»). */
export function toast(texto, { icono: ic = "check", accion = null } = {}) {
  if (!toastEl) { toastEl = h("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.append(toastEl); }
  const cerrar = () => { clearTimeout(toastT); toastEl.classList.remove("visible"); };
  poner(toastEl, ic ? icono(ic) : null, h("span", null, texto),
    accion ? h("button", { class: "toast-accion", onClick: () => { cerrar(); accion.alPulsar(); } }, accion.texto) : null);
  toastEl.classList.toggle("con-accion", !!accion);
  requestAnimationFrame(() => toastEl.classList.add("visible"));
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove("visible"), accion ? 4000 : 2000);
}

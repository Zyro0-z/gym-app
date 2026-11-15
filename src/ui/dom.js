// Utilidades DOM mínimas. `h` crea elementos HTML y `s` elementos SVG con la misma firma:
//   h("div", { class: "x", onClick: fn, style: { color: "red" }, dataset: { id: 1 } }, hijo1, [hijo2, hijo3])
// Los hijos pueden ser nodos, texto, números, arrays o null/false (se ignoran). Nunca usa innerHTML
// con datos del usuario: el texto siempre entra como nodo de texto.

const SVG_NS = "http://www.w3.org/2000/svg";

function aplicar(el, props) {
  if (!props) return el;
  for (const k in props) {
    const v = props[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.setAttribute("class", Array.isArray(v) ? v.filter(Boolean).join(" ") : v);
    else if (k === "style" && typeof v === "object") { for (const p in v) if (v[p] !== null && v[p] !== undefined) { if (p.startsWith("--")) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; } }
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "html") el.innerHTML = v;              // solo para SVG propio y constante
    else if (k === "ref" && typeof v === "function") v(el);
    else if (k in el && !(el instanceof SVGElement) && k !== "list" && k !== "form" && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  return el;
}

function anadir(el, hijos) {
  for (const c of hijos) {
    if (c === null || c === undefined || c === false || c === true) continue;
    if (Array.isArray(c)) anadir(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
  return el;
}

export function h(tag, props, ...hijos) { return anadir(aplicar(document.createElement(tag), props), hijos); }
export function s(tag, props, ...hijos) { return anadir(aplicar(document.createElementNS(SVG_NS, tag), props), hijos); }

/** Vacía un nodo y le pone hijos nuevos. */
export function poner(el, ...hijos) { el.replaceChildren(); return anadir(el, hijos); }

/** Espera al siguiente fotograma (útil antes de una transición CSS). */
export const fotograma = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export const reducirMovimiento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Anima con la Web Animations API y resuelve al terminar (o enseguida si no hay soporte).
 * Lleva un temporizador de respaldo: en algunos WebKit la promesa `finished` de una animación
 * recién creada no llega a resolverse aunque la animación termine.
 */
export function animar(el, frames, opciones) {
  if (!el || !el.animate) return Promise.resolve();
  const op = Object.assign({ fill: "forwards" }, opciones);
  const a = el.animate(frames, op);
  return new Promise((res) => {
    let hecho = false;
    const fin = () => { if (!hecho) { hecho = true; res(a); } };
    a.finished.then(fin, fin);
    setTimeout(() => { if (!hecho) { try { a.finish(); } catch (e) {} fin(); } }, (op.duration || 0) + 120);
  });
}

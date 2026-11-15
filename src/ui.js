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
export const kg = (n) => fmt(n, Number.isInteger(+n) ? 0 : 1);
export const iso = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
export const hhmm = (d = new Date()) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
export const canon = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_\-.]+/g, "").trim();
export const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };

export function toast(msg, ms = 1800) {
  const t = h("div", { class: "toast" }, msg);
  document.body.append(t); setTimeout(() => t.remove(), ms);
}
// Hoja inferior. construir(cerrar) devuelve el contenido.
export function hoja(construir) {
  const fondo = h("div", { class: "hoja-fondo" });
  const cerrar = () => fondo.remove();
  const c = h("div", { class: "hoja" });
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  c.append(construir(cerrar));
  fondo.append(c); document.body.append(fondo);
  return cerrar;
}
export function confirmar(texto, si = "Aceptar", peligro = false) {
  return new Promise((ok) => {
    const cerrar = hoja((c) => h("div", null,
      h("p", { style: { fontSize: "17px", margin: "4px 0 16px" } }, texto),
      h("div", { class: "row" },
        h("button", { class: "btn sp", onclick: () => { c(); ok(false); } }, "Cancelar"),
        h("button", { class: "btn sp " + (peligro ? "mal" : "pri"), onclick: () => { c(); ok(true); } }, si))));
  });
}

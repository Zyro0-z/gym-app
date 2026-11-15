// Gráficas SVG propias al estilo de Swift Charts: barras redondeadas, línea con área en degradado,
// rejilla tenue de 3-4 líneas, eje Y a la derecha y selección por arrastre con un indicador
// vertical y una burbuja arriba. Se dibujan al ancho real del contenedor (ResizeObserver).
import { h, s } from "./dom.js";
import { seleccion } from "./haptica.js";

const EJE_Y = 40, EJE_X = 20, ARRIBA = 52;   // ARRIBA: hueco para la burbuja de selección
let nGrad = 0;

/** Marcas «redondas» para un rango: 1, 2, 2,5 o 5 × 10^n. */
export function marcas(min, max, n = 4) {
  if (!(isFinite(min) && isFinite(max))) return [0, 1];
  if (min === max) { const d = Math.abs(min) * 0.1 || 1; min -= d; max += d; }
  const bruto = (max - min) / Math.max(1, n - 1);
  const p = Math.pow(10, Math.floor(Math.log10(bruto)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= bruto) || 10 * p;
  const a = Math.floor(min / paso) * paso, b = Math.ceil(max / paso) * paso;
  const out = [];
  for (let v = a; v <= b + paso * 1e-6; v += paso) out.push(Math.round(v / paso) * paso);
  return out;
}

const fmtEje = (v) => {
  const a = Math.abs(v);
  if (a >= 10000) return (Math.round(v / 100) / 10).toLocaleString("es-ES") + " mil";
  if (a >= 1000) return Math.round(v).toLocaleString("es-ES");
  return (Math.round(v * 10) / 10).toLocaleString("es-ES");
};

function contenedor(alto, dibujar, etiqueta) {
  const el = h("div", { class: "grafica", style: { height: alto + "px" }, role: "img", "aria-label": etiqueta || "Gráfica" });
  let ancho = 0;
  const ro = new ResizeObserver((ents) => {
    const w = Math.round(ents[0].contentRect.width);
    if (w && w !== ancho) { ancho = w; el.replaceChildren(); dibujar(el, w); }
  });
  ro.observe(el);
  return el;
}

/** Selección por arrastre: `xs` posiciones de cada dato y `info(i)` → { valor, detalle, y }. */
function seleccionable(el, svg, xs, ys, alto, info, ancho) {
  const cursor = s("line", { class: "cursor", y1: ARRIBA - 6, y2: alto - EJE_X, visibility: "hidden" });
  const marca = s("circle", { class: "selec", r: 5, visibility: "hidden" });
  svg.append(cursor, marca);
  const burbuja = h("div", { class: "burbuja", hidden: true });
  el.appendChild(burbuja);
  let i0 = -1, t = 0;
  const mostrar = (cx) => {
    let i = 0;
    for (let j = 1; j < xs.length; j++) if (Math.abs(xs[j] - cx) < Math.abs(xs[i] - cx)) i = j;
    if (i === i0) return;
    if (i0 !== -1) seleccion();
    i0 = i;
    const d = info(i);
    cursor.setAttribute("x1", xs[i]); cursor.setAttribute("x2", xs[i]); cursor.setAttribute("visibility", "visible");
    if (ys && ys[i] !== null && ys[i] !== undefined) { marca.setAttribute("cx", xs[i]); marca.setAttribute("cy", ys[i]); marca.setAttribute("visibility", "visible"); }
    else marca.setAttribute("visibility", "hidden");
    burbuja.replaceChildren(h("b", null, d.valor), d.detalle ? h("span", null, d.detalle) : null);
    burbuja.hidden = false;
    const bw = burbuja.offsetWidth;
    burbuja.style.left = Math.max(bw / 2, Math.min(ancho - EJE_Y - bw / 2 + 8, xs[i])) + "px";
  };
  const ocultar = () => { i0 = -1; cursor.setAttribute("visibility", "hidden"); marca.setAttribute("visibility", "hidden"); burbuja.hidden = true; };
  let activo = null;
  el.addEventListener("pointerdown", (e) => { activo = e.pointerId; clearTimeout(t); const r = el.getBoundingClientRect(); mostrar(e.clientX - r.left); });
  el.addEventListener("pointermove", (e) => { if (activo !== e.pointerId) return; const r = el.getBoundingClientRect(); mostrar(e.clientX - r.left); });
  const fin = (e) => { if (activo !== e.pointerId) return; activo = null; t = setTimeout(ocultar, 1400); };
  el.addEventListener("pointerup", fin); el.addEventListener("pointercancel", fin);
}

function rejilla(svg, ticks, y, ancho) {
  for (const v of ticks) {
    const yy = y(v);
    svg.append(s("line", { class: ["rejilla", v === ticks[0] && "base"], x1: 0, x2: ancho - EJE_Y + 4, y1: yy, y2: yy }));
    svg.append(s("text", { class: "eje", x: ancho - EJE_Y + 8, y: yy + 4 }, fmtEje(v)));
  }
}

/**
 * Barras. datos: [{ etiqueta, valor, activa, partes: [{ valor, color }] }]
 * formato(v) para la burbuja; detalle(d, i) texto secundario; banda [min, max] opcional.
 */
export function graficaBarras({ datos, alto = 180, formato = fmtEje, detalle = null, banda = null, etiqueta = "", seleccionar = true }) {
  return contenedor(alto, (el, ancho) => {
    const svg = s("svg", { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    const total = (d) => (d.partes ? d.partes.reduce((a, p) => a + (p.valor || 0), 0) : d.valor || 0);
    const maxV = Math.max(banda ? banda[1] : 0, ...datos.map(total), 0);
    const ticks = marcas(0, maxV || 1, 4).filter((v) => v >= 0);
    const top = ticks[ticks.length - 1] || 1;
    const y = (v) => ARRIBA + (alto - EJE_X - ARRIBA) * (1 - v / top);
    if (banda) svg.append(s("rect", { class: "banda", x: 0, width: ancho - EJE_Y + 4, y: y(banda[1]), height: Math.max(1, y(banda[0]) - y(banda[1])), rx: 4 }));
    rejilla(svg, ticks, y, ancho);
    const zona = ancho - EJE_Y - 4, n = datos.length || 1, hueco = zona / n, bw = Math.max(4, Math.min(28, hueco * 0.62));
    const xs = [], ys = [];
    const cadaEt = Math.ceil(n / Math.max(1, Math.floor(zona / 34)));
    datos.forEach((d, i) => {
      const cx = hueco * i + hueco / 2, x = cx - bw / 2;
      xs.push(cx); ys.push(null);
      if (d.partes) {
        let acum = 0;
        const partes = d.partes.filter((p) => p.valor > 0);
        partes.forEach((p, j) => {
          const y1 = y(acum + p.valor), y0 = y(acum); acum += p.valor;
          const ultimo = j === partes.length - 1;
          svg.append(s("path", { d: barraPath(x, y1 + (j ? 0 : 0), bw, Math.max(0, y0 - y1 - (j ? 1 : 0)), ultimo ? 4 : 0), style: `fill:${p.color}` }));
        });
      } else {
        const v = d.valor || 0, hh = Math.max(v > 0 ? 2 : 0, y(0) - y(v));
        svg.append(s("path", { class: ["barra", d.activa && "activa"], d: barraPath(x, y(0) - hh, bw, hh, 4) }));
      }
      if (i % cadaEt === 0 || i === n - 1 && n <= 12) svg.append(s("text", { class: "eje", x: cx, y: alto - 4, "text-anchor": "middle" }, d.etiqueta || ""));
    });
    el.appendChild(svg);
    if (seleccionar && datos.length) seleccionable(el, svg, xs, ys, alto, (i) => ({ valor: formato(total(datos[i])), detalle: detalle ? detalle(datos[i], i) : datos[i].etiqueta }), ancho);
  }, etiqueta);
}

/** Rectángulo con las esquinas de arriba redondeadas. */
function barraPath(x, y, w, hh, r) {
  if (hh <= 0) return "";
  r = Math.min(r, w / 2, hh);
  return `M${x} ${y + hh}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + hh}Z`;
}

/**
 * Línea (y área). puntos: [{ x: número (día), y, detalle }]; ejeX(x) → texto de la marca.
 * secundaria: [{ x, y }] línea punteada (media móvil); conPuntos dibuja cada dato.
 */
export function graficaLinea({ puntos, alto = 200, formato = fmtEje, ejeX = null, area = true, conPuntos = true, secundaria = null, etiqueta = "", dominioX = null }) {
  return contenedor(alto, (el, ancho) => {
    const svg = s("svg", { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    if (!puntos.length) { el.appendChild(svg); return; }
    const vals = puntos.map((p) => p.y).concat(secundaria ? secundaria.map((p) => p.y) : []);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const marg = (hi - lo) * 0.12 || Math.abs(hi) * 0.05 || 1;
    const ticks = marcas(lo - marg, hi + marg, 4);
    lo = ticks[0]; hi = ticks[ticks.length - 1];
    const x0 = dominioX ? dominioX[0] : puntos[0].x, x1 = dominioX ? dominioX[1] : puntos[puntos.length - 1].x;
    const zona = ancho - EJE_Y - 12;
    const x = (v) => 6 + (x1 === x0 ? zona / 2 : ((v - x0) / (x1 - x0)) * zona);
    const y = (v) => ARRIBA + (alto - EJE_X - ARRIBA) * (1 - (v - lo) / (hi - lo || 1));
    rejilla(svg, ticks, y, ancho);
    if (ejeX) {
      const n = Math.max(2, Math.min(5, Math.floor(zona / 64)));
      for (let k = 0; k < n; k++) {
        const v = x0 + ((x1 - x0) * k) / (n - 1);
        svg.append(s("text", { class: "eje", x: x(v), y: alto - 4, "text-anchor": k === 0 ? "start" : k === n - 1 ? "end" : "middle" }, ejeX(Math.round(v))));
      }
    }
    const camino = (ps) => ps.map((p, i) => (i ? "L" : "M") + x(p.x).toFixed(1) + " " + y(p.y).toFixed(1)).join("");
    const linea = camino(puntos);
    if (area && puntos.length > 1) {
      const id = "gl" + ++nGrad;
      svg.append(s("defs", null, s("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 },
        s("stop", { offset: "0", "stop-color": "var(--accent)", "stop-opacity": ".28" }),
        s("stop", { offset: "1", "stop-color": "var(--accent)", "stop-opacity": "0" }))));
      svg.append(s("path", { d: `${linea}L${x(puntos[puntos.length - 1].x).toFixed(1)} ${y(lo)}L${x(puntos[0].x).toFixed(1)} ${y(lo)}Z`, fill: `url(#${id})` }));
    }
    if (secundaria && secundaria.length > 1) svg.append(s("path", { class: "linea secundaria", d: camino(secundaria) }));
    if (puntos.length > 1) svg.append(s("path", { class: "linea", d: linea }));
    if (conPuntos || puntos.length === 1) for (const p of puntos) svg.append(s("circle", { class: "punto", cx: x(p.x), cy: y(p.y), r: puntos.length > 40 ? 2 : 3 }));
    el.appendChild(svg);
    seleccionable(el, svg, puntos.map((p) => x(p.x)), puntos.map((p) => y(p.y)), alto,
      (i) => ({ valor: formato(puntos[i].y), detalle: puntos[i].detalle || "" }), ancho);
  }, etiqueta);
}

/** Línea mínima sin ejes. */
export function sparkline(valores, { ancho = 64, alto = 22 } = {}) {
  const v = valores.filter((n) => isFinite(n));
  const svg = s("svg", { class: "sparkline", width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}`, "aria-hidden": "true" });
  if (v.length < 2) return svg;
  const lo = Math.min(...v), hi = Math.max(...v);
  const d = v.map((n, i) => (i ? "L" : "M") + ((i / (v.length - 1)) * (ancho - 4) + 2).toFixed(1) + " " + (alto - 2 - ((n - lo) / (hi - lo || 1)) * (alto - 4)).toFixed(1)).join("");
  svg.append(s("path", { d }));
  return svg;
}

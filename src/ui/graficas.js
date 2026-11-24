// Gráficas SVG propias al estilo de Swift Charts: barras redondeadas, línea con área en degradado,
// rejilla tenue de 3-4 líneas, eje Y a la derecha y selección por arrastre con un indicador
// vertical y una burbuja arriba. Se dibujan al ancho real del contenedor (ResizeObserver).
import { h, s } from "./dom.js";
import { seleccion, impacto } from "./haptica.js";

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

// Un solo formateador: toLocaleString crea uno por llamada y en WebKit eso bloquea el hilo
const NUM = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 });
const fmtEje = (v) => {
  const a = Math.abs(v);
  if (a >= 10000) return NUM.format(Math.round(v / 100) / 10) + " mil";
  if (a >= 1000) return NUM.format(Math.round(v));
  return NUM.format(Math.round(v * 10) / 10);
};

/**
 * Resumen textual de una serie (lectores de pantalla): extremos, último valor y tendencia, que
 * compara la media de la segunda mitad con la de la primera (±3 % se considera estable).
 * valores: números o null; nombres(i): texto del dato i.
 */
export function describirSerie(valores, formato = fmtEje, nombres = null) {
  const idx = valores.map((v, i) => (typeof v === "number" && isFinite(v) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return "Sin datos.";
  const v = idx.map((i) => valores[i]), nom = (i) => (nombres ? nombres(i) : "");
  const iMin = idx[v.indexOf(Math.min(...v))], iMax = idx[v.indexOf(Math.max(...v))], ult = idx[idx.length - 1];
  const con = (i) => formato(valores[i]) + (nom(i) ? " (" + nom(i) + ")" : "");
  if (v.length === 1) return "Un dato: " + con(ult) + ".";
  let t = "Mínimo " + con(iMin) + "; máximo " + con(iMax) + "; último " + con(ult) + ".";
  if (v.length >= 4) {
    const m = Math.floor(v.length / 2), med = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const a = med(v.slice(0, m)), b = med(v.slice(v.length - m));
    const pct = a ? ((b - a) / Math.abs(a)) * 100 : null;
    t += pct == null ? "" : Math.abs(pct) < 3 ? " Tendencia estable." : pct > 0 ? " Tendencia al alza." : " Tendencia a la baja.";
  }
  return t;
}

function contenedor(alto, dibujar, etiqueta, resumen = "") {
  const el = h("div", { class: "grafica", style: { height: alto + "px" }, role: "img", "aria-label": (etiqueta || "Gráfica") + (resumen ? ". " + resumen : "") });
  let ancho = 0;
  const ro = new ResizeObserver((ents) => {
    const w = Math.round(ents[0].contentRect.width);
    if (w && w !== ancho) { ancho = w; el.replaceChildren(); dibujar(el, w); }
  });
  ro.observe(el);
  return el;
}

/** Selección por arrastre: `xs` posiciones de cada dato y `info(i)` → { valor, detalle, y }. */
function seleccionable(el, svg, xs, ys, alto, info, ancho, marcar = -1) {
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
    if (i0 !== -1) { if (i === marcar) impacto(); else seleccion(); }   // el máximo del periodo suena distinto
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
  }, etiqueta, describirSerie(datos.map((d) => (d.partes ? d.partes.reduce((a, p) => a + (p.valor || 0), 0) : d.valor)), formato, (i) => datos[i].etiqueta || ""));
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
export function graficaLinea({ puntos, alto = 200, formato = fmtEje, ejeX = null, area = true, conPuntos = true, secundaria = null, etiqueta = "", dominioX = null, banda = null }) {
  return contenedor(alto, (el, ancho) => {
    const svg = s("svg", { width: ancho, height: alto, viewBox: `0 0 ${ancho} ${alto}` });
    if (!puntos.length) { el.appendChild(svg); return; }
    const vals = puntos.map((p) => p.y).concat(secundaria ? secundaria.map((p) => p.y) : [], banda ? banda.flatMap((b) => [b.lo, b.hi]) : []);
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
    if (banda && banda.length > 1) {   // franja de ±ruido personal: la zona donde un cambio no se distingue de la variación normal
      const arriba = banda.map((b, i) => (i ? "L" : "M") + x(b.x).toFixed(1) + " " + y(b.hi).toFixed(1)).join("");
      const abajo = banda.slice().reverse().map((b) => "L" + x(b.x).toFixed(1) + " " + y(b.lo).toFixed(1)).join("");
      svg.append(s("path", { class: "banda-confianza", d: arriba + abajo + "Z" }));
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
    const iMax = puntos.length > 2 ? puntos.reduce((m, p, i) => (p.y > puntos[m].y ? i : m), 0) : -1;
    seleccionable(el, svg, puntos.map((p) => x(p.x)), puntos.map((p) => y(p.y)), alto,
      (i) => ({ valor: formato(puntos[i].y), detalle: (puntos[i].detalle || "") + (i === iMax ? " · máximo del periodo" : "") }), ancho, iMax);
  }, etiqueta, describirSerie(puntos.map((p) => p.y), formato, (i) => puntos[i].detalle || (ejeX ? ejeX(puntos[i].x) : "")));
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

/**
 * Miniatura sin ejes para varias a la vez (small multiples): una etiqueta, el último valor y la forma
 * de la serie. `tipo`: "barras" o "linea"; `valores` con null donde no hay dato. Todas las miniaturas de
 * un grupo deben usar la misma escala horizontal (mismo número de valores) para poder compararse.
 */
export function miniGrafica({ titulo, valores, formato = fmtEje, tipo = "linea", unidad = "", alto = 44, nombres = null }) {
  const v = valores.map((n) => (typeof n === "number" && isFinite(n) ? n : null));
  const ult = v.map((n, i) => (n == null ? -1 : i)).filter((i) => i >= 0).pop();
  const ancho = 120, n = v.length, num = v.filter((x) => x != null);
  const svg = s("svg", { class: "mini-svg", viewBox: `0 0 ${ancho} ${alto}`, preserveAspectRatio: "none", "aria-hidden": "true" });
  if (num.length) {
    let lo = Math.min(...num), hi = Math.max(...num);
    if (tipo === "barras") lo = Math.min(0, lo);
    if (hi === lo) { hi += 1; lo -= tipo === "barras" ? 0 : 1; }
    const y = (x) => 3 + (alto - 6) * (1 - (x - lo) / (hi - lo));
    const cx = (i) => (n === 1 ? ancho / 2 : 4 + (i / (n - 1)) * (ancho - 8));
    if (tipo === "barras") {
      const bw = Math.max(3, (ancho / n) * 0.62);
      v.forEach((x, i) => { if (x != null) svg.append(s("rect", { class: ["mini-barra", i === ult && "ultima"], x: cx(i) - bw / 2, y: Math.min(y(x), y(0)), width: bw, height: Math.max(1.5, Math.abs(y(0) - y(x))), rx: 1.5 })); });
    } else {
      let d = "", pen = false;
      v.forEach((x, i) => { if (x == null) { pen = false; return; } d += (pen ? "L" : "M") + cx(i).toFixed(1) + " " + y(x).toFixed(1); pen = true; });
      svg.append(s("path", { class: "mini-linea", d, "vector-effect": "non-scaling-stroke" }));
      if (ult != null) svg.append(s("circle", { class: "mini-punto", cx: cx(ult), cy: y(v[ult]), r: 2.6 }));
    }
  }
  const desc = describirSerie(v, formato, nombres);
  return h("div", { class: "mini", role: "img", "aria-label": titulo + ". " + desc },
    h("div", { class: "mini-cab" }, h("span", { class: "mini-titulo" }, titulo), h("span", { class: "mini-valor num" }, ult == null ? "—" : formato(v[ult]) + unidad)), svg);
}

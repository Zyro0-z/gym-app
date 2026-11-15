// Insignias de liga: 15 ligas, cada una con su silueta, color dominante y emblema, en dos
// niveles de detalle (completa para 96 px, simplificada para 32 px) y con la división (I, II, III)
// en una cinta. Diseño propio, en SVG generado; sin dependencias.
//
// Interfaz: crearInsignias().svg(n, simple, numeral), con n = 1-15 y numeral «I», «II», «III» o «».
// Los id de <defs> llevan el prefijo «Lnn-» (o «Lnns-»): quien inserte varias copias en una página
// debe renombrarlos en cada una (lo hace `insignia()` más abajo).
export function crearInsignias() {
const C = 64;
const f = (n) => Math.round(n * 100) / 100;
const rad2 = (g) => (g * Math.PI) / 180;

// ═══════════════════════════ utilidades ═══════════════════════════
function rng(semilla) { // mulberry32
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const paradas = (ps) => ps.map((p, i) => {
  const [o, c, a] = Array.isArray(p) ? p : [i / (ps.length - 1), p];
  return `<stop offset="${f(o)}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ""}/>`;
}).join("");
const lin = (id, ps, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${paradas(ps)}</linearGradient>`;
const rad = (id, ps, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${paradas(ps)}</radialGradient>`;
const escala = (s, cy, cx = C) => `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
const poli = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L") + " Z";
const linea = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L");
const circulo = (cx, cy, r) => `M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
function estrella(cx, cy, R, r, n = 5, giro = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rad2(giro + (i * 180) / n), rr = i % 2 ? r : R; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return poli(pts);
}
function poligono(cx, cy, R, n, giro = -90, sx = 1, sy = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = rad2(giro + (i * 360) / n); pts.push([cx + R * Math.cos(a) * sx, cy + R * Math.sin(a) * sy]); }
  return pts;
}
function mezcla(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function destello(x, y, r, op = 0.95, clase = "") {
  return `<path${clase ? ` class="${clase}"` : ""} d="M${f(x)} ${f(y - r)} L${f(x + r * 0.16)} ${f(y - r * 0.16)} L${f(x + r)} ${f(y)} L${f(x + r * 0.16)} ${f(y + r * 0.16)} L${f(x)} ${f(y + r)} L${f(x - r * 0.16)} ${f(y + r * 0.16)} L${f(x - r)} ${f(y)} L${f(x - r * 0.16)} ${f(y - r * 0.16)} Z" fill="#ffffff" fill-opacity="${op}"/>`;
}

// ═══════════════════════════ capas comunes ═══════════════════════════
// Paleta de cada liga: base = color dominante; claro/oscuro sus luces y sombras; emb = el
// emblema (contrasta con la base); cinta = la cinta de la división.
function defsPaleta(P, p, { barrido = false } = {}) {
  return lin(P + "aro", [p.claro, p.base, p.oscuro, mezcla(p.base, p.oscuro, 0.4), p.oscuro], 0, 0, 0.7, 1) +
    rad(P + "cara", [[0, mezcla(p.claro, p.base, 0.25)], [0.55, p.base], [1, mezcla(p.base, p.oscuro, 0.55)]], 0.38, 0.3, 0.8) +
    lin(P + "filo", [[0, "#ffffff", 0.9], [0.4, "#ffffff", 0.2], [0.65, "#ffffff", 0]], 0, 0, 0.4, 1) +
    lin(P + "espec", [[0, "#ffffff", 0.5], [0.6, "#ffffff", 0.08], [1, "#ffffff", 0]], 0, 0, 0.3, 1) +
    lin(P + "emb", [[0, p.embClaro], [0.5, p.emb], [1, p.embOscuro]], 0, 0, 0.35, 1) +
    lin(P + "cinta", [[0, mezcla(p.cinta, "#ffffff", 0.18)], [0.5, p.cinta], [1, mezcla(p.cinta, "#000000", 0.35)]], 0, 0, 0, 1) +
    (barrido ? lin(P + "barrido", [[0, "#ffffff", 0], [0.3, "#ffffff", 0.06], [0.5, "#ffffff", 0.6], [0.7, "#ffffff", 0.06], [1, "#ffffff", 0]], 0, 0, 1, 0) : "");
}
// Sombra proyectada sin filtros: copias desplazadas y translúcidas
const sombra = (d, cy, dy = 3) =>
  [[1.05, dy + 1.4, 0.07], [1.025, dy, 0.1], [1.0, dy * 0.5, 0.15]]
    .map(([s, y, o]) => `<path d="${d}" fill="#000000" fill-opacity="${o}" transform="translate(0 ${y}) ${escala(s, cy)}"/>`).join("");
// Cuerpo con el color dominante: aro, borde brillante, cara, textura (sólo completa),
// sombra interior y reflejo. `cara` es la escala de la cara respecto a la silueta.
function cuerpo(P, d, cy, p, { cara = 0.88, textura = "", simple = false, barrido = "" } = {}) {
  const k = `transform="${escala(cara, cy)}"`;
  let s = sombra(d, cy, simple ? 2.5 : 3);
  s += `<path d="${d}" fill="url(#${P}aro)" stroke="#0d0d0d" stroke-opacity="0.65" stroke-width="${simple ? 3 : 1.8}" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${simple ? 2.4 : 1.6}" transform="${escala(0.97, cy)}"/>`;
  s += `<path d="${d}" fill="url(#${P}cara)" ${k}/>`;
  s += `<clipPath id="${P}recorte"><path d="${d}" ${k}/></clipPath><g clip-path="url(#${P}recorte)">`;
  if (!simple) s += textura +
    `<g transform="translate(1.6 2.4)"><path d="${d}" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="6" ${k}/></g>` +
    `<path d="M-4 -4 H132 V${f(cy - 16)} C 96 ${f(cy)} 44 ${f(cy - 24)} -4 ${f(cy - 4)} Z" fill="url(#${P}espec)"/>`;
  else s += `<path d="M-4 -4 H132 V${f(cy - 14)} C 96 ${f(cy)} 44 ${f(cy - 22)} -4 ${f(cy - 2)} Z" fill="url(#${P}espec)" fill-opacity="0.8"/>`;
  s += `</g>`;
  s += `<path d="${d}" fill="none" stroke="${p.oscuro}" stroke-opacity="0.8" stroke-width="${simple ? 2 : 1.2}" ${k}/>`;
  if (barrido) s += `<g clip-path="url(#${P}recorte)">${barridoSvg(P, barrido)}</g>`;
  return s;
}
const barridoSvg = (P, c) => `<g transform="skewX(-18)"><path class="${c}-barrido" d="M-110 -20 h40 v170 h-40 Z" fill="url(#${P}barrido)"/></g>`;
// Emblema en relieve: sombra abajo-derecha, luz arriba-izquierda y la pieza.
function relieve(d, relleno, borde, { trazo = 1, prof = 1.6, simple = false } = {}) {
  return `<path d="${d}" fill="#000000" fill-opacity="0.45" transform="translate(${f(prof * 0.6)} ${f(prof)})"/>` +
    (simple ? "" : `<path d="${d}" fill="#ffffff" fill-opacity="0.5" transform="translate(-0.6 -0.7)"/>`) +
    `<path d="${d}" fill="${relleno}" stroke="${borde}" stroke-width="${simple ? trazo * 1.6 : trazo}" stroke-linejoin="round"/>`;
}
const emb = (P, p, d, o = {}) => relieve(d, `url(#${P}emb)`, p.embOscuro, o);

// ─── Cinta con el numeral romano de la división ───
// El numeral es geométrico (barras con remates arriba y abajo), no texto: no depende de
// las fuentes del dispositivo. III = tres barras, II = dos, I = una.
function numeral(txt, cx, cy, h) {
  const n = txt.length, w = h * 0.27, g = h * 0.17, t = h * 0.17, sal = h * 0.16;
  const ancho = n * w + (n - 1) * g, x0 = cx - ancho / 2, y0 = cy - h / 2;
  let d = `M${f(x0 - sal)} ${f(y0)} h${f(ancho + 2 * sal)} v${f(t)} h${f(-(ancho + 2 * sal))} Z ` +
          `M${f(x0 - sal)} ${f(y0 + h - t)} h${f(ancho + 2 * sal)} v${f(t)} h${f(-(ancho + 2 * sal))} Z `;
  for (let i = 0; i < n; i++) d += `M${f(x0 + i * (w + g))} ${f(y0)} h${f(w)} v${f(h)} h${f(-w)} Z `;
  return d;
}
function cinta(P, p, y, alto, ancho, txt, simple) {
  const x0 = C - ancho / 2, x1 = C + ancho / 2, cola = simple ? 0 : alto * 0.55, m = alto * 0.3;
  const cuerpoC = `M${f(x0)} ${f(y)} H${f(x1)} V${f(y + alto)} H${f(x0)} Z`;
  const colaI = `M${f(x0 + 2)} ${f(y + m)} H${f(x0 - cola)} L${f(x0 - cola + alto * 0.35)} ${f(y + m + alto / 2)} L${f(x0 - cola)} ${f(y + m + alto)} H${f(x0 + 2)} Z`;
  const colaD = `M${f(x1 - 2)} ${f(y + m)} H${f(x1 + cola)} L${f(x1 + cola - alto * 0.35)} ${f(y + m + alto / 2)} L${f(x1 + cola)} ${f(y + m + alto)} H${f(x1 - 2)} Z`;
  const osc = mezcla(p.cinta, "#000000", 0.45);
  let s = `<g class="cinta">` + sombra(cuerpoC, y + alto / 2, 2) +
    (simple ? "" : `<path d="${colaI}" fill="${osc}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="${colaD}" fill="${osc}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="1" stroke-linejoin="round"/>`) +
    `<path d="${cuerpoC}" fill="url(#${P}cinta)" stroke="#0d0d0d" stroke-opacity="0.75" stroke-width="${simple ? 2 : 1.2}" stroke-linejoin="round"/>`;
  if (!simple) s += `<path d="M${f(x0 + 2)} ${f(y + 1.8)} H${f(x1 - 2)}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1"/>`;
  if (txt) {
    const d = numeral(txt, C, y + alto / 2, alto * (simple ? 0.72 : 0.64));
    s += `<path d="${d}" fill="#000000" fill-opacity="0.5" transform="translate(0.7 1.2)"/>` +
         `<path d="${d}" fill="${p.numeral || "#ffffff"}" stroke="${mezcla(p.cinta, "#000000", 0.6)}" stroke-width="${simple ? 1 : 0.6}"/>`;
  }
  return s + `</g>`;
}

// ─── Gemas: facetas de un polígono hacia una mesa interior ───
// Para cada lado, un trapecio entre el contorno y la mesa, con el tono según hacia dónde
// mira (luz arriba-izquierda). La mesa lleva un degradado claro y un reflejo.
function facetas(P, p, pts, cx, cy, kMesa, { simple = false, prisma = null } = {}) {
  const mesa = pts.map(([x, y]) => [cx + (x - cx) * kMesa, cy + (y - cy) * kMesa]);
  let s = "";
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const mx = (pts[i][0] + pts[j][0]) / 2 - cx, my = (pts[i][1] + pts[j][1]) / 2 - cy;
    const luz = Math.cos(Math.atan2(my, mx) - rad2(-135));
    let col = luz > 0 ? mezcla(p.base, p.claro, luz * 0.75) : mezcla(p.base, p.oscuro, -luz * 0.7);
    if (prisma && i % 2 === 0) col = mezcla(col, prisma[(i / 2) % prisma.length], 0.35);
    s += `<path d="${poli([pts[i], pts[j], mesa[j], mesa[i]])}" fill="${col}"/>`;
    if (!simple) {   // subfaceta: una arista desde el centro del lado a la mesa
      const mid = [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
      const mm = [(mesa[i][0] + mesa[j][0]) / 2, (mesa[i][1] + mesa[j][1]) / 2];
      s += `<path d="${poli([mid, pts[j], mesa[j], mm])}" fill="${mezcla(col, "#000000", 0.12)}"/>`;
    }
  }
  s += `<path d="${poli(mesa)}" fill="url(#${P}mesa)"/>`;
  if (!simple) {
    s += `<path d="${pts.map((q, i) => `M${f(q[0])} ${f(q[1])} L${f(mesa[i][0])} ${f(mesa[i][1])}`).join(" ")}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="0.6"/>`;
    s += `<path d="${poli(mesa)}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.7"/>`;
    // reflejo interno: la mesa repite el contorno, más pequeño
    const r2 = pts.map(([x, y]) => [cx + (x - cx) * kMesa * 0.55, cy + (y - cy) * kMesa * 0.55]);
    s += `<path d="${poli(r2)}" fill="none" stroke="${p.oscuro}" stroke-opacity="0.35" stroke-width="0.7"/>`;
  }
  return s;
}
const defsMesa = (P, p) => rad(P + "mesa", [[0, "#ffffff"], [0.3, p.claro], [0.75, p.base], [1, mezcla(p.base, p.oscuro, 0.3)]], 0.35, 0.3, 0.85);
// Cuerpo de gema: la silueta ES la gema. Sombra, contorno, facetas y brillo.
function cuerpoGema(P, p, pts, cx, cy, kMesa, o = {}) {
  const d = poli(pts);
  return sombra(d, cy, o.simple ? 2.5 : 3) +
    `<path d="${d}" fill="${p.oscuro}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${o.simple ? 3 : 1.8}" stroke-linejoin="round"/>` +
    facetas(P, p, pts.map(([x, y]) => [cx + (x - cx) * 0.965, cy + (y - cy) * 0.965]), cx, cy, kMesa, o) +
    `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${o.simple ? 2.4 : 1.6}" transform="${escala(0.97, cy, cx)}"/>` +
    `<clipPath id="${P}recorte"><path d="${d}"/></clipPath>` +
    (o.barrido ? `<g clip-path="url(#${P}recorte)">${barridoSvg(P, o.barrido)}</g>` : "");
}

// ─── Ornamentos de las ligas altas ───
function laurel(P, lado, { cx = C, cy = 58, R = 40, desde = 100, hasta = 245, hojas = 9, tam = 1, simple = false, relleno } = {}) {
  const pa = (g) => [cx + lado * R * Math.cos(rad2(g)), cy + R * Math.sin(rad2(g))];
  const tallo = []; for (let i = 0; i <= 28; i++) tallo.push(pa(desde + ((hasta - desde) * i) / 28));
  let s = `<path d="${linea(tallo)}" fill="none" stroke="url(#${P}tallo)" stroke-width="${simple ? 4 : 2.2}" stroke-linecap="round"/>`;
  const hoja = (x, y, ang, t) =>
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})">` +
    `<path d="M0 0 C ${f(3 * t)} ${f(-4 * t)} ${f(9 * t)} ${f(-4.2 * t)} ${f(14 * t)} 0 C ${f(9 * t)} ${f(3.2 * t)} ${f(3 * t)} ${f(3.2 * t)} 0 0 Z" fill="${relleno || `url(#${P}hoja)`}" stroke="#1a0a2e" stroke-opacity="0.6" stroke-width="${simple ? 1 : 0.55}"/>` +
    (simple ? "" : `<path d="M0.8 0 Q ${f(6 * t)} ${f(-0.7 * t)} ${f(12.5 * t)} 0" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.5"/>`) + `</g>`;
  for (let i = 0; i < hojas; i++) {
    const g = desde + ((hasta - desde) * (i + 0.35)) / hojas;
    const [x, y] = pa(g), [x2, y2] = pa(g + 1), [x0, y0] = pa(g - 1);
    const tang = (Math.atan2(y2 - y0, x2 - x0) * 180) / Math.PI, t = tam * (1 - (i / hojas) * 0.25);
    for (const lh of [-1, 1]) s += hoja(x, y, tang + lh * 34, t);
  }
  const [xf, yf] = pa(hasta), [xa, ya] = pa(hasta - 1);
  return s + hoja(xf, yf, (Math.atan2(yf - ya, xf - xa) * 180) / Math.PI, tam * 0.75);
}
// Ala desplegada: plumas largas en abanico, de arriba (remeras) abajo
function ala(P, lado, { cy = 58, raiz = 26, largo = 50, plumas = 8, filas = 3, ancho0 = 8, simple = false, desde = -58, abre = 78 } = {}) {
  let s = "";
  const rx = C + lado * raiz, ry = cy;
  const nFilas = simple ? 1 : filas;
  for (let fila = 0; fila < nFilas; fila++) {
    const escalaFila = 1 - fila * 0.28, ancho = (simple ? 11 : ancho0) - fila * 1.2, n = (simple ? 4 : plumas) - fila;
    for (let i = n - 1; i >= 0; i--) {
      const u = n === 1 ? 0 : i / (n - 1), ang = desde + u * abre;
      const L = largo * escalaFila * (0.66 + 0.34 * Math.sin((1 - u) * Math.PI * 0.75 + 0.35));
      const a = rad2(ang), dx = lado * Math.cos(a), dy = Math.sin(a), nx = -dy * lado, ny = dx * lado;
      const ex = rx + dx * L, ey = ry + dy * L, w = ancho * (1 + (1 - u) * 0.25);
      const d = `M${f(rx)} ${f(ry)} C ${f(rx + dx * L * 0.35 + nx * w)} ${f(ry + dy * L * 0.35 + ny * w)} ${f(ex - dx * L * 0.12 + nx * w * 0.9)} ${f(ey - dy * L * 0.12 + ny * w * 0.9)} ${f(ex)} ${f(ey)} ` +
                `C ${f(ex - dx * L * 0.18 - nx * w * 0.5)} ${f(ey - dy * L * 0.18 - ny * w * 0.5)} ${f(rx + dx * L * 0.3 - nx * w * 0.6)} ${f(ry + dy * L * 0.3 - ny * w * 0.6)} ${f(rx)} ${f(ry)} Z`;
      s += `<path d="${d}" fill="#000000" fill-opacity="0.25" transform="translate(0.6 1.2)"/>`;
      s += `<path d="${d}" fill="url(#${P}pluma${fila})" stroke="#0d0d0d" stroke-opacity="0.55" stroke-width="${simple ? 1.4 : 0.7}" stroke-linejoin="round"/>`;
      if (!simple) s += `<path d="M${f(rx + dx * 3)} ${f(ry + dy * 3)} Q ${f(rx + dx * L * 0.5 + nx * w * 0.25)} ${f(ry + dy * L * 0.5 + ny * w * 0.25)} ${f(ex - dx * 2.5)} ${f(ey - dy * 2.5)}" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="0.55"/>`;
    }
  }
  return s;
}
const defsPlumas = (P, a) => [0, 1, 2].map((k) => lin(P + "pluma" + k, [[0, mezcla(a.claro, "#ffffff", 0.2 - k * 0.07)], [0.5, mezcla(a.base, a.claro, 0.25 - k * 0.1)], [1, mezcla(a.base, a.oscuro, 0.3 + k * 0.2)]], 0, 0, 1, 1)).join("");
// Corona: banda y puntas con perlas. `y` es la base.
function coronaD(cx, y, ancho, alto, puntas) {
  const x0 = cx - ancho / 2, pts = [[x0, y]];
  for (let i = 0; i <= puntas * 2; i++) {
    const x = x0 + (ancho * i) / (puntas * 2);
    const h = i % 2 === 0 ? alto * (i === puntas ? 1.15 : i === 0 || i === puntas * 2 ? 0.85 : 1) : alto * 0.42;
    pts.push([x, y - h]);
  }
  pts.push([x0 + ancho, y]);
  return pts;
}
function corona(P, cx, y, ancho, alto, puntas, relleno, simple, gemas = ["#d1123f", "#1d4ed8", "#0e9a57"]) {
  const pts = coronaD(cx, y, ancho, alto, puntas), d = poli(pts);
  let s = relieve(d, relleno, "#3a2400", { trazo: 1.1, simple });
  s += `<path d="M${f(cx - ancho / 2 - 1.5)} ${f(y - 5)} h${f(ancho + 3)} v7 h${f(-(ancho + 3))} Z" fill="${relleno}" stroke="#3a2400" stroke-width="${simple ? 1.6 : 1}"/>`;
  if (!simple) {
    for (let i = 0; i <= puntas * 2; i += 2) s += `<circle cx="${f(pts[i + 1][0])}" cy="${f(pts[i + 1][1])}" r="2.3" fill="#fff6dc" stroke="#6b4a00" stroke-width="0.5"/>`;
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * (ancho / 3.2);
      s += `<ellipse cx="${f(x)}" cy="${f(y - 1.5)}" rx="${i === 1 ? 2.8 : 2}" ry="${i === 1 ? 2.3 : 1.8}" fill="${gemas[i % gemas.length]}" stroke="#2a1600" stroke-width="0.5"/>` +
           `<circle cx="${f(x - 0.7)}" cy="${f(y - 2.3)}" r="0.7" fill="#ffffff" fill-opacity="0.9"/>`;
    }
  }
  return s;
}
const destellosGema = (c, pts) => pts.map(([x, y, r], i) => destello(x, y, r, 1, `${c}-destello d${i + 1}`)).join("");

// ═══════════════════════════ animación ═══════════════════════════
function estiloAnim(c, { barrido = 0, destellos = false, aura = false, leyenda = false } = {}) {
  let css = "";
  if (barrido) css += `.${c}-barrido{animation:${c}-barre ${barrido}s ease-in-out infinite}
@keyframes ${c}-barre{0%{transform:translateX(0)}30%,100%{transform:translateX(260px)}}`;
  if (destellos) css += `.${c}-destello{transform-box:fill-box;transform-origin:center;animation:${c}-brilla 3.2s ease-in-out infinite;opacity:0}
.${c}-destello.d2{animation-delay:1.1s}.${c}-destello.d3{animation-delay:2.2s}
@keyframes ${c}-brilla{0%,62%,100%{opacity:0;transform:scale(.2) rotate(0deg)}74%{opacity:1;transform:scale(1) rotate(45deg)}86%{opacity:0;transform:scale(.3) rotate(90deg)}}`;
  if (aura) css += `.${c}-aura{animation:${c}-pulsa 4s ease-in-out infinite}
@keyframes ${c}-pulsa{0%,100%{opacity:.45}50%{opacity:1}}`;
  if (leyenda) css += `.${c}-rayos{transform-origin:64px 58px;animation:${c}-gira 60s linear infinite}
.${c}-halo{transform-origin:64px 52px;animation:${c}-halo 5s ease-in-out infinite}
.${c}-chispa{animation:${c}-sube 4.8s ease-out infinite;opacity:0}
@keyframes ${c}-gira{to{transform:rotate(360deg)}}
@keyframes ${c}-halo{0%,100%{opacity:.6;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
@keyframes ${c}-sube{0%{opacity:0;transform:translateY(6px)}20%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}`;
  const clases = [barrido && `.${c}-barrido`, destellos && `.${c}-destello`, aura && `.${c}-aura`, leyenda && `.${c}-rayos,.${c}-halo,.${c}-chispa`].filter(Boolean).join(",");
  css += `
@media (prefers-reduced-motion: reduce){${clases}{animation:none!important}${barrido ? `.${c}-barrido{opacity:0}` : ""}${destellos ? `.${c}-destello{opacity:.85;transform:none}` : ""}${leyenda ? `.${c}-chispa{opacity:0}` : ""}}`;
  return `<style>${css}</style>`;
}

// ═══════════════════════════ las 15 ligas ═══════════════════════════
// Colocación común: el cuerpo y su emblema arriba; la cinta de la división, abajo.
// `escalaCuerpo` hace crecer la presencia con la liga.
const L = [];
const CINTA = { completa: { y: 92, alto: 22, ancho: 52 }, simple: { y: 90, alto: 34, ancho: 46 } };

// 1 · MADERA · rodaja de tronco irregular, marrón, brote de dos hojas
L.push({ nombre: "Madera", escala: 0.8, cy: 54,
  pal: { base: "#9a6232", claro: "#d9a46a", oscuro: "#3e2008", emb: "#6fbf4a", embClaro: "#c8f5a0", embOscuro: "#1f4a10", cinta: "#5b3413" },
  d: (() => { const r = rng(11), pts = []; for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2, R = 46 + Math.sin(a * 3 + 0.7) * 2.2 + (r() - 0.5) * 2.4;
      // muñón de una rama arriba a la derecha: rompe la simetría del círculo
      const rama = Math.max(0, 1 - Math.abs(a - 5.55) / 0.22) * 16;
      pts.push([64 + (R + rama) * Math.cos(a) * 1.1, 54 + (R + rama) * Math.sin(a) * 0.82]); } return poli(pts); })(),
  textura: (P) => { const r = rng(12); let s = "";
    for (let k = 1; k <= 9; k++) { const pts = []; for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, R = k * 4.6 + Math.sin(a * 2 + k) * 0.9 + (r() - 0.5) * 0.8; pts.push([58 + R * Math.cos(a), 50 + R * Math.sin(a) * 0.94]); }
      s += `<path d="${poli(pts)}" fill="none" stroke="#3a1c05" stroke-opacity="${f(0.22 + (k % 2) * 0.12)}" stroke-width="${f(0.6 + r() * 0.7)}"/>`; }
    for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2; s += `<path d="M${f(58 + 8 * Math.cos(a))} ${f(50 + 8 * Math.sin(a))} L${f(58 + 46 * Math.cos(a + 0.05))} ${f(50 + 46 * Math.sin(a + 0.05))}" stroke="#2a1204" stroke-opacity="0.35" stroke-width="0.8"/>`; }
    return s + `<circle cx="58" cy="50" r="2.4" fill="#3a1c05" fill-opacity="0.6"/>`; },
  emblema: (P, p, simple) => `<g transform="translate(64 60)">` +
    emb(P, p, "M-3 20 C -4 8 -1 0 -2 -8 L2 -8 C 3 0 4 8 3 20 Z", { simple }) +
    emb(P, p, "M-1 -2 C -9 -2 -25 -3 -27 -20 C -12 -23 -3 -14 -1 -2 Z", { simple }) +
    emb(P, p, "M1 -7 C 9 -8 25 -12 27 -30 C 12 -32 3 -21 1 -7 Z", { simple }) + `</g>`,
});

// 2 · COBRE · moneda de canto dentado, naranja cobre, martillo
L.push({ nombre: "Cobre", escala: 0.83, cy: 54,
  pal: { base: "#d9722e", claro: "#ffb784", oscuro: "#6a2c0c", emb: "#fbe3cf", embClaro: "#ffffff", embOscuro: "#6a2c0c", cinta: "#7c3210" },
  d: (() => { const pts = []; for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, R = Math.floor(i / 2) % 2 ? 42 : 51; pts.push([64 + R * Math.cos(a), 54 + R * Math.sin(a)]); } return poli(pts); })(),
  cara: 0.84,
  textura: (P) => { const r = rng(22); let s = "";
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 42, R = 2.4 + r() * 3.4;
      s += `<circle cx="${f(64 + rr * Math.cos(a))}" cy="${f(54 + rr * Math.sin(a))}" r="${f(R)}" fill="url(#${P}golpe)"/>`; }
    for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, rr = 30 + r() * 10; s += `<ellipse cx="${f(64 + rr * Math.cos(a))}" cy="${f(54 + rr * Math.sin(a))}" rx="${f(1.5 + r() * 2.5)}" ry="${f(1 + r() * 1.5)}" fill="#3fae90" fill-opacity="0.45"/>`; }
    return s + `<circle cx="64" cy="54" r="34" fill="none" stroke="#6a2c0c" stroke-opacity="0.35" stroke-width="0.8"/>`; },
  defs: (P) => rad(P + "golpe", [[0, "#ffe6d2", 0], [0.5, "#ffe6d2", 0.04], [0.78, "#3d1603", 0.3], [0.92, "#ffd6b8", 0.45], [1, "#ffd6b8", 0]], 0.5, 0.5, 0.5, 0.62, 0.66),
  emblema: (P, p, simple) => `<g transform="translate(64 54) rotate(-35)">` +
    emb(P, p, "M-3.4 -6 H3.4 V30 Q 0 33 -3.4 30 Z", { simple }) +
    emb(P, p, "M-20 -20 H14 Q 22 -20 22 -12 V-4 H-20 Q -26 -12 -20 -20 Z", { simple }) + `</g>`,
});

// 3 · HIERRO · placa hexagonal ancha (lado plano arriba) con remaches, gris acero, yunque
L.push({ nombre: "Hierro", escala: 0.86, cy: 54,
  pal: { base: "#58626d", claro: "#a9b4bf", oscuro: "#20262c", emb: "#dfe5ea", embClaro: "#ffffff", embOscuro: "#20262c", cinta: "#2b3137" },
  d: poli(poligono(64, 54, 54, 6, 0, 1, 0.84)),
  textura: (P) => { const r = rng(33); let s = "";
    for (let y = 4; y < 110; y += 0.9) s += `<path d="M4 ${f(y)} H124" stroke="${r() > 0.55 ? "#ffffff" : "#000000"}" stroke-opacity="${f(0.03 + r() * 0.08)}" stroke-width="${f(0.3 + r() * 0.5)}"/>`;
    return s; },
  extra: (P, p, simple) => poligono(64, 54, 45, 6, 0, 1, 0.84).map(([x, y]) =>
    `<circle cx="${f(x + 0.5)}" cy="${f(y + 1.1)}" r="${simple ? 4.6 : 3.4}" fill="#000" fill-opacity="0.45"/><circle cx="${f(x)}" cy="${f(y)}" r="${simple ? 4.6 : 3.4}" fill="url(#${P}remache)" stroke="#111" stroke-width="0.6"/>`).join(""),
  defs: (P) => rad(P + "remache", [[0, "#ffffff"], [0.3, "#d5dbe0"], [0.75, "#6a7178"], [1, "#2c3136"]], 0.5, 0.5, 0.5, 0.35, 0.3),
  emblema: (P, p, simple) => `<g transform="translate(64 56)">` +
    emb(P, p, "M-28 -14 H22 Q 30 -14 34 -8 Q 26 -6 20 -4 Q 14 0 12 4 H-10 Q -12 -2 -20 -4 Q -28 -6 -28 -14 Z M-10 4 H12 V10 H-10 Z M-16 10 H18 V16 H-16 Z", { simple }) + `</g>`,
});

// 4 · BRONCE · escudo redondeado sencillo, bronce marrón-dorado, casco
L.push({ nombre: "Bronce", escala: 0.88, cy: 54,
  pal: { base: "#b4792f", claro: "#f0c07c", oscuro: "#553108", emb: "#f7e2bd", embClaro: "#ffffff", embOscuro: "#4a2a06", cinta: "#6a3f10" },
  d: "M18 16 Q18 8 26 8 H102 Q110 8 110 16 V60 Q110 100 64 110 Q18 100 18 60 Z",
  textura: (P) => { let s = ""; for (let i = 0; i < 20; i++) s += `<path d="M${-20 + i * 9} 0 L${40 + i * 9} 120" stroke="#ffffff" stroke-opacity="${i % 3 ? 0.05 : 0.12}" stroke-width="3"/>`; return s +
    `<path d="M26 16 H102 V60 Q102 94 64 102 Q26 94 26 60 Z" fill="none" stroke="#553108" stroke-opacity="0.45" stroke-width="0.9"/>`; },
  emblema: (P, p, simple) => `<g transform="translate(64 50)">` +
    emb(P, p, "M-24 6 Q -26 -26 0 -28 Q 26 -26 24 6 L24 22 Q 14 24 10 18 L10 6 H-10 L-10 18 Q -14 24 -24 22 Z", { simple }) +
    `<path d="M-18 -4 H18 V2 H-18 Z" fill="${p.embOscuro}"/>` +
    `<path d="M-2 -28 Q 0 -36 12 -38 Q 6 -32 4 -27 Z" fill="${p.embOscuro}" fill-opacity="0.85"/>` + `</g>`,
});

// 5 · PLATA · escudo de punta con hombros, plata brillante fría, espada
L.push({ nombre: "Plata", escala: 0.9, cy: 56,
  pal: { base: "#c3cfdc", claro: "#ffffff", oscuro: "#5d6b7c", emb: "#3d4c60", embClaro: "#8698b0", embOscuro: "#16202c", cinta: "#44546a" },
  d: "M8 8 L30 16 H98 L120 8 L114 36 Q112 54 108 64 Q98 94 64 116 Q30 94 20 64 Q16 54 14 36 Z",
  textura: (P) => { let s = ""; for (let r = 6; r < 70; r += 3) s += `<circle cx="64" cy="48" r="${r}" fill="none" stroke="#5d6b7c" stroke-opacity="0.12" stroke-width="0.5"/>`; return s; },
  emblema: (P, p, simple) => `<g transform="translate(64 54)">` +
    emb(P, p, "M0 -42 L6 -30 V14 H-6 V-30 Z", { simple }) +
    emb(P, p, "M-20 14 H20 Q 22 17 20 20 H-20 Q -22 17 -20 14 Z", { simple }) +
    emb(P, p, "M-3.5 20 H3.5 V32 H-3.5 Z", { simple }) +
    emb(P, p, circulo(0, 35, 4.6), { simple }) +
    (simple ? "" : `<path d="M0 -38 V12" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1"/>`) + `</g>`,
});

// 6 · ORO · escudo con remate de corona, amarillo oro, estrella
L.push({ nombre: "Oro", escala: 0.92, cy: 58, anim: { barrido: 7 },
  pal: { base: "#f5b800", claro: "#fff08a", oscuro: "#8a5a00", emb: "#fffbe8", embClaro: "#ffffff", embOscuro: "#8a4a00", cinta: "#9a5205" },
  d: "M12 30 L26 30 L28 2 L46 22 L64 -6 L82 22 L100 2 L102 30 L116 30 V64 Q114 98 64 118 Q14 98 12 64 Z",
  textura: (P) => { let s = ""; for (let i = 0; i < 40; i++) { const a = rad2(i * 9); s += `<path d="M64 58 L${f(64 + 80 * Math.cos(a))} ${f(58 + 80 * Math.sin(a))}" stroke="${i % 2 ? "#ffffff" : "#8a5a00"}" stroke-opacity="${i % 2 ? 0.18 : 0.12}" stroke-width="0.7"/>`; } return s; },
  emblema: (P, p, simple) => emb(P, p, estrella(64, 60, 32, 13.5), { simple, prof: 2 }),
});

// 7 · PLATINO · escudo alto tipo cometa, platino verde azulado, doble estrella
L.push({ nombre: "Platino", escala: 0.94, cy: 56, anim: { barrido: 6.5 },
  pal: { base: "#4fb5a8", claro: "#c8fff4", oscuro: "#135650", emb: "#f2fffd", embClaro: "#ffffff", embOscuro: "#0d3f3a", cinta: "#15514b" },
  d: "M64 0 Q 98 0 102 28 Q 104 44 96 62 L64 124 L32 62 Q 24 44 26 28 Q 30 0 64 0 Z",
  textura: (P) => { let s = ""; for (let i = 0; i < 72; i++) { const a = rad2(i * 5); s += `<path d="M64 46 L${f(64 + 90 * Math.cos(a))} ${f(46 + 90 * Math.sin(a))}" stroke="${i % 2 ? "#ffffff" : "#135650"}" stroke-opacity="${i % 2 ? 0.2 : 0.1}" stroke-width="0.4"/>`; } return s; },
  emblema: (P, p, simple) => emb(P, p, estrella(78, 34, 15, 6.4), { simple }) + emb(P, p, estrella(60, 52, 26, 11), { simple, prof: 2 }),
});

// 8 · ZAFIRO · la insignia ES una gema hexagonal alta (puntas arriba y abajo), azul profundo
L.push({ nombre: "Zafiro", escala: 0.95, cy: 56, gema: true, anim: { barrido: 6.5 },
  pal: { base: "#1d4ed8", claro: "#9cc2ff", oscuro: "#061556", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#0c2472" },
  puntos: () => poligono(64, 58, 58, 6, -90, 0.78, 1),
  kMesa: 0.52,
  emblema: (P, p, simple, c) => destello(64, 50, simple ? 18 : 16, 0.95) + (simple ? "" : destello(80, 70, 6, 0.6)),
});

// 9 · ESMERALDA · gema octogonal de talla esmeralda (escalonada), verde
L.push({ nombre: "Esmeralda", escala: 0.96, cy: 56, gema: true, anim: { barrido: 6 },
  pal: { base: "#0ea35c", claro: "#93f7c4", oscuro: "#023a1c", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#05512c" },
  puntos: () => { const w = 84, h = 110, c = 22, cx = 64, cy = 58; return [[cx - w / 2 + c, cy - h / 2], [cx + w / 2 - c, cy - h / 2], [cx + w / 2, cy - h / 2 + c], [cx + w / 2, cy + h / 2 - c], [cx + w / 2 - c, cy + h / 2], [cx - w / 2 + c, cy + h / 2], [cx - w / 2, cy + h / 2 - c], [cx - w / 2, cy - h / 2 + c]]; },
  kMesa: 0.78, escalones: true,
  emblema: (P, p, simple) => destello(56, 34, simple ? 12 : 9, 0.9),
});

// 10 · RUBÍ · gema triangular (talla trillón), rojo, facetas y brillo interno
L.push({ nombre: "Rubí", escala: 0.97, cy: 60, gema: true, anim: { barrido: 6, destellos: true },
  pal: { base: "#d8143f", claro: "#ff9ab0", oscuro: "#4e0012", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#6e0a1c" },
  puntos: () => { const pts = [], V = [[64, 2], [122, 104], [6, 104]];   // lados algo curvos
    for (let i = 0; i < 3; i++) { const a = V[i], b = V[(i + 1) % 3]; pts.push(a);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], cx = 64, cy = 70; pts.push([m[0] + (m[0] - cx) * 0.1, m[1] + (m[1] - cy) * 0.1]); }
    return pts; },
  kMesa: 0.45, centro: [64, 70],
  emblema: (P, p, simple, c) => `<circle cx="64" cy="70" r="${simple ? 16 : 20}" fill="url(#${P}brilloInt)"/>` + destello(64, 66, simple ? 14 : 12, 0.95) +
    (c ? destellosGema(c, [[82, 52, 6], [46, 84, 5], [80, 88, 4]]) : ""),
  defs: (P) => rad(P + "brilloInt", [[0, "#ffe0e8", 0.9], [0.5, "#ff5a7e", 0.35], [1, "#ff5a7e", 0]]),
});

// 11 · DIAMANTE · diamante de talla brillante (corona y pabellón), blanco hielo con destellos de color
L.push({ nombre: "Diamante", escala: 1, cy: 56, gema: true, anim: { barrido: 5.5, destellos: true },
  pal: { base: "#d9f1ff", claro: "#ffffff", oscuro: "#5b8fb0", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#2d5f80", numeral: "#ffffff" },
  diamante: true,
  emblema: (P, p, simple, c) => destello(50, 26, simple ? 12 : 10, 1) + (simple ? "" : destello(84, 54, 6, 0.8)) +
    (c ? destellosGema(c, [[74, 22, 7], [40, 50, 6], [70, 74, 5]]) : ""),
});

// 12-15 · medallones
const MED = {
  12: { base: "#7a3ad6", claro: "#d8bcff", oscuro: "#26085c", emb: "#ffd34d", embClaro: "#fff4b8", embOscuro: "#6b4a04", cinta: "#3a1280", numeral: "#fff0b0" },
  13: { base: "#c2185b", claro: "#ff8fbd", oscuro: "#44001d", emb: "#ffe8f1", embClaro: "#ffffff", embOscuro: "#5a0a2a", cinta: "#5a0a2a" },
  14: { base: "#1a1a22", claro: "#6c6c84", oscuro: "#030305", emb: "#f5c400", embClaro: "#fff3a8", embOscuro: "#5e3f00", cinta: "#0c0c10", numeral: "#f5c400" },
  15: { base: "#5b3fc4", claro: "#ffffff", oscuro: "#1a0d4a", emb: "#ffd34d", embClaro: "#fff7cc", embOscuro: "#6b4a04", cinta: "#2a1a6a", numeral: "#fff0b0" },
};
L.push({ nombre: "Maestro", escala: 1, cy: 52, medallon: { r: 34 }, pal: MED[12], anim: { barrido: 6, destellos: true },
  // Contorno liso (el borde dentado es exclusivo de Cobre): un disco ancho morado con aro de
  // oro, y la corona de laurel encima, recortada al disco para que no dentee la silueta.
  detras: (P, p, simple) => {
    const R = 50, d = circulo(64, 52, R);
    return sombra(d, 52, simple ? 2.5 : 3) +
      `<path d="${d}" fill="url(#${P}oro)" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 2.6 : 1.6}"/>` +
      `<path d="${circulo(64, 52, R - 3.5)}" fill="url(#${P}aro)"/>` +
      `<clipPath id="${P}recLaurel"><path d="${circulo(64, 52, R - 4)}"/></clipPath><g clip-path="url(#${P}recLaurel)">` +
      laurel(P, -1, { cy: 52, R: 41, desde: 112, hasta: 248, hojas: simple ? 5 : 9, tam: simple ? 0.95 : 0.8, simple }) +
      laurel(P, 1, { cy: 52, R: 41, desde: 112, hasta: 248, hojas: simple ? 5 : 9, tam: simple ? 0.95 : 0.8, simple }) + `</g>`;
  },
  defs: (P) => lin(P + "hoja", [[0, "#fff4b8"], [0.5, "#f0c94f"], [1, "#8a5a00"]], 0, 0, 1, 1) + lin(P + "tallo", [[0, "#f0c94f"], [1, "#7a5406"]]),
  emblema: (P, p, simple, c) => `<g transform="translate(64 52)">` +
    laurel(P, -1, { cx: 0, cy: 6, R: 20, desde: 95, hasta: 215, hojas: simple ? 3 : 5, tam: simple ? 1.2 : 0.95, simple, relleno: `url(#${P}emb)` }) +
    laurel(P, 1, { cx: 0, cy: 6, R: 20, desde: 95, hasta: 215, hojas: simple ? 3 : 5, tam: simple ? 1.2 : 0.95, simple, relleno: `url(#${P}emb)` }) + `</g>` +
    (c ? destellosGema(c, [[80, 34, 5], [46, 62, 4], [76, 66, 3.5]]) : ""),
});
L.push({ nombre: "Gran Maestro", escala: 1, cy: 54, medallon: { r: 30 }, pal: MED[13], alas: { base: "#c2185b", claro: "#ffc2da", oscuro: "#44001d" },
  anim: { barrido: 6, destellos: true, aura: true }, aura: "#ff6fa8",
  detras: (P, p, simple) => ala(P, -1, { cy: 56, raiz: 22, largo: simple ? 46 : 50, simple }) + ala(P, 1, { cy: 56, raiz: 22, largo: simple ? 46 : 50, simple }),
  emblema: (P, p, simple, c) => {
    const w = (lado) => `M${64 + lado * 2} 58 C ${64 + lado * 10} 40 ${64 + lado * 20} 36 ${64 + lado * 24} 38 C ${64 + lado * 20} 44 ${64 + lado * 22} 48 ${64 + lado * 18} 52 C ${64 + lado * 18} 56 ${64 + lado * 12} 60 ${64 + lado * 2} 62 Z`;
    return emb(P, p, w(-1), { simple }) + emb(P, p, w(1), { simple }) + emb(P, p, circulo(64, 60, 4), { simple }) +
      (c ? destellosGema(c, [[76, 40, 5], [48, 68, 4], [80, 68, 3.5]]) : "");
  },
});
L.push({ nombre: "Élite", escala: 1, cy: 66, medallon: { r: 27 }, pal: MED[14], alas: { base: "#e0ac00", claro: "#fff1a8", oscuro: "#5e3f00" },
  anim: { barrido: 5.5, destellos: true, aura: true }, aura: "#ffd34d",
  detras: (P, p, simple) => ala(P, -1, { cy: 64, raiz: 18, largo: simple ? 56 : 60, simple, desde: -84, abre: 62 }) + ala(P, 1, { cy: 64, raiz: 18, largo: simple ? 56 : 60, simple, desde: -84, abre: 62 }),
  emblema: (P, p, simple, c) => corona(P, 64, 70, 46, 44, simple ? 3 : 5, `url(#${P}emb)`, simple) +
    (c ? destellosGema(c, [[78, 44, 5], [48, 50, 4], [82, 66, 3.5]]) : ""),
});
L.push({ nombre: "Leyenda", escala: 1, cy: 58, medallon: { r: 30 }, pal: MED[15], alas: { base: "#f3ead0", claro: "#ffffff", oscuro: "#a8894a" },
  anim: { barrido: 5, destellos: true, aura: true, leyenda: true }, aura: "#fff3c4",
  defs: (P) => lin(P + "prisma", [[0, "#ff7eb6"], [0.2, "#ffd36e"], [0.4, "#7ef0c1"], [0.6, "#6ec8ff"], [0.8, "#b28dff"], [1, "#ff7eb6"]], 0, 0, 1, 1) +
               rad(P + "halo", [[0.55, "#ffffff", 0], [0.7, "#fff7d6", 0.95], [0.8, "#ffd36e", 0.4], [1, "#ffd36e", 0]]),
  detras: (P, p, simple, c) => {
    // Estallido tipo sol: estrella de 16 puntas rellena por cuñas de colores del arcoíris
    const col = ["#ff5c8a", "#ffb347", "#ffe066", "#6be39a", "#4fc3f7", "#9b7bff"];
    const n = 16, pt = (i) => { const a = rad2((i * 360) / (n * 2) - 90), R = i % 2 ? 46 : i % 4 === 0 ? 64 : 58; return [64 + R * Math.cos(a), 58 + R * Math.sin(a)]; };
    let rayos = "";
    for (let i = 0; i < n * 2; i++) rayos += `<path d="${poli([[64, 58], pt(i), pt(i + 1)])}" fill="${mezcla(col[Math.floor(i / (n * 2 / 6)) % 6], i % 2 ? "#ffffff" : "#000000", i % 2 ? 0.25 : 0.08)}"/>`;
    const contorno = poli(Array.from({ length: n * 2 }, (_, i) => pt(i)));
    let chispas = "";
    if (!simple && c) { const r = rng(1515); for (let i = 0; i < 10; i++) chispas += `<circle class="${c}-chispa" cx="${f(20 + r() * 88)}" cy="${f(20 + r() * 76)}" r="${f(0.9 + r() * 1.1)}" fill="#ffffff" style="animation-delay:${f(r() * 4.8)}s"/>`; }
    return sombra(contorno, 58, 2.5) + `<g${c ? ` class="${c}-rayos"` : ""}>${rayos}<path d="${contorno}" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="${simple ? 2 : 1.2}" stroke-linejoin="round"/>` +
      `<path d="${contorno}" fill="none" stroke="#0d0d0d" stroke-opacity="0.45" stroke-width="${simple ? 1.4 : 0.8}" stroke-linejoin="round" transform="translate(0 0.8)"/></g>` + chispas;
  },
  emblema: (P, p, simple, c) => `<circle${c ? ` class="${c}-halo"` : ""} cx="64" cy="52" r="${simple ? 24 : 26}" fill="url(#${P}halo)"/>` +
    corona(P, 64, 70, 40, 28, simple ? 3 : 5, `url(#${P}emb)`, simple) +
    (c ? destellosGema(c, [[80, 36, 6], [46, 42, 4.5], [82, 64, 4]]) : ""),
});

// ═══════════════════════════ montaje ═══════════════════════════
function montar(n, simple, num) {
  const o = L[n - 1], p = o.pal, nn = String(n).padStart(2, "0");
  const P = "L" + nn + (simple ? "s" : "") + "-", c = simple ? "" : "l" + nn;
  const anim = simple ? null : o.anim || null;
  let defs = defsPaleta(P, p, { barrido: !!(anim && anim.barrido) }) + (o.defs ? o.defs(P) : "");
  let cuerpoSvg = "";
  const cy = o.cy;
  if (o.gema) {
    defs += defsMesa(P, p);
    if (o.diamante) {   // perfil: mesa, corona y pabellón
      const tabla = [[42, 12], [86, 12]], cintura = [[6, 42], [122, 42]], punta = [64, 124];
      const pts = [tabla[0], tabla[1], cintura[1], punta, cintura[0]], d = poli(pts);
      const prisma = ["#ff9aa8", "#ffd48a", "#fff7a0", "#a9f2b4", "#9fd8ff", "#c7a9ff"];
      let fac = "";
      const corona = [[42, 12], [53, 12], [64, 12], [75, 12], [86, 12]], cinturaP = [6, 25, 45, 64, 83, 103, 122].map((x) => [x, 42]);
      for (let i = 0; i < 6; i++) {    // corona: triángulos alternos entre la mesa y la cintura
        const a = corona[Math.min(4, Math.round(i * 4 / 6))], b = corona[Math.min(4, Math.round((i + 1) * 4 / 6))];
        const t = i / 5, col = mezcla(p.claro, p.oscuro, 0.1 + 0.5 * Math.abs(t - 0.3));
        fac += `<path d="${poli([a, cinturaP[i], cinturaP[i + 1], b])}" fill="${!simple && i % 2 ? mezcla(col, prisma[i], 0.3) : col}"/>`;
      }
      for (let i = 0; i < 6; i++) {    // pabellón: gajos hacia la punta
        const t = i / 5, col = mezcla(p.base, p.oscuro, 0.15 + 0.6 * t);
        fac += `<path d="${poli([cinturaP[i], cinturaP[i + 1], punta])}" fill="${!simple && i % 2 === 0 ? mezcla(col, prisma[(i + 3) % 6], 0.28) : col}"/>`;
      }
      fac += `<path d="${poli([tabla[0], tabla[1], [80, 24], [48, 24]])}" fill="url(#${P}mesa)"/>`;
      if (!simple) fac += `<path d="${cinturaP.map((q) => `M${q[0]} ${q[1]} L64 124`).join(" ")} ${corona.map((q, i) => `M${q[0]} ${q[1]} L${cinturaP[Math.min(6, i * 1.5 | 0)][0]} 42`).join(" ")} M6 42 H122" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.7"/>`;
      cuerpoSvg = sombra(d, 60, simple ? 2.5 : 3) +
        `<path d="${d}" fill="${p.oscuro}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 3 : 1.8}" stroke-linejoin="round"/>` +
        `<g transform="${escala(0.96, 60)}">${fac}</g>` +
        `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${simple ? 2.4 : 1.6}" transform="${escala(0.97, 60)}"/>` +
        `<clipPath id="${P}recorte"><path d="${d}"/></clipPath>` + (anim && anim.barrido ? `<g clip-path="url(#${P}recorte)">${barridoSvg(P, c)}</g>` : "");
    } else if (o.escalones) {
      const pts = o.puntos(), d = poli(pts);
      let esc = "";
      const niveles = simple ? [1, 0.7] : [1, 0.84, 0.7, 0.56];
      const cx = 64, cyG = 58, tono = [0.6, 0.3, -0.2, -0.5, -0.65, -0.4, 0.1, 0.5];
      for (let k = 0; k < niveles.length - 1; k++) {
        const A = pts.map(([x, y]) => [cx + (x - cx) * niveles[k] * 0.965, cyG + (y - cyG) * niveles[k] * 0.965]);
        const B = pts.map(([x, y]) => [cx + (x - cx) * niveles[k + 1] * 0.965, cyG + (y - cyG) * niveles[k + 1] * 0.965]);
        for (let i = 0; i < 8; i++) { const j = (i + 1) % 8, t = tono[i] * (1 - k * 0.2) + (k % 2 ? 0.08 : -0.04);
          esc += `<path d="${poli([A[i], A[j], B[j], B[i]])}" fill="${t > 0 ? mezcla(p.base, p.claro, t) : mezcla(p.base, p.oscuro, -t)}"${simple ? "" : ` stroke="#ffffff" stroke-opacity="0.25" stroke-width="0.5"`}/>`; }
      }
      const mesa = pts.map(([x, y]) => [cx + (x - cx) * niveles[niveles.length - 1] * 0.965, cyG + (y - cyG) * niveles[niveles.length - 1] * 0.965]);
      esc += `<path d="${poli(mesa)}" fill="url(#${P}mesa)"/>`;
      if (!simple) esc += `<path d="${poli(pts.map(([x, y]) => [cx + (x - cx) * 0.3, cyG + (y - cyG) * 0.3]))}" fill="none" stroke="${p.oscuro}" stroke-opacity="0.3" stroke-width="0.7"/>`;
      cuerpoSvg = sombra(d, cyG, simple ? 2.5 : 3) +
        `<path d="${d}" fill="${p.oscuro}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 3 : 1.8}" stroke-linejoin="round"/>` + esc +
        `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${simple ? 2.4 : 1.6}" transform="${escala(0.97, cyG)}"/>` +
        `<clipPath id="${P}recorte"><path d="${d}"/></clipPath>` + (anim && anim.barrido ? `<g clip-path="url(#${P}recorte)">${barridoSvg(P, c)}</g>` : "");
    } else {
      const ctr = o.centro || [64, 58];
      cuerpoSvg = cuerpoGema(P, p, o.puntos(), ctr[0], ctr[1], o.kMesa, { simple, barrido: anim && anim.barrido ? c : "" });
    }
  } else if (o.medallon) {
    const r = o.medallon.r, a = o.alas;
    if (a) defs += defsPlumas(P, a);
    if (o.aura) defs += rad(P + "aura", [[0, o.aura, 0.85], [0.5, o.aura, 0.3], [1, o.aura, 0]]);
    const d = circulo(64, cy, r);
    cuerpoSvg = (o.aura && !simple ? `<circle class="${c}-aura" cx="64" cy="${cy}" r="60" fill="url(#${P}aura)"/>` : "") +
      (o.detras ? o.detras(P, p, simple, c) : "") +
      sombra(circulo(64, cy, r + 5), cy, 2.5) +
      `<path d="${circulo(64, cy, r + 5)}" fill="url(#${P}oro)" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 2.4 : 1.4}"/>` +
      cuerpo(P, d, cy, p, { cara: 1, simple, barrido: anim && anim.barrido ? c : "",
        textura: (() => { let s = ""; for (let i = 0; i < 36; i++) { const g = rad2(i * 10); s += `<path d="M64 ${cy} L${f(64 + r * Math.cos(g))} ${f(cy + r * Math.sin(g))}" stroke="#ffffff" stroke-opacity="0.1" stroke-width="0.5"/>`; } return s; })() });
    defs += lin(P + "oro", [[0, "#fff4b8"], [0.3, "#f0c94f"], [0.55, "#b8860b"], [0.75, "#f7dc84"], [1, "#7a5406"]], 0, 0, 0.35, 1);
  } else {
    cuerpoSvg = cuerpo(P, o.d, cy, p, { cara: o.cara || 0.88, simple, textura: o.textura ? o.textura(P) : "", barrido: anim && anim.barrido ? c : "" }) +
      (o.extra ? o.extra(P, p, simple) : "");
  }
  const emblema = o.emblema(P, p, simple, anim && anim.destellos ? c : "");
  const k = o.escala * (simple ? 1.07 : 1);
  let cuerpoTodo = `<g transform="${escala(k, 58)}">${cuerpoSvg}${emblema}</g>`;
  // Sin división (y sin cinta), centrada en vertical. Leyenda ya está compuesta así.
  if (!num && n !== 15 && o.cy !== 64) cuerpoTodo = `<g transform="translate(0 ${f(64 - o.cy)})">${cuerpoTodo}</g>`;
  const ci = simple ? CINTA.simple : CINTA.completa;
  const cintaSvg = num ? cinta(P, p, ci.y, ci.alto, ci.ancho, num, simple) : "";
  const nombre = o.nombre + (num ? " " + num : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" class="liga liga-${nn}${simple ? " liga-32" : ""}" data-liga="${n}" role="img" aria-label="Liga ${nombre}">
<title>${nombre}</title>
<!-- Insignia de liga ${n}/15 · ${nombre}${simple ? " · versión de 32 px" : ""}. Diseño propio. -->
<defs>${defs}</defs>${anim ? estiloAnim(c, anim) : ""}
<g class="cuerpo">${cuerpoTodo}</g>
${cintaSvg}
</svg>
`;
}

// ═══════════════════════════ interfaz ═══════════════════════════
const hechas = new Map();
function svg(n, simple, numeral) {
  const num = n === 15 ? "" : numeral || "";
  const clave = n + (simple ? "s" : "") + num;
  if (!hechas.has(clave)) hechas.set(clave, montar(n, simple, num));
  return hechas.get(clave);
}
return { svg, total: L.length, nombres: L.map((o) => o.nombre) };
}

// Color dominante de cada liga (1-15), para su barra de progreso.
export const COLOR_LIGA = ["#9a6232", "#d9722e", "#8a96a3", "#c48a3a", "#c3cfdc", "#f5b800", "#4fb5a8", "#3b6ff0", "#12b366",
  "#e0284f", "#8fd8ff", "#9b5cf0", "#e0337a", "#f5c400", "#8b6cff"];

let INS = null, nCopia = 0;
/**
 * Insignia como elemento: nivel { insignia: 1-15, div: "I" | "II" | "III" | "" } y tamaño en px
 * (20, 32 o 96). Hasta 48 px usa la versión simplificada.
 */
export function insignia(nivel, px = 32) {
  if (!INS) INS = crearInsignias();
  const el = document.createElement("span");
  el.className = "insignia";
  el.style.width = el.style.height = px + "px";
  if (!nivel || !nivel.insignia) return el;
  const simple = px <= 48, n = nivel.insignia;
  const pre = "L" + String(n).padStart(2, "0") + (simple ? "s" : "") + "-";
  el.innerHTML = INS.svg(n, simple, nivel.div || "").split(pre).join(pre + "u" + ++nCopia + "-")
    .replace('width="128" height="128"', 'width="' + px + '" height="' + px + '"');
  return el;
}
export const nombresLigas = () => { if (!INS) INS = crearInsignias(); return INS.nombres; };

// Insignias de liga · primitivas gráficas: utilidades SVG, cuerpos, gemas, cintas, ornamentos y animación.

export const C = 64;
export const f = (n) => Math.round(n * 100) / 100;
export const rad2 = (g) => (g * Math.PI) / 180;

// ═══════════════════════════ utilidades ═══════════════════════════
export function rng(semilla) { // mulberry32
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const paradas = (ps) => ps.map((p, i) => {
  const [o, c, a] = Array.isArray(p) ? p : [i / (ps.length - 1), p];
  return `<stop offset="${f(o)}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ""}/>`;
}).join("");
export const lin = (id, ps, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${paradas(ps)}</linearGradient>`;
export const rad = (id, ps, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${paradas(ps)}</radialGradient>`;
export const escala = (s, cy, cx = C) => `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
export const poli = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L") + " Z";
export const linea = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L");
export const circulo = (cx, cy, r) => `M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
export function estrella(cx, cy, R, r, n = 5, giro = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rad2(giro + (i * 180) / n), rr = i % 2 ? r : R; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return poli(pts);
}
export function poligono(cx, cy, R, n, giro = -90, sx = 1, sy = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = rad2(giro + (i * 360) / n); pts.push([cx + R * Math.cos(a) * sx, cy + R * Math.sin(a) * sy]); }
  return pts;
}
export function mezcla(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
export function destello(x, y, r, op = 0.95, clase = "") {
  return `<path${clase ? ` class="${clase}"` : ""} d="M${f(x)} ${f(y - r)} L${f(x + r * 0.16)} ${f(y - r * 0.16)} L${f(x + r)} ${f(y)} L${f(x + r * 0.16)} ${f(y + r * 0.16)} L${f(x)} ${f(y + r)} L${f(x - r * 0.16)} ${f(y + r * 0.16)} L${f(x - r)} ${f(y)} L${f(x - r * 0.16)} ${f(y - r * 0.16)} Z" fill="#ffffff" fill-opacity="${op}"/>`;
}

// ═══════════════════════════ capas comunes ═══════════════════════════
// Paleta de cada liga: base = color dominante; claro/oscuro sus luces y sombras; emb = el
// emblema (contrasta con la base); cinta = la cinta de la división.
export function defsPaleta(P, p, { barrido = false } = {}) {
  return lin(P + "aro", [p.claro, p.base, p.oscuro, mezcla(p.base, p.oscuro, 0.4), p.oscuro], 0, 0, 0.7, 1) +
    rad(P + "cara", [[0, mezcla(p.claro, p.base, 0.25)], [0.55, p.base], [1, mezcla(p.base, p.oscuro, 0.55)]], 0.38, 0.3, 0.8) +
    lin(P + "filo", [[0, "#ffffff", 0.9], [0.4, "#ffffff", 0.2], [0.65, "#ffffff", 0]], 0, 0, 0.4, 1) +
    lin(P + "espec", [[0, "#ffffff", 0.5], [0.6, "#ffffff", 0.08], [1, "#ffffff", 0]], 0, 0, 0.3, 1) +
    lin(P + "emb", [[0, p.embClaro], [0.5, p.emb], [1, p.embOscuro]], 0, 0, 0.35, 1) +
    lin(P + "cinta", [[0, mezcla(p.cinta, "#ffffff", 0.18)], [0.5, p.cinta], [1, mezcla(p.cinta, "#000000", 0.35)]], 0, 0, 0, 1) +
    (barrido ? lin(P + "barrido", [[0, "#ffffff", 0], [0.3, "#ffffff", 0.06], [0.5, "#ffffff", 0.6], [0.7, "#ffffff", 0.06], [1, "#ffffff", 0]], 0, 0, 1, 0) : "");
}
// Sombra proyectada sin filtros: copias desplazadas y translúcidas
export const sombra = (d, cy, dy = 3) =>
  [[1.05, dy + 1.4, 0.07], [1.025, dy, 0.1], [1.0, dy * 0.5, 0.15]]
    .map(([s, y, o]) => `<path d="${d}" fill="#000000" fill-opacity="${o}" transform="translate(0 ${y}) ${escala(s, cy)}"/>`).join("");
// Cuerpo con el color dominante: aro, borde brillante, cara, textura (sólo completa),
// sombra interior y reflejo. `cara` es la escala de la cara respecto a la silueta.
export function cuerpo(P, d, cy, p, { cara = 0.88, textura = "", simple = false, barrido = "" } = {}) {
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
export const barridoSvg = (P, c) => `<g transform="skewX(-18)"><path class="${c}-barrido" d="M-110 -20 h40 v170 h-40 Z" fill="url(#${P}barrido)"/></g>`;
// Emblema en relieve: sombra abajo-derecha, luz arriba-izquierda y la pieza.
export function relieve(d, relleno, borde, { trazo = 1, prof = 1.6, simple = false } = {}) {
  return `<path d="${d}" fill="#000000" fill-opacity="0.45" transform="translate(${f(prof * 0.6)} ${f(prof)})"/>` +
    (simple ? "" : `<path d="${d}" fill="#ffffff" fill-opacity="0.5" transform="translate(-0.6 -0.7)"/>`) +
    `<path d="${d}" fill="${relleno}" stroke="${borde}" stroke-width="${simple ? trazo * 1.6 : trazo}" stroke-linejoin="round"/>`;
}
export const emb = (P, p, d, o = {}) => relieve(d, `url(#${P}emb)`, p.embOscuro, o);

// ─── Cinta con el numeral romano de la división ───
// El numeral es geométrico (barras con remates arriba y abajo), no texto: no depende de
// las fuentes del dispositivo. III = tres barras, II = dos, I = una.
export function numeral(txt, cx, cy, h) {
  const n = txt.length, w = h * 0.27, g = h * 0.17, t = h * 0.17, sal = h * 0.16;
  const ancho = n * w + (n - 1) * g, x0 = cx - ancho / 2, y0 = cy - h / 2;
  let d = `M${f(x0 - sal)} ${f(y0)} h${f(ancho + 2 * sal)} v${f(t)} h${f(-(ancho + 2 * sal))} Z ` +
          `M${f(x0 - sal)} ${f(y0 + h - t)} h${f(ancho + 2 * sal)} v${f(t)} h${f(-(ancho + 2 * sal))} Z `;
  for (let i = 0; i < n; i++) d += `M${f(x0 + i * (w + g))} ${f(y0)} h${f(w)} v${f(h)} h${f(-w)} Z `;
  return d;
}
export function cinta(P, p, y, alto, ancho, txt, simple) {
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
export function facetas(P, p, pts, cx, cy, kMesa, { simple = false, prisma = null } = {}) {
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
export const defsMesa = (P, p) => rad(P + "mesa", [[0, "#ffffff"], [0.3, p.claro], [0.75, p.base], [1, mezcla(p.base, p.oscuro, 0.3)]], 0.35, 0.3, 0.85);
// Cuerpo de gema: la silueta ES la gema. Sombra, contorno, facetas y brillo.
export function cuerpoGema(P, p, pts, cx, cy, kMesa, o = {}) {
  const d = poli(pts);
  return sombra(d, cy, o.simple ? 2.5 : 3) +
    `<path d="${d}" fill="${p.oscuro}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${o.simple ? 3 : 1.8}" stroke-linejoin="round"/>` +
    facetas(P, p, pts.map(([x, y]) => [cx + (x - cx) * 0.965, cy + (y - cy) * 0.965]), cx, cy, kMesa, o) +
    `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${o.simple ? 2.4 : 1.6}" transform="${escala(0.97, cy, cx)}"/>` +
    `<clipPath id="${P}recorte"><path d="${d}"/></clipPath>` +
    (o.barrido ? `<g clip-path="url(#${P}recorte)">${barridoSvg(P, o.barrido)}</g>` : "");
}

// ─── Ornamentos de las ligas altas ───
export function laurel(P, lado, { cx = C, cy = 58, R = 40, desde = 100, hasta = 245, hojas = 9, tam = 1, simple = false, relleno } = {}) {
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
export function ala(P, lado, { cy = 58, raiz = 26, largo = 50, plumas = 8, filas = 3, ancho0 = 8, simple = false, desde = -58, abre = 78 } = {}) {
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
export const defsPlumas = (P, a) => [0, 1, 2].map((k) => lin(P + "pluma" + k, [[0, mezcla(a.claro, "#ffffff", 0.2 - k * 0.07)], [0.5, mezcla(a.base, a.claro, 0.25 - k * 0.1)], [1, mezcla(a.base, a.oscuro, 0.3 + k * 0.2)]], 0, 0, 1, 1)).join("");
// Corona: banda y puntas con perlas. `y` es la base.
export function coronaD(cx, y, ancho, alto, puntas) {
  const x0 = cx - ancho / 2, pts = [[x0, y]];
  for (let i = 0; i <= puntas * 2; i++) {
    const x = x0 + (ancho * i) / (puntas * 2);
    const h = i % 2 === 0 ? alto * (i === puntas ? 1.15 : i === 0 || i === puntas * 2 ? 0.85 : 1) : alto * 0.42;
    pts.push([x, y - h]);
  }
  pts.push([x0 + ancho, y]);
  return pts;
}
export function corona(P, cx, y, ancho, alto, puntas, relleno, simple, gemas = ["#d1123f", "#1d4ed8", "#0e9a57"]) {
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
export const destellosGema = (c, pts) => pts.map(([x, y, r], i) => destello(x, y, r, 1, `${c}-destello d${i + 1}`)).join("");

// ═══════════════════════════ animación ═══════════════════════════
export function estiloAnim(c, { barrido = 0, destellos = false, aura = false, leyenda = false } = {}) {
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

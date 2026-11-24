// Insignias de liga · primitivas: color, degradados, siluetas, facetas y glifos. Todo en coordenadas
// locales centradas en (0, 0); el montaje las traslada y escala dentro del lienzo de 128 × 128.

export const f = (n) => +n.toFixed(2);
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => "#" + c.map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
/** Mezcla dos colores #rrggbb: t = 0 → a, t = 1 → b. */
export const mezcla = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };

/** Paleta de un material a partir de su color base. */
export function paleta(base, { oscuro = false } = {}) {
  return { base, claro: mezcla(base, "#ffffff", 0.58), brillo: mezcla(base, "#ffffff", 0.82), medio: mezcla(base, "#ffffff", 0.18),
    sombra: mezcla(base, "#000000", 0.42), hondo: mezcla(base, "#000000", 0.7), glifoOscuro: oscuro };
}

const paradas = (s) => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ""}/>`).join("");
export const lin = (id, s, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${paradas(s)}</linearGradient>`;
export const rad = (id, s, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${paradas(s)}</radialGradient>`;

// ── siluetas ──
export const poli = (pts) => "M" + pts.map(([x, y]) => f(x) + " " + f(y)).join(" L") + " Z";
export const rad2 = (g) => (g * Math.PI) / 180;
/** Polígono cerrado con las esquinas redondeadas (arcos cuadráticos de radio r). */
export function redondea(pts, r) {
  const n = pts.length; let d = "";
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const va = [a[0] - p[0], a[1] - p[1]], vb = [b[0] - p[0], b[1] - p[1]], la = Math.hypot(...va), lb = Math.hypot(...vb);
    const ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
    const p1 = [p[0] + (va[0] / la) * ra, p[1] + (va[1] / la) * ra], p2 = [p[0] + (vb[0] / lb) * rb, p[1] + (vb[1] / lb) * rb];
    d += (i ? "L" : "M") + f(p1[0]) + " " + f(p1[1]) + "Q" + f(p[0]) + " " + f(p[1]) + " " + f(p2[0]) + " " + f(p2[1]);
  }
  return d + "Z";
}
export const regular = (n, R, rot = -90, sx = 1, sy = 1) => Array.from({ length: n }, (_, i) => { const a = rad2(rot + (360 / n) * i); return [R * Math.cos(a) * sx, R * Math.sin(a) * sy]; });
export const circulo = (R) => `M${-R} 0A${R} ${R} 0 1 1 ${R} 0A${R} ${R} 0 1 1 ${-R} 0Z`;
export const ondulada = (R, lobulos, prof, n = 96) => poli(Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, r = R - prof * (0.5 + 0.5 * Math.cos(a * lobulos)); return [r * Math.cos(a - Math.PI / 2), r * Math.sin(a - Math.PI / 2)]; }));
export const elipse = (rx, ry, n = 72) => poli(Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [rx * Math.cos(a), ry * Math.sin(a)]; }));
export const estrella = (R, r, n = 5, rot = -90) => poli(Array.from({ length: n * 2 }, (_, i) => { const a = rad2(rot + (180 / n) * i), q = i % 2 ? r : R; return [q * Math.cos(a), q * Math.sin(a)]; }));

// ── relieve común ──
export const sombraSuelo = (P, ext) => `<ellipse cx="0" cy="${f(ext * 0.97)}" rx="${f(ext * 0.78)}" ry="${f(ext * 0.13)}" fill="url(#${P}suelo)"/>`;

/** Degradados comunes de una insignia (borde, cara, hundido, brillo, glifo, suelo, filo). */
export function defsBase(P, p) {
  return lin(P + "borde", [[0, p.brillo], [0.25, p.claro], [0.55, p.base], [1, p.hondo]], 0.1, 0, 0.9, 1) +
    lin(P + "hundido", [[0, p.hondo], [1, p.claro]], 0, 0, 0, 1) +
    rad(P + "cara", [[0, p.claro], [0.55, p.medio], [1, p.base]], 0.4, 0.28, 0.85) +
    lin(P + "brillo", [[0, "#ffffff", 0.7], [0.55, "#ffffff", 0.1], [1, "#ffffff", 0]], 0, 0, 0, 1) +
    lin(P + "filo", [[0, "#ffffff", 0.95], [0.4, "#ffffff", 0.15], [0.7, "#000000", 0.05], [1, "#000000", 0.45]], 0, 0, 0, 1) +
    rad(P + "suelo", [[0, "#000000", 0.34], [1, "#000000", 0]]) +
    (p.glifoOscuro ? lin(P + "glifo", [[0, mezcla(p.sombra, p.hondo, 0.2)], [1, p.hondo]]) : lin(P + "glifo", [[0, "#ffffff"], [1, mezcla(p.claro, "#ffffff", 0.35)]]));
}

/** Facetas de una gema: anillo entre el contorno y su copia reducida, sombreado según la luz (arriba a la izquierda). */
export function facetas(P, p, pts, k, simple) {
  const n = pts.length, Q = pts.map(([x, y]) => [x * k, y * k]); let s = "";
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, mx = (pts[i][0] + pts[j][0]) / 2, my = (pts[i][1] + pts[j][1]) / 2, l = Math.hypot(mx, my) || 1;
    const t = (-mx / l) * 0.6 + (-my / l) * 0.8;                  // 1 = de cara a la luz
    const col = t > 0 ? mezcla(p.base, p.brillo, Math.min(1, t * 0.9)) : mezcla(p.base, p.hondo, Math.min(1, -t * 0.75));
    s += `<path d="${poli([pts[i], pts[j], Q[j], Q[i]])}" fill="${col}"${simple ? "" : ` stroke="#ffffff" stroke-opacity=".32" stroke-width=".6" stroke-linejoin="round"`}/>`;
  }
  s += `<path d="${poli(Q)}" fill="url(#${P}cara)"${simple ? "" : ` stroke="#ffffff" stroke-opacity=".45" stroke-width=".7"`}/>`;
  if (!simple) for (let i = 0; i < n; i++) s += `<path d="M${f(pts[i][0])} ${f(pts[i][1])}L${f(Q[i][0])} ${f(Q[i][1])}" stroke="#ffffff" stroke-opacity=".22" stroke-width=".5"/>`;
  return s;
}

/** Corona de puntos (cuentas) sobre un círculo de radio R. */
export const cuentas = (n, R, r, fill, op = 0.9) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `<circle cx="${f(R * Math.cos(a))}" cy="${f(R * Math.sin(a))}" r="${r}" fill="${fill}" fill-opacity="${op}"/>`; }).join("");
export const marcas = (n, R1, R2, color, ancho, op) => `<path d="${Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); return `M${f(R1 * c)} ${f(R1 * s)}L${f(R2 * c)} ${f(R2 * s)}`; }).join("")}" stroke="${color}" stroke-width="${ancho}" stroke-opacity="${op}" stroke-linecap="round"/>`;

// ── glifos (≈ ±24 unidades) ──
/** Relieve de un glifo: sombra desplazada, relleno degradado y un filo de luz. `trazos` son líneas con el mismo degradado. */
export function glifo(P, p, formas, trazos = "") {
  const c = p.glifoOscuro, sh = c ? "#ffffff" : p.hondo, shOp = c ? 0.55 : 0.5;
  const G = `url(#${P}glifo)`;
  const sombra = (formas + trazos).replaceAll("@F", sh).replaceAll("@S", sh);
  return `<g transform="translate(0 1.7)" fill-opacity="${shOp}" stroke-opacity="${shOp}">${sombra}</g>` + (formas + trazos).replaceAll("@F", G).replaceAll("@S", G);
}
const F = (d, extra = "") => `<path d="${d}" fill="@F" ${extra}/>`;
const S = (d, w) => `<path d="${d}" fill="none" stroke="@S" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const rect = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="@F"/>`;

export const G = {
  brote: () => F("M-2.2 24 V5 Q-2.2 -3 0 -9 Q2.2 -3 2.2 5 V24Z") + F("M-2 8C-15 10-25 3-25-11 -12-13-3-7-2 8Z") + F("M2 0C13 2 25-5 25-22 10-23 2-15 2 0Z"),
  pesaRusa: () => F("M0 24C-13 24-18 15-18 8-18 0-11-5 0-5 11-5 18 0 18 8 18 15 13 24 0 24Z") + F("M-11.5-4C-11.5-24 11.5-24 11.5-4L5.8-4C5.8-14-5.8-14-5.8-4Z"),
  mancuerna: () => `<g transform="rotate(-32)">` + rect(-12, -2.6, 24, 5.2, 2) + rect(-18, -11, 6.5, 22, 2.6) + rect(11.5, -11, 6.5, 22, 2.6) + rect(-24.5, -7, 5, 14, 2.2) + rect(19.5, -7, 5, 14, 2.2) + `</g>`,
  disco: () => `<path fill-rule="evenodd" fill="@F" d="${circulo(22)}${circulo(16.5)}${circulo(14.6)}${circulo(5.4)}"/>`,
  barra: () => `<g transform="rotate(-28)">` + rect(-28, -1.8, 56, 3.6, 1.8) + rect(-23, -13, 5, 26, 2) + rect(-17.5, -9.5, 4, 19, 1.8) + rect(18, -13, 5, 26, 2) + rect(13.5, -9.5, 4, 19, 1.8) + `</g>`,
  estrella: () => F(estrella(24, 10.5, 5)),
  llama: () => F("M0-26C5-15 16-10 16 4 16 16 8 24 0 24-8 24-16 16-16 6-16-1-12-6-8-10-7-4-4-3-3-1-4-12-3-20 0-26Z"),
  rayo: () => F("M6-26L-15 4H-3L-8 26 16-6H4Z"),
  montana: () => F("M-26 20L-8-10-1 2 9-16 26 20Z") + `<path d="M9-16L15-6 9-8 4-3 3-1 5-10Z" fill="#ffffff" fill-opacity=".85"/>`,
  copa: () => F("M-12-22H12V-9C12 2 6 8 0 8-6 8-12 2-12-9Z") + S("M-12-17C-24-17-24-1-11 0", 3.4) + S("M12-17C24-17 24-1 11 0", 3.4) + rect(-2.6, 8, 5.2, 8, 1) + rect(-10, 16, 20, 6, 2.4),
  brillo4: () => F("M0-26C2-10 10-2 26 0 10 2 2 10 0 26-2 10-10 2-26 0-10-2-2-10 0-26Z") + F("M15-20C16-16 18-14 22-13 18-12 16-10 15-6 14-10 12-12 8-13 12-14 14-16 15-20Z", `transform="translate(0 0) scale(.62)" `),
  corona: () => F("M-24 14L-27-12-13-1 0-20 13-1 27-12 24 14Z") + rect(-24, 16, 48, 7, 2.6),
};

/** Laurel: hojas a lo largo de un arco a cada lado, orientadas según la tangente, con un hueco arriba. */
export function laurel(R, hojas, largo, ancho, fill) {
  let s = "";
  for (const lado of [-1, 1]) for (let i = 0; i < hojas; i++) {
    const t = i / (hojas - 1), g = 100 - t * 150, a = rad2(g), x = lado * R * Math.cos(a), y = R * Math.sin(a);
    const tang = (Math.atan2(Math.cos(a), -lado * Math.sin(a)) * 180) / Math.PI;
    const d = i % 2 ? 1 : -1, rr = R + d * 1.8, x2 = lado * rr * Math.cos(a), y2 = rr * Math.sin(a);
    s += `<ellipse cx="${f(x2)}" cy="${f(y2)}" rx="${largo}" ry="${ancho}" transform="rotate(${f(tang + d * 24)} ${f(x2)} ${f(y2)})" fill="${fill}"/>`;
  }
  return s;
}
/** Ala: seis plumas en abanico que salen de un punto de la medalla; `lado` -1 izquierda, 1 derecha. `id` es el degradado de las plumas. */
export function ala(lado, id, R, esc = 1) {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const L = (50 - i * 4.2) * esc, a = 36 + i * 13, w = (7.2 - i * 0.35) * esc;
    s += `<path d="M0 0C${f(w)} ${f(-L * 0.3)} ${f(w * 1.05)} ${f(-L * 0.78)} 0 ${f(-L)}C${f(-w * 1.05)} ${f(-L * 0.78)} ${f(-w)} ${f(-L * 0.3)} 0 0Z" transform="translate(${f(lado * (R - 4))} 6) scale(${lado} 1) rotate(${a})" fill="url(#${id})" stroke="#000000" stroke-opacity=".28" stroke-width=".6"/>`;
  }
  return s;
}

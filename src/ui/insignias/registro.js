// Insignias de liga · registro de las 15 ligas. Cada una es una medalla con su material, su silueta,
// un glifo en relieve y detalles propios. Estética de premios de Salud/Fitness: degradados suaves,
// bisel, brillo superior y glifos redondeados.
import { f, rad2, rad, poli, redondea, regular, circulo, ondulada, estrella, cuentas, marcas, facetas, G, glifo, laurel } from "./graficos.js";

export const CINTA = { completa: { y: 99, alto: 19 }, simple: { y: 92, alto: 28 } };
export const L = [];
const rng = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const escudo = (pts, r) => redondea(pts, r);
const SIMPLE = (cuerpo, simple) => (simple ? "" : cuerpo);

// 1 · MADERA · rodaja de tronco con anillos y un brote
L.push({ nombre: "Madera", base: "#9a6232", forma: ondulada(47, 5, 2.2), ext: 46, k: 0.84, kSolo: 1.04, disco: 25, gl: G.brote, gk: 0.78, gy: 1,
  cara: (P, p, simple) => { const r = rng(7); let s = "";
    for (let i = 1; i <= 8; i++) s += `<ellipse cx="${f(-2 + r())}" cy="${f(-1 + r())}" rx="${f(i * 4.4 + r())}" ry="${f(i * 4.2 + r())}" fill="none" stroke="${p.hondo}" stroke-opacity="${f(0.1 + (i % 2) * 0.12)}" stroke-width="${f(0.5 + r() * 0.6)}"/>`;
    return simple ? s : s + marcas(5, 10, 40, p.hondo, 0.5, 0.25); } });

// 2 · COBRE · moneda de canto festoneado, martillada
L.push({ nombre: "Cobre", base: "#d9722e", forma: ondulada(48, 16, 2.6), ext: 47, k: 0.84, kSolo: 1.04, disco: 25, gl: G.pesaRusa, gk: 0.8, gy: 1,
  cara: (P, p, simple) => { const r = rng(21); let s = `<circle r="38" fill="none" stroke="${p.hondo}" stroke-opacity=".35" stroke-width=".9"/>`;
    if (!simple) { for (let i = 0; i < 46; i++) { const a = r() * 6.28, d = 14 + r() * 24; s += `<circle cx="${f(d * Math.cos(a))}" cy="${f(d * Math.sin(a))}" r="${f(1.2 + r() * 1.8)}" fill="${p.hondo}" fill-opacity="${f(0.1 + r() * 0.1)}"/>`; }
      s += cuentas(32, 42.5, 0.9, p.brillo, 0.7); }
    return s; } });

// 3 · HIERRO · placa hexagonal con remaches y trazo de cepillo
L.push({ nombre: "Hierro", base: "#6f7c8a", forma: redondea(regular(6, 52, 0, 1, 0.9), 7), ext: 47, k: 0.84, kSolo: 1.02, disco: 26, gl: G.mancuerna, gk: 0.88, gy: 0,
  cara: (P, p, simple) => { let s = ""; if (!simple) { for (let y = -36; y < 38; y += 2.2) s += `<path d="M-46 ${y}H46" stroke="#ffffff" stroke-opacity="${f(0.03 + ((y * 7) % 5) * 0.012)}" stroke-width=".6"/>`; }
    for (const [x, y] of regular(6, 41, 0, 1, 0.9)) s += `<circle cx="${f(x)}" cy="${f(y + 0.8)}" r="3.5" fill="#000" fill-opacity=".4"/><circle cx="${f(x)}" cy="${f(y)}" r="3.3" fill="url(#${P}remache)" stroke="${p.hondo}" stroke-width=".5"/>`;
    return s; },
  defs: (P, p) => rad(P + "remache", [[0, "#ffffff"], [0.45, p.claro], [1, p.sombra]], 0.38, 0.3, 0.7) });

// 4 · BRONCE · escudo con galones
L.push({ nombre: "Bronce", base: "#c48a3a", forma: escudo([[-42, -36], [0, -44], [42, -36], [42, 6], [24, 32], [0, 48], [-24, 32], [-42, 6]], 9), ext: 47, k: 0.86, kSolo: 1.04, disco: 0, gl: G.disco, gk: 0.86, gy: -2,
  cara: (P, p, simple) => SIMPLE(`<path d="M-30-24L0-18 30-24" fill="none" stroke="${p.hondo}" stroke-opacity=".3" stroke-width="1.2" stroke-linecap="round"/>` +
    [[-33, -30], [33, -30], [-26, 14], [26, 14]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="${p.brillo}" fill-opacity=".8"/><circle cx="${x}" cy="${f(y + 0.7)}" r="2.1" fill="${p.hondo}" fill-opacity=".35"/>`).join(""), simple) });

// 5 · PLATA · escudo con filete grabado
L.push({ nombre: "Plata", base: "#aebccb", oscuro: true, forma: escudo([[-38, -44], [38, -44], [45, -34], [45, 10], [30, 34], [0, 50], [-30, 34], [-45, 10], [-45, -34]], 9), ext: 48, k: 0.86, kSolo: 1.04, disco: 0, gl: G.barra, gk: 0.9, gy: -2,
  cara: (P, p, simple) => SIMPLE(`<path d="${escudo([[-27, -33], [27, -33], [33, -26], [33, 8], [22, 24], [0, 38], [-22, 24], [-33, 8], [-33, -26]], 5)}" fill="none" stroke="${p.hondo}" stroke-opacity=".35" stroke-width="1"/>` +
    `<path d="${escudo([[-27, -33], [27, -33], [33, -26], [33, 8], [22, 24], [0, 38], [-22, 24], [-33, 8], [-33, -26]], 5)}" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width=".7" transform="translate(0 1.1)"/>`, simple) });

// 6 · ORO · sello de 16 puntas con rayos
L.push({ nombre: "Oro", base: "#f2b200", forma: redondea(Array.from({ length: 32 }, (_, i) => { const a = rad2(-90 + (360 / 32) * i), r = i % 2 ? 44 : 52; return [r * Math.cos(a), r * Math.sin(a)]; }), 2.2), ext: 51, k: 0.82, kSolo: 1, disco: 26, gl: G.estrella, gk: 0.9, gy: 1, anim: true,
  cara: (P, p, simple) => { let s = ""; if (!simple) for (let i = 0; i < 24; i++) { const a = rad2(i * 15), b = rad2(i * 15 + 7.5); s += `<path d="M0 0L${f(38 * Math.cos(a))} ${f(38 * Math.sin(a))}L${f(38 * Math.cos(b))} ${f(38 * Math.sin(b))}Z" fill="#ffffff" fill-opacity="${i % 2 ? 0.1 : 0}"/>`; }
    return s + (simple ? "" : cuentas(30, 41, 0.9, p.brillo, 0.85)); } });

// 7 · PLATINO · octógono con doble filete y llama
L.push({ nombre: "Platino", base: "#47b5a6", forma: redondea(regular(8, 52, 22.5), 8), ext: 50, k: 0.83, kSolo: 1.02, disco: 26, gl: G.llama, gk: 0.86, gy: 0, anim: true,
  cara: (P, p, simple) => `<circle r="38.5" fill="none" stroke="${p.brillo}" stroke-opacity=".5" stroke-width=".9"/>` +
    SIMPLE(`<circle r="35" fill="none" stroke="${p.hondo}" stroke-opacity=".35" stroke-width="2.2" stroke-dasharray="1.2 2.6"/>` +
    regular(8, 44, 22.5).map(([x, y]) => `<path d="M${f(x)} ${f(y - 2.6)}L${f(x + 2.2)} ${f(y)} ${f(x)} ${f(y + 2.6)} ${f(x - 2.2)} ${f(y)}Z" fill="${p.brillo}" fill-opacity=".85"/>`).join(""), simple) });

// 8-11 · gemas con facetas
const GEMAS = [
  null,
  { pts: [[0, -52], [42, -26], [42, 26], [0, 52], [-42, 26], [-42, -26]], r: 4 },                                          // zafiro: hexagonal
  { pts: [[-24, -50], [24, -50], [44, -30], [44, 30], [24, 50], [-24, 50], [-44, 30], [-44, -30]], r: 3 },                // esmeralda: talla esmeralda
  { pts: Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return [38 * Math.cos(a), 50 * Math.sin(a)]; }), r: 0 },  // rubí: óvalo
];
const gema = (n, nombre, base, gl, gk, anim, escalones) => L.push({ nombre, base, gema: GEMAS[n], escalones, ext: 52, k: 0.84, kSolo: 1, gl, gk, gy: 0, anim });
gema(1, "Zafiro", "#3b6ff0", G.rayo, 0.62, true, false);
gema(2, "Esmeralda", "#12b366", G.montana, 0.66, true, true);
gema(3, "Rubí", "#e0284f", G.copa, 0.62, true, false);

// 11 · DIAMANTE · talla brillante vista de perfil
const DIA = { corona: [[[-22, -38], [-50, -12], [-30, -12]], [[-22, -38], [-30, -12], [-10, -12], [-11, -38]], [[-11, -38], [-10, -12], [10, -12], [11, -38]], [[11, -38], [10, -12], [30, -12], [22, -38]], [[22, -38], [30, -12], [50, -12]]],
  pabellon: [[[-50, -12], [-30, -12], [0, 50]], [[-30, -12], [-10, -12], [0, 50]], [[-10, -12], [10, -12], [0, 50]], [[10, -12], [30, -12], [0, 50]], [[30, -12], [50, -12], [0, 50]]] };
L.push({ nombre: "Diamante", base: "#79cdf2", forma: poli([[-22, -38], [22, -38], [50, -12], [0, 50], [-50, -12]]), ext: 50, k: 0.9, kSolo: 1.06, ext2: 0, diamante: true, gk: 1, anim: true });

// 12 · MAESTRO · medallón con laurel y estrella
L.push({ nombre: "Maestro", base: "#9b5cf0", forma: circulo(47), ext: 47, k: 0.84, kSolo: 1.04, disco: 0, gl: G.estrella, gk: 0.7, gy: 0, anim: true, laurel: true,
  cara: (P, p, simple) => cuentas(simple ? 0 : 36, 41.5, 0.9, p.brillo, 0.85) + `<circle r="26.5" fill="${p.hondo}" fill-opacity=".3" stroke="#ffffff" stroke-opacity=".28" stroke-width=".8"/>` });

// 13 · GRAN MAESTRO · medallón con alas
L.push({ nombre: "Gran Maestro", base: "#e0337a", forma: circulo(37), ext: 37, k: 0.78, kSolo: 0.84, disco: 22, gl: G.estrella, gk: 0.62, gy: 0, anim: true, alas: { R: 37, esc: 0.92 },
  cara: (P, p, simple) => cuentas(simple ? 0 : 28, 32.2, 0.8, p.brillo, 0.85) });

// 14 · ÉLITE · medallón con alas grandes y corona
L.push({ nombre: "Élite", base: "#f1b800", forma: circulo(34), ext: 34, k: 0.78, kSolo: 0.82, disco: 20, gl: G.corona, gk: 0.58, gy: 0, anim: true, alas: { R: 34, esc: 1 },
  cara: (P, p, simple) => cuentas(simple ? 0 : 26, 29.6, 0.8, p.brillo, 0.85) });

// 15 · LEYENDA · corona sobre anillo espectral con alas
L.push({ nombre: "Leyenda", base: "#7a56f0", forma: circulo(31), ext: 31, k: 0.8, kSolo: 0.86, disco: 18, gl: G.corona, gk: 0.54, gy: 0, anim: true, alas: { R: 31, esc: 0.95 }, espectro: true,
  cara: (P, p, simple) => cuentas(simple ? 0 : 24, 27.2, 0.75, p.brillo, 0.9) });

export const DIAMANTE = DIA;

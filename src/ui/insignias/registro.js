// Insignias de liga · registro de las 15 ligas: silueta, paleta, emblema y escala de cada una.
import { C, f, rad2, rng, lin, rad, escala, poli, circulo, estrella, poligono, mezcla, destello, sombra, cuerpo, emb, numeral, cinta, facetas, laurel, ala, corona, destellosGema } from "./graficos.js";

// ═══════════════════════════ las 15 ligas ═══════════════════════════
// Colocación común: el cuerpo y su emblema arriba; la cinta de la división, abajo.
// `escalaCuerpo` hace crecer la presencia con la liga.
export const L = [];
export const CINTA = { completa: { y: 92, alto: 22, ancho: 52 }, simple: { y: 90, alto: 34, ancho: 46 } };

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
export const MED = {
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

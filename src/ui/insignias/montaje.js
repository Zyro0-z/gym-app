// Insignias de liga · montaje: apila silueta, bisel, cara, brillo y glifo, y añade la división (I, II, III) en una píldora.
import { f, mezcla, lin, rad, poli, redondea, glifo, laurel, ala, paleta, facetas, defsBase, sombraSuelo } from "./graficos.js";
import { L, CINTA, DIAMANTE } from "./registro.js";

const PRISMA = ["#ff9aa8", "#ffd48a", "#fff7a0", "#a9f2b4", "#9fd8ff", "#c7a9ff"];

function estiloAnim(c) {
  return `<style>.${c}-b{animation:${c}-s 6.5s ease-in-out infinite}.${c}-r{transform-box:fill-box;transform-origin:center;animation:${c}-g 90s linear infinite}` +
    `@keyframes ${c}-s{0%,58%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(200px) skewX(-20deg)}}@keyframes ${c}-g{to{transform:rotate(360deg)}}` +
    `@media (prefers-reduced-motion:reduce){.${c}-b{animation:none;opacity:0}.${c}-r{animation:none}}</style>`;
}

/** Cuerpo de una medalla de silueta libre o de una gema; devuelve el SVG local (centrado en 0,0). */
function cuerpo(o, P, p, simple, c) {
  const d = o.gema ? (o.gema.r ? redondea(o.gema.pts, o.gema.r) : poli(o.gema.pts)) : o.forma;
  const caraEsc = o.gema || o.diamante ? 0.94 : 0.875;
  let s = sombraSuelo(P, o.ext);
  s += `<clipPath id="${P}c1"><path d="${d}"/></clipPath><clipPath id="${P}c2"><path d="${d}" transform="scale(${caraEsc})"/></clipPath>`;
  if (o.diamante) {
    s += `<path d="${d}" fill="${p.hondo}" stroke="${p.hondo}" stroke-opacity=".8" stroke-width="2.4" stroke-linejoin="round"/>`;
    const sombra = [[0.55, 0.8, 1, 0.5, 0.3], [0.2, 0.45, 0.7, 0.35, 0.1]];
    DIAMANTE.corona.forEach((q, i) => { const col = mezcla(p.base, p.brillo, sombra[0][i] * 0.95); s += `<path d="${poli(q)}" fill="${!simple && i % 2 === 0 ? mezcla(col, PRISMA[i], 0.22) : col}"${simple ? "" : ` stroke="#ffffff" stroke-opacity=".55" stroke-width=".6" stroke-linejoin="round"`}/>`; });
    DIAMANTE.pabellon.forEach((q, i) => { const col = mezcla(p.base, p.hondo, 0.12 + (0.55 - sombra[1][i] * 0.7)); s += `<path d="${poli(q)}" fill="${!simple && i % 2 ? mezcla(col, PRISMA[(i + 3) % 6], 0.2) : col}"${simple ? "" : ` stroke="#ffffff" stroke-opacity=".3" stroke-width=".6" stroke-linejoin="round"`}/>`; });
    s += `<path d="M-50 -12H50" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.1"/>`;
    s += `<g clip-path="url(#${P}c1)"><ellipse cx="-12" cy="-40" rx="46" ry="30" fill="url(#${P}brillo)"/></g>`;
    s += `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="1.6" stroke-linejoin="round"/>`;
    const spark = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${glifo(P, { ...p, glifoOscuro: false }, `<path d="M0-26C2-10 10-2 26 0 10 2 2 10 0 26-2 10-10 2-26 0-10-2-2-10 0-26Z" fill="@F"/>`)}</g>`;
    return s + spark(0, -24, 0.42) + (simple ? "" : spark(30, -4, 0.2) + spark(-34, 12, 0.16));
  }
  s += `<path d="${d}" fill="url(#${P}borde)" stroke="${p.hondo}" stroke-opacity=".6" stroke-width="1" stroke-linejoin="round"/>`;
  if (o.gema) {
    const g = o.gema.pts, k1 = o.escalones ? 0.8 : 0.6;
    s += `<g clip-path="url(#${P}c1)">${facetas(P, p, g, k1, simple)}${o.escalones ? facetas(P, p, g.map(([x, y]) => [x * k1, y * k1]), 0.66, simple) : ""}</g>`;
  } else {
    s += `<path d="${d}" transform="scale(.935)" fill="url(#${P}hundido)"/><path d="${d}" transform="scale(.875)" fill="url(#${P}cara)" stroke="#ffffff" stroke-opacity=".28" stroke-width=".6"/>`;
    if (o.cara) s += `<g clip-path="url(#${P}c2)">${o.cara(P, p, simple)}</g>`;
    if (o.disco && !simple) s += `<circle r="${o.disco}" fill="${p.hondo}" fill-opacity=".26" stroke="#ffffff" stroke-opacity=".3" stroke-width=".8"/>`;
    else if (o.disco) s += `<circle r="${o.disco}" fill="${p.hondo}" fill-opacity=".2"/>`;
    if (o.laurel && !simple) s += laurel(33, 11, 6.2, 2.4, p.brillo);
  }
  s += `<g clip-path="url(#${P}${o.gema ? "c1" : "c2"})"><ellipse cx="0" cy="${f(-o.ext * 0.6)}" rx="${f(o.ext * 0.95)}" ry="${f(o.ext * 0.62)}" fill="url(#${P}brillo)"/></g>`;
  s += `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="1.5" stroke-linejoin="round" transform="scale(.985)"/>`;
  if (o.gl) s += `<g transform="translate(0 ${o.gy || 0}) scale(${o.gk})">${glifo(P, p, o.gl())}</g>`;
  if (o.anim && !simple) s += `<g clip-path="url(#${P}c1)"><rect class="${c}-b" x="-100" y="-70" width="24" height="140" fill="url(#${P}barrido)" transform="skewX(-20)"/></g>`;
  return s;
}

function detras(o, P, p, simple, c) {
  let s = "";
  if (o.espectro) {
    s += `<circle r="54" fill="url(#${P}aura)"/><g class="${simple ? "" : c + "-r"}">` + Array.from({ length: 36 }, (_, i) => `<path d="M0-38L${simple ? 5 : 3.4} -55.5 ${simple ? -5 : -3.4} -55.5Z" transform="rotate(${i * 10})" fill="hsl(${i * 10} 88% ${58 + (i % 2) * 8}%)" stroke="#000" stroke-opacity=".18" stroke-width=".5" stroke-linejoin="round"/>`).join("") + `</g>`;
  }
  if (o.alas) { const e = o.alas; s += ala(-1, P + "ala", e.R, e.esc) + ala(1, P + "ala", e.R, e.esc); }
  return s;
}

function pildora(P, p, num, simple) {
  const ci = simple ? CINTA.simple : CINTA.completa, n = num.length, w = (simple ? 18 : 15) + n * (simple ? 11 : 8.4), x = 64 - w / 2;
  const bw = simple ? 4.4 : 3.2, sep = simple ? 8.8 : 6.4, h = ci.alto - (simple ? 10 : 8);
  let s = `<rect x="${f(x)}" y="${ci.y + 1.2}" width="${f(w)}" height="${ci.alto}" rx="${f(ci.alto / 2)}" fill="#000" fill-opacity=".3"/>` +
    `<rect x="${f(x)}" y="${ci.y}" width="${f(w)}" height="${ci.alto}" rx="${f(ci.alto / 2)}" fill="url(#${P}pil)" stroke="${p.claro}" stroke-opacity=".75" stroke-width="${simple ? 1.4 : 0.9}"/>`;
  if (!simple) s += `<rect x="${f(x + 2)}" y="${ci.y + 1.2}" width="${f(w - 4)}" height="${f(ci.alto / 2 - 1)}" rx="${f(ci.alto / 4)}" fill="#ffffff" fill-opacity=".14"/>`;
  for (let i = 0; i < n; i++) s += `<rect x="${f(64 + (i - (n - 1) / 2) * sep - bw / 2)}" y="${f(ci.y + (ci.alto - h) / 2)}" width="${bw}" height="${h}" rx="${bw / 2}" fill="url(#${P}barra)"/>`;
  return s;
}

export function montar(n, simple, num) {
  const o = L[n - 1], p = paleta(o.base, { oscuro: !!o.oscuro }), nn = String(n).padStart(2, "0");
  const P = "L" + nn + (simple ? "s" : "") + "-", c = "l" + nn + (simple ? "s" : "");
  const alaCol = o.espectro ? paleta("#d6ccff") : p;
  let defs = defsBase(P, p) + (o.defs ? o.defs(P, p) : "") +
    lin(P + "barrido", [[0, "#ffffff", 0], [0.5, "#ffffff", 0.55], [1, "#ffffff", 0]], 0, 0, 1, 0) +
    lin(P + "pil", [[0, mezcla(p.sombra, p.hondo, 0.5)], [1, p.hondo]], 0, 0, 0, 1) + lin(P + "barra", [[0, "#ffffff"], [1, p.brillo]], 0, 0, 0, 1);
  if (o.alas) defs += lin(P + "ala", [[0, alaCol.sombra], [0.45, alaCol.base], [1, alaCol.brillo]], 0, 1, 0, 0);
  if (o.espectro) defs += rad(P + "aura", [[0, "#ffffff", 0.55], [0.55, "#b9a6ff", 0.28], [1, "#b9a6ff", 0]]);
  const cy = num ? 54 : 64, k = (num ? o.k : o.kSolo) * (simple ? 1.06 : 1);
  const cuerpoSvg = `<g transform="translate(64 ${cy}) scale(${f(k)})">${detras(o, P, p, simple, c)}${cuerpo(o, P, p, simple, c)}</g>`;
  const nombre = o.nombre + (num ? " " + num : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" class="liga liga-${nn}${simple ? " liga-32" : ""}" data-liga="${n}" role="img" aria-label="Liga ${nombre}">
<title>${nombre}</title>
<defs>${defs}</defs>${o.anim && !simple || o.espectro && !simple ? estiloAnim(c) : ""}
<g class="cuerpo">${cuerpoSvg}</g>
${num ? pildora(P, p, num, simple) : ""}
</svg>
`;
}

export const hechas = new Map();
export function svg(n, simple, numeral) {
  const num = n === 15 ? "" : numeral || "";
  const clave = n + (simple ? "s" : "") + num;
  if (!hechas.has(clave)) hechas.set(clave, montar(n, simple, num));
  return hechas.get(clave);
}

// Insignias de liga · reglas de montaje: compone cuerpo, emblema y cinta de la división, con caché.
import { f, rad2, lin, rad, escala, poli, circulo, mezcla, defsPaleta, sombra, cuerpo, barridoSvg, numeral, cinta, defsMesa, cuerpoGema, defsPlumas, corona, estiloAnim } from "./graficos.js";
import { L, CINTA } from "./registro.js";

// ═══════════════════════════ montaje ═══════════════════════════
export function montar(n, simple, num) {
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
export const hechas = new Map();
export function svg(n, simple, numeral) {
  const num = n === 15 ? "" : numeral || "";
  const clave = n + (simple ? "s" : "") + num;
  if (!hechas.has(clave)) hechas.set(clave, montar(n, simple, num));
  return hechas.get(clave);
}

// Insignias de liga: 15 ligas, cada una con su silueta, color dominante y emblema, en dos
// niveles de detalle (completa para 96 px, simplificada para 32 px) y con la división (I, II, III)
// en una cinta. Diseño propio, en SVG generado; sin dependencias.
//
// Presentación. Piezas en ui/insignias/: graficos.js (primitivas), registro.js (las 15 ligas) y
// montaje.js (composición y caché).
// Interfaz: crearInsignias().svg(n, simple, numeral), con n = 1-15 y numeral «I», «II», «III» o «».
// Los id de <defs> llevan el prefijo «Lnn-» (o «Lnns-»): quien inserte varias copias en una página
// debe renombrarlos en cada una (lo hace `insignia()` más abajo).
import { svg } from "./insignias/montaje.js";
import { L } from "./insignias/registro.js";

export function crearInsignias() { return { svg, total: L.length, nombres: L.map((o) => o.nombre) }; }

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

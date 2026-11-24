// Relieve y textura del diagrama corporal. Cada zona con datos recibe encima dos copias de su forma, sin trazo y sin eventos:
// una con un degradado de luz y sombra (volumen) y otra con fibras a lo largo del músculo, o puntos si es secundario.
// Las definiciones (degradado y tramas) se añaden al <defs> de cada instancia con ids propios.

let ORIENTACION = null;

/** Orientación de cada región («v» vertical, «h» horizontal, «d» compacta), medida una vez con el SVG en el documento. */
function orientaciones(plantilla) {
  if (ORIENTACION) return ORIENTACION;
  ORIENTACION = new Map();
  const caja = document.createElement("div");
  caja.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;height:200px;visibility:hidden;pointer-events:none";
  const svg = plantilla.cloneNode(true);
  caja.append(svg); document.body.append(caja);
  try {
    for (const p of svg.querySelectorAll("path[id^='m-']")) {
      const b = p.getBBox();
      ORIENTACION.set(p.id, b.height >= b.width * 1.25 ? "v" : b.width >= b.height * 1.25 ? "h" : "d");
    }
  } catch (_) { /* sin medidas: todas compactas */ }
  caja.remove();
  return ORIENTACION;
}

const FIBRA = "style=\"stroke:var(--accent-ink);stroke-opacity:.4;stroke-width:3.2;fill:none\"";
const PUNTO = "style=\"fill:var(--accent-ink);fill-opacity:.6\"";

/** Añade al <defs> del SVG el degradado y las tramas; `n` hace únicos los ids. Devuelve el prefijo de los ids. */
export function definirCapas(svg, n) {
  const p = "k" + n + "-";
  let defs = svg.querySelector("defs");
  if (!defs) { defs = document.createElementNS("http://www.w3.org/2000/svg", "defs"); svg.prepend(defs); }
  defs.insertAdjacentHTML("beforeend",
    `<linearGradient id="${p}b" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".36"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".24"/></linearGradient>` +
    `<pattern id="${p}v" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M6 0V22M17 0V22" ${FIBRA}/></pattern>` +
    `<pattern id="${p}h" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 6H22M0 17H22" ${FIBRA}/></pattern>` +
    `<pattern id="${p}d" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M6 0V22M17 0V22" ${FIBRA}/></pattern>` +
    `<pattern id="${p}p" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="3.4" ${PUNTO}/><circle cx="15" cy="15" r="3.4" ${PUNTO}/></pattern>`);
  return p;
}

/**
 * Pone las dos capas sobre la zona `zona` y devuelve las copias. `textura`: «fibras» (por defecto), «puntos» o «ninguna».
 */
export function capasDe(zona, prefijo, plantilla, textura = "fibras") {
  const nivel = zona.getAttribute("data-nivel");
  const crear = (clase, relleno) => {
    const c = zona.cloneNode(false);
    for (const a of ["id", "data-nivel", "data-v"]) c.removeAttribute(a);
    c.setAttribute("class", "capa " + clase); c.setAttribute("aria-hidden", "true"); c.style.fill = relleno;
    if (nivel) c.setAttribute("data-n", nivel);   // la intensidad de la capa sigue al nivel: que las fibras no igualen los niveles bajos con los altos
    return c;
  };
  const out = [crear("relieve", `url(#${prefijo}b)`)];
  if (textura !== "ninguna") out.push(crear("textura", `url(#${prefijo}${textura === "puntos" ? "p" : orientaciones(plantilla).get(zona.id) || "d"})`));
  zona.after(...out);
  return out;
}

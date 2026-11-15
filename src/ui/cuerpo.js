// Diagrama corporal: assets/cuerpo-muscular.svg (body-muscles, Apache-2.0; ver assets/licencias)
// en línea, con cada región coloreada según el grupo muscular al que pertenece.
import { h } from "./dom.js";

let svgTexto = null;
const cargar = () => (svgTexto ||= fetch("assets/cuerpo-muscular.svg").then((r) => { if (!r.ok) throw new Error("sin diagrama"); return r.text(); }));

/** ¿La región `id` (sin «m-») encaja con el patrón (admite «*» final como prefijo)? */
export const encaja = (id, patron) => (patron.endsWith("*") ? id.startsWith(patron.slice(0, -1)) : id === patron);

/**
 * grupos: [{ tokens: ["chest-*", ...], color, intensidad: 0..1 }]. Las regiones sin grupo quedan
 * en gris de silueta. Devuelve el contenedor; el SVG se carga en segundo plano.
 */
export function diagramaCuerpo(grupos, { etiqueta = "Diagrama muscular" } = {}) {
  const el = h("div", { class: "diagrama-cuerpo", role: "img", "aria-label": etiqueta });
  cargar().then((txt) => {
    el.innerHTML = txt.replace(/<!--[\s\S]*?-->/g, "").replace(/ width="\d+" height="\d+"/, "");
    const svg = el.querySelector("svg");
    if (!svg) return;
    svg.removeAttribute("aria-label"); svg.setAttribute("aria-hidden", "true");
    for (const p of svg.querySelectorAll("path[id^='m-']")) {
      const id = p.id.slice(2);
      p.querySelector("title")?.remove();
      const g = grupos.find((x) => x.tokens.some((t) => encaja(id, t)));
      if (!g || !g.intensidad) continue;
      p.style.fill = g.color;
      p.style.fillOpacity = String(0.25 + 0.75 * Math.max(0, Math.min(1, g.intensidad)));
    }
  }).catch(() => { el.replaceChildren(); });
  return el;
}

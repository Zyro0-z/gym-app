// Diagrama corporal: assets/cuerpo-muscular.svg (geometría MIT de react-muscle-highlighter; ver assets/licencias,
// generado con tools/generar-cuerpo.mjs; una región por trozo de músculo, ids «m-<músculo>-<lado>-<n>») en línea. Monocromo: un solo tono (el acento) con 4 niveles de intensidad según el valor de cada
// grupo, contorno del acento en las zonas con datos (contraste ≥ 3:1 en claro y oscuro), leyenda
// con los rangos y el valor al tocar una zona. La alternativa textual es la lista de grupos que
// acompaña al diagrama y la etiqueta, que nombra los grupos de más a menos.
import { h } from "./dom.js";
import { seleccion } from "./haptica.js";

let svgTexto = null, instancias = 0;
const cargar = () => (svgTexto ||= fetch("assets/cuerpo-muscular.svg").then((r) => { if (!r.ok) throw new Error("sin diagrama"); return r.text(); }));

/** ¿La región `id` (sin «m-») encaja con el patrón (admite «*» final como prefijo)? */
export const encaja = (id, patron) => (patron.endsWith("*") ? id.startsWith(patron.slice(0, -1)) : id === patron);

/** Vistas en las que se dibuja cada músculo: f = frontal, e = trasera (el SVG lleva las dos una al lado de la otra). */
export const VISTA_MUSCULO = {
  "pecho-clavicular": "f", "pecho-esternal": "f", serrato: "f", oblicuos: "f", "recto-abdominal": "f", biceps: "f", braquial: "f",
  "deltoide-anterior": "f", "deltoide-lateral": "f", "recto-femoral": "f", vastos: "f",
  aductores: "fe", "triceps-lateral-medial": "fe", "trapecio-superior": "fe", antebrazo: "fe", soleo: "fe", gemelos: "fe",
  "deltoide-posterior": "e", manguito: "e", dorsal: "e", redondo: "e", "trapecio-medio": "e", romboides: "e", erectores: "e",
  "triceps-largo": "e", "gluteo-mayor": "e", "gluteo-medio": "e", isquiotibiales: "e",
};
const VISTAS = {
  ambas: { caja: "38 84 1376 1272", ar: 1376 / 1272 },
  frente: { caja: "34 84 660 1272", ar: 660 / 1272 },
  espalda: { caja: "754 84 660 1272", ar: 660 / 1272 },
};
/** Vista que muestra todos los músculos dados con el menor recorte: «frente», «espalda» o «ambas». */
export function vistaPara(musculos) {
  const v = musculos.map((m) => VISTA_MUSCULO[m] || "fe");
  if (!v.length) return "ambas";
  if (v.every((x) => x.includes("f"))) return "frente";
  if (v.every((x) => x.includes("e"))) return "espalda";
  return "ambas";
}

export const NIVELES = 4;
/** Nivel 0..4 de un valor respecto al máximo (0 = sin datos). */
export const nivelDe = (v, max) => (!(v > 0) || !(max > 0) ? 0 : Math.max(1, Math.min(NIVELES, Math.ceil((v / max) * NIVELES))));
/** Rangos de cada nivel para la leyenda: [{ nivel, desde, hasta }] (enteros, sin huecos ni solapes). */
export function rangosNiveles(max) {
  const out = [];
  let desde = 1;
  for (let n = 1; n <= NIVELES; n++) {
    const hasta = Math.floor((max * n) / NIVELES);
    if (hasta >= desde) { out.push({ nivel: n, desde, hasta }); desde = hasta + 1; }
  }
  return out;
}

/**
 * grupos: [{ nombre, tokens: ["chest-*", ...], valor }]. unidad(v) → «13 series».
 * Devuelve { el, leyenda }: el contenedor (el SVG se carga en segundo plano) y la leyenda.
 */
export function diagramaCuerpo(grupos, { etiqueta = "Diagrama muscular", unidad = (v) => String(v), vista = "ambas", mini = false } = {}) {
  const max = Math.max(0, ...grupos.map((g) => g.valor || 0));
  const orden = grupos.filter((g) => g.valor > 0).sort((a, b) => b.valor - a.valor);
  const texto = orden.length ? etiqueta + ". De más a menos: " + orden.map((g) => g.nombre + ", " + unidad(g.valor)).join("; ") + "." : etiqueta + ". Sin datos en este periodo.";
  const info = h("p", { class: "diagrama-info", "aria-live": "polite" }, orden.length ? "Toca una zona para ver su valor." : "Sin datos en este periodo.");
  const V = VISTAS[vista] || VISTAS.ambas;
  const el = h("div", { class: "diagrama-cuerpo" + (mini ? " mini" : "") + (V.ar < 1 ? " una-vista" : ""), role: "img", "aria-label": texto, style: { aspectRatio: String(V.ar) } });
  cargar().then((txt) => {
    // Los recortes (clipPath) se referencian por id: con dos diagramas en el documento hay que darles ids propios o el segundo usa los del primero.
    const n = ++instancias;
    el.innerHTML = txt.replace(/<!--[\s\S]*?-->/g, "").replace(/ width="\d+" height="\d+"/, "").replace(/(id="|#)cp(\d+)/g, "$1cp" + n + "_$2");
    const svg = el.querySelector("svg");
    if (!svg) return;
    svg.removeAttribute("aria-label"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("viewBox", V.caja);
    for (const p of svg.querySelectorAll("path[id^='m-']")) {
      const id = p.id.slice(2);
      const g = grupos.find((x) => x.tokens.some((t) => encaja(id, t)));
      if (!g) continue;
      const n = nivelDe(g.valor, max);
      if (n) p.setAttribute("data-nivel", String(n));
      p.addEventListener("click", () => {
        seleccion();
        info.textContent = g.nombre + ": " + (g.valor > 0 ? unidad(g.valor) : "sin datos");
        for (const q of svg.querySelectorAll(".marcada")) q.classList.remove("marcada");
        for (const q of svg.querySelectorAll("path[id^='m-']")) if (g.tokens.some((t) => encaja(q.id.slice(2), t))) q.classList.add("marcada");
      });
    }
  }).catch(() => { el.replaceChildren(); });
  const leyenda = max > 0 && !mini ? h("div", { class: "leyenda-niveles", "aria-hidden": "true" },
    h("span", { class: "etq" }, "Menos"),
    rangosNiveles(max).map((r) => h("span", { class: "nivel" }, h("i", { "data-nivel": String(r.nivel) }), r.desde === r.hasta ? String(r.desde) : r.desde + "–" + r.hasta)),
    h("span", { class: "etq" }, "Más")) : null;
  return h("div", { class: "diagrama" + (mini ? " mini" : "") }, el, leyenda, info);
}

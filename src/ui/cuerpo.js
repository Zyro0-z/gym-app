// Diagrama corporal: assets/cuerpo-muscular.svg (dos imágenes, frente y espalda, con una región tocable por trozo de músculo,
// ids «m-<músculo>-<lado>-<n>»; lo genera tools/cuerpo/generar.py) en línea. Monocromo: un solo tono (--mapa, el mismo en claro y
// oscuro) con 4 niveles de intensidad según el valor de cada grupo, teñido sobre la imagen para conservar las fibras. Al tocar una
// zona (o cerca de ella) se enfoca el grupo: el resto se atenúa y aparece su resumen sobre la figura, sin mover la página.
// El SVG se parsea una vez y cada diagrama es una copia. La alternativa textual es la lista de grupos que acompaña al
// diagrama y la etiqueta, que nombra los grupos de más a menos.
import { h, s as sv } from "./dom.js";
import { seleccion } from "./haptica.js";
import { segmentado } from "./controles.js";

let plantilla = null, vistaElegida = "ambas";
const cargar = () => (plantilla ||= fetch("assets/cuerpo-muscular.svg").then((r) => { if (!r.ok) throw new Error("sin diagrama"); return r.text(); }).then((txt) => {
  const t = document.createElement("template");
  t.innerHTML = txt.replace(/<!--[\s\S]*?-->/g, "");
  return t.content.firstElementChild;
}));

/** ¿La región `id` (sin «m-») encaja con el patrón (admite «*» final como prefijo)? */
export const encaja = (id, patron) => (patron.endsWith("*") ? id.startsWith(patron.slice(0, -1)) : id === patron);

/** Vistas en las que se dibuja cada músculo: f = frontal, e = trasera (el SVG lleva las dos una al lado de la otra). */
export const VISTA_MUSCULO = {
  "pecho-clavicular": "f", "pecho-esternal": "f", serrato: "f", "recto-abdominal": "f", biceps: "f", braquial: "f",
  "deltoide-anterior": "f", "recto-femoral": "f",
  oblicuos: "fe", "deltoide-lateral": "fe", vastos: "fe", aductores: "fe", "triceps-lateral-medial": "fe", "trapecio-superior": "fe",
  antebrazo: "fe", gemelos: "fe", "gluteo-medio": "fe",
  "deltoide-posterior": "e", manguito: "e", dorsal: "e", redondo: "e", "trapecio-medio": "e", romboides: "e", erectores: "e",
  "triceps-largo": "e", "gluteo-mayor": "e", isquiotibiales: "e", soleo: "e",
};
const VISTAS = {
  ambas: { caja: "0 0 937 1050", ar: 937 / 1050 },
  frente: { caja: "0 0 465 1050", ar: 465 / 1050 },
  espalda: { caja: "465 0 472 1050", ar: 472 / 1050 },
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

const OPCIONES_VISTA = [{ valor: "ambas", texto: "Ambas" }, { valor: "frente", texto: "Frente" }, { valor: "espalda", texto: "Espalda" }];
const DIST_CERCA = [0, 7, 14];   // px alrededor del dedo donde se busca una zona si se toca justo al lado

/**
 * grupos: [{ nombre, tokens: ["pecho-*", ...], valor }]. unidad(v) → «13 series». Un grupo secundario es solo un valor menor: se tiñe en un nivel más bajo.
 * Opciones: vista inicial; `selector` añade Ambas/Frente/Espalda (se recuerda entre repintados); `resumen(g)` → nodo extra en
 * la ficha del grupo enfocado; `alElegir(g|null)` avisa a la lista que acompaña al diagrama.
 * Devuelve el contenedor (el SVG se carga en segundo plano) con `.foco(nombre|null)` para enfocar un grupo desde fuera.
 */
export function diagramaCuerpo(grupos, { etiqueta = "Diagrama muscular", unidad = (v) => String(v), vista = "ambas", mini = false, selector = false, resumen = null, alElegir = null } = {}) {
  const max = Math.max(0, ...grupos.map((g) => g.valor || 0));
  const orden = grupos.filter((g) => g.valor > 0).sort((a, b) => b.valor - a.valor);
  const texto = orden.length ? etiqueta + ". De más a menos: " + orden.map((g) => g.nombre + ", " + unidad(g.valor)).join("; ") + "." : etiqueta + ". Sin datos en este periodo.";
  const sinDatos = orden.length ? "" : "Sin datos en este periodo.";
  const info = h("div", { class: "diagrama-info", "aria-live": "polite" }, sinDatos);
  let vistaAct = selector ? vistaElegida : vista, svg = null, elegido = null;
  const el = h("div", { role: "img", "aria-label": texto });
  const zonaDe = new Map(), sombras = new Map();

  function pintarVista() {
    const V = VISTAS[vistaAct] || VISTAS.ambas;
    el.className = "diagrama-cuerpo" + (mini ? " compacto" : "") + (V.ar < 1 ? " una-vista" : "") + (selector ? " con-selector" : "");
    el.style.aspectRatio = String(selector ? VISTAS.ambas.ar : V.ar);   // con selector el alto no cambia al cambiar de cara: nada se mueve
    if (svg) {
      svg.setAttribute("viewBox", V.caja);
      if (selector) svg.style.cssText = "height:100%;width:auto;margin:0 auto;aspect-ratio:" + V.ar;   // una cara: más estrecha, centrada y a la misma altura
    }
  }
  pintarVista();
  const ponerVista = (v) => { vistaAct = v; if (selector) vistaElegida = v; pintarVista(); };
  const sel = selector ? segmentado(OPCIONES_VISTA, vistaAct, ponerVista, { etiqueta: "Vista del mapa" }) : null;

  function pintarInfo() {
    if (!elegido) { info.replaceChildren(sinDatos); return; }
    const extra = resumen ? resumen(elegido) : null;
    info.replaceChildren(h("div", { class: "resumen" }, h("span", { class: "txt" }, h("b", null, elegido.nombre), " · ", elegido.valor > 0 ? unidad(elegido.valor) : "sin datos"), extra));
  }
  /** Enfoca un grupo (null lo quita): las demás zonas se atenúan. La cara que se ve solo la cambia el selector, nunca un toque. */
  function foco(g, usuario) {
    elegido = g;
    if (svg) {
      svg.classList.toggle("con-foco", !!g);
      for (const [q, x] of zonaDe) q.classList.toggle("marcada", !!g && x === g);
      for (const [q, c] of sombras) { const mia = !!g && zonaDe.get(q) === g; c.classList.toggle("on", !!g && !mia); c.classList.toggle("marca", mia); }
    }
    pintarInfo();
    if (alElegir) alElegir(g, usuario);
  }
  const cercano = (ev) => {
    for (const r of DIST_CERCA)
      for (let k = 0; k < (r ? 8 : 1); k++) {
        const a = (k * Math.PI) / 4;
        const q = document.elementsFromPoint(ev.clientX + r * Math.cos(a), ev.clientY + r * Math.sin(a)).find((x) => zonaDe.has(x));
        if (q) return zonaDe.get(q);
      }
    return null;
  };

  cargar().then((base) => {
    svg = base.cloneNode(true);
    svg.removeAttribute("aria-label"); svg.setAttribute("aria-hidden", "true");
    el.replaceChildren(svg);
    pintarVista();
    const capa = svg.querySelector(".musculos");
    for (const p of [...capa.querySelectorAll("path[id^='m-']")]) {
      const id = p.id.slice(2);
      const so = p.cloneNode(false);   // capa oscura que atenúa lo que no es el grupo enfocado
      so.removeAttribute("id"); so.removeAttribute("data-v"); so.setAttribute("class", "sombra");
      sombras.set(p, so);
      const g = grupos.find((x) => x.tokens.some((t) => encaja(id, t)));
      if (!g) continue;
      zonaDe.set(p, g);
      const nv = nivelDe(g.valor, max);
      if (nv) p.setAttribute("data-nivel", String(nv));
    }
    capa.after(sv("g", { class: "sombras", "aria-hidden": "true" }, [...sombras.values()]));
    svg.addEventListener("click", (ev) => {
      const g = cercano(ev);
      seleccion();
      foco(g && g !== elegido ? g : null, true);
    });
    if (elegido) foco(elegido);
  }).catch(() => { el.replaceChildren(); });

  const leyenda = max > 0 && !mini ? h("div", { class: "leyenda-niveles", "aria-hidden": "true" },
    h("span", { class: "etq" }, "Menos"),
    rangosNiveles(max).map((r) => h("span", { class: "nivel" }, h("i", { "data-nivel": String(r.nivel) }), r.desde === r.hasta ? String(r.desde) : r.desde + "–" + r.hasta)),
    h("span", { class: "etq" }, "Más")) : null;
  const raiz = h("div", { class: "diagrama" + (mini ? " compacto" : "") }, sel, h("div", { class: "diagrama-lienzo" }, el, info), leyenda);
  raiz.foco = (nombre) => foco(nombre ? grupos.find((g) => g.nombre === nombre) || null : null, false);
  return raiz;
}

// Progreso › Rendimiento frente a sueño, estrés y energía, siempre con el número de sesiones (n).
import { h, poner } from "../ui/dom.js";
import { seccion, vacio, chip } from "../ui/controles.js";
import { analizarRendimiento, MIN_BANDA } from "../core/rendimiento.js";
import { fmt, plural } from "../core/formato.js";

const pct = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), 1) + " %";
const ESCALA = 8;   // la pista cubre ±8 %: lo que salga se recorta al borde

/** Una fila: la franja del intervalo del 95 %, el punto de la media y el n. Sin n suficiente, punto hueco. */
function filaBanda(b) {
  const pos = (v) => 50 + Math.max(-ESCALA, Math.min(ESCALA, v)) / ESCALA * 50;
  const pista = h("span", { class: "pista", "aria-hidden": "true" }, h("i", { class: "cero" }));
  if (b.n && b.media != null) {
    if (b.lo != null) pista.append(h("i", { class: "rango", style: { left: pos(b.lo) + "%", width: Math.max(1, pos(b.hi) - pos(b.lo)) + "%" } }));
    pista.append(h("i", { class: "media", style: { left: pos(b.media) + "%" } }));
  }
  const texto = b.n ? (b.media != null ? pct(b.media) : "—") : "sin datos";
  return h("div", { class: ["banda-fila", !b.suficiente && "pocos"], role: "listitem",
    "aria-label": b.texto + ": " + (b.n ? texto + " de rendimiento medio en " + plural(b.n, "sesión", "sesiones") + (b.suficiente ? "" : ", pocos datos") : "sin sesiones") },
    h("span", null, b.texto), pista, h("span", { class: "n num" }, b.n ? texto + " · n = " + b.n : "n = 0"));
}

export function vistaRendimiento(_p, app) {
  const { store } = app;
  return {
    titulo: "Rendimiento",
    render(c) {
      const R = analizarRendimiento(store.analisis());
      if (R.sesiones < 8 || R.conRecuperacion < 6) {
        poner(c, vacio({ icono: "progreso", titulo: "Aún no hay datos suficientes",
          texto: "Necesito sesiones con ejercicios que ya hayas repetido (al menos 3 veces) y que hayas anotado cómo venías antes de entrenar. Ahora hay " + plural(R.sesiones, "sesión", "sesiones") + " con rendimiento medible, " + R.conRecuperacion + " con sueño, estrés o energía." }));
        return;
      }
      poner(c,
        seccion({ pie: "Mejor e1RM de cada ejercicio frente a la mediana de sus 5 sesiones anteriores. Las descargas no cuentan." },
          h("div", { class: "tarjeta" }, h("div", { class: "etiqueta" }, "Sesiones medidas"), h("div", { class: "cifra t-title1 c-accent" }, String(R.sesiones)),
            h("div", { class: "t-subhead c-2" }, R.conRecuperacion + " con datos de cómo venías"))),
        R.factores.map((f) => seccion({ cab: f.texto,
          pie: f.rho == null ? "No hay variación suficiente para correlacionar." : "Correlación de Spearman ρ = " + fmt(f.rho, 2) + " con n = " + f.n + ". " + (f.concluyente ? "Es una señal, no una prueba: otros factores (hora, comida, estrés de exámenes) también pesan." : "Con tan pocos datos esa diferencia puede ser ruido; hacen falta al menos 12 sesiones y una relación clara.") },
          h("div", { class: "tarjeta" },
            h("div", { class: "fila entre", style: { marginBottom: "6px" } }, h("span", { class: "etiqueta" }, "Rendimiento medio por " + f.texto.toLowerCase()),
              chip(f.veredicto === "sin datos" ? "sin datos" : f.concluyente ? f.veredicto : "sin conclusión (n = " + f.n + ")", f.concluyente ? "accent" : null)),
            h("div", { role: "list", "aria-label": "Rendimiento por " + f.texto.toLowerCase() }, f.bandas.map(filaBanda)),
            h("p", { class: "etiqueta", style: { marginTop: "6px" } }, "Franja = intervalo del 95 % (con 3 sesiones o más). Punto hueco: menos de " + MIN_BANDA + " sesiones.")))));
    },
  };
}

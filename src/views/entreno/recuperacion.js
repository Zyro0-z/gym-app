// Comprobación de recuperación (opcional): horas de sueño, estrés y energía, una vez por sesión.
// Se guarda en la sesión (recuperacion) y alimenta el informe de fatiga y la propuesta de descarga.
import { h, poner } from "../../ui/dom.js";
import { seccion, lista, celda, segmentado, stepper } from "../../ui/controles.js";
import { icono } from "../../ui/iconos.js";
import { fmt } from "../../core/formato.js";
import { E } from "./estado.js";
import { guardarYa } from "./pantalla.js";

const ESCALA = [1, 2, 3, 4, 5].map((v) => ({ valor: v, texto: String(v) }));
const horas = (v) => fmt(v, Number.isInteger(v) ? 0 : 1) + " h";

/** Resumen corto: «7,5 h · estrés 2 · energía 4», o null si no hay nada anotado. */
export function resumenRecuperacion(r) {
  if (!r) return null;
  const p = [];
  if (typeof r.sueno === "number") p.push(horas(r.sueno) + " de sueño");
  if (typeof r.estres === "number") p.push("estrés " + r.estres);
  if (typeof r.energia === "number") p.push("energía " + r.energia);
  return p.length ? p.join(" · ") : null;
}

/** Píldora «Cómo llegas hoy · 7 h de sueño …  Editar ›» que abre la hoja. `alCambiar` repinta quien la muestra. */
export function celdaRecuperacion(d, alCambiar) {
  const r = resumenRecuperacion(d.recuperacion);
  return h("button", { class: "checkin-pill", onClick: () => editarRecuperacion(d, alCambiar) },
    h("span", { class: "ci-txt" }, icono("rayo", { tam: 14, grosor: 2.2 }), h("b", null, "Cómo llegas hoy"), h("span", { class: "ci-val" }, r || "Sin anotar")),
    h("span", { class: "ci-acto" }, (r ? "Editar" : "Anotar") + " ›"));
}

export function editarRecuperacion(d, alCambiar) {
  const r = Object.assign({ sueno: null, estres: null, energia: null }, d.recuperacion || {});
  E.app.abrirHoja({
    titulo: "Recuperación", alturas: ["grande"],
    accion: { texto: "Guardar", alPulsar: () => {
      const limpio = {};
      for (const k of ["sueno", "estres", "energia"]) if (typeof r[k] === "number") limpio[k] = r[k];
      if (Object.keys(limpio).length) d.recuperacion = limpio; else delete d.recuperacion;
      if (E.M && E.M.modo === "entreno") guardarYa();
      if (alCambiar) alCambiar();
    } },
    render(c) {
      const bloque = (k, titulo, control) => celda({ titulo, sub: typeof r[k] === "number" ? null : "Sin anotar", control });
      const pintar = () => poner(c,
        seccion({}, lista([
          bloque("sueno", "Sueño anoche", stepper({ valor: typeof r.sueno === "number" ? r.sueno : 7.5, min: 0, max: 14, paso: 0.5, formato: horas, sinValor: typeof r.sueno !== "number",
            etiqueta: "horas de sueño", alCambiar: (v) => { const nuevo = typeof r.sueno !== "number"; r.sueno = v; if (nuevo) pintar(); } })),
        ])),
        seccion({ cab: "Estrés", pie: "1 = muy tranquilo · 5 = mucho estrés" }, h("div", { class: "celda-area" }, segmentado(ESCALA, r.estres, (v) => { r.estres = v; }, { etiqueta: "Estrés de 1 a 5" }))),
        seccion({ cab: "Energía", pie: "1 = sin fuerzas · 5 = a tope" }, h("div", { class: "celda-area" }, segmentado(ESCALA, r.energia, (v) => { r.energia = v; }, { etiqueta: "Energía de 1 a 5" }))),
        seccion({}, lista([celda({ titulo: "Borrar lo anotado", estilo: "destructiva", alPulsar: () => { r.sueno = r.estres = r.energia = null; pintar(); } })])));
      pintar();
    },
  });
}

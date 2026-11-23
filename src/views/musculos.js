// Progreso › Series por músculo: series efectivas por semana con recuento fraccional.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio, stepper } from "../ui/controles.js";
import { fmt, plural } from "../core/formato.js";

const n1 = (x) => fmt(x, Number.isInteger(Math.round(x * 100) / 100) ? 0 : x * 10 === Math.round(x * 10) ? 1 : 2);
const REFERENCIA = 10;   // series efectivas semanales por músculo: referencia de las revisiones dosis-respuesta (Schoenfeld 2017), no un objetivo

export function vistaMusculos(_p, app) {
  const { store } = app;
  return {
    titulo: "Series por músculo", tituloAtras: "Músculos",
    render(c) {
      const V = store.analisis().volumenMusculos();
      if (!V.filas.length && !V.sinMusculos.length) { poner(c, vacio({ icono: "pesa", titulo: "Sin series todavía", texto: "Cuando entrenes aparecerán aquí las series de cada músculo por semana." })); return; }
      const tope = Math.max(REFERENCIA * 1.5, ...V.filas.map((f) => Math.max(f.actual, f.previa, f.media4)));
      const barra = (f) => {
        const el = h("span", { class: "barra-obj", "aria-hidden": "true" });
        el.append(h("i", { class: "banda", style: { left: (REFERENCIA / tope * 100) + "%", width: "2px", borderRadius: "0", background: "var(--label-2)" } }),
          h("i", { class: "hechas", style: { width: (f.actual / tope * 100) + "%" } }));
        return el;
      };
      poner(c,
        V.filas.length ? seccion({ cab: "Esta semana", pie: "Principal = 1 serie, secundario = " + n1(V.fraccion) + ". La marca vertical es " + REFERENCIA + " series, la referencia de las revisiones dosis-respuesta para hipertrofia (más series, más ganancia hasta cierto punto); no es un objetivo obligatorio. Solo series de trabajo, sin calentamiento." },
          lista(V.filas.map((f) => celda({ titulo: f.nombre, sub: h("span", { class: "barra-objetivo" }, barra(f), h("span", { class: "num" }, "pasada " + n1(f.previa) + " · media 4 sem. " + n1(f.media4))),
            valor: h("span", { class: "num" }, n1(f.actual)), "aria-label": f.nombre + ": " + n1(f.actual) + " series efectivas esta semana, la pasada " + n1(f.previa) + ", media de 4 semanas " + n1(f.media4) })))) : null,
        seccion({ cab: "Recuento", pie: "Con 1 cuentas solo series directas e indirectas completas; con 0 solo las del músculo principal. El 0,5 es una aproximación con apoyo preliminar (aún sin revisión por pares)." }, lista([
          celda({ titulo: "Peso de un músculo secundario", control: stepper({ valor: V.fraccion, min: 0, max: 1, paso: 0.25, formato: (v) => n1(v), etiqueta: "peso del músculo secundario",
            alCambiar: (v) => store.guardarAjustes((a) => { a.analisis = Object.assign({}, a.analisis, { fraccionSecundaria: v }); }).then(() => this.render(c)) }) }),
        ])),
        V.sinMusculos.length ? seccion({ cab: "Sin músculos asignados", pie: "No cuentan hasta que les asignes músculos en Ajustes › Ejercicios (o añadas los ejercicios comunes)." },
          lista(V.sinMusculos.map((x) => celda({ titulo: x.nombre, valor: plural(x.series, "serie", "series") })))) : null);
    },
  };
}
vistaMusculos.pestana = "progreso";

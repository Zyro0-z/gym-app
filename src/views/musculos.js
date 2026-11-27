// Progreso › Series por músculo: series efectivas por semana con recuento fraccional.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio, stepper } from "../ui/controles.js";
import { fmt, plural } from "../core/formato.js";
import { diagramaCuerpo } from "../ui/cuerpo.js";
import { asignarMusculos } from "../core/musculos.js";

const n1 = (x) => fmt(x, Number.isInteger(Math.round(x * 100) / 100) ? 0 : x * 10 === Math.round(x * 10) ? 1 : 2);
const REFERENCIA = 10;   // series efectivas semanales por músculo: referencia de las revisiones dosis-respuesta (Schoenfeld 2017), no un objetivo

/** Mapa corporal de la semana con una zona por músculo (no por grupo). */
function mapaMusculosSemana(V) {
  return diagramaCuerpo(V.filas.map((f) => ({ nombre: f.nombre, tokens: [f.id + "-*"], valor: Math.round(f.actual * 100) / 100 })),
    { etiqueta: "Series efectivas por músculo esta semana", unidad: (v) => n1(v) + (v === 1 ? " serie" : " series") });
}
export { n1 };

/** Ejercicios del catálogo sin músculos asignados que el catálogo base sí conoce / que no conoce. */
export const sinMusculosCat = (catalogo) => { const r = asignarMusculos(catalogo); return { resolubles: r.cambiados, sin: r.sinCoincidencia }; };

/**
 * Sección «Asignar músculos automáticamente» (o null si no hace falta): rellena desde el catálogo base los ejercicios que no tienen
 * músculos, para que cuenten en el mapa por músculos. Los que el catálogo base no conoce se listan para asignarlos a mano.
 */
export function seccionAsignarMusculos(app, repintar) {
  const { store } = app, { resolubles, sin } = sinMusculosCat(store.estado.catalogo);
  if (!resolubles && !sin.length) return null;
  const celdas = [];
  if (resolubles) celdas.push(celda({ titulo: "Asignar músculos automáticamente", sub: plural(resolubles, "ejercicio", "ejercicios") + " con coincidencia en el catálogo base", estilo: "accion", alPulsar: async () => {
    const r = asignarMusculos(store.estado.catalogo);
    await store.guardarCatalogo(r.catalogo);
    app.toast(plural(r.cambiados, "ejercicio actualizado", "ejercicios actualizados")); repintar();
  } }));
  for (const ej of sin) celdas.push(celda({ titulo: ej.nombre, sub: "No está en el catálogo base: asigna sus músculos a mano", chevron: true, alPulsar: () => app.nav.ir("ejercicioCat/" + encodeURIComponent(ej.id)) }));
  return seccion({ cab: "Músculos por asignar", pie: "Sin músculos, un ejercicio no cuenta en el mapa. Lo que ya editaste no se toca." }, lista(celdas));
}

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
        V.filas.length ? seccion({ cab: "Mapa de la semana" },
          h("div", { class: "tarjeta" }, mapaMusculosSemana(V))) : null,
        V.filas.length ? seccion({ cab: "Esta semana", pie: "La marca vertical (" + REFERENCIA + " series) es una referencia orientativa para hipertrofia, no un objetivo obligatorio." },
          lista(V.filas.map((f) => celda({ titulo: f.nombre, sub: h("span", { class: "barra-objetivo" }, barra(f), h("span", { class: "num" }, "pasada " + n1(f.previa) + " · media 4 sem. " + n1(f.media4))),
            valor: h("span", { class: "num" }, n1(f.actual)), "aria-label": f.nombre + ": " + n1(f.actual) + " series efectivas esta semana, la pasada " + n1(f.previa) + ", media de 4 semanas " + n1(f.media4) })))) : null,
        seccion({ cab: "Recuento", pie: "Con 1, las series cuentan completas en los secundarios; con 0, solo en el principal. El 0,5 es una aproximación." }, lista([
          celda({ titulo: "Peso de un músculo secundario", control: stepper({ valor: V.fraccion, min: 0, max: 1, paso: 0.25, formato: (v) => n1(v), etiqueta: "peso del músculo secundario",
            alCambiar: (v) => store.guardarAjustes((a) => { a.analisis = Object.assign({}, a.analisis, { fraccionSecundaria: v }); }).then(() => this.render(c)) }) }),
        ])),
        seccionAsignarMusculos(app, () => this.render(c)),
        V.sinMusculos.length ? seccion({ cab: "Sin músculos asignados" },
          lista(V.sinMusculos.map((x) => celda({ titulo: x.nombre, valor: plural(x.series, "serie", "series") })))) : null);
    },
  };
}
vistaMusculos.pestana = "progreso";

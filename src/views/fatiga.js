// Progreso › Fatiga: informe semana a semana (≥ 4 semanas) y propuesta de descarga con su regla.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio, chip, stepper, boton } from "../ui/controles.js";
import { graficaLinea, graficaBarras, miniGrafica } from "../ui/graficas.js";
import { fmt, plural } from "../core/formato.js";
import { masDias, ddmm, numDia, deNum } from "../core/fechas.js";
import { informeFatiga, SEMANAS_MIN } from "../core/fatiga.js";
import { propuestaDescarga } from "../core/descarga.js";
import { fechaCorta } from "../ui/textos.js";
import { distribucionRpe, semanasRpe, BANDAS_RPE } from "../core/rpebandas.js";
import { elegirRutina } from "./hoy.js";

const f1 = (x) => fmt(x, Number.isInteger(Math.round(x * 10) / 10) ? 0 : 1);
const pctTxt = (x) => (x > 0 ? "+" : x < 0 ? "−" : "") + fmt(Math.abs(x), 1) + " %";

/** Programa una semana de descarga desde `inicio` (lunes). */
export async function programarDescarga(app, inicio) {
  const fin = masDias(inicio, 6);
  await app.store.guardarAjustes((a) => {
    a.bloques = [...(a.bloques || []), { id: "descarga-" + inicio, inicio, fin, tipo: "deload", grupos: [] }];
    a.descarga = Object.assign({}, a.descarga, { pospuestaHasta: null, descartadaEn: null });
  });
  app.toast("Descarga del " + ddmm(inicio) + " al " + ddmm(fin));
}
export const posponerDescarga = (app, dias = 7) => app.store.guardarAjustes((a) => { a.descarga = Object.assign({}, a.descarga, { pospuestaHasta: masDias(app.store.hoy(), dias) }); }, { analitico: false });
export const descartarDescarga = (app) => app.store.guardarAjustes((a) => { a.descarga = Object.assign({}, a.descarga, { descartadaEn: app.store.hoy() }); }, { analitico: false });

/** Tarjeta de la propuesta (también la usa Hoy). */
export function tarjetaDescarga(app, P, { detalle = true } = {}) {
  return h("div", { class: "tarjeta tarjeta-aviso", role: "region", "aria-label": "Propuesta de descarga" },
    h("div", { class: "t-headline" }, "Te vendría bien una semana de descarga"),
    h("ul", { class: "lista-motivos t-subhead" }, (detalle ? P.motivos : P.motivos.slice(0, 1)).map((m) => h("li", null, m))),
    h("p", { class: "t-subhead c-2" }, plural(P.semanas, "semana", "semanas") + " sin descargar. Propuesta: la semana del " + fechaCorta(P.inicio, app.store.hoy()) + ", con menos series y carga."),
    h("div", { class: "fila", style: { gap: "10px", marginTop: "12px", flexWrap: "wrap" } },
      boton("Programar descarga", () => programarDescarga(app, P.inicio), { peq: true, estilo: "tap" }),
      boton("Ahora no", () => posponerDescarga(app), { peq: true, estilo: "texto tap" }),
      detalle ? boton("Descartar", () => descartarDescarga(app), { peq: true, estilo: "texto tap" }) : boton("Ver por qué", () => app.nav.ir("fatiga", { pestana: "progreso" }), { peq: true, estilo: "texto tap" })));
}

export function vistaFatiga(_p, app) {
  const { store } = app;
  return {
    titulo: "Fatiga",
    render(c) {
      const A = store.analisis(), aj = store.estado.ajustes;
      const I = informeFatiga(A);
      if (!I.suficiente) {
        poner(c, vacio({ icono: "progreso", titulo: "Aún es pronto", texto: "El informe mira las 8 últimas semanas completas y necesita sesiones en al menos " + SEMANAS_MIN + ". " + (I.semanasConDatos ? "Hay " + plural(I.semanasConDatos, "semana", "semanas") + " con sesiones." : "No hay sesiones en ese tiempo."),
          acciones: [{ texto: "Empezar entrenamiento", alPulsar: () => elegirRutina(app) }] }), regla(app, aj));
        return;
      }
      const P = propuestaDescarga(A, aj.descarga);
      const estado = P.proponer ? tarjetaDescarga(app, P)
        : h("div", { class: "tarjeta" }, h("div", { class: "t-headline" }, "Sin propuesta de descarga"),
          h("p", { class: "etiqueta" }, P.motivo === "pronto" ? "Han pasado " + plural(P.semanas, "semana", "semanas") + " desde la última descarga; se valora a partir de " + aj.descarga.semanasMin + "."
            : P.motivo === "pospuesta" ? "La pospusiste hasta el " + fechaCorta(aj.descarga.pospuestaHasta, A.hoy) + "."
            : P.motivo === "descartada" ? "La descartaste el " + fechaCorta(aj.descarga.descartadaEn, A.hoy) + "; se vuelve a valorar a las dos semanas."
            : P.motivo === "en descarga" ? "Estás en una semana de descarga."
            : "No hay señales de fatiga en las dos últimas semanas."));
      const conRm = I.semanas.filter((s) => s.e1rmPct != null);
      const grafica = conRm.length >= 2 ? graficaLinea({ puntos: conRm.map((s) => ({ x: numDia(s.lunes), y: s.e1rmPct, detalle: "Semana del " + ddmm(s.lunes) + " · " + pctTxt(s.e1rmPct) })),
        formato: (v) => fmt(v, 1) + " %", ejeX: (n) => ddmm(deNum(n)), area: false, etiqueta: "Cambio de e1RM por semana" }) : null;
      const filas = [...I.semanas].reverse().map((s) => {
        const sub = [plural(s.series, "serie", "series")];
        if (s.rpe != null) sub.push("RPE " + f1(s.rpe));
        if (s.sueno != null) sub.push(f1(s.sueno) + " h de sueño");
        if (s.energia != null) sub.push("energía " + f1(s.energia));
        if (s.estres != null) sub.push("estrés " + f1(s.estres));
        return celda({ titulo: "Semana del " + ddmm(s.lunes) + (s.descarga ? " · descarga" : ""), sub: s.sesiones ? sub.join(" · ") : "Sin sesiones",
          valor: s.e1rmPct == null ? h("span", { class: "c-2" }, "—") : chip(pctTxt(s.e1rmPct), s.e1rmPct >= 0.5 ? "ok" : s.e1rmPct <= -0.5 ? "bad" : null) });
      });
      poner(c,
        seccion({}, estado),
        grafica ? seccion({ cab: "e1RM semana a semana", pie: "Mediana del cambio del mejor e1RM de cada ejercicio respecto a su semana anterior con datos." }, h("div", { class: "tarjeta" }, grafica)) : null,
        seccion({ cab: "De un vistazo · 8 semanas", pie: "Todas con las mismas 8 semanas, de la más antigua a la más reciente. Un hueco es una semana sin dato." }, h("div", { class: "rejilla-mini" }, multiples(I))),
        seccionRpe(A),
        seccion({ cab: "Semanas", pie: "RPE, sueño, energía y estrés salen de lo que anotas al entrenar (son opcionales). «—»: sin ejercicios que comparar." }, lista(filas)),
        regla(app, aj));
    },
  };
}

function regla(app, aj) {
  const R = aj.descarga;
  const g = (k, v) => app.store.guardarAjustes((a) => { a.descarga = Object.assign({}, a.descarga, { [k]: v }); });
  const f = (v, ud) => f1(v) + ud;
  return seccion({ cab: "Regla de la propuesta", pie: "Se propone si han pasado las semanas mínimas desde la última descarga y aparece alguna señal al comparar las 2 últimas semanas completas con las 2 anteriores (sin contar días de descarga)." }, lista([
    celda({ titulo: "Semanas mínimas", control: stepper({ valor: R.semanasMin, min: 3, max: 16, formato: (v) => String(v), etiqueta: "semanas mínimas", alCambiar: (v) => g("semanasMin", v) }) }),
    celda({ titulo: "Caída de e1RM", control: stepper({ valor: R.caidaPct, min: 1, max: 15, paso: 0.5, formato: (v) => f(v, " %"), etiqueta: "caída de e1RM", alCambiar: (v) => g("caidaPct", v) }) }),
    celda({ titulo: "En cuántos ejercicios", control: stepper({ valor: R.ejercicios, min: 1, max: 10, formato: (v) => String(v), etiqueta: "ejercicios", alCambiar: (v) => g("ejercicios", v) }) }),
    celda({ titulo: "Subida del RPE medio", control: stepper({ valor: R.rpeSube, min: 0.5, max: 3, paso: 0.5, formato: (v) => f(v, ""), etiqueta: "subida del RPE", alCambiar: (v) => g("rpeSube", v) }) }),
    celda({ titulo: "Sueño por debajo de", control: stepper({ valor: R.sueno, min: 4, max: 9, paso: 0.5, formato: (v) => f(v, " h"), etiqueta: "horas de sueño", alCambiar: (v) => g("sueno", v) }) }),
  ]));
}

const f2 = (x) => fmt(x, 1);
/** Miniaturas por métrica con la misma escala horizontal (small multiples). */
function multiples(I) {
  const col = (k) => I.semanas.map((s) => s[k]);
  const nombres = (i) => "semana del " + ddmm(I.semanas[i].lunes);
  const m = (titulo, k, o = {}) => miniGrafica(Object.assign({ titulo, valores: col(k), nombres }, o));
  return [m("Series", "series", { tipo: "barras", formato: (v) => String(Math.round(v)) }), m("Volumen", "volumen", { tipo: "barras", formato: (v) => fmt(Math.round(v / 100) / 10, 1), unidad: " t" }),
    m("e1RM", "e1rmPct", { formato: pctTxt }), m("RPE", "rpe", { formato: f2 }), m("Sueño", "sueno", { formato: f2, unidad: " h" }), m("Estrés", "estres", { formato: f2 }), m("Energía", "energia", { formato: f2 })]
    .filter((x, i) => i < 4 || I.semanas.some((s) => s[["sueno", "estres", "energia"][i - 4]] != null));
}

/** Reparto de las series de trabajo por franjas de RPE: total de 8 semanas y barras semana a semana. */
function seccionRpe(A) {
  const D = distribucionRpe(A, { desde: masDias(A.hoy, -55) });
  if (!D.conRpe) return seccion({ cab: "Intensidad (RPE)", pie: "Anota el RPE de tus series (en el entrenamiento) para ver cómo se reparte el esfuerzo." }, h("div", { class: "tarjeta" }, h("p", { class: "etiqueta" }, "Sin series con RPE en las últimas 8 semanas.")));
  const semanas = semanasRpe(A, 8);
  const datos = semanas.map((s) => ({ etiqueta: ddmm(s.lunes), partes: BANDAS_RPE.map((b) => ({ valor: s.cuentas[b.id], color: b.color })) }));
  return seccion({ cab: "Intensidad (RPE) · 8 semanas", pie: "Cobertura: " + fmt(D.cobertura * 100, 0) + " % de tus series de trabajo tienen RPE (" + D.conRpe + " de " + D.total + "). Con poca cobertura, el reparto no representa tu entrenamiento." },
    h("div", { class: "tarjeta" },
      h("div", { class: "franja", role: "img", "aria-label": "Reparto del RPE: " + D.bandas.filter((b) => b.n).map((b) => b.corto + " " + fmt(b.pct, 0) + " %").join(", ") }, D.bandas.filter((b) => b.n).map((b) => h("i", { style: { width: b.pct + "%", background: b.color } }))),
      h("div", { class: "leyenda" }, D.bandas.map((b) => h("span", null, h("i", { style: { background: b.color } }), b.corto + " · " + fmt(b.pct, 0) + " %"))),
      h("div", { style: { marginTop: "12px" } }, graficaBarras({ datos, formato: (v) => plural(v, "serie", "series"), detalle: (d) => "semana del " + d.etiqueta, etiqueta: "Series por franja de RPE, semana a semana", alto: 150 }))));
}

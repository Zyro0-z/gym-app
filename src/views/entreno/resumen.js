// Resumen al terminar: totales, récords y comparación con la sesión anterior.
import { h, poner, reducirMovimiento } from "../../ui/dom.js";
import { record } from "../../ui/haptica.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda, chip } from "../../ui/controles.js";
import { kg, kgTotal, minutos } from "../../ui/textos.js";
import { fmt, plural } from "../../core/formato.js";
import { epley } from "../../core/sesiones.js";
import { E } from "./estado.js";
import { datosTarjeta } from "../../core/tarjeta.js";
import { compartirTarjeta } from "../../ui/tarjeta.js";
import { derivaEjercicio, UMBRAL_GENERICO_PCT } from "../../core/deriva.js";

export function mejorRM(series) { let m = 0; for (const s of series) if (s.peso > 0 && s.reps > 0) m = Math.max(m, epley(s.peso, s.reps)); return m; }

/** Sube de 0 al valor final en ~600 ms (ease-out); con movimiento reducido pone el valor directamente. */
function contar(el, hasta, formato) {
  if (reducirMovimiento() || !(hasta > 0)) { el.textContent = formato(hasta); return; }
  const t0 = performance.now(), dur = 600;
  const paso = (t) => {
    if (!el.isConnected) return;
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = formato(hasta * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(paso);
  };
  el.textContent = formato(0); requestAnimationFrame(paso);
}

export async function mostrarResumen(ses) {
  const { store } = E.app;
  let prs = [], deriva = [];
  try {
    // Los récords salen del análisis CON esta sesión: se espera al Worker (como mucho 2 s)
    const A = await Promise.race([store.analisisFresco(), new Promise((ok) => setTimeout(() => ok(store.analisis()), 2000))]);
    for (const e of ses.ejercicios) {
      const ej = A.ejercicios.find((x) => x.k === e.ejercicioId || x.nombre === e.nombre);
      if (!ej || !ej.hist.length || ej.hist[ej.hist.length - 1].dia !== ses.fecha) continue;
      const d = derivaEjercicio(ej.hist);
      if (d) deriva.push({ nombre: e.nombre, d });
    }
    prs = A.nuevosPR.filter((p) => (p.rm && p.e.rmMax && p.e.rmMax.ses && p.e.rmMax.ses.id === ses.id) || (p.peso && p.e.pesoMax && p.e.pesoMax.ses && p.e.pesoMax.ses.id === ses.id));
  } catch (e) { prs = []; }
  const anteriorDe = (id) => {
    let mejor = null;
    for (const s of store.estado.sesiones) {
      if (s.id === ses.id || s.fecha > ses.fecha || (s.fecha === ses.fecha && s.id > ses.id)) continue;
      const e = s.ejercicios.find((x) => x.ejercicioId === id);
      if (e && (!mejor || s.fecha > mejor.s.fecha || (s.fecha === mejor.s.fecha && s.id > mejor.s.id))) mejor = { s, e };
    }
    return mejor;
  };
  let series = 0, vol = 0;
  for (const e of ses.ejercicios) for (const s of e.series) { series++; if (s.peso > 0) vol += s.peso * s.reps; }
  const nSeries = h("span"), nVol = vol ? h("span") : null;
  if (prs.length) record();
  E.app.abrirHoja({
    titulo: "", cancelar: null, alturas: ["grande"],
    accion: { texto: "Hecho", alPulsar: () => {} },
    render(c) {
      contar(nSeries, series, (v) => plural(Math.round(v), "serie", "series"));
      if (nVol) contar(nVol, vol, kgTotal);
      poner(c,
        h("div", { class: "seccion resumen-cab" },
          h("div", { class: "fila", style: { gap: "10px" } }, h("span", { class: "c-ok", style: { display: "flex" } }, icono("check", { tam: 30, grosor: 2.6 })), h("div", { class: "t-title1" }, ses.rutina || "Entrenamiento")),
          h("div", { class: "t-subhead c-2 num", style: { marginTop: "4px" } }, ...[ses.duracion ? minutos(ses.duracion) : null, nSeries, nVol].filter(Boolean).flatMap((x, i) => (i ? [" · ", x] : [x])))),
        prs.length ? h("div", { class: "seccion" }, h("div", { class: "tarjeta" },
          h("div", { class: "fila", style: { gap: "8px", marginBottom: "8px" } }, h("span", { class: "c-accent", style: { display: "flex" } }, icono("trofeo", { tam: 22 })),
            h("span", { class: "t-headline" }, prs.length === 1 ? "1 récord nuevo" : prs.length + " récords nuevos")),
          prs.map((p, i) => h("div", { class: "fila entre fila-pr", style: { "--i": Math.min(i, 6) } }, h("span", null, p.e.nombre), h("span", { class: "num c-2" }, p.rm ? "e1RM " + kg(p.rm) : kg(p.peso)))))) : null,
        deriva.length ? seccion({ cab: "Fatiga dentro de la sesión", pie: "Caída del e1RM de la primera a la última serie de trabajo. «Tu umbral» sale de tus propias sesiones del ejercicio (mediana + 1,5 desviaciones); con menos de 4 sesiones previas se usa un umbral genérico del " + UMBRAL_GENERICO_PCT + " %." },
          lista(deriva.map(({ nombre, d }) => celda({ titulo: nombre, sub: d.personal ? "Tu mediana " + fmt(d.personal.mediana, 1) + " % · umbral " + fmt(d.umbral, 1) + " %" : "Umbral genérico " + d.umbral + " %",
            valor: chip((d.caida > 0 ? "−" : "+") + fmt(Math.abs(d.caida), 1) + " %", d.alta ? "warn" : "ok") })))) : null,
        seccion({ cab: "Por ejercicio" }, lista(ses.ejercicios.map((e) => {
          const mejor = e.series.reduce((m, s) => (!m || epley(s.peso, s.reps) > epley(m.peso, m.reps) ? s : m), null);
          const ant = anteriorDe(e.ejercicioId);
          const a = ant ? mejorRM(ant.e.series) : 0, b = mejorRM(e.series);
          const dir = !ant || !a || !b ? null : b > a * 1.005 ? "sube" : b < a * 0.995 ? "baja" : "igual";
          return celda({ titulo: e.nombre, sub: plural(e.series.length, "serie", "series") + (mejor && mejor.peso > 0 ? " · mejor " + fmt(mejor.peso, Number.isInteger(mejor.peso) ? 0 : 1) + " × " + mejor.reps : ""),
            valor: dir ? chip(dir === "sube" ? "Mejor" : dir === "baja" ? "Peor" : "Igual", dir === "sube" ? "ok" : dir === "baja" ? "bad" : null, { icono: dir }) : null });
        }))),
        seccion({ pie: "Una imagen con lo esencial de la sesión para enviar o publicar." }, lista([celda({ icono: "compartir", colorIcono: "var(--g-azul)", titulo: "Compartir tarjeta", estilo: "accion",
          alPulsar: () => compartirTarjeta(E.app, datosTarjeta(ses, prs.map((p) => p.e.nombre))) })], { iconos: true })));
    },
  });
}

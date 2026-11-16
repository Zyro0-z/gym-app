// Resumen al terminar: totales, récords y comparación con la sesión anterior.
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda, chip } from "../../ui/controles.js";
import { kg, kgTotal, minutos } from "../../ui/textos.js";
import { fmt, plural } from "../../core/formato.js";
import { epley } from "../../core/sesiones.js";
import { E } from "./estado.js";

export function mejorRM(series) { let m = 0; for (const s of series) if (s.peso > 0 && s.reps > 0) m = Math.max(m, epley(s.peso, s.reps)); return m; }

export async function mostrarResumen(ses) {
  const { store } = E.app;
  let prs = [];
  try {
    // Los récords salen del análisis CON esta sesión: se espera al Worker (como mucho 2 s)
    const A = await Promise.race([store.analisisFresco(), new Promise((ok) => setTimeout(() => ok(store.analisis()), 2000))]);
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
  E.app.abrirHoja({
    titulo: "", cancelar: null, alturas: ["grande"],
    accion: { texto: "Hecho", alPulsar: () => {} },
    render(c) {
      poner(c,
        h("div", { class: "seccion resumen-cab" },
          h("div", { class: "fila", style: { gap: "10px" } }, h("span", { class: "c-ok", style: { display: "flex" } }, icono("check", { tam: 30, grosor: 2.6 })), h("div", { class: "t-title1" }, ses.rutina || "Entrenamiento")),
          h("div", { class: "t-subhead c-2", style: { marginTop: "4px" } }, [ses.duracion ? minutos(ses.duracion) : null, plural(series, "serie", "series"), vol ? kgTotal(vol) : null].filter(Boolean).join(" · "))),
        prs.length ? h("div", { class: "seccion" }, h("div", { class: "tarjeta" },
          h("div", { class: "fila", style: { gap: "8px", marginBottom: "8px" } }, h("span", { class: "c-accent", style: { display: "flex" } }, icono("trofeo", { tam: 22 })),
            h("span", { class: "t-headline" }, prs.length === 1 ? "1 récord nuevo" : prs.length + " récords nuevos")),
          prs.map((p) => h("div", { class: "fila entre fila-pr" }, h("span", null, p.e.nombre), h("span", { class: "num c-2" }, p.rm ? "e1RM " + kg(p.rm) : kg(p.peso)))))) : null,
        seccion({ cab: "Por ejercicio" }, lista(ses.ejercicios.map((e) => {
          const mejor = e.series.reduce((m, s) => (!m || epley(s.peso, s.reps) > epley(m.peso, m.reps) ? s : m), null);
          const ant = anteriorDe(e.ejercicioId);
          const a = ant ? mejorRM(ant.e.series) : 0, b = mejorRM(e.series);
          const dir = !ant || !a || !b ? null : b > a * 1.005 ? "sube" : b < a * 0.995 ? "baja" : "igual";
          return celda({ titulo: e.nombre, sub: plural(e.series.length, "serie", "series") + (mejor && mejor.peso > 0 ? " · mejor " + fmt(mejor.peso, Number.isInteger(mejor.peso) ? 0 : 1) + " × " + mejor.reps : ""),
            valor: dir ? chip(dir === "sube" ? "Mejor" : dir === "baja" ? "Peor" : "Igual", dir === "sube" ? "ok" : dir === "baja" ? "bad" : null, { icono: dir }) : null });
        }))));
    },
  });
}

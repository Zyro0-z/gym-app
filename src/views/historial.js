// Historial: «¿qué hice?». Mapa de calor del mes y la lista de sesiones por meses.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio } from "../ui/controles.js";
import { mapaCalor } from "../ui/calor.js";
import { capital, mesAnio, DIAS_CORTOS, fechaCorta, kg } from "../ui/textos.js";
import { claveMes, diaSemana, menosMeses } from "../core/fechas.js";
import { plural } from "../core/formato.js";
import { lineaSesion, sesionesOrdenadas, totalesSesion } from "./comun.js";

export function vistaHistorial(_p, app) {
  const { store } = app;
  let mes = null;
  return {
    titulo: "Historial",
    render(c) {
      const est = store.estado, hoy = store.hoy();
      const ses = sesionesOrdenadas(est);
      if (!ses.length) { poner(c, vacio({ icono: "historial", titulo: "Sin entrenamientos", texto: "Aquí aparecerá cada sesión que registres." })); return; }
      if (!mes) mes = claveMes(ses[0].fecha);
      const porDia = new Map();
      for (const s of ses) porDia.set(s.fecha, (porDia.get(s.fecha) || 0) + totalesSesion(s).series);
      const primero = claveMes(ses[ses.length - 1].fecha), ultimo = claveMes(hoy > ses[0].fecha ? hoy : ses[0].fecha);
      const A = store.analisis();
      const nivel = (iso) => { const n = porDia.get(iso) || 0; return n ? (n < 10 ? 1 : n < 18 ? 2 : n < 26 ? 3 : 4) : 0; };
      const enMes = ses.filter((s) => claveMes(s.fecha) === mes).length;
      const calor = h("div", { class: "tarjeta" }, mapaCalor({
        mes, nivel, hoy, deload: (iso) => A.C.bloquesActivos(iso).some((b) => b.esDeload),
        etiquetaDia: (iso, n) => fechaCorta(iso) + (n ? ", entrenado" : ""),
        alPulsar: (iso) => { const s = ses.find((x) => x.fecha === iso); if (s) app.nav.ir("sesion/" + encodeURIComponent(s.id)); },
        alCambiarMes: (d) => { mes = claveMes(menosMeses(mes + "-01", -d)); this.render(c); },
        puedeAntes: mes > primero, puedeDespues: mes < ultimo,
      }), h("div", { class: "etiqueta", style: { marginTop: "12px" } }, plural(enMes, "sesión", "sesiones") + " en " + mesAnio(mes)));
      const grupos = new Map();
      for (const s of ses) { const k = claveMes(s.fecha); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(s); }
      poner(c, h("div", { class: "seccion" }, calor),
        [...grupos].map(([k, lst]) => seccion({ cab: capital(mesAnio(k)) }, lista(lst.map((s) => celda({
          titulo: s.rutina || "Entrenamiento libre", sub: lineaSesion(s), valor: DIAS_CORTOS[diaSemana(s.fecha) - 1] + " " + +s.fecha.slice(8), chevron: true,
          alPulsar: () => app.nav.ir("sesion/" + encodeURIComponent(s.id)),
        }))))));
    },
  };
}

/** Detalle de una sesión. */
export function vistaSesion([id], app) {
  const { store } = app;
  const buscar = () => store.estado.sesiones.find((s) => s.id === id);
  return {
    titulo: () => { const s = buscar(); return s ? s.rutina || "Entrenamiento" : "Sesión"; },
    tituloAtras: "Sesión",
    render(c) {
      const s = buscar();
      if (!s) { poner(c, vacio({ icono: "historial", titulo: "Sesión no encontrada", texto: "Puede que se haya borrado." })); return; }
      const cab = h("div", { class: "seccion" }, h("div", { class: "t-title2" }, capital(fechaCorta(s.fecha, store.hoy())) + (s.inicio ? " · " + s.inicio : "")),
        h("div", { class: "t-subhead c-2", style: { marginTop: "2px" } }, lineaSesion(s)));
      const ejs = s.ejercicios.map((e) => seccion({ cab: e.nombre }, lista(e.series.map((x, i) => celda({
        titulo: "Serie " + (i + 1) + (x.tipo && x.tipo !== "normal" ? " · " + x.tipo : ""),
        valor: x.peso > 0 ? kg(x.peso) + " × " + x.reps : x.reps ? x.reps + " reps" : "—",
      }))), e.nota ? null : null));
      poner(c, cab, ejs);
    },
  };
}
vistaSesion.pestana = "historial";

// Historial: «¿qué hice?». Calendario del mes: el número de cada día lleva el color de su rutina y lleva a la sesión.
import { esRpe, rpeTxt } from "../core/rpe.js";
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio } from "../ui/controles.js";
import { mapaCalor } from "../ui/calor.js";
import { capital, fechaCorta, kg } from "../ui/textos.js";
import { canon } from "../core/nombres.js";
import { claveMes, menosMeses, numDia, finDeMes } from "../core/fechas.js";
import { plural } from "../core/formato.js";
import { lineaSesion, sesionesOrdenadas, totalesSesion, abrirSesionDelDia } from "./comun.js";
import { editarSesion } from "./entreno.js";
import { elegirRutina } from "./hoy.js";
import { datosTarjeta } from "../core/tarjeta.js";
import { compartirTarjeta } from "../ui/tarjeta.js";
import { fmt } from "../core/formato.js";

export function vistaHistorial(_p, app) {
  const { store } = app;
  let mes = null;
  return {
    titulo: "Historial", sobre: "Diario de entrenamientos",
    cabDerecha: () => { const n = store.estado.sesiones.length; return n ? h("span", { class: "pastilla-info solo-info neutra num" }, plural(n, "sesión", "sesiones")) : null; },
    render(c) {
      const est = store.estado, hoy = store.hoy();
      const ses = sesionesOrdenadas(est);
      if (!ses.length) { poner(c, vacio({ icono: "historial", titulo: "Sin entrenamientos", texto: "Aquí aparecerá cada sesión que registres.", acciones: [{ texto: "Empezar", alPulsar: () => elegirRutina(app) }] })); return; }
      if (!mes) mes = claveMes(ses[0].fecha);
      const primero = claveMes(ses[ses.length - 1].fecha), ultimo = claveMes(hoy > ses[0].fecha ? hoy : ses[0].fecha);
      const A = store.analisis();
      const rutinas = est.rutinas.map((r) => canon(r.nombre));
      const ruta = new Map();
      for (const s of ses.slice().reverse()) { if (!ruta.has(s.fecha)) { const i = s.rutina ? rutinas.indexOf(canon(s.rutina)) : -1; ruta.set(s.fecha, i < 0 ? -1 : i % 8); } }
      const delMes = ses.filter((s) => claveMes(s.fecha) === mes), enMes = delMes.length;
      const volMes = delMes.reduce((a, s) => a + totalesSesion(s).vol, 0);
      const finTrans = Math.min(numDia(finDeMes(mes + "-01")), numDia(hoy)) - numDia(mes + "-01") + 1, semanas = Math.max(1, finTrans) / 7;
      const kpi = (et, v) => h("div", { class: "hm-kpi" }, h("span", null, et), h("b", { class: "num" }, v));
      const calor = h("div", { class: "tarjeta tarjeta-calor" }, h("div", { class: "hm-kpis" }, kpi("Sesiones", String(enMes)), kpi("Volumen", volMes ? fmt(volMes / 1000, 1) + " t" : "—"), kpi("Frecuencia", enMes ? fmt(enMes / semanas, 1) + " /sem" : "—")), mapaCalor({
        mes, ruta: (iso) => ruta.get(iso), hoy, deload: (iso) => A.C.bloquesActivos(iso).some((b) => b.esDeload),
        etiquetaDia: (iso, r) => fechaCorta(iso) + (r !== undefined ? ", entrenado" : ""),
        alPulsar: (iso) => abrirSesionDelDia(app, ses.filter((x) => x.fecha === iso), capital(fechaCorta(iso))),
        alCambiarMes: (d) => { mes = claveMes(menosMeses(mes + "-01", -d)); this.render(c); },
        puedeAntes: mes > primero, puedeDespues: mes < ultimo,
      }));
      poner(c, h("div", { class: "seccion" }, calor));
    },
  };
}

/** Detalle de una sesión, con la comparación frente a la anterior de la misma rutina. */
export function vistaSesion([id], app) {
  const { store } = app;
  const buscar = () => store.estado.sesiones.find((s) => s.id === id);
  return {
    titulo: () => { const s = buscar(); return s ? s.rutina || "Entrenamiento" : "Sesión"; },
    tituloAtras: "Sesión",
    derecha: () => (buscar() ? [h("button", { class: "btn-barra", onClick: () => editarSesion(buscar()) }, "Editar")] : null),
    render(c) {
      const s = buscar();
      if (!s) { poner(c, vacio({ icono: "historial", titulo: "Sesión no encontrada", texto: "Puede que se haya borrado." })); return; }
      const hoy = store.hoy();
      const previa = (ejercicioId) => {
        let mejor = null;
        for (const x of store.estado.sesiones) {
          if (x.id === s.id || x.fecha > s.fecha || (x.fecha === s.fecha && x.id > s.id)) continue;
          if (s.rutina && x.rutina !== s.rutina) continue;
          const e = x.ejercicios.find((y) => y.ejercicioId === ejercicioId);
          if (e && (!mejor || x.fecha > mejor.x.fecha || (x.fecha === mejor.x.fecha && x.id > mejor.x.id))) mejor = { x, e };
        }
        return mejor;
      };
      const delta = (st, ant) => {
        if (!ant) return null;
        const dp = Math.round((st.peso - ant.peso) * 10) / 10, dr = st.reps - ant.reps;
        if (dp) return h("span", { class: "delta " + (dp > 0 ? "c-ok" : "c-bad") }, (dp > 0 ? "+" : "−") + fmt(Math.abs(dp), Number.isInteger(dp) ? 0 : 1) + " kg");
        if (dr) return h("span", { class: "delta " + (dr > 0 ? "c-ok" : "c-bad") }, (dr > 0 ? "+" : "−") + Math.abs(dr) + (Math.abs(dr) === 1 ? " rep" : " reps"));
        return null;
      };
      const cab = h("div", { class: "seccion" }, h("div", { class: "t-title2" }, capital(fechaCorta(s.fecha, hoy)) + (s.inicio ? " · " + s.inicio : "")),
        h("div", { class: "t-subhead c-2", style: { marginTop: "2px" } }, lineaSesion(s)));
      const ejs = s.ejercicios.map((e) => {
        const p = previa(e.ejercicioId);
        const ss = e.grupoId ? s.ejercicios.filter((x) => x.grupoId === e.grupoId) : [];
        const enSuperserie = ss.length > 1 ? " · superserie " + (ss.indexOf(e) + 1) + "/" + ss.length : "";
        let n = 0;
        return seccion({ cab: (e.nombre || e.ejercicioId) + enSuperserie, pie: e.nota || (p ? "Comparado con el " + fechaCorta(p.x.fecha, hoy) : null) }, lista(e.series.map((x, i) => {
          if (x.tipo !== "calentamiento") n++;
          const etq = x.tipo === "calentamiento" ? "Calentamiento" : "Serie " + n + (x.tipo === "fallo" ? " · al fallo" : x.tipo === "descendente" ? " · descendente" : "");
          return celda({ titulo: etq, estilo: "compacta", valor: h("span", null, (x.peso > 0 ? kg(x.peso) + " × " + x.reps : x.reps ? x.reps + " reps" : "—") + (esRpe(x.rpe) ? " @" + rpeTxt(x.rpe) : ""), delta(x, p && p.e.series[i])) });
        })));
      });
      const nota = s.nota ? seccion({ cab: "Nota" }, h("div", { class: "celda-area" }, h("div", { class: "ej-nota", style: { margin: 0, padding: "12px 14px", fontSize: "var(--f-body)" } }, s.nota))) : null;
      const compartir = seccion({}, lista([celda({ icono: "compartir", colorIcono: "var(--g-azul)", titulo: "Compartir tarjeta", estilo: "accion", alPulsar: () => compartirTarjeta(app, datosTarjeta(s)) })], { iconos: true }));
      poner(c, cab, nota, ejs, compartir, seccion({}, lista([celda({ titulo: "Borrar sesión", estilo: "destructiva", alPulsar: async () => {
        const ok = await app.confirmar("¿Borrar la sesión?", "Se borrará la sesión del " + fechaCorta(s.fecha, hoy) + ". No se puede deshacer.", "Borrar", true);
        if (!ok) return;
        await store.borrarSesion(s.id);
        app.toast("Sesión borrada", { icono: "papelera" });
        app.nav.atras();
      } })])));
    },
  };
}
vistaSesion.pestana = "historial";

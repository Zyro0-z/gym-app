// Historial: «¿qué hice?». Mapa de calor del mes y la lista de sesiones por meses.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio } from "../ui/controles.js";
import { mapaCalor } from "../ui/calor.js";
import { capital, mesAnio, DIAS_CORTOS, fechaCorta, kg } from "../ui/textos.js";
import { claveMes, diaSemana, menosMeses } from "../core/fechas.js";
import { plural } from "../core/formato.js";
import { lineaSesion, sesionesOrdenadas, totalesSesion } from "./comun.js";
import { editarSesion } from "./entreno.js";
import { elegirRutina } from "./hoy.js";
import { fmt } from "../core/formato.js";

// La lista se pinta por tandas: con cientos de sesiones, pintarlas todas de golpe bloquea la
// interfaz. Se ven las más recientes y «Ver sesiones anteriores» añade la siguiente tanda.
const TANDA = 40;

export function vistaHistorial(_p, app) {
  const { store } = app;
  let mes = null, cuantas = TANDA;
  return {
    titulo: "Historial",
    render(c) {
      const est = store.estado, hoy = store.hoy();
      const ses = sesionesOrdenadas(est);
      if (!ses.length) { poner(c, vacio({ icono: "historial", titulo: "Sin entrenamientos", texto: "Aquí aparecerá cada sesión que registres.", acciones: [{ texto: "Empezar", alPulsar: () => elegirRutina(app) }] })); return; }
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
      for (const s of ses.slice(0, cuantas)) { const k = claveMes(s.fecha); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(s); }
      const quedan = ses.length - cuantas;
      poner(c, h("div", { class: "seccion" }, calor),
        [...grupos].map(([k, lst]) => seccion({ cab: capital(mesAnio(k)) }, lista(lst.map((s) => celda({
          titulo: s.rutina || "Entrenamiento libre", sub: lineaSesion(s), valor: DIAS_CORTOS[diaSemana(s.fecha) - 1] + " " + +s.fecha.slice(8), chevron: true,
          alPulsar: () => app.nav.ir("sesion/" + encodeURIComponent(s.id)),
        }))))),
        quedan > 0 ? h("div", { class: "seccion" }, h("button", { class: "btn gris", onClick: () => { cuantas += TANDA; this.render(c); } },
          h("span", null, "Ver sesiones anteriores (" + quedan + ")"))) : null);
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
        let n = 0;
        return seccion({ cab: e.nombre || e.ejercicioId, pie: e.nota || (p ? "Comparado con el " + fechaCorta(p.x.fecha, hoy) : null) }, lista(e.series.map((x, i) => {
          if (x.tipo !== "calentamiento") n++;
          const etq = x.tipo === "calentamiento" ? "Calentamiento" : "Serie " + n + (x.tipo === "fallo" ? " · al fallo" : x.tipo === "descendente" ? " · descendente" : "");
          return celda({ titulo: etq, valor: h("span", null, x.peso > 0 ? kg(x.peso) + " × " + x.reps : x.reps ? x.reps + " reps" : "—", delta(x, p && p.e.series[i])) });
        })));
      });
      poner(c, cab, ejs, seccion({}, lista([celda({ titulo: "Borrar sesión", estilo: "destructiva", alPulsar: async () => {
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

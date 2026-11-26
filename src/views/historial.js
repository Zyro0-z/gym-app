// Historial: «¿qué hice?». Mapa de calor del mes y la lista de sesiones por meses.
import { gimnasiosDe, nombreGimnasio } from "../core/gimnasios.js";
import { esRpe, rpeTxt } from "../core/rpe.js";
import { resumenRecuperacion } from "./entreno/recuperacion.js";
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio } from "../ui/controles.js";
import { mapaCalor } from "../ui/calor.js";
import { capital, mesAnio, DIAS_CORTOS, fechaCorta, kg, kgTotal } from "../ui/textos.js";
import { icono } from "../ui/iconos.js";
import { canon } from "../core/nombres.js";
import { claveMes, diaSemana, menosMeses, numDia, finDeMes } from "../core/fechas.js";
import { plural } from "../core/formato.js";
import { lineaSesion, sesionesOrdenadas, totalesSesion, abrirSesionDelDia } from "./comun.js";
import { editarSesion } from "./entreno.js";
import { elegirRutina } from "./hoy.js";
import { datosTarjeta } from "../core/tarjeta.js";
import { compartirTarjeta } from "../ui/tarjeta.js";
import { fmt } from "../core/formato.js";

// La lista se pinta por tandas: con cientos de sesiones, pintarlas todas de golpe bloquea la
// interfaz. Se ven las más recientes y «Ver sesiones anteriores» añade la siguiente tanda.
const TANDA = 40;

export function vistaHistorial(_p, app) {
  const { store } = app;
  let mes = null, cuantas = TANDA;
  return {
    titulo: "Historial", sobre: "Diario de entrenamientos",
    cabDerecha: () => { const n = store.estado.sesiones.length; return n ? h("span", { class: "pastilla-liga solo-info neutra num" }, plural(n, "sesión", "sesiones")) : null; },
    render(c) {
      const est = store.estado, hoy = store.hoy();
      const ses = sesionesOrdenadas(est);
      if (!ses.length) { poner(c, vacio({ icono: "historial", titulo: "Sin entrenamientos", texto: "Aquí aparecerá cada sesión que registres.", acciones: [{ texto: "Empezar", alPulsar: () => elegirRutina(app) }] })); return; }
      if (!mes) mes = claveMes(ses[0].fecha);
      const porDia = new Map();
      for (const s of ses) porDia.set(s.fecha, (porDia.get(s.fecha) || 0) + totalesSesion(s).series);
      const primero = claveMes(ses[ses.length - 1].fecha), ultimo = claveMes(hoy > ses[0].fecha ? hoy : ses[0].fecha);
      const A = store.analisis();
      // Cuatro niveles relativos a tus propios días (cuartiles de series), para que una sesión ligera y un pico se distingan
      const vals = [...porDia.values()].sort((a, b) => a - b), cuartil = (q) => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))] || 0;
      const q1 = cuartil(0.25), q2 = cuartil(0.5), q3 = cuartil(0.75);
      const nivel = (iso) => { const n = porDia.get(iso) || 0; return n ? (n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4) : 0; };
      const delMes = ses.filter((s) => claveMes(s.fecha) === mes), enMes = delMes.length;
      const volMes = delMes.reduce((a, s) => a + totalesSesion(s).vol, 0);
      const finTrans = Math.min(numDia(finDeMes(mes + "-01")), numDia(hoy)) - numDia(mes + "-01") + 1, semanas = Math.max(1, finTrans) / 7;
      const kpi = (et, v) => h("div", { class: "hm-kpi" }, h("span", null, et), h("b", { class: "num" }, v));
      const calor = h("div", { class: "tarjeta tarjeta-calor" }, h("div", { class: "hm-kpis" }, kpi("Sesiones", String(enMes)), kpi("Volumen", volMes ? fmt(volMes / 1000, 1) + " t" : "—"), kpi("Frecuencia", enMes ? fmt(enMes / semanas, 1) + " /sem" : "—")), mapaCalor({
        mes, nivel, hoy, deload: (iso) => A.C.bloquesActivos(iso).some((b) => b.esDeload),
        etiquetaDia: (iso, n) => fechaCorta(iso) + (n ? ", entrenado" : ""),
        alPulsar: (iso) => abrirSesionDelDia(app, ses.filter((x) => x.fecha === iso), capital(fechaCorta(iso))),
        alCambiarMes: (d) => { mes = claveMes(menosMeses(mes + "-01", -d)); this.render(c); },
        puedeAntes: mes > primero, puedeDespues: mes < ultimo,
      }));
      const grupos = new Map();
      for (const s of ses.slice(0, cuantas)) { const k = claveMes(s.fecha); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(s); }
      const quedan = ses.length - cuantas;
      poner(c, h("div", { class: "seccion" }, calor),
        [...grupos].map(([k, lst]) => seccion({ cab: capital(mesAnio(k)) }, h("div", { class: "lista lista-sesiones" }, lst.map((s) => filaSesion(s, est, app))))),
        quedan > 0 ? h("div", { class: "seccion" }, h("button", { class: "btn gris", onClick: () => { cuantas += TANDA; this.render(c); } },
          h("span", null, "Ver sesiones anteriores (" + quedan + ")"))) : null);
    },
  };
}

const COLORES_RUTINA = ["--g-azul", "--g-verde", "--g-naranja", "--g-rosa", "--g-morado", "--g-indigo", "--g-cian", "--g-amarillo"];
const colorRutina = (n) => { let x = 0; for (const ch of canon(n || "libre")) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return "var(" + COLORES_RUTINA[x % COLORES_RUTINA.length] + ")"; };

/** Fila de una sesión: barra de color por rutina, título, resumen, RPE medio, gimnasio y fecha. */
function filaSesion(s, est, app) {
  const rpes = s.ejercicios.flatMap((e) => e.series).filter((x) => x.hecha !== false && esRpe(x.rpe)).map((x) => x.rpe);
  const rpeMedio = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const gim = s.gimnasio && gimnasiosDe(est.ajustes).length > 1 ? nombreGimnasio(est.ajustes, s.gimnasio) : null;
  const meta = lineaSesion(s) + (rpeMedio ? " · @" + fmt(rpeMedio, 1) : "");
  const d = diaSemana(s.fecha) - 1;
  return h("button", { class: "fila-sesion", onClick: () => app.nav.ir("sesion/" + encodeURIComponent(s.id)), "aria-label": (s.rutina || "Entrenamiento libre") + ", " + capital(fechaCorta(s.fecha, est.ajustes ? app.store.hoy() : undefined)) + ", " + meta },
    h("i", { class: "barra-rutina", style: { background: colorRutina(s.rutina) } }),
    h("span", { class: "fs-main" }, h("span", { class: "fs-tit" }, h("b", null, s.rutina || "Entrenamiento libre"), gim ? h("em", { class: "fs-gim" }, gim) : null), h("span", { class: "fs-meta num" }, meta)),
    h("span", { class: "fs-fecha" }, h("span", null, DIAS_CORTOS[d]), h("b", { class: "num" }, String(+s.fecha.slice(8)))),
    icono("chevron", { tam: 12, grosor: 2.6 }));
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
        h("div", { class: "t-subhead c-2", style: { marginTop: "2px" } }, lineaSesion(s) + (s.gimnasio && gimnasiosDe(store.estado.ajustes).length > 1 && nombreGimnasio(store.estado.ajustes, s.gimnasio) ? " · " + nombreGimnasio(store.estado.ajustes, s.gimnasio) : "")));
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
      const rec = resumenRecuperacion(s.recuperacion);
      const nota = s.nota ? seccion({ cab: "Nota" }, h("div", { class: "celda-area" }, h("div", { class: "ej-nota", style: { margin: 0, padding: "12px 14px", fontSize: "var(--f-body)" } }, s.nota))) : null;
      const compartir = seccion({}, lista([celda({ icono: "compartir", colorIcono: "var(--g-azul)", titulo: "Compartir tarjeta", estilo: "accion", alPulsar: () => compartirTarjeta(app, datosTarjeta(s)) })], { iconos: true }));
      poner(c, cab, rec ? h("p", { class: "seccion t-subhead c-2", style: { marginTop: "-8px" } }, capital(rec)) : null, nota, ejs, compartir, seccion({}, lista([celda({ titulo: "Borrar sesión", estilo: "destructiva", alPulsar: async () => {
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

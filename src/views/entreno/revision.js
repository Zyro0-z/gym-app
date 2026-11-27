// Terminar (revisión), descartar, convertir a sesión y guardar una edición.
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda, interruptor } from "../../ui/controles.js";
import { exito } from "../../ui/haptica.js";
import { minutos } from "../../ui/textos.js";
import { leerNumero, plural } from "../../core/formato.js";
import { idSesion } from "../../data/modelo.js";
import { hhmm, fechaLocal, nombreDe, contarHechas } from "./estado.js";
import { cerrarModal, guardarYa } from "./pantalla.js";
import { mostrarResumen } from "./resumen.js";
import { E } from "./estado.js";
import { esRpe } from "../../core/rpe.js";
import { posicionSuperserie } from "./herramientas.js";
import { diffRutina } from "../../core/rutinas.js";

export async function descartar() {
  const ok = await E.app.confirmar("¿Descartar el entrenamiento?", "Se perderán las series de esta sesión.", "Descartar", true);
  if (!ok) return;
  await E.app.store.guardarBorrador(null);
  cerrarModal();
}

/** Convierte el borrador o la edición en una sesión del modelo. */
export function aSesion(d, { id, fecha, inicio, fin, conSinMarcar = false }) {
  const minutosDe = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  let duracion = null;
  if (inicio && fin) { duracion = minutosDe(fin) - minutosDe(inicio); if (duracion < 0) duracion += 1440; }
  const ejercicios = d.ejercicios.map((e, i) => {
    const series = e.series.filter((s) => s.hecha || (conSinMarcar && leerNumero(s.reps) > 0)).map((s) => {
      const out = { peso: s.peso === "" ? 0 : leerNumero(s.peso) || 0, reps: leerNumero(s.reps) || 0, tipo: s.tipo || "normal", hecha: true };
      if (s.segundos != null) out.segundos = s.segundos;
      if (esRpe(s.rpe)) out.rpe = s.rpe;
      return out;
    });
    const x = { ejercicioId: e.ejercicioId, nombre: e.nombre || nombreDe(e.ejercicioId), tipo: e.tipo || "peso", series };
    if (e.nota) x.nota = e.nota;
    if (e.grupoId && posicionSuperserie(d.ejercicios, i)) x.grupoId = e.grupoId;
    return x;
  }).filter((e) => e.series.length);
  // Una superserie que se queda con un solo ejercicio (los demás sin series) deja de serlo
  for (let i = 0; i < ejercicios.length; i++) if (ejercicios[i].grupoId && !posicionSuperserie(ejercicios, i)) delete ejercicios[i].grupoId;
  const ses = { id, rutina: d.rutina || null, fecha, inicio: inicio || null, fin: fin || null, duracion, ejercicios };
  if (d.nota && d.nota.trim()) ses.nota = d.nota.trim();
  return ses;
}

export async function terminar() {
  const d = E.M.d;
  guardarYa();
  if (!contarHechas(d)) {
    const r = await E.app.alerta({ titulo: "No hay series hechas", mensaje: "Marca al menos una serie para guardar el entrenamiento.",
      botones: [{ texto: "Descartar entrenamiento", valor: "d", estilo: "peligro" }, { texto: "Seguir entrenando", valor: null, estilo: "fuerte" }] });
    if (r === "d") { await E.app.store.guardarBorrador(null); cerrarModal(); }
    return;
  }
  const ahora = Date.now();
  const r = { fecha: d.fecha || fechaLocal(d.inicio), inicio: hhmm(d.inicio), fin: hhmm(ahora), conSinMarcar: false };
  const sinMarcar = d.ejercicios.reduce((a, e) => a + e.series.filter((s) => !s.hecha && leerNumero(s.reps) > 0).length, 0);
  const durTxt = () => { const s = aSesion(d, Object.assign({ id: "x" }, r)); return s.duracion != null ? minutos(s.duracion) : "—"; };
  let durEl = null;
  const rutinaBase = d.rutina ? E.app.store.estado.rutinas.find((x) => x.nombre === d.rutina) : null;
  const cambioRutina = E.M.modo === "entreno" ? diffRutina(rutinaBase, d.ejercicios.map((e) => ({ ejercicioId: e.ejercicioId, series: e.series })), nombreDe) : null;
  let actualizarRutina = false;
  E.app.abrirHoja({
    titulo: "Terminar", cancelar: "Seguir", alturas: ["grande"],
    accion: { texto: "Guardar", alPulsar: async () => {
      const ses = aSesion(d, Object.assign({ id: idSesion(r.fecha, d.inicio) }, r));
      await E.app.store.guardarSesion(ses);
      if (actualizarRutina && cambioRutina && rutinaBase)
        await E.app.store.guardarRutinas(E.app.store.estado.rutinas.map((x) => (x.id === rutinaBase.id ? Object.assign({}, x, { ejercicios: cambioRutina.ejercicios }) : x)));
          await E.app.store.guardarBorrador(null);
      cerrarModal(true);
      exito();
      mostrarResumen(ses);
    } },
    render(c) {
      const campo = (tipo, k, etiqueta) => h("input", { type: tipo, class: "campo-fila", value: r[k], "aria-label": etiqueta, onChange: (e) => { if (e.target.value) r[k] = e.target.value; if (durEl) durEl.textContent = durTxt(); } });
      durEl = h("span", { class: "num" }, durTxt());
      poner(c,
        h("div", { class: "seccion" }, h("div", { class: "t-title2" }, d.rutina || "Entrenamiento"), h("div", { class: "t-subhead c-2" }, plural(contarHechas(d), "serie hecha", "series hechas"))),
        seccion({}, lista([
          celda({ titulo: "Fecha", control: campo("date", "fecha", "Fecha") }),
          celda({ titulo: "Inicio", control: campo("time", "inicio", "Hora de inicio") }),
          celda({ titulo: "Fin", control: campo("time", "fin", "Hora de fin") }),
          celda({ titulo: "Duración", valor: durEl }),
        ])),
        seccion({ cab: "Ejercicios" }, lista(d.ejercicios.map((e) => {
          const n = e.series.filter((s) => s.hecha).length;
          return celda({ titulo: e.nombre, valor: n + " de " + e.series.length });
        }))),
        seccion({ cab: "Nota de la sesión" }, h("div", { class: "celda-area" }, notaSesion(d))),
        cambioRutina ? seccion({ cab: "Rutina «" + rutinaBase.nombre + "»", pie: cambioRutina.cambios.join(" · ") }, lista([
          celda({ titulo: "Actualizar la rutina con estos cambios", control: interruptor(false, (v) => { actualizarRutina = v; }, "Actualizar la rutina con estos cambios") })])) : null,
        sinMarcar ? seccion({ pie: plural(sinMarcar, "serie sin marcar", "series sin marcar") + " con repeticiones: por defecto no se guardan." }, lista([
          celda({ titulo: "Guardar también las sin marcar", control: interruptor(false, (v) => { r.conSinMarcar = v; }, "Guardar también las series sin marcar") })])) : null);
    },
  });
}

/** Campo de texto para la nota de la sesión entera (se guarda en el borrador al escribir). */
export function notaSesion(d) {
  const ta = h("textarea", { class: "area-nota", rows: 3, placeholder: "Cómo fue, molestias, cambios…", "aria-label": "Nota de la sesión",
    onInput: (e) => { d.nota = e.target.value; if (E.M && E.M.modo === "entreno") guardarYa(); } });
  ta.value = d.nota || "";
  return ta;
}

export async function cancelarEdicion() {
  if (JSON.stringify(E.M.d) !== E.M.inicial) {
    const r = await E.app.hojaAcciones({ opciones: [{ texto: "Descartar cambios", valor: "s", peligro: true }] });
    if (r !== "s") return;
  }
  cerrarModal();
}

export async function guardarEdicion() {
  const d = E.M.d;
  const ses = aSesion(d, { id: E.M.id, fecha: d.fecha, inicio: d.inicioTxt || null, fin: d.finTxt || null, conSinMarcar: false });
  if (!d.inicioTxt || !d.finTxt) ses.duracion = E.M.original.duracion ?? null;
  if (E.M.original.origen) ses.origen = E.M.original.origen;
  if (!ses.ejercicios.length) {
    const ok = await E.app.confirmar("La sesión se queda vacía", "Sin series no se puede guardar. ¿Borrar la sesión?", "Borrar sesión", true);
    if (!ok) return;
    await E.app.store.borrarSesion(E.M.id);
    cerrarModal(); E.app.toast("Sesión borrada", { icono: "papelera" });
    if (E.app.nav.pantalla && E.app.nav.pantalla.nombre === "sesion") E.app.nav.atras();
    return;
  }
  await E.app.store.guardarSesion(ses);
  cerrarModal();
  E.app.toast("Cambios guardados");
}

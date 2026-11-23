// Sesiones: qué series cuentan, volumen, 1RM estimado y fiabilidad de la duración.
import { canon } from "./nombres.js";
import { minutosDelDia } from "./fechas.js";
import { fmt } from "./formato.js";
import { MAX_DURACION_MIN, MAX_MIN_POR_SERIE, TOLERANCIA_MIN, REPS_UMBRAL_FIABILIDAD_1RM } from "./constantes.js";

/** 1RM estimado (Epley; con 1 repetición, el propio peso). */
export const epley = (w, r) => (w <= 0 || r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30));
export const pocoFiable = (reps) => Number(reps) > REPS_UMBRAL_FIABILIDAD_1RM;

const CUENTA = { normal: true, fallo: true };
const TIPO_EJ = { peso: "weight", reps: "reps", duracion: "duration", temporizador: "timer" };

function umbralesDe(C, rutina) {
  const u = rutina ? C.umbrales.get(canon(rutina)) : null;
  return { plantilla: u ? u.plantilla : null,
    maxDur: u && u.maxDur != null ? u.maxDur : MAX_DURACION_MIN, maxSerie: u && u.maxSerie != null ? u.maxSerie : MAX_MIN_POR_SERIE,
    durPropio: !!(u && u.maxDur != null), seriePropio: !!(u && u.maxSerie != null) };
}

/** ¿Es fiable la duración? Cota superior, coherencia con inicio→fin y minutos por serie. */
export function evaluarDuracion(C, s, seriesContadas) {
  const u = umbralesDe(C, s.rutina);
  const deQuien = (propio) => (propio ? " de la rutina «" + u.plantilla + "»" : "");
  const d = s.duracion == null ? NaN : Number(s.duracion);
  const ini = minutosDelDia(s.inicio), fin = minutosDelDia(s.fin);
  let rango = null;
  if (ini != null && fin != null) { rango = fin - ini; if (rango < 0) rango += 1440; }
  if (!Number.isFinite(d) || d <= 0) return { min: null, fiable: false, motivo: "sin duración", codigo: "sinDato" };
  if (d > u.maxDur) return { min: d, fiable: false, codigo: "irreal",
    motivo: "irreal: " + fmt(d) + " min supera el umbral" + deQuien(u.durPropio) + " de " + fmt(u.maxDur) + " min" };
  if (rango != null && Math.abs(d - rango) > TOLERANCIA_MIN) return { min: d, fiable: false, codigo: "inconsistente",
    motivo: "inconsistente: la duración dice " + fmt(d) + " min pero inicio→fin son " + fmt(rango) + " min" };
  if (seriesContadas > 0 && d / seriesContadas > u.maxSerie) return { min: d, fiable: false, codigo: "sospechosa",
    motivo: "sospechosa: " + fmt(d / seriesContadas, 1) + " min por serie (máx " + fmt(u.maxSerie, Number.isInteger(u.maxSerie) ? 0 : 1) + deQuien(u.seriePropio) + ")" };
  return { min: d, fiable: true, motivo: null, codigo: null };
}

/** Sesiones normalizadas, de la más reciente a la más antigua. */
export function leerSesiones(C) {
  const orden = (C.modelo.sesiones || []).slice().sort((a, b) =>
    (b.fecha ? Date.parse(b.fecha) : 0) - (a.fecha ? Date.parse(a.fecha) : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return orden.map((s) => {
    let series = 0, volumen = 0, descartadas = 0, sinPeso = 0;
    const ejercicios = (s.ejercicios || []).map((ex) => {
      const k = ex.ejercicioId;
      const cat = C.catalogo.get(k);
      const nombre = ex.nombre || (cat ? cat.nombre : k);
      const tipoEj = TIPO_EJ[ex.tipo || (cat && cat.tipoAncla) || "peso"] || ex.tipo;
      const unilateral = C.unilateral(canon(nombre));
      const lados = unilateral ? 2 : 1;
      // Peso corporal: con «lastre» la carga del sistema es el peso corporal + el lastre; con «asistido», el peso corporal − la ayuda.
      // Sin ningún pesaje conocido no hay carga calculable y la serie cuenta solo como serie (sin 1RM ni volumen).
      const modo = (cat && cat.modoCarga) || "total";
      const bw = modo === "total" ? null : (C.pesoEn(s.fecha) || (C.peso.registros || [])[0] || null);
      const cargaDe = (peso) => (modo === "lastre" ? (bw ? bw.kg + peso : 0) : modo === "asistido" ? (bw ? Math.max(0, bw.kg - peso) : 0) : peso);
      const sets = [];
      for (const st of ex.series || []) {
        if (st.hecha === false) continue;
        const tipo = st.tipo || "normal";
        const segundos = Number(st.segundos) || 0, pesoAnotado = Number(st.peso) || 0, reps = Number(st.reps) || 0;
        const peso = cargaDe(pesoAnotado);
        const paraSeries = !!CUENTA[tipo] && (tipoEj === "duration" ? segundos > 0 : reps > 0);
        const paraPR = paraSeries && tipoEj !== "duration" && peso > 0 && reps > 0;
        sets.push({ peso, reps, segundos, tipo, tipoEj, paraSeries, paraPR, unilateral, ...(modo === "total" ? {} : { modoCarga: modo, anotado: pesoAnotado }),
          volumen: paraPR ? peso * reps * lados : 0, oneRM: paraPR ? epley(peso, reps) : 0,
          ...(typeof st.rpe === "number" && st.rpe >= 5 && st.rpe <= 10 ? { rpe: st.rpe } : {}) });
        if (paraSeries) { series += 1; volumen += paraPR ? peso * reps * lados : 0; if (!paraPR) sinPeso += 1; }
        else descartadas += 1;
      }
      return { nombre: String(nombre).trim(), k: canon(nombre), tipoEj, unilateral, sets };
    });
    return { id: s.id, dia: s.fecha || null, rutina: s.rutina || null, plantilla: s.rutina ? String(s.rutina) : "—",
      ejercicios, series, volumen, descartadas, sinPeso, dur: evaluarDuracion(C, s, series), ref: s };
  });
}

/** Todas las series realizadas (también sin peso: cuentan para su grupo). */
export function todasLasSeries(C, SESIONES) {
  const out = [];
  for (const s of SESIONES) for (const ex of s.ejercicios) for (const st of ex.sets)
    if (st.paraSeries) out.push({ st, ejercicio: ex.nombre, k: ex.k, grupo: C.grupoDe(ex.nombre), dia: s.dia, ses: s });
  return out;
}

/** Agregado por ejercicio: series, volumen, PRs e historial de mejor 1RM por sesión. */
export function porEjercicio(C, TODAS) {
  const porEj = new Map();
  for (const x of TODAS) {
    let e = porEj.get(x.k);
    if (!e) {
      const cat = C.catalogo.get(x.k);
      e = { k: x.k, nombre: cat ? cat.nombre : x.ejercicio, grupo: x.grupo, ser: 0, serSinPeso: 0, vol: 0, unilateral: C.unilateral(x.k),
            pesoMax: null, rmMax: null, sesiones: new Map() };
      porEj.set(x.k, e);
    }
    e.ser += 1;
    e.vol += x.st.volumen;
    if (!x.st.paraPR) { e.serSinPeso += 1; continue; }
    if (!e.pesoMax || x.st.peso > e.pesoMax.st.peso || (x.st.peso === e.pesoMax.st.peso && x.st.reps > e.pesoMax.st.reps)) e.pesoMax = x;
    if (!e.rmMax || x.st.oneRM > e.rmMax.st.oneRM) e.rmMax = x;
    if (x.dia) {
      const s = e.sesiones.get(x.dia) || { dia: x.dia, mejorRM: 0, mejorRMReps: 0, vol: 0, ser: 0, series: [] };
      if (x.st.oneRM > s.mejorRM) { s.mejorRM = x.st.oneRM; s.mejorRMReps = x.st.reps; }
      s.vol += x.st.volumen; s.ser += 1;
      s.series.push(x.st);
      e.sesiones.set(x.dia, s);
    }
  }
  const lista = Array.from(porEj.values());
  for (const e of lista) e.hist = Array.from(e.sesiones.values()).sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0));
  return lista;
}

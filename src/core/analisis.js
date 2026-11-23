// Punto de entrada del análisis: modelo + fecha de hoy → todo lo que enseñan las pantallas.
import { crearContexto } from "./contexto.js";
import { leerSesiones, todasLasSeries, porEjercicio } from "./sesiones.js";
import { diagnosticar } from "./estancamiento.js";
import { evaluarProgresion, incrementoDe, proximaVez, avisosProgresion } from "./progresion.js";
import { calcularLigas } from "./ligas.js";
import { analizarPeso, resumenPeso } from "./peso.js";
import { ultimasSemanas, resumenSemana, racha, hoyToca, seriesObjetivo, grupoSemana, volumenPorGrupo, balance } from "./semanal.js";
import { calidad } from "./calidad.js";
import { volumenMusculos } from "./volumen.js";

/**
 * @param {object} modelo {sesiones, catalogo, rutinas, pesajes, ajustes}
 * @param {string} hoy    fecha ISO «AAAA-MM-DD» (local)
 */
export function analizar(modelo, hoy) {
  const C = crearContexto(modelo, hoy);
  const SESIONES = leerSesiones(C);
  const TODAS = todasLasSeries(C, SESIONES);
  const EJERCICIOS = porEjercicio(C, TODAS);
  const diagnostico = new Map(EJERCICIOS.map((e) => [e.k, diagnosticar(C, e)]));
  const progresion = new Map();
  for (const [k, obj] of C.objetivos) progresion.set(k, evaluarProgresion(C, SESIONES, k, obj));
  const progresionDe = (k) => { const p = progresion.get(k); return p && !p.sinDatos ? p : null; };
  const LIGA = calcularLigas(C, SESIONES, TODAS);
  const pesoA = analizarPeso(C);
  const semanas = ultimasSemanas(C, SESIONES);
  const ultima = SESIONES[0] || null;
  const nuevosPR = [];
  if (ultima && ultima.dia)
    for (const e of EJERCICIOS) {
      if (!e.rmMax || !e.rmMax.dia) continue;
      const esRM = e.rmMax.dia === ultima.dia;
      const esPeso = e.pesoMax && e.pesoMax.dia === ultima.dia;
      if (esRM || esPeso) nuevosPR.push({ e, peso: esPeso ? e.pesoMax.st.peso : null, rm: esRM ? e.rmMax.st.oneRM : null, reps: e.rmMax.st.reps });
    }
  return {
    hoy, C, sesiones: SESIONES, series: TODAS, ejercicios: EJERCICIOS, diagnostico, progresion, progresionDe,
    incrementoDe: (p) => incrementoDe(C, SESIONES, p), proximaVez: (p) => proximaVez(C, SESIONES, p), avisosProgresion,
    liga: LIGA, peso: pesoA, resumenPeso: resumenPeso(C, pesoA), semanas, resumen: resumenSemana(C, SESIONES),
    racha: racha(C, SESIONES), hoyToca: hoyToca(C, SESIONES, progresionDe), seriesObjetivo: seriesObjetivo(C, SESIONES, TODAS),
    grupoSemana: grupoSemana(C, TODAS), volumenPorGrupo: volumenPorGrupo(TODAS, semanas),
    volumenMusculos: (o) => volumenMusculos(C, TODAS, o),
    balance: (periodo) => balance(C, TODAS, periodo), nuevosPR, calidad: calidad(C, SESIONES, TODAS, LIGA),
  };
}

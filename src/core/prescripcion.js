// Prescripción y lectura del esfuerzo: carga para un RPE objetivo, back-offs, confianza y ruido del
// e1RM, récords por rango de repeticiones y ajuste de la progresión según el RPE real. Puro.
//
// Base: RIR = 10 − RPE (escala de Zourdos y cols., 2016). Una serie de `reps` a RPE r equivale a
// una serie al fallo de reps + RIR, y de ahí sale el e1RM (Epley) y su inversa. La precisión de
// lo que se reporta como RIR es mejor cerca del fallo, con cargas altas y en las últimas series, y
// peor con más repeticiones (Halperin y cols., 2022; Russo y cols., 2025): por eso la confianza baja
// con muchas repeticiones o con RPE lejos del fallo.
import { epley } from "./sesiones.js";
import { e1rmAjustado, esRpe, rir } from "./rpe.js";

const red = (x, d = 2) => { const f = 10 ** d; return Math.round(x * f) / f; };
const redondear = (kg, paso) => (paso > 0 ? red(Math.round(kg / paso) * paso) : red(kg));

/** Peso para `reps` repeticiones al fallo con un 1RM dado (inversa de Epley). */
export const pesoParaFallo = (e1rm, repsAlFallo) => (!(e1rm > 0) || !(repsAlFallo > 0) ? 0 : repsAlFallo <= 1 ? e1rm : e1rm / (1 + repsAlFallo / 30));

/** Carga para hacer `reps` repeticiones a `rpe` con un e1RM dado, redondeada al paso (la más cercana). */
export function cargaParaRpe(e1rm, reps, rpe, paso = 2.5) {
  if (!esRpe(rpe) || !(reps > 0)) return 0;
  return redondear(pesoParaFallo(e1rm, reps + rir(rpe)), paso);
}

/**
 * Autorregulación tras la primera serie de trabajo: si el e1RM de hoy (con su RPE) se aleja ≥ `umbral` del habitual,
 * propone el peso que da `reps` al RPE objetivo. Con menos desvío es ruido de un día normal y devuelve null.
 * @returns {{ e1rm:number, desv:number, peso:number, reps:number } | null}
 */
export function autorregulacion(serie, e1Previo, rpeObj, paso = 2.5, umbral = 0.05) {
  if (!serie || !(serie.peso > 0) || !(serie.reps > 0) || !esRpe(serie.rpe) || !(e1Previo > 0) || !esRpe(rpeObj)) return null;
  const e1 = e1rmAjustado(serie.peso, serie.reps, serie.rpe), desv = (e1 - e1Previo) / e1Previo;
  if (Math.abs(desv) < umbral) return null;
  const peso = cargaParaRpe(e1, serie.reps, rpeObj, paso);
  return peso > 0 ? { e1rm: red(e1, 1), desv, peso, reps: serie.reps } : null;
}

/**
 * Back-offs a partir de la serie top. El e1RM sale de la propia serie; sin RPE se asume esfuerzo
 * máximo (RPE 10), lo que da cargas algo más ligeras (lado seguro). Por defecto los back-offs
 * van 1 punto de RPE por debajo de la top, con un máximo de RPE 9 (top a 10 → back-offs a 9).
 * @returns {{peso:number, reps:number, rpe:number}[]}
 */
export function backoffs(top, { n = 2, rpe = Math.min(9, (esRpe(top.rpe) ? top.rpe : 10) - 1), reps = top.reps, paso = 2.5 } = {}) {
  const e1 = e1rmAjustado(top.peso, top.reps, esRpe(top.rpe) ? top.rpe : 10);
  const peso = cargaParaRpe(e1, reps, rpe, paso);
  if (!(peso > 0)) return [];
  const tope = Math.min(peso, top.peso);
  return Array.from({ length: n }, () => ({ peso: tope, reps, rpe }));
}

/** Confianza del e1RM de una serie: «alta», «media» o «baja» (heurística documentada arriba). */
export function confianzaSerie({ reps, rpe }) {
  const conRpe = esRpe(rpe);
  if (!(reps > 0)) return "baja";
  if (reps > 10 || (conRpe && rpe < 7.5)) return "baja";
  if (reps <= 6 && conRpe && rpe >= 8.5) return "alta";
  return "media";
}

/**
 * Ruido personal del e1RM: desviación típica de los residuos respecto a la tendencia lineal de las
 * últimas sesiones. Una mejora menor que esto no se distingue de la variación normal.
 * @param {{mejorRM:number}[]} hist sesiones del ejercicio, de la más antigua a la más reciente
 * @returns {{n:number, sd:number, pct:number}|null} null con menos de 5 sesiones
 */
export function ruidoE1rm(hist, ventana = 8) {
  const ys = hist.map((x) => x.mejorRM).filter((v) => v > 0).slice(-ventana);
  const n = ys.length;
  if (n < 5) return null;
  const mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  ys.forEach((y, i) => { sxy += (i - mx) * (y - my); sxx += (i - mx) ** 2; });
  const b = sxy / sxx, a = my - b * mx;
  const ss = ys.reduce((t, y, i) => t + (y - (a + b * i)) ** 2, 0);
  const sd = Math.sqrt(ss / (n - 2));
  return { n, sd: red(sd), pct: red((sd / my) * 100, 1) };
}

/** e1RM de la última sesión del ejercicio (mejor serie, ajustado por RPE si lo hay). */
export function e1rmReciente(e) {
  const h = e && e.hist && e.hist[e.hist.length - 1];
  if (!h) return null;
  let mejor = null;
  for (const st of h.series) {
    const v = e1rmAjustado(st.peso, st.reps, st.rpe);
    if (!mejor || v > mejor.e1rm) mejor = { e1rm: v, reps: st.reps, rpe: st.rpe ?? null };
  }
  return mejor ? { dia: h.dia, e1rm: red(mejor.e1rm, 1), reps: mejor.reps, rpe: mejor.rpe, confianza: confianzaSerie(mejor) } : null;
}

export const RANGOS_REPS = [{ id: "1", txt: "1", min: 1, max: 1 }, { id: "2-3", txt: "2–3", min: 2, max: 3 }, { id: "4-5", txt: "4–5", min: 4, max: 5 },
  { id: "6-8", txt: "6–8", min: 6, max: 8 }, { id: "9-12", txt: "9–12", min: 9, max: 12 }, { id: "13+", txt: "13+", min: 13, max: Infinity }];
export const rangoDe = (reps) => RANGOS_REPS.find((r) => reps >= r.min && reps <= r.max) || null;

/** Mejor serie de cada rango de repeticiones: [{rango, peso, reps, dia}] (solo los rangos con datos). */
export function prPorRango(e) {
  const mejor = new Map();
  for (const h of e.hist || []) for (const st of h.series) {
    const r = rangoDe(st.reps);
    if (!r || !(st.peso > 0)) continue;
    const a = mejor.get(r.id);
    if (!a || st.peso > a.peso || (st.peso === a.peso && st.reps > a.reps)) mejor.set(r.id, { rango: r, peso: st.peso, reps: st.reps, dia: h.dia });
  }
  return RANGOS_REPS.filter((r) => mejor.has(r.id)).map((r) => mejor.get(r.id));
}

/**
 * ¿Esta serie supera un récord anterior? `rango`: más peso (o las mismas con más reps) que el mejor de su rango;
 * `e1rm`: más e1RM que el máximo histórico. Si el rango no tenía registro, no se marca (no hay con qué comparar).
 */
export function superaRecord(e, peso, reps) {
  if (!(peso > 0) || !(reps > 0)) return null;
  const r = rangoDe(reps), prev = prPorRango(e).find((x) => r && x.rango.id === r.id);
  const nuevoRM = epley(peso, reps), maxRM = e.rmMax ? e.rmMax.st.oneRM : 0;
  const enRango = !!prev && (peso > prev.peso || (peso === prev.peso && reps > prev.reps));
  const enE1rm = maxRM > 0 && nuevoRM > maxRM + 1e-9;
  if (!enRango && !enE1rm) return null;
  return { tipo: enE1rm ? "e1rm" : "rango", rango: r, previo: prev || null, e1rm: red(nuevoRM, 1), e1rmPrevio: red(maxRM, 1) };
}

/**
 * Ajusta la sugerencia de la doble progresión según el RPE real de la última sesión.
 *  · «sube» con RPE medio ≥ 9,5: se consolida (mismo peso, tope del rango) antes de subir.
 *  · «mantén» con el RPE medio claramente por debajo del objetivo: se avisa de que sobraba.
 * Sin RPE anotado devuelve la sugerencia tal cual.
 */
export function ajustarPorRpe(sug, p, rpeObj = null) {
  if (!sug || !p || !p.work) return sug;
  const rs = p.work.map((s) => s.rpe).filter((v) => typeof v === "number");
  if (!rs.length) return sug;
  const media = red(rs.reduce((a, b) => a + b, 0) / rs.length, 1);
  const txt = String(media).replace(".", ",");
  if (p.clave === "sube" && media >= 9.5) return { peso: p.pesoMax, reps: p.obj.max, motivo: "Tope del rango, pero con RPE medio " + txt + ": consolida antes de subir", consolida: true };
  if (p.clave === "mantén" && esRpe(rpeObj) && media <= rpeObj - 1.5) return Object.assign({}, sug, { motivo: sug.motivo + " · RPE medio " + txt + ", te sobraba", holgura: true });
  return sug;
}

/**
 * Franja de ruido personal para la gráfica del e1RM: media móvil de las `ventana` últimas sesiones ± `sd`
 * (el ruido de ruidoE1rm). Un punto dentro de la franja no se distingue de la variación normal.
 * @returns {{dia:string, lo:number, hi:number}[]}  una por sesión con e1RM
 */
export function bandaRuido(hist, sd, ventana = 5) {
  const h = hist.filter((x) => x.mejorRM > 0);
  return h.map((x, i) => {
    const w = h.slice(Math.max(0, i - ventana + 1), i + 1).map((y) => y.mejorRM), m = w.reduce((a, b) => a + b, 0) / w.length;
    return { dia: x.dia, lo: m - sd, hi: m + sd };
  });
}

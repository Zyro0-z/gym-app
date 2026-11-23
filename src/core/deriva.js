// Fatiga dentro de la sesión: cuánto cae el e1RM de la primera a la última serie de trabajo de un
// ejercicio, comparado con lo que sueles caer TÚ en ese ejercicio (umbral personal). Puro.
// Con pocas sesiones previas no hay base personal y se usa un umbral genérico, indicado como tal.
import { e1rmAjustado } from "./rpe.js";

const mediana = (v) => { const s = v.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const red = (x) => Math.round(x * 10) / 10;
export const MIN_SERIES = 3, MIN_SESIONES_PERSONAL = 4, UMBRAL_GENERICO_PCT = 8;

/** Caída % del e1RM de la 1.ª a la última serie (positiva = caída). null con menos de 3 series con peso. */
export function caidaSesion(series) {
  const v = series.map((st) => e1rmAjustado(st.peso, st.reps, st.rpe)).filter((x) => x > 0);
  if (v.length < MIN_SERIES) return null;
  return red(((v[0] - v[v.length - 1]) / v[0]) * 100);
}

/**
 * @param {{series:object[]}[]} hist sesiones del ejercicio, de la más antigua a la más reciente (la última es la actual)
 * @returns {null | {caida:number, personal:{mediana:number, mad:number, n:number}|null, umbral:number, alta:boolean, generica:boolean}}
 */
export function derivaEjercicio(hist) {
  if (!hist || !hist.length) return null;
  const caida = caidaSesion(hist[hist.length - 1].series);
  if (caida == null) return null;
  const previas = hist.slice(0, -1).map((x) => caidaSesion(x.series)).filter((x) => x != null);
  if (previas.length < MIN_SESIONES_PERSONAL)
    return { caida, personal: null, umbral: UMBRAL_GENERICO_PCT, alta: caida >= UMBRAL_GENERICO_PCT, generica: true };
  const med = mediana(previas), mad = mediana(previas.map((x) => Math.abs(x - med)));
  const umbral = red(med + 1.5 * Math.max(mad, 1));
  return { caida, personal: { mediana: red(med), mad: red(mad), n: previas.length }, umbral, alta: caida > umbral, generica: false };
}

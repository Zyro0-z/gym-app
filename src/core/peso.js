// Peso corporal: medias de 21 días, ritmo semanal y tendencia frente a la fase (bulk, cut, mantener).
// Nunca se comparan dos pesajes sueltos: el peso diario oscila por agua, sal y digestión.
import { numDia } from "./fechas.js";
import { PESO_VENTANA_DIAS, PESO_MIN_REGISTROS, PESO_UMBRAL_PCT_SEMANA, PESO_BANDA_MANTENER_KG } from "./constantes.js";

export function faseEn(C, iso) {
  let f = null;
  for (const x of C.peso.fases) if (!x.desde || x.desde <= iso) f = x;
  return f;
}

/** Media reciente, ritmo, dirección y color de cada pesaje. */
export function analizarPeso(C) {
  const R = C.peso.registros, n = R.length, V = PESO_VENTANA_DIAS;
  const dia = R.map((r) => numDia(r.fecha));
  const sKg = [0], sDia = [0];
  for (let i = 0; i < n; i++) { sKg.push(sKg[i] + R[i].kg); sDia.push(sDia[i] + dia[i]); }
  const media = (a, b) => (sKg[b] - sKg[a]) / (b - a);
  const mDia = (a, b) => (sDia[b] - sDia[a]) / (b - a);
  let lo1 = 0, lo0 = 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = dia[i];
    while (dia[lo1] <= t - V) lo1++;
    while (dia[lo0] <= t - 2 * V) lo0++;
    const n1 = i + 1 - lo1, n0 = lo1 - lo0;
    const x = { fecha: R[i].fecha, kg: R[i].kg, dia: t, media: null, ritmo: null, dir: null };
    if (n1 >= PESO_MIN_REGISTROS && dia[0] <= t - V + 1) x.media = media(lo1, i + 1);
    if (x.media != null && n0 >= PESO_MIN_REGISTROS && dia[0] <= t - 2 * V + 1) {
      const semanas = (mDia(lo1, i + 1) - mDia(lo0, lo1)) / 7;
      x.ritmo = (x.media - media(lo0, lo1)) / semanas;
      const umbral = (PESO_UMBRAL_PCT_SEMANA / 100) * x.media;
      x.dir = x.ritmo >= umbral ? "sube" : x.ritmo <= -umbral ? "baja" : "estable";
    }
    out.push(x);
  }
  const refDe = new Map();
  for (const f of C.peso.fases) {
    if (f.tipo !== "mantener") continue;
    const ini = f.desde ? numDia(f.desde) : n ? dia[0] : 0;
    const dentro = out.filter((x) => x.dia >= ini && x.dia < ini + V);
    refDe.set(f, { media: dentro.length >= PESO_MIN_REGISTROS ? dentro.reduce((a, x) => a + x.kg, 0) / dentro.length : null, fin: ini + V - 1, n: dentro.length });
  }
  for (const x of out) {
    const f = faseEn(C, x.fecha);
    x.fase = f;
    x.color = "neutro";
    if (!f) continue;
    if (f.tipo === "mantener") {
      const ref = refDe.get(f);
      if (ref.media == null || x.dia < ref.fin || x.media == null) continue;
      x.desvio = x.media - ref.media;
      x.color = Math.abs(x.desvio) <= PESO_BANDA_MANTENER_KG ? "verde" : "rojo";
    } else if (x.dir) {
      const aFavor = f.tipo === "bulk" ? "sube" : "baja";
      x.color = x.dir === "estable" ? "ambar" : x.dir === aFavor ? "verde" : "rojo";
    }
  }
  return { puntos: out, refDe };
}

/**
 * Resumen para la pantalla Cuerpo: cambio desde el inicio de la fase (medias de 21 días que
 * no se solapan) y estado frente al objetivo de hoy.
 */
export function resumenPeso(C, A) {
  const P = A.puntos;
  if (!P.length) return null;
  const ult = P[P.length - 1];
  const faseHoy = faseEn(C, C.hoy);
  const V = PESO_VENTANA_DIAS;
  const inicio = faseHoy && faseHoy.desde ? faseHoy.desde : P[0].fecha;
  const dIni = numDia(inicio);
  const primeros = P.filter((x) => x.dia >= dIni && x.dia < dIni + V);
  const ultimos = P.filter((x) => x.dia > ult.dia - V);
  const mediaDe = (a) => a.reduce((s, x) => s + x.kg, 0) / a.length;
  const r = { ultimo: ult, n: P.length, dias: ult.dia - numDia(P[0].fecha) + 1, inicio, cambio: null, fase: faseHoy, hayObjetivo: C.peso.fases.length > 0 };
  if (primeros.length >= PESO_MIN_REGISTROS && ultimos.length >= PESO_MIN_REGISTROS && ult.dia >= dIni + 2 * V - 1) {
    const mi = mediaDe(primeros), mf = mediaDe(ultimos);
    r.cambio = { mi, mf, dif: mf - mi };
  }
  if (!r.hayObjetivo) r.objetivo = { estado: "sin" };
  else if (!faseHoy) r.objetivo = { estado: "futura", desde: C.peso.fases[0].desde };
  else if (faseHoy.tipo === "mantener") {
    const ref = A.refDe.get(faseHoy);
    r.objetivo = ref.media == null || ult.dia < ref.fin || ult.media == null
      ? { estado: "referencia", tipo: "mantener", n: ref.n, necesarios: PESO_MIN_REGISTROS }
      : { estado: "mantener", tipo: "mantener", desvio: ult.desvio, ref: ref.media, color: ult.color, banda: PESO_BANDA_MANTENER_KG };
  } else if (ult.dir) r.objetivo = { estado: "ritmo", tipo: faseHoy.tipo, ritmo: ult.ritmo, dir: ult.dir, color: ult.color };
  else r.objetivo = { estado: "sinColor", tipo: faseHoy.tipo };
  return r;
}


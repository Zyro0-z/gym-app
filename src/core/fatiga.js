// Informe de fatiga semana a semana (función NUEVA: no toca `analizar` ni sus números).
// Junta lo que ya calcula el análisis (series, volumen, e1RM por sesión) con lo que solo está en
// las sesiones guardadas: RPE por serie y la comprobación de recuperación (sueño, estrés, energía).
// Solo semanas completas (la actual va aparte, marcada «en curso»). Sin datos no hay número: null.
import { lunesDe, masDias } from "./fechas.js";
import { esRpe } from "./rpe.js";

export const SEMANAS_MIN = 4;              // semanas con sesiones para que el informe diga algo
const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
const mediana = (l) => { if (!l.length) return null; const s = [...l].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** ¿El día cae en un bloque de descarga? */
export const enDescarga = (C, dia) => (C.bloques || []).some((b) => b.esDeload && dia >= b.inicio && dia <= b.fin);

/**
 * Datos crudos por semana: RPE de las series que cuentan y recuperación de cada sesión.
 * `A.sesiones[i].ref` es la sesión guardada (con rpe y recuperacion).
 */
function crudosPorSemana(A) {
  const m = new Map();
  const de = (k) => { if (!m.has(k)) m.set(k, { rpe: [], sueno: [], estres: [], energia: [] }); return m.get(k); };
  for (const s of A.sesiones) {
    const r = s.ref, k = lunesDe(s.dia), x = de(k);
    if (!r) continue;
    for (const e of r.ejercicios || []) for (const st of e.series || []) {
      if (st.hecha === false || !(st.tipo === "normal" || st.tipo === "fallo" || !st.tipo)) continue;
      if (esRpe(st.rpe)) x.rpe.push(st.rpe);
    }
    const rc = r.recuperacion;
    if (rc) for (const c of ["sueno", "estres", "energia"]) if (typeof rc[c] === "number") x[c].push(rc[c]);
  }
  return m;
}

/** Mejor e1RM de cada ejercicio por semana: Map k → Map lunes → mejor. */
function mejoresPorSemana(A) {
  const out = new Map();
  for (const e of A.ejercicios) {
    const m = new Map();
    for (const h of e.hist) if (h.mejorRM > 0) { const k = lunesDe(h.dia); if (!(m.get(k) >= h.mejorRM)) m.set(k, h.mejorRM); }
    if (m.size) out.set(e.k, m);
  }
  return out;
}

/**
 * Filas semanales (las de `lunes`, en ese orden) con { lunes, sesiones, series, volumen, rpe, nRpe, sueno, estres,
 * energia, e1rmPct, ejerciciosComparados, descarga }. Sirve también para la semana en curso y para los mesociclos.
 */
export function filasSemanas(A, lunes) {
  const crudos = crudosPorSemana(A), mejores = mejoresPorSemana(A);
  const fila = (w) => {
    const sem = A.semanas.find((x) => x.clave === w) || { ser: 0, vol: 0, n: 0 };
    const c = crudos.get(w) || { rpe: [], sueno: [], estres: [], energia: [] };
    // Cambio de e1RM: para cada ejercicio hecho esta semana, contra su semana anterior con datos (≤ 4 semanas antes)
    const cambios = [];
    for (const m of mejores.values()) {
      if (!m.has(w)) continue;
      for (let i = 1; i <= 4; i++) { const p = masDias(w, -7 * i); if (m.has(p)) { cambios.push((m.get(w) / m.get(p) - 1) * 100); break; } }
    }
    return { lunes: w, sesiones: sem.n, series: sem.ser, volumen: sem.vol, rpe: media(c.rpe), nRpe: c.rpe.length,
      sueno: media(c.sueno), estres: media(c.estres), energia: media(c.energia),
      e1rmPct: mediana(cambios), ejerciciosComparados: cambios.length, descarga: enDescarga(A.C, w) || enDescarga(A.C, masDias(w, 6)) };
  };
  return lunes.map(fila);
}

/** Cambio del mejor e1RM de cada ejercicio entre la primera y la última de las semanas dadas (mediana, %). null si ningún ejercicio aparece en dos. */
export function cambioE1rm(A, lunes) {
  const set = new Set(lunes), cambios = [];
  for (const m of mejoresPorSemana(A).values()) {
    const ws = [...m.keys()].filter((w) => set.has(w)).sort();
    if (ws.length >= 2) cambios.push((m.get(ws[ws.length - 1]) / m.get(ws[0]) - 1) * 100);
  }
  return { pct: mediana(cambios), ejercicios: cambios.length };
}

/**
 * @returns {{ suficiente: boolean, semanasConDatos: number, semanas: object[], actual: object|null }}
 *   semanas: de la más antigua a la más reciente (como mucho `n`), cada una con
 *   { lunes, sesiones, series, volumen, rpe, sueno, estres, energia, e1rmPct, ejerciciosComparados, descarga }
 */
export function informeFatiga(A, { n = 8 } = {}) {
  const lunesHoy = lunesDe(A.hoy);
  const completas = A.semanas.map((x) => x.clave).filter((w) => w < lunesHoy);
  const conDatos = completas.filter((w) => (A.semanas.find((x) => x.clave === w) || {}).n > 0);
  const filas = filasSemanas(A, [...completas.slice(-n), lunesHoy]);
  return { suficiente: conDatos.length >= SEMANAS_MIN, semanasConDatos: conDatos.length, semanas: filas.slice(0, -1), actual: filas[filas.length - 1] };
}

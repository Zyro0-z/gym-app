// Distribución del esfuerzo: cuántas series de trabajo caen en cada franja de RPE.
// Solo cuentan las series normales y al fallo con RPE anotado; las que no lo tienen se cuentan
// aparte (cobertura) para saber cuánto fiarse del reparto.
import { lunesDe, masDias } from "./fechas.js";

export const BANDAS_RPE = [
  { id: "facil", texto: "Hasta 6,5", corto: "≤ 6,5", color: "var(--g-cian)", cabe: (r) => r <= 6.5 },
  { id: "moderada", texto: "7 a 7,5", corto: "7–7,5", color: "var(--g-verde)", cabe: (r) => r >= 7 && r <= 7.5 },
  { id: "dura", texto: "8 a 8,5", corto: "8–8,5", color: "var(--g-amarillo)", cabe: (r) => r >= 8 && r <= 8.5 },
  { id: "muyDura", texto: "9 a 9,5", corto: "9–9,5", color: "var(--g-naranja)", cabe: (r) => r >= 9 && r <= 9.5 },
  { id: "limite", texto: "10", corto: "10", color: "var(--g-rosa)", cabe: (r) => r >= 10 },
];

const vacio = () => Object.fromEntries(BANDAS_RPE.map((b) => [b.id, 0]));

/**
 * @param {object} A      análisis
 * @param {object} [opt]  { desde, hasta }: días ISO (inclusive) para acotar
 * @returns {{ total, conRpe, cobertura, bandas: [{ id, texto, corto, color, n, pct }], semanas: [{ lunes, n, total, cuentas }] }}
 */
export function distribucionRpe(A, { desde = null, hasta = null } = {}) {
  const cuentas = vacio(), porSemana = new Map();
  let total = 0, conRpe = 0;
  for (const s of A.sesiones) {
    if (!s.dia || (desde && s.dia < desde) || (hasta && s.dia > hasta)) continue;
    const w = lunesDe(s.dia);
    if (!porSemana.has(w)) porSemana.set(w, { lunes: w, n: 0, total: 0, cuentas: vacio() });
    const sem = porSemana.get(w);
    for (const ex of s.ejercicios) for (const st of ex.sets) {
      if (!st.paraSeries || !(st.tipo === "normal" || st.tipo === "fallo")) continue;
      total++; sem.total++;
      if (typeof st.rpe !== "number") continue;
      const b = BANDAS_RPE.find((x) => x.cabe(st.rpe));
      if (!b) continue;
      conRpe++; sem.n++; cuentas[b.id]++; sem.cuentas[b.id]++;
    }
  }
  const semanas = [...porSemana.values()].sort((a, b) => (a.lunes < b.lunes ? -1 : 1));
  return { total, conRpe, cobertura: total ? conRpe / total : 0,
    bandas: BANDAS_RPE.map((b) => ({ id: b.id, texto: b.texto, corto: b.corto, color: b.color, n: cuentas[b.id], pct: conRpe ? (cuentas[b.id] / conRpe) * 100 : 0 })), semanas };
}

/** Las últimas `n` semanas (con hueco para las que no tienen sesiones), de la más antigua a la actual. */
export function semanasRpe(A, n = 8) {
  const D = distribucionRpe(A), por = new Map(D.semanas.map((s) => [s.lunes, s]));
  const fin = lunesDe(A.hoy);
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const w = masDias(fin, -7 * i); out.push(por.get(w) || { lunes: w, n: 0, total: 0, cuentas: vacio() }); }
  return out;
}

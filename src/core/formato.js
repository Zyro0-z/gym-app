// Números en español de España sin Intl (idéntico en todos los motores):
// punto de miles y coma decimal. fmt(12345.678, 1) → «12.345,7».

export function fmt(n, d) {
  d = d || 0;
  const v = Number(n) || 0;
  const p = Math.abs(v).toFixed(d).split(".");
  return (v < 0 ? "-" : "") + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (p[1] ? "," + p[1] : "");
}

/** 60 · 17,5 — sin «,0» en los enteros. */
export const kgCorto = (kg) => fmt(kg, Number.isInteger(kg) ? 0 : 1);

/** «1 ejercicio» / «3 ejercicios». */
export const plural = (n, uno, varios) => n + " " + (n === 1 ? uno : varios);

/** Signo tipográfico: +1,2 · −0,4 · ±0 */
export const conSigno = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v), d);

/** Lee un número escrito con coma o con punto. NaN si no lo es. */
export function leerNumero(t) {
  const s = String(t == null ? "" : t).trim().replace(",", ".");
  return /^[-+]?\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN;
}

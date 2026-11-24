// Datos de la tarjeta de sesión para compartir (la imagen se dibuja en ui/tarjeta.js). Pura.
import { epley } from "./sesiones.js";

export const MAX_EJERCICIOS_TARJETA = 6;
const cuenta = (st) => st.hecha !== false && (st.tipo === "normal" || st.tipo === "fallo" || !st.tipo);

/**
 * @param {object} ses   sesión guardada { fecha, rutina, duracion (min), ejercicios: [{ nombre, series: [{ peso, reps, tipo, hecha }] }] }
 * @param {string[]} [prs] nombres de ejercicios que batieron récord en la sesión (si se conocen)
 * @returns {{ titulo, fecha, duracion, series, volumen, ejercicios: {nombre, series, peso, reps, pr}[], mas, prs }}
 */
export function datosTarjeta(ses, prs = []) {
  const esPr = new Set(prs);
  let series = 0, volumen = 0;
  const filas = [];
  for (const e of ses.ejercicios || []) {
    const sets = (e.series || []).filter(cuenta);
    if (!sets.length) continue;
    let mejor = null, vol = 0;
    for (const st of sets) {
      series++;
      if (st.peso > 0 && st.reps > 0) vol += st.peso * st.reps;
      const v = st.peso > 0 ? epley(st.peso, st.reps) : st.reps;
      if (!mejor || v > mejor.v) mejor = { v, peso: st.peso > 0 ? st.peso : 0, reps: st.reps };
    }
    volumen += vol;
    filas.push({ nombre: e.nombre || e.ejercicioId, series: sets.length, peso: mejor.peso, reps: mejor.reps, pr: esPr.has(e.nombre || e.ejercicioId), vol });
  }
  filas.sort((a, b) => (b.pr - a.pr) || (b.vol - a.vol));
  return { titulo: ses.rutina || "Entrenamiento", fecha: ses.fecha, duracion: ses.duracion || null, series, volumen: Math.round(volumen),
    ejercicios: filas.slice(0, MAX_EJERCICIOS_TARJETA).map(({ vol, ...x }) => x), mas: Math.max(0, filas.length - MAX_EJERCICIOS_TARJETA), prs: filas.filter((f) => f.pr).length };
}

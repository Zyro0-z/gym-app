// Sugerencia de carga para la próxima serie, a partir de la doble progresión (progresion.js).
// No calcula nada nuevo: traduce el estado «sube / mantén / debajo» y el incremento del ejercicio a
// un peso y unas repeticiones concretas.
//   sube    peso máximo + incremento, desde el mínimo del rango
//   mantén  mismo peso; una repetición más que la serie pesada, sin pasar del tope
//   debajo  peso máximo − incremento (si queda por encima de 0), al mínimo del rango
// Sin incremento conocido para subir o bajar, no sugiere peso (null): no se inventan números.

/**
 * @param {object} p   resultado de progresionDe(id)
 * @param {{kg:number}|null} inc resultado de incrementoDe(p)
 * @returns {{ peso: number, reps: number, motivo: string } | null}
 */
export function sugerirCarga(p, inc) {
  if (!p || p.sinDatos || !p.obj || !(p.pesoMax > 0)) return null;
  const { min, max } = p.obj;
  if (p.clave === "sube") return inc ? { peso: red(p.pesoMax + inc.kg), reps: min, motivo: "Llegaste al tope del rango" } : null;
  if (p.clave === "debajo") return inc && p.pesoMax - inc.kg > 0 ? { peso: red(p.pesoMax - inc.kg), reps: min, motivo: "La primera serie no llegó al mínimo" } : null;
  const top = p.work.filter((s) => s.peso === p.pesoMax)[0];
  return { peso: p.pesoMax, reps: Math.min(max, (top ? top.reps : min) + 1), motivo: "Mismo peso, una repetición más" };
}
const red = (x) => Math.round(x * 100) / 100;

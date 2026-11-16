// RPE (esfuerzo percibido) por serie y 1RM estimado ajustado por RPE.
//
// Regla: las repeticiones que quedaban en reserva son RIR = 10 − RPE. Una serie de `reps` a RPE `r`
// equivale a una serie al fallo de reps + RIR, así que el 1RM estimado ajustado es
//   e1rmAjustado(kg, reps, rpe) = epley(kg, reps + (10 − rpe))
// Sin RPE se usa epley(kg, reps), igual que el resto de la app. Es una función NUEVA: `analizar`
// y sus números no cambian (golden master).
import { epley } from "./sesiones.js";

export const CHIPS_RPE = [6, 7, 8, 8.5, 9, 9.5, 10];
export const RPE_MIN = 5, RPE_MAX = 10;

/** RPE válido: número de 5 a 10 en pasos de 0,5. */
export const esRpe = (v) => typeof v === "number" && Number.isFinite(v) && v >= RPE_MIN && v <= RPE_MAX && Number.isInteger(v * 2);

/** Repeticiones en reserva para un RPE (null si no hay RPE válido). */
export const rir = (rpe) => (esRpe(rpe) ? RPE_MAX - rpe : null);

/** 1RM estimado ajustado por RPE (kg). 0 si no hay peso o repeticiones. */
export function e1rmAjustado(kg, reps, rpe) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  const r = rir(rpe);
  return epley(kg, r == null ? reps : reps + r);
}

/** Texto corto del RPE: «8,5» o «» si no hay. */
export const rpeTxt = (rpe) => (esRpe(rpe) ? String(rpe).replace(".", ",") : "");

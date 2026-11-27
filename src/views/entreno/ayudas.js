// Ayudas en la sala: ajuste del peso según cómo ha ido la primera serie.
import { h } from "../../ui/dom.js";
import { fmt, leerNumero } from "../../core/formato.js";
import { esRpe } from "../../core/rpe.js";
import { e1rmReciente, autorregulacion } from "../../core/prescripcion.js";
import { E } from "./estado.js";
import { esTop } from "./herramientas.js";

/** Chip con el peso para el RPE objetivo según el e1RM de hoy, tras la primera serie de trabajo hecha con RPE. `aplicar(a)` rellena las series vacías. */
export function chipAutorregulacion(e, paso, aplicar) {
  if (E.M.modo !== "entreno" || !esRpe(e.rpeObjetivo) || esTop(e.ejercicioId)) return null;
  const s1 = e.series.find((s) => s.tipo !== "calentamiento");
  if (!s1 || !s1.hecha || !esRpe(s1.rpe)) return null;
  if (!e.series.some((s) => !s.hecha && s.tipo !== "calentamiento" && (s.peso === "" || s.peso == null))) return null;
  try {
    const ej = E.app.store.analisis().ejercicios.find((x) => x.k === e.ejercicioId), r = ej && e1rmReciente(ej);
    const a = r && autorregulacion({ peso: leerNumero(s1.peso), reps: leerNumero(s1.reps), rpe: s1.rpe }, r.e1rm, e.rpeObjetivo, paso);
    if (!a) return null;
    const pct = (a.desv > 0 ? "+" : "−") + fmt(Math.abs(a.desv) * 100, 1) + " %", kg = fmt(a.peso, Number.isInteger(a.peso) ? 0 : 1);
    return h("button", { class: "chip-sugerencia", "aria-label": "Hoy tu e1RM estimado es " + fmt(a.e1rm, 0) + " kilos, " + pct + " sobre el habitual. Para " + a.reps + " repeticiones al RPE objetivo: " + kg + " kilos. Toca para ponerlo en las series vacías.",
      onClick: () => aplicar(a) },
      h("span", { class: "t" }, "Hoy"), h("span", { class: "num" }, kg + " kg × " + a.reps), h("span", { class: "m" }, "e1RM de hoy " + fmt(a.e1rm, 0) + " kg (" + pct + ")"));
  } catch (_) { return null; }
}

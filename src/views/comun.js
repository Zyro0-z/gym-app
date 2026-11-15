// Piezas compartidas por varias vistas.
import { h } from "../ui/dom.js";
import { fechaRelativa, minutos, kgTotal } from "../ui/textos.js";
import { plural as pl, plural } from "../core/formato.js";

/** Totales de una sesión del modelo: series hechas y volumen. */
export function totalesSesion(s) {
  let series = 0, vol = 0;
  for (const e of s.ejercicios || []) for (const x of e.series || []) {
    if (x.hecha === false) continue;
    series++;
    if (x.peso > 0 && x.reps > 0) vol += x.peso * x.reps;
  }
  return { series, vol };
}

/** «52 min · 22 series · 8.410 kg» */
export function lineaSesion(s) {
  const t = totalesSesion(s);
  return [s.duracion ? minutos(s.duracion) : null, pl(t.series, "serie", "series"), t.vol ? kgTotal(t.vol) : null].filter(Boolean).join(" · ");
}

export const sesionesOrdenadas = (est) => est.sesiones.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? 1 : -1));
export { fechaRelativa, plural };

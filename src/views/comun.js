// Piezas compartidas por varias vistas.
import { minutos, kgTotal } from "../ui/textos.js";
import { plural as pl } from "../core/formato.js";

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

/** Abre una sesión; si hay varias el mismo día (`sesiones`), pregunta cuál en una hoja de acciones. */
export async function abrirSesionDelDia(app, sesiones, titulo) {
  let s = sesiones[0];
  if (!s) return;
  if (sesiones.length > 1) {
    const id = await app.hojaAcciones({ mensaje: titulo + ": " + sesiones.length + " sesiones",
      opciones: sesiones.map((x) => ({ texto: (x.rutina || "Entrenamiento libre") + (x.inicio ? " · " + x.inicio : ""), valor: x.id })) });
    s = id && sesiones.find((x) => x.id === id);
    if (!s) return;
  }
  app.nav.ir("sesion/" + encodeURIComponent(s.id));
}

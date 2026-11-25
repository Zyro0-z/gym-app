// Textos de fechas y cifras para la interfaz (español de España).
import { fmt, kgCorto } from "../core/formato.js";
import { diaSemana, numDia } from "../core/fechas.js";

export const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
export const DIAS_CORTOS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** «domingo, 15 de noviembre» */
export const fechaLarga = (iso) => DIAS[diaSemana(iso) - 1] + ", " + +iso.slice(8, 10) + " de " + MESES[+iso.slice(5, 7) - 1];
/** «12 nov» (con el año si no es el actual) */
export const fechaCorta = (iso, hoy = null) => +iso.slice(8, 10) + " " + MESES_CORTOS[+iso.slice(5, 7) - 1] + (hoy && hoy.slice(0, 4) !== iso.slice(0, 4) ? " " + iso.slice(0, 4) : "");
/** «hoy», «ayer», «vie», «12 nov» según la distancia. */
export function fechaRelativa(iso, hoy) {
  const d = numDia(hoy) - numDia(iso);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d > 1 && d < 7) return DIAS_CORTOS[diaSemana(iso) - 1];
  return fechaCorta(iso, hoy);
}
export const mesAnio = (clave) => MESES[+clave.slice(5, 7) - 1] + " " + clave.slice(0, 4);
export const capital = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export const kg = (v) => kgCorto(Math.round(v * 10) / 10) + " kg";
export const kgTotal = (v) => fmt(Math.round(v)) + " kg";
export const minutos = (m) => { const t = Math.round(m); return t >= 60 ? Math.floor(t / 60) + " h " + String(t % 60).padStart(2, "0") + " min" : t + " min"; };
/** 1:05 · 12:30 (segundos → m:ss) */
export const reloj = (seg) => { seg = Math.max(0, Math.round(seg)); const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60; return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0"); };

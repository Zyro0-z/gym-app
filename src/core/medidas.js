// Medidas corporales (cm): validación de una entrada y series para la gráfica. Pura.
import { fechaISO } from "./fechas.js";

export const MEDIDAS = [
  { k: "cintura", texto: "Cintura" }, { k: "pecho", texto: "Pecho" }, { k: "brazo", texto: "Brazo" },
  { k: "muslo", texto: "Muslo" }, { k: "cadera", texto: "Cadera" }, { k: "cuello", texto: "Cuello" },
];
export const CLAVES_MEDIDAS = MEDIDAS.map((m) => m.k);
export const MIN_CM = 10, MAX_CM = 300;

/** Problemas de una entrada { fecha, cintura, … } (lista vacía si es válida). */
export function validarMedida(m, hoy) {
  const p = [];
  if (!m || !fechaISO(m.fecha)) p.push("La fecha no es válida.");
  else if (hoy && m.fecha > hoy) p.push("La fecha es futura.");
  let alguna = false;
  for (const { k, texto } of MEDIDAS) {
    const v = m ? m[k] : null;
    if (v == null) continue;
    alguna = true;
    if (!(typeof v === "number" && Number.isFinite(v) && v >= MIN_CM && v <= MAX_CM)) p.push(texto + ": entre " + MIN_CM + " y " + MAX_CM + " cm.");
  }
  if (!alguna) p.push("Escribe al menos una medida.");
  return p;
}

/** Inserta o sustituye la entrada de esa fecha; devuelve una lista nueva ordenada por fecha. */
export function ponerMedida(lista, m) {
  const limpia = { fecha: m.fecha };
  for (const k of CLAVES_MEDIDAS) if (typeof m[k] === "number") limpia[k] = Math.round(m[k] * 10) / 10;
  return [...(lista || []).filter((x) => x.fecha !== m.fecha), limpia].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

/** Puntos { fecha, valor } de una medida, por fecha. */
export const serieMedida = (lista, k) => (lista || []).filter((x) => typeof x[k] === "number").map((x) => ({ fecha: x.fecha, valor: x[k] }));

/** Última y cambio contra la anterior de esa medida (null si no hay). */
export function ultimaMedida(lista, k) {
  const s = serieMedida(lista, k);
  if (!s.length) return null;
  const u = s[s.length - 1], a = s.length > 1 ? s[s.length - 2] : null;
  return { fecha: u.fecha, valor: u.valor, cambio: a ? Math.round((u.valor - a.valor) * 10) / 10 : null, desde: a ? a.fecha : null };
}

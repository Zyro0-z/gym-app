// Mesociclos: un bloque de N semanas con un nombre, que puede cerrar con una semana de descarga.
// Se guardan en ajustes.mesociclos = [{ id, nombre, inicio (lunes), semanas, descarga }]. Si lleva
// descarga, la última semana se registra también como bloque de descarga (ajustes.bloques, id
// «meso-<id>») para que el análisis y la propuesta de descarga la respeten.
import { fechaISO, lunesDe, masDias, numDia } from "./fechas.js";
import { filasSemanas, cambioE1rm } from "./fatiga.js";

export const SEMANAS_MIN_MESO = 2, SEMANAS_MAX_MESO = 16;
export const idBloqueDe = (id) => "meso-" + id;

/** Semanas (lunes) del mesociclo, en orden. */
export const lunesDeMeso = (m) => Array.from({ length: m.semanas }, (_, i) => masDias(m.inicio, 7 * i));
export const finDeMeso = (m) => masDias(m.inicio, 7 * m.semanas - 1);

/** Problemas de un mesociclo (frases); vacío si es válido. `otros`: los demás, para comprobar solapes. */
export function validarMesociclo(m, otros = []) {
  const p = [];
  if (!m || typeof m.nombre !== "string" || !m.nombre.trim()) p.push("Ponle un nombre.");
  if (!m || !fechaISO(m.inicio)) return p.concat("Elige la fecha de inicio.");
  if (lunesDe(m.inicio) !== m.inicio) p.push("Empieza en lunes.");
  if (!Number.isInteger(m.semanas) || m.semanas < SEMANAS_MIN_MESO || m.semanas > SEMANAS_MAX_MESO) p.push("Entre " + SEMANAS_MIN_MESO + " y " + SEMANAS_MAX_MESO + " semanas.");
  else {
    const fin = finDeMeso(m);
    const choca = otros.find((o) => o.id !== m.id && m.inicio <= finDeMeso(o) && fin >= o.inicio);
    if (choca) p.push("Se solapa con «" + choca.nombre + "».");
  }
  return p;
}

/** Estado frente a una fecha: { estado: "futuro"|"en curso"|"terminado", semana (1 a N o null), esDescarga, restan (días) }. */
export function estadoMesociclo(m, hoy) {
  const fin = finDeMeso(m);
  if (hoy < m.inicio) return { estado: "futuro", semana: null, esDescarga: false, restan: numDia(m.inicio) - numDia(hoy) };
  if (hoy > fin) return { estado: "terminado", semana: m.semanas, esDescarga: false, restan: 0 };
  const semana = Math.floor((numDia(hoy) - numDia(m.inicio)) / 7) + 1;
  return { estado: "en curso", semana, esDescarga: !!m.descarga && semana === m.semanas, restan: numDia(fin) - numDia(hoy) + 1 };
}

export const mesocicloActual = (lista, hoy) => (lista || []).find((m) => hoy >= m.inicio && hoy <= finDeMeso(m)) || null;

/** Ajustes con el mesociclo añadido o sustituido (y su bloque de descarga). Muta `aj` y lo devuelve. */
export function ponerMesociclo(aj, m) {
  const id = idBloqueDe(m.id);
  aj.mesociclos = (aj.mesociclos || []).filter((x) => x.id !== m.id).concat([m]).sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  aj.bloques = (aj.bloques || []).filter((b) => b.id !== id);
  if (m.descarga) { const i = masDias(m.inicio, 7 * (m.semanas - 1)); aj.bloques.push({ id, inicio: i, fin: masDias(i, 6), tipo: "deload", grupos: [] }); }
  return aj;
}
export function quitarMesociclo(aj, idMeso) {
  aj.mesociclos = (aj.mesociclos || []).filter((x) => x.id !== idMeso);
  aj.bloques = (aj.bloques || []).filter((b) => b.id !== idBloqueDe(idMeso));
  return aj;
}

/** Resumen con datos: filas por semana (hasta hoy) y totales. */
export function resumenMesociclo(A, m) {
  const lunes = lunesDeMeso(m), hoyLunes = lunesDe(A.hoy);
  const hechas = lunes.filter((w) => w <= hoyLunes);
  const filas = filasSemanas(A, hechas);
  const conSesion = filas.filter((f) => f.sesiones > 0 && !f.descarga);   // la semana de descarga baja la carga a propósito: no cuenta como pérdida de fuerza
  const conRpe = filas.filter((f) => f.rpe != null && f.nRpe > 0), nRpe = conRpe.reduce((a, f) => a + f.nRpe, 0);
  return { filas, semanasTotales: m.semanas,
    sesiones: filas.reduce((a, f) => a + f.sesiones, 0), series: filas.reduce((a, f) => a + f.series, 0), volumen: filas.reduce((a, f) => a + f.volumen, 0),
    rpe: nRpe ? conRpe.reduce((a, f) => a + f.rpe * f.nRpe, 0) / nRpe : null, e1rm: cambioE1rm(A, conSesion.map((f) => f.lunes)) };
}

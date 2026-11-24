// Registro de molestias articulares: dónde, cuánto y con qué ejercicio. Va aparte de las sesiones
// (como las medidas): kv «molestias» = [{ id, fecha, articulacion, lado, nivel, ejercicioId, nota }].
// Solo recoge y resume lo que anotas: no diagnostica nada.
import { fechaISO, lunesDe, masDias, numDia } from "./fechas.js";
import { media } from "./estadistica.js";

export const ARTICULACIONES = [
  { id: "cuello", texto: "Cuello" }, { id: "hombro", texto: "Hombro" }, { id: "codo", texto: "Codo" }, { id: "muneca", texto: "Muñeca" },
  { id: "espalda-alta", texto: "Espalda alta" }, { id: "espalda-baja", texto: "Espalda baja" }, { id: "cadera", texto: "Cadera" },
  { id: "rodilla", texto: "Rodilla" }, { id: "tobillo", texto: "Tobillo" },
];
export const LADOS = [{ id: "izq", texto: "Izquierda" }, { id: "der", texto: "Derecha" }, { id: "ambos", texto: "Ambos" }];
export const NIVELES = [{ n: 1, texto: "Se nota apenas" }, { n: 2, texto: "Leve" }, { n: 3, texto: "Molesta" }, { n: 4, texto: "Duele" }, { n: 5, texto: "No puedo cargarla" }];
export const nombreArticulacion = (id) => (ARTICULACIONES.find((a) => a.id === id) || { texto: id }).texto;
export const nuevoId = (fecha) => "mo-" + fecha + "-" + Math.random().toString(36).slice(2, 7);

/** Frases con los problemas de una entrada (vacío si es válida). */
export function validarMolestia(m, hoy) {
  const p = [];
  if (!m || !fechaISO(m.fecha)) p.push("Fecha no válida.");
  else if (hoy && m.fecha > hoy) p.push("La fecha no puede ser futura.");
  if (!m || !ARTICULACIONES.some((a) => a.id === m.articulacion)) p.push("Elige la articulación.");
  if (!m || !Number.isInteger(m.nivel) || m.nivel < 1 || m.nivel > 5) p.push("El nivel va de 1 a 5.");
  if (m && m.lado != null && !LADOS.some((l) => l.id === m.lado)) p.push("Lado no válido.");
  return p;
}

export const ordenar = (l) => l.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? 1 : -1));

/**
 * Resumen por articulación con anotaciones en los últimos 60 días:
 * { id, texto, ultima, n7, n30, max30, media30, semanas: [media de nivel por semana, 8 semanas; null si no hay], persistente }.
 * «persistente»: ≥ 3 anotaciones de nivel ≥ 3 en los últimos 14 días.
 */
export function resumenMolestias(lista, hoy) {
  const d = (f) => numDia(hoy) - numDia(f);
  const out = [];
  for (const a of ARTICULACIONES) {
    const l = lista.filter((m) => m.articulacion === a.id && m.fecha <= hoy);
    const rec = l.filter((m) => d(m.fecha) < 60);
    if (!rec.length) continue;
    const de = (dias) => l.filter((m) => d(m.fecha) < dias);
    const l30 = de(30), fin = lunesDe(hoy);
    const semanas = Array.from({ length: 8 }, (_, i) => {
      const w = masDias(fin, -7 * (7 - i)), z = masDias(w, 6);
      const s = l.filter((m) => m.fecha >= w && m.fecha <= z);
      return s.length ? media(s.map((m) => m.nivel)) : null;
    });
    out.push({ id: a.id, texto: a.texto, ultima: ordenar(l)[0].fecha, n7: de(7).length, n30: l30.length,
      max30: l30.length ? Math.max(...l30.map((m) => m.nivel)) : 0, media30: l30.length ? media(l30.map((m) => m.nivel)) : null, semanas,
      persistente: de(14).filter((m) => m.nivel >= 3).length >= 3 });
  }
  return out.sort((a, b) => (b.persistente - a.persistente) || (a.ultima < b.ultima ? 1 : -1));
}

/** Ejercicios a los que más anotaciones se asocian en los últimos `dias` días: [{ ejercicioId, n, max }]. */
export function porEjercicio(lista, hoy, dias = 60) {
  const m = new Map();
  for (const x of lista) {
    if (!x.ejercicioId || x.fecha > hoy || numDia(hoy) - numDia(x.fecha) >= dias) continue;
    const e = m.get(x.ejercicioId) || { ejercicioId: x.ejercicioId, n: 0, max: 0 };
    e.n++; e.max = Math.max(e.max, x.nivel); m.set(x.ejercicioId, e);
  }
  return [...m.values()].sort((a, b) => b.n - a.n || b.max - a.max);
}

/** Anotaciones de un ejercicio, de la más reciente a la más antigua. */
export const deEjercicio = (lista, ejercicioId) => ordenar(lista.filter((m) => m.ejercicioId === ejercicioId));

/** Última anotación de este ejercicio con nivel ≥ `nivelMin` en los últimos `dias` días (o null): el aviso que se ve al entrenarlo. */
export function molestiaReciente(lista, ejercicioId, hoy, { dias = 21, nivelMin = 3 } = {}) {
  return deEjercicio(lista, ejercicioId).find((m) => m.fecha <= hoy && numDia(hoy) - numDia(m.fecha) <= dias && m.nivel >= nivelMin) || null;
}

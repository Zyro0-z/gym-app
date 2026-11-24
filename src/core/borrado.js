// Borrar un ejercicio por completo: del historial, las rutinas y el catálogo. Devuelve el modelo nuevo (no toca el estado).
import { canon } from "./nombres.js";

const copia = (x) => JSON.parse(JSON.stringify(x));

/** Modelo sin el ejercicio `id`: las sesiones que se quedan sin ejercicios desaparecen y las molestias pierden el vínculo con él. */
export function modeloSinEjercicio(estado, id) {
  const es = (e) => e.ejercicioId === id || canon(e.nombre) === id;
  const sesiones = [];
  for (const s of estado.sesiones) {
    if (!s.ejercicios.some(es)) { sesiones.push(copia(s)); continue; }
    const resto = s.ejercicios.filter((e) => !es(e));
    if (resto.length) sesiones.push(Object.assign(copia(s), { ejercicios: copia(resto) }));
  }
  return {
    sesiones,
    catalogo: copia(estado.catalogo.filter((c) => c.id !== id)),
    rutinas: copia(estado.rutinas.map((r) => Object.assign({}, r, { ejercicios: r.ejercicios.filter((e) => e.ejercicioId !== id) }))),
    pesajes: copia(estado.pesajes), medidas: copia(estado.medidas || []),
    molestias: copia((estado.molestias || []).map((m) => (m.ejercicioId === id ? Object.assign({}, m, { ejercicioId: null }) : m))),
    ajustes: copia(estado.ajustes),
  };
}

/** El borrador de entreno sin el ejercicio, o null si se queda vacío. */
export function borradorSin(b, id) {
  if (!b) return b;
  const resto = b.ejercicios.filter((e) => e.ejercicioId !== id && canon(e.nombre) !== id);
  return resto.length ? Object.assign(copia(b), { ejercicios: copia(resto) }) : null;
}

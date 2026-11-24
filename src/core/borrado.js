// Borrar, renombrar o unir ejercicios en todo el modelo a la vez: historial, rutinas, molestias, catálogo y entreno en curso. Devuelven el modelo nuevo (no tocan el estado).
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

/**
 * Modelo con los ejercicios de `mapa` (Map: id o nombre canónico viejo → { id, nombre }) sustituidos por su destino en sesiones,
 * rutinas (sin repetir), molestias y entreno en curso. El catálogo ya viene resuelto. Devuelve { modelo, borrador }.
 */
export function modeloConEjerciciosUnidos(estado, mapa, catalogo) {
  const destino = (e) => mapa.get(e.ejercicioId) || mapa.get(canon(e.nombre));
  const mover = (e) => { const d = destino(e); return d ? Object.assign({}, e, { ejercicioId: d.id, nombre: d.nombre }) : e; };
  const sinRepetir = (xs) => { const vistos = new Set(); return xs.filter((e) => (vistos.has(e.ejercicioId) ? false : vistos.add(e.ejercicioId))); };
  const b = estado.borrador;
  return {
    modelo: {
      sesiones: copia(estado.sesiones.map((s) => (s.ejercicios.some(destino) ? Object.assign({}, s, { ejercicios: s.ejercicios.map(mover) }) : s))),
      catalogo: copia(catalogo),
      rutinas: copia(estado.rutinas.map((r) => Object.assign({}, r, { ejercicios: sinRepetir(r.ejercicios.map((e) => { const d = mapa.get(e.ejercicioId); return d ? Object.assign({}, e, { ejercicioId: d.id }) : e; })) }))),
      pesajes: copia(estado.pesajes), medidas: copia(estado.medidas || []),
      molestias: copia((estado.molestias || []).map((m) => { const d = m.ejercicioId && mapa.get(m.ejercicioId); return d ? Object.assign({}, m, { ejercicioId: d.id }) : m; })),
      ajustes: copia(estado.ajustes),
    },
    borrador: b ? copia(Object.assign({}, b, { ejercicios: b.ejercicios.map(mover) })) : null,
  };
}

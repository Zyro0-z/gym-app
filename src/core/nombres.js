// Normalización de nombres: la única vía por la que el sistema compara ejercicios y grupos.
// «Press militar máquina», «PRESS  MILITAR MAQUINA» y «press-militar-máquina» → «pressmilitarmaquina».

export function canon(s) {
  return String(s == null ? "" : s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "")
    .trim();
}

export const sinTildes = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Distancia de edición con tope: en cuanto supera `tope` devuelve tope + 1. */
export function levenshtein(a, b, tope) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let prev = [];
  for (let j = 0; j <= b.length; j++) prev.push(j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minFila = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      cur.push(v);
      if (v < minFila) minFila = v;
    }
    if (minFila > tope) return tope + 1;
    prev = cur;
  }
  return Math.min(prev[b.length], tope + 1);
}

export const DISTANCIA_MAX_VARIANTE = 2;

/**
 * Ejercicios con grupo más parecidos a un nombre sin grupo (todos los empatados a la
 * distancia mínima, como mucho DISTANCIA_MAX_VARIANTE). `conGrupo`: [{clave, nombre, grupo}].
 */
export function posiblesVariantes(nombre, conGrupo) {
  const k = canon(nombre);
  if (!k || conGrupo.some((x) => x.clave === k)) return [];
  let mejor = DISTANCIA_MAX_VARIANTE + 1;
  let cands = [];
  for (const x of conGrupo) {
    const d = levenshtein(k, x.clave, DISTANCIA_MAX_VARIANTE);
    if (d > DISTANCIA_MAX_VARIANTE) continue;
    if (d < mejor) { mejor = d; cands = []; }
    if (d === mejor) cands.push({ nombre: x.nombre, grupo: x.grupo, distancia: d });
  }
  return cands;
}

/** Riqueza tipográfica: mayúsculas y tildes (para elegir la grafía escrita con cuidado). */
export const riqueza = (v) => (String(v).match(/[A-ZÁÉÍÓÚÜÑ]/g) || []).length + (String(v).match(/[áéíóúüñ]/g) || []).length;

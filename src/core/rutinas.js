// Comparar lo que se ha hecho con la rutina de la que se partió. Puro.
// Solo cuentan las series de trabajo marcadas (no calentamientos). Un ejercicio sin ninguna se ignora.

/**
 * @param {{ejercicios:{ejercicioId:string, series:number, rpe?:number}[]}} rutina
 * @param {{ejercicioId:string, nombre?:string, series:{tipo?:string, hecha?:boolean}[]}[]} hecho ejercicios de la sesión
 * @param {(id:string)=>string} nombreDe
 * @returns {{ cambios:string[], ejercicios:object[] } | null} null si la rutina queda igual
 */
export function diffRutina(rutina, hecho, nombreDe = (id) => id) {
  if (!rutina) return null;
  const trabajo = hecho.map((e) => ({ id: e.ejercicioId, n: e.series.filter((s) => s.hecha && s.tipo !== "calentamiento").length })).filter((e) => e.n > 0);
  if (!trabajo.length) return null;
  const antes = new Map(rutina.ejercicios.map((e) => [e.ejercicioId, e]));
  const cambios = [];
  for (const e of trabajo) {
    const a = antes.get(e.id);
    if (!a) cambios.push("Añade " + nombreDe(e.id) + " (" + e.n + " " + (e.n === 1 ? "serie" : "series") + ")");
    else if (a.series !== e.n) cambios.push(nombreDe(e.id) + ": " + a.series + " → " + e.n + " series");
  }
  const ahora = new Set(trabajo.map((e) => e.id));
  for (const a of rutina.ejercicios) if (!ahora.has(a.ejercicioId)) cambios.push("Quita " + nombreDe(a.ejercicioId));
  const comunes = trabajo.filter((e) => antes.has(e.id)).map((e) => e.id), orden = rutina.ejercicios.map((e) => e.ejercicioId).filter((id) => ahora.has(id));
  if (comunes.join("|") !== orden.join("|")) cambios.push("Cambia el orden");
  if (!cambios.length) return null;
  return { cambios, ejercicios: trabajo.map((e) => Object.assign({ ejercicioId: e.id, series: e.n }, antes.get(e.id) && antes.get(e.id).rpe ? { rpe: antes.get(e.id).rpe } : {})) };
}

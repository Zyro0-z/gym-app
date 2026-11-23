// Volumen por músculo: series efectivas por semana con recuento fraccional.
// Un músculo principal de un ejercicio suma 1 por serie; un secundario suma `fraccion` (0,5 por
// defecto, configurable). Las revisiones dosis-respuesta del volumen (Schoenfeld y cols.) cuentan
// series directas; el recuento fraccional de los músculos que trabajan de ayudantes es una
// aproximación con apoyo preliminar (preprints de Pelland y Remmert, sin revisión por pares).
// Solo cuentan las series de trabajo (normales y al fallo; sin calentamientos).
import { claveSemana, lunesDe, masDias } from "./fechas.js";
import { ddmm } from "./fechas.js";
import { MUSCULOS } from "./musculos.js";

const red = (x) => Math.round(x * 100) / 100;

/**
 * @param {object} C    contexto (catalogo, hoy, fraccionSecundaria)
 * @param {object[]} TODAS series de todasLasSeries()
 * @param {{semanas?:number, fraccion?:number}} o
 */
export function volumenMusculos(C, TODAS, { semanas = 8, fraccion = C.fraccionSecundaria } = {}) {
  const claves = [];
  for (let i = semanas - 1; i >= 0; i--) claves.push(claveSemana(masDias(C.hoy, -7 * i)));
  const col = new Map(claves.map((k, i) => [k, i]));
  const por = new Map(MUSCULOS.map((m) => [m.id, new Array(claves.length).fill(0)]));
  const sin = new Map();
  for (const x of TODAS) {
    if (!x.dia) continue;
    const i = col.get(claveSemana(x.dia));
    if (i === undefined) continue;
    const c = C.catalogo.get(x.k), m = c && c.musculos;
    if (!m || (!m.p.length && !m.s.length)) { const g = sin.get(x.k) || { nombre: x.ejercicio, series: 0 }; g.series++; sin.set(x.k, g); continue; }
    for (const id of m.p) if (por.has(id)) por.get(id)[i] += 1;
    for (const id of m.s) if (por.has(id)) por.get(id)[i] += fraccion;
  }
  const filas = MUSCULOS.map((m) => {
    const v = por.get(m.id).map(red), n = v.length;
    const previas = v.slice(Math.max(0, n - 5), n - 1);
    return { id: m.id, nombre: m.nombre, grupo: m.grupo, porSemana: v, actual: v[n - 1], previa: v[n - 2] ?? 0,
      media4: previas.length ? red(previas.reduce((a, b) => a + b, 0) / previas.length) : 0, total: red(v.reduce((a, b) => a + b, 0)) };
  }).filter((f) => f.total > 0).sort((a, b) => b.actual - a.actual || b.media4 - a.media4);
  return { fraccion, semanas: claves.map((k) => ({ clave: k, etiqueta: ddmm(lunesDe(k)) })), filas,
    sinMusculos: [...sin.values()].sort((a, b) => b.series - a.series) };
}

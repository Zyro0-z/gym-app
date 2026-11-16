// Presentación de comparaciones periodo a periodo, sin cifras engañosas. No cambia ningún cálculo:
// recibe lo que ya calcula el análisis y decide qué se puede afirmar.
// Regla: si el periodo en curso lleva menos de la mitad de sus días, o no hay nada comparable en
// el anterior, no se da ni porcentaje ni déficit («Semana en curso» o «—»).
import { diaSemana } from "./fechas.js";
import { conSigno } from "./formato.js";

/** Fracción transcurrida de la semana ISO de `hoy`, contando hoy: lunes 1/7 … domingo 7/7. */
export const fraccionSemana = (hoy) => diaSemana(hoy) / 7;
export const MITAD = 0.5;
export const pctTexto = (p) => conSigno(p, Math.abs(p) < 10 ? 1 : 0) + " %";

/**
 * Compara el valor del periodo en curso con el del anterior.
 * @returns {{tipo: "sinDatos"|"enCurso"|"pct", texto: string, pct?: number, mejora?: boolean}}
 */
export function compararPeriodo(actual, anterior, fraccion) {
  if (!(Number(anterior) > 0) || !Number.isFinite(Number(actual))) return { tipo: "sinDatos", texto: "—" };
  if (!(fraccion >= MITAD)) return { tipo: "enCurso", texto: "Semana en curso" };
  const pct = ((actual - anterior) / anterior) * 100;
  return { tipo: "pct", pct, texto: pctTexto(pct) + " vs anterior", mejora: pct >= 0 };
}

/**
 * Estado del objetivo semanal de series de un grupo para mostrar. Con menos de media semana, un
 * «no llegará» es una previsión poco fiable: se muestra «En curso» en vez del déficit.
 * `cierre` es el de analisis.seriesObjetivo.lista[i].cierre.
 */
export function estadoObjetivoSemana(cierre, fraccion) {
  if (!cierre) return { tipo: "sinDatos", texto: "—" };
  if (cierre.estado === "noLlega" && !(fraccion >= MITAD)) return { tipo: "enCurso", texto: "En curso" };
  if (cierre.estado === "noLlega") return { tipo: "deficit", texto: "Faltan " + cierre.faltan };
  return { tipo: cierre.estado, texto: null };
}

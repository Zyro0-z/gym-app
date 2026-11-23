// El análisis viaja del Worker al hilo principal con structuredClone, que no admite funciones.
//  · aPlano(A): quita el contexto y las funciones (y la referencia a la sesión original, que el
//    hilo principal ya tiene). DESTRUCTIVO: se usa en el Worker sobre un análisis recién hecho.
//  · rehidratar(P, modelo): rehace el contexto y las funciones con los mismos datos. El resultado
//    es equivalente al de `analizar` (lo comprueba tests/core/rehidratar.test.mjs).
import { crearContexto } from "./contexto.js";
import { incrementoDe, proximaVez, avisosProgresion } from "./progresion.js";
import { balance } from "./semanal.js";
import { volumenMusculos } from "./volumen.js";
import { funcionesLiga } from "./ligas.js";

const FUNCIONES = ["progresionDe", "incrementoDe", "proximaVez", "avisosProgresion", "balance", "volumenMusculos"];
const FUNCIONES_LIGA = ["nivelDe", "pct", "progreso", "falta", "faltaTxt", "faltaGrupoTxt", "mensual"];

export function aPlano(A) {
  const P = Object.assign({}, A);
  delete P.C;
  for (const k of FUNCIONES) delete P[k];
  if (A.liga) { P.liga = Object.assign({}, A.liga); for (const k of FUNCIONES_LIGA) delete P.liga[k]; }
  for (const s of A.sesiones) delete s.ref;
  return P;
}

export function rehidratar(P, modelo) {
  const C = crearContexto(modelo, P.hoy);
  // La grafía de cada grupo es la primera que aparece al recorrer las series (como en analizar)
  for (const x of P.series) C.nombreGrupo(x.grupo);
  const porId = new Map((modelo.sesiones || []).map((s) => [s.id, s]));
  for (const s of P.sesiones) s.ref = porId.get(s.id) || null;
  const SESIONES = P.sesiones, TODAS = P.series;
  const A = Object.assign(P, {
    C,
    progresionDe: (k) => { const p = P.progresion.get(k); return p && !p.sinDatos ? p : null; },
    incrementoDe: (p) => incrementoDe(C, SESIONES, p),
    proximaVez: (p) => proximaVez(C, SESIONES, p),
    avisosProgresion,
    balance: (periodo) => balance(C, TODAS, periodo),
    volumenMusculos: (o) => volumenMusculos(C, TODAS, o),
  });
  if (P.liga && P.liga.ok) Object.assign(P.liga, funcionesLiga(C));
  return A;
}

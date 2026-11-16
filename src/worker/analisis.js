// Worker de módulo: calcula el análisis fuera del hilo principal.
// Mensaje de entrada: { id, modelo, hoy }. Respuesta: { id, A } o { id, error }.
import { analizar } from "../core/analisis.js";
import { aPlano } from "../core/rehidratar.js";

self.onmessage = (e) => {
  const { id, modelo, hoy } = e.data || {};
  try { self.postMessage({ id, A: aPlano(analizar(modelo, hoy)) }); }
  catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};

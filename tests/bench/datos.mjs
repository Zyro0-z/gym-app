// Modelo grande para medir: las sesiones de la fixture sintética repetidas hacia atrás en el tiempo.
// modeloGrande(10) ≈ 820 sesiones (la fixture tiene 82).
import { desdeLegacy } from "../../src/migracion/index.js";
import { masDias } from "../../src/core/fechas.js";
import { fixture } from "../golden/fixture.mjs";

export function modeloGrande(copias = 10) {
  const m = desdeLegacy(fixture());
  const base = m.sesiones;
  const sesiones = [];
  for (let k = 0; k < copias; k++)
    for (const s of base) sesiones.push(Object.assign(JSON.parse(JSON.stringify(s)), { id: masDias(s.fecha, -k * 196) + "-b" + k + "-" + s.id, fecha: masDias(s.fecha, -k * 196) }));
  return Object.assign({}, m, { sesiones });
}
export const HOY = "2026-11-15";

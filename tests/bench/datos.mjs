// Modelo grande para medir: las sesiones de la fixture sintética repetidas hacia atrás en el tiempo.
// modeloGrande(10) ≈ 820 sesiones (la fixture tiene 82).
import { readFileSync } from "node:fs";
import { masDias } from "../../src/core/fechas.js";

export function modeloGrande(copias = 10) {
  const m = JSON.parse(readFileSync(new URL("../golden/modelo-sintetico.json", import.meta.url), "utf8"));
  const base = m.sesiones;
  const sesiones = [];
  for (let k = 0; k < copias; k++)
    for (const s of base) sesiones.push(Object.assign(JSON.parse(JSON.stringify(s)), { id: masDias(s.fecha, -k * 196) + "-b" + k + "-" + s.id, fecha: masDias(s.fecha, -k * 196) }));
  return Object.assign({}, m, { sesiones });
}
export const HOY = "2026-11-15";

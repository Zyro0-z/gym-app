import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTablas, fusionarTablas } from "../../src/core/estandares.js";

const fila = (pc, n) => ({ pc, niveles: n });
const ok = { estandares: { "bench-press": [fila(80, [56, 75, 98, 124, 151]), fila(60, [37, 53, 72, 95, 119])] } };

test("leerTablas acepta el formato con envoltorio y ordena por peso", () => {
  const t = leerTablas(JSON.stringify(ok));
  assert.deepEqual(t["bench-press"].map((f) => f.pc), [60, 80]);
});
test("leerTablas acepta el mapa directo", () => {
  assert.ok(leerTablas(JSON.stringify(ok.estandares))["bench-press"]);
});
test("leerTablas rechaza JSON roto, vacío y filas incorrectas", () => {
  assert.throws(() => leerTablas("{"), /JSON/);
  assert.throws(() => leerTablas("[]"), /tablas/);
  assert.throws(() => leerTablas("{}"), /tablas/);
  assert.throws(() => leerTablas(JSON.stringify({ x: [] })), /vacía/);
  assert.throws(() => leerTablas(JSON.stringify({ x: [fila(80, [1, 2, 3])] })), /formato/);
  assert.throws(() => leerTablas(JSON.stringify({ x: [fila(80, [5, 4, 6, 7, 8])] })), /formato/);
  assert.throws(() => leerTablas(JSON.stringify({ x: [fila(0, [1, 2, 3, 4, 5])] })), /formato/);
});
test("fusionarTablas sustituye las claves iguales y conserva el resto", () => {
  const r = fusionarTablas({ a: [1], b: [2] }, { b: [3], c: [4] });
  assert.deepEqual(r, { a: [1], b: [3], c: [4] });
});

import test from "node:test";
import assert from "node:assert/strict";
import { generarCalentamiento } from "../../src/core/calentamiento.js";

const D = [25, 20, 15, 10, 5, 2.5, 1.25];

test("barra: sube de la barra a ~88 % con cargas montables y repeticiones decrecientes", () => {
  const w = generarCalentamiento(115, { barra: 20, discos: D });
  assert.deepEqual(w.map((x) => x.peso), [20, 45, 67.5, 85, 100]);
  assert.deepEqual(w.map((x) => x.reps), [10, 8, 5, 3, 1]);
  for (let i = 1; i < w.length; i++) assert.ok(w[i].peso > w[i - 1].peso);
  assert.ok(w.every((x) => x.peso < 115 * 0.95));
});

test("sin discos redondea al paso (máquinas, mancuernas)", () => {
  const w = generarCalentamiento(60, { paso: 2.5 });
  assert.deepEqual(w.map((x) => x.peso), [25, 35, 45, 52.5]);
});

test("pesos muy ligeros o inválidos: pocas series o ninguna", () => {
  assert.deepEqual(generarCalentamiento(0), []);
  assert.deepEqual(generarCalentamiento(-5), []);
  assert.ok(generarCalentamiento(22.5, { barra: 20, discos: D }).length <= 2);
});

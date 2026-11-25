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

test("resolverLigas: da por revisado el factor o marca sin estándar, solo los ejercicios indicados", async () => {
  const { resolverLigas } = await import("../../src/core/estandares.js");
  const cat = [{ id: "a", nombre: "A", estandar: { slug: "x", factor: 1, revisado: false } }, { id: "b", nombre: "B", rangoReps: [8, 12] }, { id: "c", nombre: "C", estandar: { slug: "y", factor: 0.8, revisado: false } }];
  const r = resolverLigas(cat, ["A"], "revisar");
  assert.deepEqual(r[0].estandar, { slug: "x", factor: 1, revisado: true });
  assert.equal(r[2], cat[2], "C no se toca");
  assert.deepEqual(resolverLigas(cat, ["B"], "sin")[1].estandar, { sin: true });
  assert.equal(cat[0].estandar.revisado, false, "no muta el original");
});

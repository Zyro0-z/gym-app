import { test } from "node:test";
import assert from "node:assert/strict";
import { modeloSinEjercicio, borradorSin } from "../../src/core/borrado.js";
import { fusionarAjustes } from "../../src/core/musculos.js";
import { leerTablas } from "../../src/core/estandares.js";

const estado = () => ({
  sesiones: [
    { id: "s1", fecha: "2026-11-01", ejercicios: [{ ejercicioId: "a", nombre: "A", series: [] }, { ejercicioId: "b", nombre: "B", series: [] }] },
    { id: "s2", fecha: "2026-11-02", ejercicios: [{ ejercicioId: "a", nombre: "A", series: [] }] },
    { id: "s3", fecha: "2026-11-03", ejercicios: [{ ejercicioId: "b", nombre: "B", series: [] }] },
  ],
  catalogo: [{ id: "a", nombre: "A" }, { id: "b", nombre: "B" }],
  rutinas: [{ id: "r", nombre: "R", ejercicios: [{ ejercicioId: "a" }, { ejercicioId: "b" }] }],
  pesajes: [{ fecha: "2026-11-01", kg: 80 }], medidas: [],
  molestias: [{ id: "m1", ejercicioId: "a", nivel: 2 }, { id: "m2", ejercicioId: "b", nivel: 1 }],
  ajustes: { x: 1 },
});

test("modeloSinEjercicio quita el ejercicio de sesiones, rutinas y catálogo, y borra las sesiones vacías", () => {
  const m = modeloSinEjercicio(estado(), "a");
  assert.deepEqual(m.sesiones.map((s) => s.id), ["s1", "s3"]);
  assert.deepEqual(m.sesiones[0].ejercicios.map((e) => e.ejercicioId), ["b"]);
  assert.deepEqual(m.catalogo.map((c) => c.id), ["b"]);
  assert.deepEqual(m.rutinas[0].ejercicios.map((e) => e.ejercicioId), ["b"]);
  assert.equal(m.pesajes.length, 1);
});
test("las molestias conservan el registro pero pierden el vínculo con el ejercicio borrado", () => {
  const m = modeloSinEjercicio(estado(), "a");
  assert.deepEqual(m.molestias.map((x) => x.ejercicioId), [null, "b"]);
});
test("no modifica el estado original", () => {
  const e = estado(), antes = JSON.stringify(e);
  modeloSinEjercicio(e, "a");
  assert.equal(JSON.stringify(e), antes);
});
test("borradorSin quita el ejercicio del entreno en curso y devuelve null si queda vacío", () => {
  const b = { ejercicios: [{ ejercicioId: "a", nombre: "A" }, { ejercicioId: "b", nombre: "B" }] };
  assert.deepEqual(borradorSin(b, "a").ejercicios.map((e) => e.ejercicioId), ["b"]);
  assert.equal(borradorSin({ ejercicios: [{ ejercicioId: "a", nombre: "A" }] }, "a"), null);
  assert.equal(borradorSin(null, "a"), null);
});
test("fusionarAjustes hereda también tipo de ancla, unilateral y modo de carga", () => {
  const r = fusionarAjustes({ id: "x" }, { tipoAncla: "pecho", unilateral: true, modoCarga: "lastre" });
  assert.equal(r.tipoAncla, "pecho"); assert.equal(r.unilateral, true); assert.equal(r.modoCarga, "lastre");
  assert.equal(fusionarAjustes({ modoCarga: "total" }, { modoCarga: "lastre" }).modoCarga, "total");
});
test("leerTablas rechaza niveles todos a cero", () => {
  assert.throws(() => leerTablas(JSON.stringify({ x: [{ pc: 80, niveles: [0, 0, 0, 0, 0] }] })), /formato/);
});

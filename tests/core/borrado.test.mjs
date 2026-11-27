import { test } from "node:test";
import assert from "node:assert/strict";
import { modeloSinEjercicio, borradorSin, modeloConEjerciciosUnidos } from "../../src/core/borrado.js";
import { fusionarAjustes } from "../../src/core/musculos.js";

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

test("unir ejercicios cambia sesiones, rutinas sin repetir, molestias y borrador a la vez", () => {
  const e = Object.assign(estado(), { borrador: { ejercicios: [{ ejercicioId: "a", nombre: "A", series: [] }] } });
  const mapa = new Map([["a", { id: "b", nombre: "B" }]]);
  const r = modeloConEjerciciosUnidos(e, mapa, [{ id: "b", nombre: "B" }]);
  assert.deepEqual(r.modelo.sesiones.map((s) => s.ejercicios.map((x) => x.ejercicioId)), [["b", "b"], ["b"], ["b"]]);
  assert.deepEqual(r.modelo.rutinas[0].ejercicios.map((x) => x.ejercicioId), ["b"]);
  assert.deepEqual(r.modelo.molestias.map((m) => m.ejercicioId), ["b", "b"]);
  assert.equal(r.borrador.ejercicios[0].nombre, "B");
  assert.equal(e.sesiones[0].ejercicios[0].ejercicioId, "a", "no muta el estado");
});
test("sin borrador, unir devuelve borrador null", () => {
  assert.equal(modeloConEjerciciosUnidos(estado(), new Map([["a", { id: "b", nombre: "B" }]]), []).borrador, null);
});

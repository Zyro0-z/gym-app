import test from "node:test";
import assert from "node:assert/strict";
import { diffRutina } from "../../src/core/rutinas.js";

const rutina = { ejercicios: [{ ejercicioId: "a", series: 3, rpe: 8 }, { ejercicioId: "b", series: 3 }] };
const s = (n, tipo = "normal") => Array.from({ length: n }, () => ({ tipo, hecha: true }));

test("igual que la rutina: sin cambios", () => {
  assert.equal(diffRutina(rutina, [{ ejercicioId: "a", series: s(3) }, { ejercicioId: "b", series: [...s(3), ...s(2, "calentamiento")] }]), null);
});

test("detecta series, ejercicios añadidos, quitados y orden; conserva el RPE objetivo", () => {
  const d = diffRutina(rutina, [{ ejercicioId: "b", series: s(3) }, { ejercicioId: "a", series: s(4) }, { ejercicioId: "c", series: s(2) }], (id) => id.toUpperCase());
  assert.deepEqual(d.cambios, ["A: 3 → 4 series", "Añade C (2 series)", "Cambia el orden"]);
  assert.deepEqual(d.ejercicios, [{ ejercicioId: "b", series: 3 }, { ejercicioId: "a", series: 4, rpe: 8 }, { ejercicioId: "c", series: 2 }]);
});

test("quitar un ejercicio sin series hechas", () => {
  const d = diffRutina(rutina, [{ ejercicioId: "a", series: s(3) }, { ejercicioId: "b", series: [{ tipo: "normal", hecha: false }] }]);
  assert.deepEqual(d.cambios, ["Quita b"]);
});

test("sin rutina o sin series hechas: null", () => {
  assert.equal(diffRutina(null, []), null);
  assert.equal(diffRutina(rutina, [{ ejercicioId: "a", series: [] }]), null);
});

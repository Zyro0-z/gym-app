import test from "node:test";
import assert from "node:assert/strict";
import { crearContexto } from "../../src/core/contexto.js";
import { leerSesiones, todasLasSeries } from "../../src/core/sesiones.js";
import { compararGimnasios } from "../../src/core/porgimnasio.js";

const ses = (id, fecha, gimnasio, kg, ej = "banca") => ({ id, fecha, ...(gimnasio ? { gimnasio } : {}), ejercicios: [{ ejercicioId: ej, nombre: ej, series: [{ peso: kg, reps: 5, tipo: "normal", hecha: true }, { peso: kg - 10, reps: 8, tipo: "normal", hecha: true }] }] });
const comparar = (sesiones) => { const m = { sesiones, catalogo: [], rutinas: [], pesajes: [], ajustes: {} }; const C = crearContexto(m, "2026-11-25"); return compararGimnasios(todasLasSeries(C, leerSesiones(C))); };

test("compara el mismo ejercicio entre gimnasios con la mediana por sesión y la referencia con más sesiones", () => {
  const r = comparar([ses("1", "2026-11-01", "casa", 100), ses("2", "2026-11-04", "casa", 100), ses("3", "2026-11-07", "casa", 110), ses("4", "2026-11-10", "club", 95)]);
  assert.equal(r.length, 1);
  const x = r[0];
  assert.equal(x.referencia, "casa");
  const casa = x.filas.find((f) => f.id === "casa"), club = x.filas.find((f) => f.id === "club");
  assert.equal(casa.sesiones, 3); assert.equal(club.sesiones, 1);
  assert.equal(casa.difPct, null);
  assert.ok(club.difPct < 0 && club.difPct > -10, "95×5 frente a una mediana de 100×5: algo más bajo");
  assert.ok(x.pocos, "el club tiene una sola sesión");
});

test("sin gimnasio en la sesión o con un solo gimnasio no hay comparación", () => {
  assert.deepEqual(comparar([ses("1", "2026-11-01", null, 100), ses("2", "2026-11-04", "club", 100)]), []);
  assert.deepEqual(comparar([ses("1", "2026-11-01", "casa", 100), ses("2", "2026-11-04", "casa", 105)]), []);
});

test("las series sin peso no entran", () => {
  const sinPeso = { id: "x", fecha: "2026-11-02", gimnasio: "club", ejercicios: [{ ejercicioId: "banca", nombre: "banca", series: [{ peso: 0, reps: 20, tipo: "normal", hecha: true }] }] };
  assert.deepEqual(comparar([ses("1", "2026-11-01", "casa", 100), sinPeso]), []);
});

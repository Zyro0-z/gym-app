import test from "node:test";
import assert from "node:assert/strict";
import { gimnasiosDe, gimnasioActivo, idGimnasio, nombreGimnasio } from "../../src/core/gimnasios.js";

test("sin gimnasios definidos hay uno implícito con la barra y los discos de siempre", () => {
  const aj = { entreno: { barra: 15, discos: [20, 10] } };
  const g = gimnasiosDe(aj);
  assert.equal(g.length, 1);
  assert.deepEqual([g[0].barra, g[0].discos], [15, [20, 10]]);
  assert.equal(gimnasioActivo(aj).id, "principal");
});

test("el gimnasio activo se elige por id y, si no existe, cae en el primero", () => {
  const aj = { gimnasios: [{ id: "a", nombre: "A", barra: 20, discos: [20] }, { id: "b", nombre: "B", barra: 15, discos: [10] }], gimnasioActivo: "b" };
  assert.equal(gimnasioActivo(aj).nombre, "B");
  assert.equal(gimnasioActivo({ ...aj, gimnasioActivo: "zzz" }).id, "a");
  assert.equal(nombreGimnasio(aj, "a"), "A");
  assert.equal(nombreGimnasio(aj, "x"), null);
});

test("idGimnasio normaliza y evita repetidos", () => {
  assert.equal(idGimnasio("Gimnasio Ñu", []), "gimnasio-nu");
  assert.equal(idGimnasio("Gym", [{ id: "gym" }, { id: "gym-2" }]), "gym-3");
  assert.equal(idGimnasio("   ", []), "gimnasio");
});

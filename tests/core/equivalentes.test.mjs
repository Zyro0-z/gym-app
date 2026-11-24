// Ejercicios equivalentes por músculo principal y descanso propio por ejercicio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { equivalentes } from "../../src/core/musculos.js";
import { validarCopia } from "../../src/data/esquema.js";
import { crearCopia } from "../../src/data/modelo.js";

const cat = [
  { id: "a", nombre: "Press banca", musculos: { p: ["pecho-esternal"], s: ["triceps-lateral-medial"] } },
  { id: "b", nombre: "Press en máquina", musculos: { p: ["pecho-esternal"], s: [] } },
  { id: "c", nombre: "Press inclinado", musculos: { p: ["pecho-clavicular", "pecho-esternal"], s: [] } },
  { id: "d", nombre: "Aperturas", musculos: { p: ["pecho-esternal", "pecho-clavicular"], s: [] } },
  { id: "e", nombre: "Sentadilla", musculos: { p: ["vastos"], s: [] } },
  { id: "f", nombre: "Sin músculos" },
];

test("equivalentes: mismo músculo principal, los idénticos primero, sin el propio ni los de otro músculo", () => {
  assert.deepEqual(equivalentes(cat, "a").map((c) => c.id), ["b", "d", "c"]);
  assert.deepEqual(equivalentes(cat, "c").map((c) => c.id), ["d", "a", "b"]);
  assert.deepEqual(equivalentes(cat, "e"), []);
  assert.deepEqual(equivalentes(cat, "f"), []);
  assert.deepEqual(equivalentes(cat, "no-existe"), []);
});

test("el descanso propio del ejercicio se valida (0-1800 s, entero)", () => {
  const base = () => JSON.parse(JSON.stringify(crearCopia(JSON.parse(readFileSync(new URL("../golden/modelo-sintetico.json", import.meta.url), "utf8")), "2026-11-15T12:00:00.000Z")));
  const o = base(); o.catalogo[0].descanso = 150;
  assert.deepEqual(validarCopia(o), []);
  for (const malo of [-1, 1.5, 5000, "90"]) { const p = base(); p.catalogo[0].descanso = malo; assert.match(validarCopia(p).join(" "), /descanso no válido/); }
});

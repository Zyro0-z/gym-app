// Asignación de músculos desde el catálogo base: nombres reales de Sergio, pecho superior frente al resto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseDe, asignarMusculos } from "../../src/core/musculos.js";

const NOMBRES = ["Press Banca (Barra)", "Press Inclinado (Manc)", "Remo Pecho Apoyado", "Jalón al Pecho", "Press Francés (Barra Z)", "Curl Bíceps Mancuernas",
  "Sentadilla Hack", "Extensión Cuádriceps", "Curl Femoral Tumbado", "Gemelos de Pie", "Crunch Abdominal (Polea Alta)", "Elevaciones Laterales (Polea)",
  "Press Plano (Manc)", "Press Militar (Máquina)", "Aperturas Polea (Baja a Alta)", "Elevaciones Laterales (Manc)", "Tríceps Polea Alta (Cuerda)",
  "Remo Polea Baja", "Remo Alto Iso-Lateral", "Pájaros (Máquina)", "Bíceps Polea Baja", "Curl Martillo", "Face-Pull"];

test("baseDe resuelve todos los nombres de la rutina real, con paréntesis y abreviaturas", () => {
  for (const n of NOMBRES) assert.ok(baseDe(n), "sin coincidencia: " + n);
  assert.equal(baseDe("Ejercicio inventado"), null);
});

test("press plano = pecho medio/inferior principal; inclinado y apertura baja a alta = pecho superior principal", () => {
  for (const n of ["Press Banca (Barra)", "Press Plano (Manc)"]) { const m = baseDe(n).musculos; assert.deepEqual(m.p, ["pecho-esternal"]); assert.ok(m.s.includes("pecho-clavicular")); }
  for (const n of ["Press Inclinado (Manc)", "Aperturas Polea (Baja a Alta)"]) { const m = baseDe(n).musculos; assert.deepEqual(m.p, ["pecho-clavicular"]); assert.ok(m.s.includes("pecho-esternal")); }
});

test("asignarMusculos rellena solo los que no tienen músculos y lista los desconocidos", () => {
  const propio = { id: "x", nombre: "Press Banca (Barra)", grupo: "Pecho", musculos: { p: ["deltoide-anterior"], s: [] } };
  const cat = [propio, { id: "y", nombre: "Press Inclinado (Manc)", grupo: null, tipoMaterial: null }, { id: "z", nombre: "Ejercicio inventado" }, { id: "w", nombre: "Dominadas", musculos: { p: [], s: [] } }];
  const r = asignarMusculos(cat);
  assert.equal(r.cambiados, 2);
  assert.deepEqual(r.catalogo[0], propio);
  assert.deepEqual(r.catalogo[1].musculos.p, ["pecho-clavicular"]);
  assert.equal(r.catalogo[1].grupo, "Pecho");
  assert.equal(r.catalogo[3].modoCarga, "lastre");
  assert.deepEqual(r.sinCoincidencia.map((c) => c.id), ["z"]);
  assert.equal(cat[1].musculos, undefined, "no muta la entrada");
});

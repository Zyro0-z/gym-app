import test from "node:test";
import assert from "node:assert/strict";
import { crearContexto } from "../../src/core/contexto.js";
import { leerSesiones, todasLasSeries } from "../../src/core/sesiones.js";
import { volumenMusculos } from "../../src/core/volumen.js";

const s = (n, tipo = "normal") => Array.from({ length: n }, () => ({ peso: 50, reps: 8, tipo, hecha: true }));
const modelo = (analisis) => ({
  sesiones: [
    { id: "a", fecha: "2026-11-23", ejercicios: [{ ejercicioId: "banca", nombre: "Banca", series: [...s(3), ...s(2, "calentamiento")] }, { ejercicioId: "raro", nombre: "Raro", series: s(2) }] },
    { id: "b", fecha: "2026-11-16", ejercicios: [{ ejercicioId: "banca", nombre: "Banca", series: s(4) }] }],
  catalogo: [{ id: "banca", nombre: "Banca", grupo: "Pecho", musculos: { p: ["pecho-esternal"], s: ["triceps-lateral-medial", "deltoide-anterior"] } },
    { id: "raro", nombre: "Raro", grupo: "Pecho" }],
  rutinas: [], pesajes: [], ajustes: analisis ? { analisis } : {},
});
const vol = (m, o) => { const C = crearContexto(m, "2026-11-25"); return volumenMusculos(C, todasLasSeries(C, leerSesiones(C)), o); };
const fila = (v, id) => v.filas.find((f) => f.id === id);

test("principales suman 1 y secundarios 0,5; los calentamientos no cuentan", () => {
  const v = vol(modelo());
  assert.equal(fila(v, "pecho-esternal").actual, 3);
  assert.equal(fila(v, "triceps-lateral-medial").actual, 1.5);
  assert.equal(fila(v, "pecho-esternal").previa, 4);
  assert.equal(fila(v, "deltoide-anterior").previa, 2);
});

test("la fracción es configurable y se acota", () => {
  assert.equal(fila(vol(modelo({ fraccionSecundaria: 0.25 })), "triceps-lateral-medial").actual, 0.75);
  assert.equal(fila(vol(modelo({ fraccionSecundaria: 7 })), "triceps-lateral-medial").actual, 1.5, "valor inválido → 0,5");
  assert.equal(fila(vol(modelo(), { fraccion: 1 }), "triceps-lateral-medial").actual, 3);
});

test("los ejercicios sin músculos se avisan aparte y la ventana son 8 semanas", () => {
  const v = vol(modelo());
  assert.deepEqual(v.sinMusculos, [{ nombre: "Raro", series: 2 }]);
  assert.equal(v.semanas.length, 8);
  assert.equal(v.filas[0].id, "pecho-esternal");
});

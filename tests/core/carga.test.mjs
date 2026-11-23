import test from "node:test";
import assert from "node:assert/strict";
import { crearContexto } from "../../src/core/contexto.js";
import { leerSesiones } from "../../src/core/sesiones.js";

const modelo = (modoCarga, pesajes = [{ fecha: "2026-11-01", kg: 80 }]) => ({
  sesiones: [{ id: "a", fecha: "2026-11-10", rutina: null, ejercicios: [{ ejercicioId: "dominadas", nombre: "Dominadas", tipo: "peso", series: [{ peso: 10, reps: 5, tipo: "normal", hecha: true }, { peso: 0, reps: 8, tipo: "normal", hecha: true }] }] }],
  catalogo: [{ id: "dominadas", nombre: "Dominadas", grupo: "Espalda", unilateral: false, tipoAncla: "peso", tipoMaterial: null, incremento: null, rangoReps: null, top: false, estandar: null, ...(modoCarga ? { modoCarga } : {}) }],
  rutinas: [], pesajes, ajustes: {},
});
const sets = (m) => leerSesiones(crearContexto(m, "2026-11-20"))[0].ejercicios[0].sets;

test("sin modo de carga, el peso es el anotado (como siempre)", () => {
  const s = sets(modelo(null));
  assert.equal(s[0].peso, 10);
  assert.equal(s[1].paraPR, false, "peso 0 no cuenta para 1RM");
});

test("lastre: carga = peso corporal + lastre; sin lastre también cuenta", () => {
  const s = sets(modelo("lastre"));
  assert.equal(s[0].peso, 90);
  assert.equal(s[1].peso, 80);
  assert.equal(s[1].paraPR, true);
  assert.equal(s[0].anotado, 10);
  assert.ok(Math.abs(s[0].oneRM - 90 * (1 + 5 / 30)) < 1e-9);
});

test("asistido: carga = peso corporal − ayuda", () => {
  const s = sets(modelo("asistido"));
  assert.equal(s[0].peso, 70);
  assert.equal(s[1].peso, 80);
});

test("sin pesajes no hay carga calculable: cuenta como serie pero no para 1RM", () => {
  const s = sets(modelo("lastre", []));
  assert.equal(s[0].paraSeries, true);
  assert.equal(s[0].paraPR, false);
});

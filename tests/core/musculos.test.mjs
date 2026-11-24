import test from "node:test";
import assert from "node:assert/strict";
import { MUSCULO, CATALOGO_BASE, baseDe, baseQueFalta, conBase } from "../../src/core/musculos.js";

test("todos los músculos del catálogo base existen en la taxonomía y no hay ids repetidos", () => {
  const ids = new Set();
  for (const c of CATALOGO_BASE) {
    assert.ok(!ids.has(c.id), "repetido " + c.id); ids.add(c.id);
    assert.ok(c.musculos.p.length > 0, c.nombre + " sin músculo principal");
    for (const m of [...c.musculos.p, ...c.musculos.s]) assert.ok(MUSCULO.has(m), c.nombre + ": músculo desconocido " + m);
    assert.equal(new Set([...c.musculos.p, ...c.musculos.s]).size, c.musculos.p.length + c.musculos.s.length, c.nombre + ": músculo repetido");
  }
});

test("baseDe reconoce nombres y alias de su rutina", () => {
  assert.equal(baseDe("Press Banca").nombre, "Press banca");
  assert.equal(baseDe("Press plano").nombre, "Press plano con mancuernas");
  assert.equal(baseDe("inventado"), null);
});

test("baseQueFalta y conBase", () => {
  assert.equal(baseQueFalta([{ id: "pressbanca" }]).length, CATALOGO_BASE.length - 1);
  const e = conBase({ id: "dominadas", nombre: "Dominadas", grupo: null, unilateral: false, tipoMaterial: null });
  assert.equal(e.modoCarga, "lastre");
  assert.equal(e.grupo, "Espalda");
  assert.deepEqual(e.musculos.p, ["dorsal", "redondo"]);
});

test("catálogo base: sin ids repetidos, con músculo principal y solo músculos y grupos conocidos", () => {
  const ids = new Set(), grupos = new Set(["Pecho", "Espalda", "Pierna", "Hombro", "Bíceps", "Tríceps", "Core", "Antebrazo"]);
  assert.ok(CATALOGO_BASE.length >= 100);
  for (const c of CATALOGO_BASE) {
    assert.ok(!ids.has(c.id), "repetido: " + c.nombre); ids.add(c.id);
    assert.ok(grupos.has(c.grupo), "grupo desconocido: " + c.nombre);
    assert.ok(c.musculos.p.length > 0, "sin principal: " + c.nombre);
    for (const m of [...c.musculos.p, ...c.musculos.s]) assert.ok(MUSCULO.has(m), c.nombre + ": músculo desconocido " + m);
    assert.ok(!c.musculos.s.some((m) => c.musculos.p.includes(m)), c.nombre + ": músculo a la vez principal y secundario");
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { caidaSesion, derivaEjercicio } from "../../src/core/deriva.js";

const ses = (...reps) => ({ series: reps.map((r) => ({ peso: 100, reps: r })) });

test("caída del e1RM de la primera a la última serie; necesita 3 series", () => {
  assert.equal(caidaSesion([{ peso: 100, reps: 8 }, { peso: 100, reps: 8 }]), null);
  assert.equal(caidaSesion([{ peso: 100, reps: 8 }, { peso: 100, reps: 8 }, { peso: 100, reps: 8 }]), 0);
  assert.ok(caidaSesion([{ peso: 100, reps: 8 }, { peso: 100, reps: 6 }, { peso: 100, reps: 4 }]) > 8);
});

test("sin base personal usa el umbral genérico y lo dice", () => {
  const d = derivaEjercicio([ses(8, 8, 8), ses(8, 6, 4)]);
  assert.equal(d.generica, true);
  assert.equal(d.alta, true);
  assert.equal(d.personal, null);
});

test("con historial usa el umbral personal: la misma caída es normal para quien suele caer mucho", () => {
  const cae = [ses(8, 7, 6), ses(8, 7, 5), ses(8, 6, 5), ses(8, 7, 6), ses(8, 7, 5)];
  const d = derivaEjercicio([...cae, ses(8, 7, 5)]);
  assert.equal(d.generica, false);
  assert.equal(d.alta, false, "5 reps al final es lo habitual");
  const estable = [ses(8, 8, 8), ses(8, 8, 7), ses(8, 8, 8), ses(8, 8, 8), ses(8, 8, 7)];
  assert.equal(derivaEjercicio([...estable, ses(8, 7, 5)]).alta, true, "para quien apenas cae, esta caída destaca");
});

test("sin series suficientes en la sesión actual: null", () => {
  assert.equal(derivaEjercicio([ses(8, 8, 8), ses(8, 8)]), null);
  assert.equal(derivaEjercicio([]), null);
});

test("si sueles subir de serie a serie, el umbral no es negativo y una caída pequeña no es alarma", () => {
  const sube = [ses(8, 8, 9), ses(8, 9, 9), ses(8, 8, 9), ses(8, 9, 10), ses(8, 8, 9)];
  const d = derivaEjercicio([...sube, ses(8, 8, 8)]);
  assert.ok(d.umbral >= 3, "umbral " + d.umbral);
  assert.equal(d.alta, false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { compararPeriodo, estadoObjetivoSemana, fraccionSemana } from "../../src/core/presentacion.js";

test("fracción de la semana: lunes 1/7, jueves 4/7, domingo 7/7", () => {
  assert.equal(fraccionSemana("2026-11-16"), 1 / 7);
  assert.equal(fraccionSemana("2026-11-19"), 4 / 7);
  assert.equal(fraccionSemana("2026-11-22"), 1);
});

test("inicio de semana: nunca «−100 %»", () => {
  const r = compararPeriodo(0, 5000, fraccionSemana("2026-11-16"));
  assert.equal(r.tipo, "enCurso");
  assert.equal(r.texto, "Semana en curso");
  assert.equal(compararPeriodo(0, 5000, fraccionSemana("2026-11-18")).tipo, "enCurso", "miércoles: 3/7 < mitad");
});

test("sin nada comparable: «—», nunca un porcentaje sobre cero", () => {
  for (const ant of [0, null, undefined, NaN]) assert.equal(compararPeriodo(3000, ant, 1).texto, "—");
});

test("a partir de media semana, porcentaje con signo tipográfico", () => {
  const r = compararPeriodo(4500, 5000, fraccionSemana("2026-11-19"));
  assert.equal(r.tipo, "pct");
  assert.equal(r.texto, "−10 % vs anterior");
  assert.equal(r.mejora, false);
  assert.equal(compararPeriodo(5250, 5000, 1).texto, "+5,0 % vs anterior");
  assert.equal(compararPeriodo(5000, 5000, 1).texto, "±0,0 % vs anterior");
});

test("objetivo semanal: «Faltan N» solo con media semana o más", () => {
  const c = { estado: "noLlega", faltan: 6 };
  assert.deepEqual(estadoObjetivoSemana(c, 2 / 7), { tipo: "enCurso", texto: "En curso" });
  assert.deepEqual(estadoObjetivoSemana(c, 5 / 7), { tipo: "deficit", texto: "Faltan 6" });
  assert.equal(estadoObjetivoSemana({ estado: "enRango" }, 1 / 7).tipo, "enRango");
  assert.equal(estadoObjetivoSemana(null, 1).texto, "—");
});

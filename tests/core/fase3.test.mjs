import { test } from "node:test";
import assert from "node:assert/strict";
import { e1rmAjustado, rir, esRpe, rpeTxt, CHIPS_RPE } from "../../src/core/rpe.js";
import { epley } from "../../src/core/sesiones.js";
import { calcularDiscos, agrupar } from "../../src/core/discos.js";
import { sugerirCarga } from "../../src/core/sugerencia.js";

test("RPE: validez, RIR y texto", () => {
  for (const r of CHIPS_RPE) assert.ok(esRpe(r));
  for (const r of [4.5, 10.5, 8.3, "8", NaN, null, undefined]) assert.equal(esRpe(r), false);
  assert.equal(rir(8), 2); assert.equal(rir(9.5), 0.5); assert.equal(rir(null), null);
  assert.equal(rpeTxt(8.5), "8,5"); assert.equal(rpeTxt(null), "");
});

test("e1rmAjustado: RIR = 10 − RPE sumado a las reps; sin RPE, Epley", () => {
  assert.equal(e1rmAjustado(100, 5, 10), epley(100, 5));
  assert.equal(e1rmAjustado(100, 5, 8), epley(100, 7));
  assert.equal(e1rmAjustado(100, 5, null), epley(100, 5));
  assert.equal(e1rmAjustado(100, 1, 10), 100);
  assert.ok(e1rmAjustado(100, 5, 7) > e1rmAjustado(100, 5, 9));
  assert.equal(e1rmAjustado(0, 5, 8), 0);
  assert.equal(e1rmAjustado(100, 0, 8), 0);
});

test("discos: exacto, sin solución exacta y errores", () => {
  const D = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
  assert.deepEqual(calcularDiscos(100, 20, D), { porLado: [25, 15], lado: 40, logrado: 100, falta: 0 });
  assert.deepEqual(agrupar(calcularDiscos(142.5, 20, D).porLado), [{ kg: 25, n: 2 }, { kg: 10, n: 1 }, { kg: 1.25, n: 1 }]);
  assert.equal(calcularDiscos(20, 20, D).porLado.length, 0);
  const r = calcularDiscos(100.4, 20, D);
  assert.equal(r.logrado, 100); assert.equal(r.falta, 0.4);
  assert.equal(calcularDiscos(101, 20, D).falta, 0);
  assert.ok(calcularDiscos(10, 20, D).error);
  assert.ok(calcularDiscos(0, 20, D).error);
});

test("sugerencia de carga a partir de la doble progresión", () => {
  const p = (clave, pesoMax, reps) => ({ clave, pesoMax, obj: { min: 6, max: 10 }, work: reps.map((r) => ({ peso: pesoMax, reps: r })) });
  assert.deepEqual(sugerirCarga(p("sube", 80, [10, 10]), { kg: 2.5 }), { peso: 82.5, reps: 6, motivo: "Llegaste al tope del rango" });
  assert.equal(sugerirCarga(p("sube", 80, [10, 10]), null), null);
  assert.equal(sugerirCarga(p("mantén", 80, [8, 7]), null).reps, 9);
  assert.equal(sugerirCarga(p("mantén", 80, [10, 7]), null).reps, 10);
  assert.equal(sugerirCarga(p("debajo", 80, [5]), { kg: 2.5 }).peso, 77.5);
  assert.equal(sugerirCarga(p("debajo", 2, [5]), { kg: 2.5 }), null);
  assert.equal(sugerirCarga({ sinDatos: true }, null), null);
});

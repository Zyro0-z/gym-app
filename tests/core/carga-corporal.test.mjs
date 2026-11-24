// Carga del sistema con peso corporal (lastre / asistido) y peso corporal vigente en una fecha.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cargaTotal, pesoCorporalEn } from "../../src/core/sesiones.js";

test("cargaTotal: total, lastre y asistido", () => {
  assert.equal(cargaTotal("total", 100, 80), 100);
  assert.equal(cargaTotal("lastre", 15, 80), 95);
  assert.equal(cargaTotal("lastre", 15, null), 0);
  assert.equal(cargaTotal("asistido", 30, 80), 50);
  assert.equal(cargaTotal("asistido", 120, 80), 0);
});

test("pesoCorporalEn: el último pesaje hasta ese día, o el más antiguo si todos son posteriores", () => {
  const p = [{ fecha: "2026-11-10", kg: 81 }, { fecha: "2026-11-01", kg: 80 }];
  assert.equal(pesoCorporalEn(p, "2026-11-05"), 80);
  assert.equal(pesoCorporalEn(p, "2026-11-20"), 81);
  assert.equal(pesoCorporalEn(p, "2026-10-01"), 80);
  assert.equal(pesoCorporalEn([], "2026-11-05"), null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { leerConfig, leerLineas, desdeLegacy } from "../../src/core/legacy.js";
import { fixture } from "../golden/fixture.mjs";

test("líneas «clave:: valor» con sus tipos", () => {
  const p = leerLineas("Pecho:: 12-16\n2026-09-14:: 78,5\n2026-09-15:: 78,5 kg\nfactor:: 1,4\n- **Remo:: Espalda**\n`ejemplo:: no`");
  assert.equal(p.Pecho, "12-16");
  assert.deepEqual(p["2026-09-14"], [78, 5]);
  assert.equal(p["2026-09-15"], "78,5 kg");
  assert.deepEqual(p.factor, [1, 4]);
  assert.equal(p.Remo, "Espalda**");
  assert.equal(p.ejemplo, undefined);
});
test("rechaza lo que rechazaba la versión 1", () => {
  const c = leerConfig({ "Gym/Config/peso-corporal.md": "2026-01-01:: 80\n2026-01-02:: 80 kg\n2026-01-03:: 300 kg\nsexo:: hombre",
    "Gym/Config/objetivos.md": "Remo:: 12-8\nPress:: 6-10 | top | +5" });
  assert.deepEqual(c.PESO.registros, [{ fecha: "2026-01-02", kg: 80 }]);
  assert.equal(c.PESO.sexo, "h");
  assert.equal(c.errores.length, 3);
  assert.deepEqual(c.OBJETIVOS.mapa.get("press"), { nombre: "Press", min: 6, max: 10, top: true, inc: 5, tipo: null });
});
test("el modelo nuevo conserva todas las sesiones y series", () => {
  const d = fixture();
  const m = desdeLegacy(d);
  assert.equal(m.sesiones.length, d.sessions.length);
  const series = (xs, f) => xs.reduce((a, s) => a + f(s), 0);
  assert.equal(series(m.sesiones, (s) => s.ejercicios.reduce((a, e) => a + e.series.length, 0)),
               series(d.sessions, (s) => s.fm.exercises.reduce((a, e) => a + e.sets.length, 0)));
  assert.ok(m.sesiones.every((s) => s.ejercicios.every((e) => m.catalogo.some((c) => c.id === e.ejercicioId))));
  const lb = m.sesiones.find((s) => s.fecha === "2026-05-08").ejercicios.find((e) => e.ejercicioId === "pressmilitarmancuernas");
  assert.ok(Math.abs(lb.series[0].peso - 88 * 0.45359237) < 1e-9);
});

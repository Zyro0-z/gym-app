import test from "node:test";
import assert from "node:assert/strict";
import { pesoParaFallo, cargaParaRpe, backoffs, confianzaSerie, ruidoE1rm, e1rmReciente, prPorRango, superaRecord, rangoDe, ajustarPorRpe } from "../../src/core/prescripcion.js";
import { e1rmAjustado } from "../../src/core/rpe.js";

test("la carga para un RPE es la inversa del e1RM ajustado", () => {
  const e1 = e1rmAjustado(100, 5, 8);                    // 100 × 5 @8 = al fallo en 7
  assert.ok(Math.abs(pesoParaFallo(e1, 7) - 100) < 1e-9);
  assert.equal(cargaParaRpe(e1, 5, 8, 2.5), 100);
  assert.ok(cargaParaRpe(e1, 5, 9, 2.5) > 100, "a RPE más alto, más peso para las mismas reps");
  assert.equal(cargaParaRpe(e1, 5, 4, 2.5), 0, "RPE inválido");
});

test("back-offs: mismas reps a RPE 9, nunca más pesados que la serie top", () => {
  const b = backoffs({ peso: 115, reps: 4, rpe: 9.5 }, { n: 2, rpe: 9, paso: 2.5 });
  assert.equal(b.length, 2);
  assert.deepEqual(b[0], { peso: 112.5, reps: 4, rpe: 9 });
  const fino = backoffs({ peso: 115, reps: 4, rpe: 9.5 }, { paso: 0.5 }), sinRpe = backoffs({ peso: 115, reps: 4 }, { paso: 0.5 });
  assert.ok(sinRpe[0].peso < fino[0].peso, "sin RPE se asume el fallo: más ligero");
  const pide = backoffs({ peso: 100, reps: 5, rpe: 8 }, { rpe: 10, paso: 2.5 });
  assert.ok(pide[0].peso <= 100);
});

test("confianza: baja con muchas reps o RPE lejano; alta con pocas reps cerca del fallo", () => {
  assert.equal(confianzaSerie({ reps: 4, rpe: 9 }), "alta");
  assert.equal(confianzaSerie({ reps: 8, rpe: 9 }), "media");
  assert.equal(confianzaSerie({ reps: 5 }), "media");
  assert.equal(confianzaSerie({ reps: 15, rpe: 9 }), "baja");
  assert.equal(confianzaSerie({ reps: 5, rpe: 7 }), "baja");
});

test("ruido del e1RM: necesita 5 sesiones y mide la dispersión sobre la tendencia", () => {
  assert.equal(ruidoE1rm([{ mejorRM: 100 }, { mejorRM: 101 }]), null);
  const lineal = ruidoE1rm([100, 102, 104, 106, 108].map((v) => ({ mejorRM: v })));
  assert.equal(lineal.sd, 0);
  const ruidoso = ruidoE1rm([100, 106, 99, 107, 100, 108].map((v) => ({ mejorRM: v })));
  assert.ok(ruidoso.sd > 2 && ruidoso.pct > 2);
});

const ej = (hist, rm) => ({ hist, rmMax: rm ? { st: { oneRM: rm } } : null });
const sesion = (dia, series) => ({ dia, series, mejorRM: 0 });

test("PR por rango de repeticiones y detección de récord", () => {
  const e = ej([sesion("2026-11-01", [{ peso: 100, reps: 5 }, { peso: 90, reps: 8 }]), sesion("2026-11-08", [{ peso: 102.5, reps: 4 }, { peso: 90, reps: 9 }])], 117);
  const pr = prPorRango(e);
  assert.deepEqual(pr.map((x) => [x.rango.id, x.peso]), [["4-5", 102.5], ["6-8", 90], ["9-12", 90]]);
  assert.equal(rangoDe(5).id, "4-5");
  assert.equal(superaRecord(e, 105, 4).tipo, "e1rm");
  const r = superaRecord(ej([sesion("d", [{ peso: 100, reps: 5 }])], 500), 102.5, 5);
  assert.equal(r.tipo, "rango");
  assert.equal(superaRecord(e, 100, 5), null, "100×5 no supera 102,5 en 4–5 ni el e1RM");
  assert.equal(superaRecord(ej([], 0), 50, 5), null, "sin historial no hay récord que superar");
});

test("e1RM reciente usa la última sesión y su RPE", () => {
  const e = ej([sesion("2026-11-01", [{ peso: 100, reps: 5 }]), sesion("2026-11-08", [{ peso: 100, reps: 5, rpe: 8 }, { peso: 90, reps: 8, rpe: 9 }])], 120);
  const r = e1rmReciente(e);
  assert.equal(r.dia, "2026-11-08");
  assert.equal(r.e1rm, Math.round(e1rmAjustado(100, 5, 8) * 10) / 10);
  assert.equal(r.confianza, "media");
});

test("la progresión consciente del RPE consolida cuando el esfuerzo ya es máximo", () => {
  const p = { clave: "sube", pesoMax: 80, obj: { min: 6, max: 10 }, work: [{ rpe: 10, reps: 10 }, { rpe: 9.5, reps: 10 }] };
  const a = ajustarPorRpe({ peso: 82.5, reps: 6, motivo: "x" }, p, 8);
  assert.deepEqual([a.peso, a.reps, a.consolida], [80, 10, true]);
  const q = { clave: "mantén", pesoMax: 80, obj: { min: 6, max: 10 }, work: [{ rpe: 6.5, reps: 8 }] };
  assert.equal(ajustarPorRpe({ peso: 80, reps: 9, motivo: "m" }, q, 8).holgura, true);
  const sinRpe = { clave: "sube", pesoMax: 80, obj: { min: 6, max: 10 }, work: [{ reps: 10 }] };
  assert.equal(ajustarPorRpe({ peso: 82.5, reps: 6, motivo: "x" }, sinRpe, 8).peso, 82.5);
});

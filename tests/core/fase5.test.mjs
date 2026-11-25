// Fase 5: informe de fatiga, propuesta de descarga, comparar periodos, CSV y medidas.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analizar } from "../../src/core/analisis.js";
import { ajustesBase } from "../../src/data/modelo.js";
import { masDias } from "../../src/core/fechas.js";
import { informeFatiga } from "../../src/core/fatiga.js";
import { propuestaDescarga } from "../../src/core/descarga.js";
import { compararPeriodos, rangos, pct } from "../../src/core/comparar.js";
import { csvSeries, csvPesajes, aCsv } from "../../src/core/csv.js";
import { validarMedida, ponerMedida, ultimaMedida, serieMedida } from "../../src/core/medidas.js";

const HOY = "2026-11-16";                 // lunes
const CAT = [
  { id: "press", nombre: "Press banca", grupo: "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null },
  { id: "remo", nombre: "Remo", grupo: "Espalda", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra", incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null },
];
/** 10 semanas, 2 sesiones por semana (lunes y jueves). `f(semanaDesdeElFinal)` da { kg, rpe, sueno }. */
function modelo(f, { bloques = [] } = {}) {
  const sesiones = [];
  for (let w = 10; w >= 1; w--) for (const d of [0, 3]) {
    const fecha = masDias(HOY, -7 * w + d), x = f(w);
    const serie = (kg) => ({ peso: kg, reps: 8, tipo: "normal", hecha: true, ...(x.rpe != null ? { rpe: x.rpe } : {}) });
    sesiones.push({ id: fecha + "-a", rutina: null, fecha, inicio: "18:00", fin: "19:00", duracion: 60,
      ...(x.sueno != null ? { recuperacion: { sueno: x.sueno, estres: 2, energia: 4 } } : {}),
      ejercicios: [{ ejercicioId: "press", nombre: "Press banca", tipo: "peso", series: [serie(x.kg), serie(x.kg)] },
                   { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [serie(x.kg - 20), serie(x.kg - 20)] }] });
  }
  const ajustes = ajustesBase(); ajustes.bloques = bloques;
  return { sesiones, catalogo: CAT, rutinas: [], pesajes: [], ajustes };
}
const A = (m) => analizar(m, HOY);

test("informe de fatiga: semanas completas, RPE y recuperación; sin NaN", () => {
  const I = informeFatiga(A(modelo((w) => ({ kg: 100, rpe: w <= 2 ? 9 : 8, sueno: 7.5 }))));
  assert.equal(I.suficiente, true);
  assert.ok(I.semanas.length >= 4 && I.semanas.length <= 8);
  const u = I.semanas[I.semanas.length - 1];
  assert.equal(u.lunes, masDias(HOY, -7)); assert.equal(u.sesiones, 2); assert.equal(u.series, 8);
  assert.equal(u.rpe, 9); assert.equal(u.sueno, 7.5); assert.equal(u.e1rmPct, 0);
  for (const s of I.semanas) for (const v of Object.values(s)) assert.ok(v === null || typeof v !== "number" || Number.isFinite(v));
  assert.equal(I.actual.sesiones, 0, "la semana en curso va aparte");
});

test("informe de fatiga: con menos de 4 semanas no dice nada", () => {
  const m = modelo(() => ({ kg: 100 })); m.sesiones = m.sesiones.slice(-6);
  const I = informeFatiga(A(m));
  assert.equal(I.suficiente, false); assert.equal(I.semanasConDatos, 3);
});

test("descarga: se propone con caída de e1RM tras 6 semanas sin descargar", () => {
  const P = propuestaDescarga(A(modelo((w) => ({ kg: w <= 2 ? 95 : 100 }))), {});
  assert.equal(P.proponer, true);
  assert.match(P.motivos[0], /e1RM ha bajado .* en 2 de 2 ejercicios/);
  assert.equal(P.inicio, HOY, "empieza el lunes");
});

test("descarga: sin señales, pospuesta, descartada o con descarga reciente no se propone", () => {
  assert.equal(propuestaDescarga(A(modelo(() => ({ kg: 100 }))), {}).proponer, false);
  const cae = A(modelo((w) => ({ kg: w <= 2 ? 95 : 100 })));
  assert.equal(propuestaDescarga(cae, { pospuestaHasta: "2026-11-20" }).motivo, "pospuesta");
  assert.equal(propuestaDescarga(cae, { descartadaEn: "2026-11-10" }).motivo, "descartada");
  assert.equal(propuestaDescarga(cae, { descartadaEn: "2026-10-01" }).proponer, true);
  const conDeload = A(modelo((w) => ({ kg: w <= 2 ? 95 : 100 }), { bloques: [{ id: "d", inicio: "2026-10-12", fin: "2026-10-18", tipo: "deload", grupos: [] }] }));
  assert.equal(propuestaDescarga(conDeload, {}).motivo, "pronto");
  assert.equal(propuestaDescarga(cae, { ejercicios: 3 }).proponer, false, "umbral configurable");
});

test("descarga: RPE que sube y poco sueño son señales", () => {
  const P = propuestaDescarga(A(modelo((w) => ({ kg: 100, rpe: w <= 2 ? 9.5 : 8, sueno: w <= 2 ? 6 : 8 }))), {});
  assert.equal(P.proponer, true);
  assert.deepEqual(P.motivos, ["El RPE medio ha subido de 8 a 9,5.", "Has dormido 6 h de media, 2 h menos que las 2 semanas anteriores."]);
});

test("descarga: dormir poco de forma habitual no es señal; solo una bajada respecto a tu normal", () => {
  const habitual = propuestaDescarga(A(modelo(() => ({ kg: 100, rpe: 8, sueno: 6 }))), {});
  assert.equal(habitual.proponer, false, "6 h siempre = tu normal");
});

test("comparar periodos: mismos días, sin % desde cero", () => {
  assert.deepEqual(rangos("4s", HOY), { actual: ["2026-10-20", HOY], anterior: ["2026-09-22", "2026-10-19"], dias: 28 });
  assert.deepEqual(rangos("mes", HOY), { actual: ["2026-11-01", HOY], anterior: ["2026-10-01", "2026-10-16"], dias: 16 });
  assert.deepEqual(rangos("mes", "2026-03-31").anterior, ["2026-02-01", "2026-02-28"], "no se sale del mes anterior");
  const R = compararPeriodos(A(modelo((w) => ({ kg: w <= 3 ? 105 : 100 }))), "4s");
  assert.equal(R.actual.sesiones, 7); assert.equal(R.anterior.sesiones, 8);     // 20/10-16/11 y 22/09-19/10
  assert.equal(R.ejercicios.length, 2);
  assert.ok(Math.abs(R.ejercicios.find((e) => e.nombre === "Press banca").pct - 5) < 1e-9);
  assert.ok(Math.abs(R.ejercicios.find((e) => e.nombre === "Remo").pct - 6.25) < 1e-9);
  assert.equal(R.ejercicios[0].nombre, "Remo", "de más a menos mejora");
  assert.equal(pct(5, 0), null); assert.equal(pct(0, 0), null);
});

test("CSV: BOM, «;», coma decimal y comillas", () => {
  const m = modelo((w) => ({ kg: 82.5, rpe: 8.5 }));
  m.sesiones[0].nota = 'Bien; "fuerte"';
  const t = csvSeries(m.sesiones, CAT, m.ajustes);
  assert.ok(t.startsWith("﻿fecha;hora;rutina;ejercicio;grupo;"));
  const l = t.split("\r\n");
  assert.equal(l.length, 1 + 20 * 4 + 1);
  const c = l[1].split(";");
  assert.equal(c[8], "82,5"); assert.equal(c[11], "8,5"); assert.equal(c[12], "104,5");
  assert.ok(l[1].endsWith('"Bien; ""fuerte"""'));
  assert.ok(!t.includes("NaN") && !t.includes("undefined"));
  assert.equal(csvPesajes([{ fecha: "2026-11-02", kg: 78.4 }, { fecha: "2026-11-01", kg: 79 }]), "﻿fecha;peso_kg\r\n2026-11-01;79\r\n2026-11-02;78,4\r\n");
  assert.equal(aCsv(["a"], [[1.5]], { separador: ",", decimal: "." }), "﻿a\r\n1.5\r\n");
});

test("medidas: validación, una por fecha y cambio", () => {
  assert.deepEqual(validarMedida({ fecha: "2026-11-16", cintura: 82.5 }, HOY), []);
  assert.match(validarMedida({ fecha: "2026-11-16" }, HOY)[0], /al menos una/);
  assert.match(validarMedida({ fecha: "2026-11-16", brazo: 5 }, HOY)[0], /Brazo: entre 10 y 300/);
  assert.match(validarMedida({ fecha: "2026-11-30", brazo: 35 }, HOY)[0], /futura/);
  assert.match(validarMedida({ fecha: "2026-02-30", brazo: 35 }, HOY)[0], /fecha/);
  let l = ponerMedida([], { fecha: "2026-11-10", cintura: 84 });
  l = ponerMedida(l, { fecha: "2026-11-16", cintura: 82.54, brazo: 37 });
  l = ponerMedida(l, { fecha: "2026-11-10", cintura: 84.2 });
  assert.deepEqual(l, [{ fecha: "2026-11-10", cintura: 84.2 }, { fecha: "2026-11-16", cintura: 82.5, brazo: 37 }]);
  assert.deepEqual(ultimaMedida(l, "cintura"), { fecha: "2026-11-16", valor: 82.5, cambio: -1.7, desde: "2026-11-10" });
  assert.equal(ultimaMedida(l, "brazo").cambio, null);
  assert.equal(ultimaMedida(l, "cuello"), null);
  assert.equal(serieMedida(l, "brazo").length, 1);
});

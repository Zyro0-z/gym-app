// Fase 5: CSV.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analizar } from "../../src/core/analisis.js";
import { ajustesBase } from "../../src/data/modelo.js";
import { masDias } from "../../src/core/fechas.js";
import { csvSeries, csvPesajes, aCsv } from "../../src/core/csv.js";

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
      ejercicios: [{ ejercicioId: "press", nombre: "Press banca", tipo: "peso", series: [serie(x.kg), serie(x.kg)] },
                   { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [serie(x.kg - 20), serie(x.kg - 20)] }] });
  }
  const ajustes = ajustesBase(); ajustes.bloques = bloques;
  return { sesiones, catalogo: CAT, rutinas: [], pesajes: [], ajustes };
}
const A = (m) => analizar(m, HOY);

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

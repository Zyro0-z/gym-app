// Fase 4 y 5: estadística, rendimiento frente a recuperación, bandas de RPE, mesociclos, molestias y tarjeta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { analizar } from "../../src/core/analisis.js";
import { ajustesBase } from "../../src/data/modelo.js";
import { masDias } from "../../src/core/fechas.js";
import { media, mediana, desviacion, rangos, spearman, mediaConIntervalo } from "../../src/core/estadistica.js";
import { indicesDeSesion, analizarRendimiento } from "../../src/core/rendimiento.js";
import { distribucionRpe, semanasRpe } from "../../src/core/rpebandas.js";
import { validarMesociclo, estadoMesociclo, mesocicloActual, ponerMesociclo, quitarMesociclo, lunesDeMeso, finDeMeso, resumenMesociclo, idBloqueDe } from "../../src/core/mesociclos.js";
import { validarMolestia, resumenMolestias, porEjercicio, deEjercicio, ordenar } from "../../src/core/molestias.js";
import { datosTarjeta } from "../../src/core/tarjeta.js";

const HOY = "2026-11-16";                 // lunes
const CAT = ["press", "remo"].map((id, i) => ({ id, nombre: i ? "Remo" : "Press banca", grupo: i ? "Espalda" : "Pecho", unilateral: false, tipoAncla: "peso", tipoMaterial: "barra",
  incremento: null, rangoReps: { min: 6, max: 10 }, top: false, estandar: null }));
/** 10 semanas × 2 sesiones. `f(semanaDesdeElFinal, d)` → { kg, rpe, rec: {sueno,estres,energia} }. */
function modelo(f, { bloques = [], mesociclos = [] } = {}) {
  const sesiones = [];
  for (let w = 10; w >= 1; w--) for (const d of [0, 3]) {
    const fecha = masDias(HOY, -7 * w + d), x = f(w, d);
    const serie = (kg) => ({ peso: kg, reps: 8, tipo: "normal", hecha: true, ...(x.rpe != null ? { rpe: x.rpe } : {}) });
    sesiones.push({ id: fecha + "-a", rutina: null, fecha, inicio: "18:00", fin: "19:00", duracion: 60, ...(x.rec ? { recuperacion: x.rec } : {}),
      ejercicios: [{ ejercicioId: "press", nombre: "Press banca", tipo: "peso", series: [serie(x.kg), serie(x.kg)] },
                   { ejercicioId: "remo", nombre: "Remo", tipo: "peso", series: [serie(x.kg - 20), serie(x.kg - 20)] }] });
  }
  const ajustes = ajustesBase(); ajustes.bloques = bloques; ajustes.mesociclos = mesociclos;
  return { sesiones, catalogo: CAT, rutinas: [], pesajes: [], ajustes };
}
const A = (m) => analizar(m, HOY);

/* ---------- estadística ---------- */
test("estadística: media, mediana, desviación y rangos con empates", () => {
  assert.equal(media([]), null); assert.equal(media([1, 2, 6]), 3);
  assert.equal(mediana([5, 1, 3]), 3); assert.equal(mediana([1, 2, 3, 10]), 2.5); assert.equal(mediana([]), null);
  assert.equal(desviacion([1]), null); assert.ok(Math.abs(desviacion([2, 4, 4, 4, 5, 5, 7, 9]) - 2.138) < 0.001);
  assert.deepEqual(rangos([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
});
test("spearman: correlación perfecta, inversa, sin variación y con pocos datos", () => {
  const x = Array.from({ length: 14 }, (_, i) => i);
  const p = spearman(x, x.map((v) => v * 3 + 1));
  assert.equal(p.rho, 1); assert.equal(p.concluyente, true);
  assert.equal(spearman(x, x.map((v) => -v)).rho, -1);
  assert.equal(spearman(x, x.map(() => 5)).rho, null);
  assert.equal(spearman([1, 2], [1, 2]).rho, null);
  const corto = spearman([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  assert.equal(corto.rho, 1); assert.equal(corto.concluyente, false, "n < 12 nunca es concluyente");
  assert.equal(spearman([1, 2, 3], [1, 2]).rho, null, "tamaños distintos");
});
test("mediaConIntervalo: con n < 3 no hay intervalo; con más, contiene la media", () => {
  assert.deepEqual(mediaConIntervalo([4, 6]), { n: 2, media: 5, lo: null, hi: null });
  const r = mediaConIntervalo([1, 2, 3, 4, 5]);
  assert.equal(r.media, 3); assert.ok(r.lo < 3 && r.hi > 3);
});

/* ---------- rendimiento ---------- */
test("rendimiento: el índice compara con las 5 sesiones previas y descarta las de descarga", () => {
  const m = modelo((w, d) => ({ kg: 100 + (w === 1 && d === 3 ? 10 : 0), rec: { sueno: 7, estres: 2, energia: 4 } }));
  const I = indicesDeSesion(A(m));
  assert.ok(I.length > 0);
  assert.equal(I[0].dia > "2026-09-01", true);
  const ultima = I[I.length - 1];
  assert.ok(ultima.indice > 5, "la sesión con +10 kg supera la mediana previa");
  assert.ok(I.slice(0, -1).every((x) => Math.abs(x.indice) < 1e-9));
  const desc = modelo(() => ({ kg: 100 }), { bloques: [{ id: "b", inicio: masDias(HOY, -14), fin: masDias(HOY, -8), tipo: "deload", grupos: [] }] });
  const D = indicesDeSesion(A(desc));
  assert.ok(D.every((x) => x.dia < masDias(HOY, -14) || x.dia > masDias(HOY, -8)), "ninguna sesión en descarga puntúa");
});
test("rendimiento: sueño que sube con el rendimiento da correlación positiva concluyente y n visible", () => {
  const m = modelo((w, d) => { const k = (10 - w) * 2 + d; return { kg: 100 + (k % 4) * 3, rec: { sueno: 5 + (k % 4), estres: 3, energia: 3 } }; });
  const R = analizarRendimiento(A(m));
  const s = R.factores.find((f) => f.id === "sueno");
  assert.equal(R.factores.length, 3);
  assert.ok(s.n >= 12); assert.ok(s.rho > 0);
  assert.equal(s.bandas.reduce((a, b) => a + b.n, 0), s.n, "cada sesión cae en una sola banda");
  assert.match(s.veredicto, /más sueño, más rendimiento|sin conclusión/);
});
test("rendimiento: datos constantes → sin correlación y bandas con pocos datos «no suficientes»", () => {
  const R = analizarRendimiento(A(modelo(() => ({ kg: 100, rec: { sueno: 7.5, estres: 2, energia: 4 } }))));
  for (const f of R.factores) { assert.equal(f.concluyente, false); assert.ok(f.veredicto === "sin datos" || f.veredicto === "sin conclusión"); }
  const sinRec = analizarRendimiento(A(modelo(() => ({ kg: 100 }))));
  assert.equal(sinRec.conRecuperacion, 0);
  for (const f of sinRec.factores) assert.equal(f.n, 0);
});

/* ---------- RPE ---------- */
test("RPE: reparte las series por franja, con cobertura y semanas", () => {
  const m = modelo((w) => ({ kg: 100, rpe: w <= 2 ? 9.5 : 8 }));
  m.sesiones[0].ejercicios[0].series.forEach((s) => delete s.rpe);
  const D = distribucionRpe(A(m));
  assert.equal(D.total, 80); assert.equal(D.conRpe, 78);
  assert.ok(Math.abs(D.cobertura - 78 / 80) < 1e-9);
  assert.equal(D.bandas.find((b) => b.id === "muyDura").n, 16);
  assert.equal(D.bandas.find((b) => b.id === "dura").n, 62);
  assert.ok(Math.abs(D.bandas.reduce((a, b) => a + b.pct, 0) - 100) < 1e-9);
  const S = semanasRpe(A(m), 8);
  assert.equal(S.length, 8); assert.equal(S[S.length - 1].lunes, HOY);
  assert.equal(S[S.length - 1].total, 0, "semana en curso sin sesiones: hueco");
  const acotada = distribucionRpe(A(m), { desde: masDias(HOY, -14) });
  assert.equal(acotada.total, 16);
});
test("RPE: sin ningún RPE anotado no hay porcentajes ni NaN", () => {
  const D = distribucionRpe(A(modelo(() => ({ kg: 100 }))));
  assert.equal(D.conRpe, 0); assert.equal(D.cobertura, 0);
  assert.ok(D.bandas.every((b) => b.pct === 0));
});

/* ---------- mesociclos ---------- */
const MESO = { id: "m1", nombre: "Volumen", inicio: "2026-10-05", semanas: 6, descarga: true };
test("mesociclos: validación (nombre, lunes, semanas y solape)", () => {
  assert.deepEqual(validarMesociclo(MESO), []);
  assert.ok(validarMesociclo({ ...MESO, nombre: " " }).length);
  assert.match(validarMesociclo({ ...MESO, inicio: "2026-10-06" })[0], /lunes/);
  assert.ok(validarMesociclo({ ...MESO, semanas: 1 }).length); assert.ok(validarMesociclo({ ...MESO, semanas: 17 }).length);
  assert.ok(validarMesociclo({ ...MESO, inicio: "x" }).length);
  assert.match(validarMesociclo({ ...MESO, id: "m2", inicio: "2026-11-02" }, [MESO])[0], /solapa/);
  assert.deepEqual(validarMesociclo({ ...MESO, id: "m2", inicio: "2026-11-16" }, [MESO]), [], "empieza el lunes siguiente al fin: no solapa");
  assert.deepEqual(validarMesociclo(MESO, [MESO]), [], "no se solapa consigo mismo al editarlo");
});
test("mesociclos: fechas, estado y mesociclo actual", () => {
  assert.equal(finDeMeso(MESO), "2026-11-15"); assert.equal(lunesDeMeso(MESO).length, 6); assert.equal(lunesDeMeso(MESO)[5], "2026-11-09");
  assert.deepEqual(estadoMesociclo(MESO, "2026-10-01"), { estado: "futuro", semana: null, esDescarga: false, restan: 4 });
  const e = estadoMesociclo(MESO, "2026-10-14"); assert.equal(e.estado, "en curso"); assert.equal(e.semana, 2); assert.equal(e.esDescarga, false);
  assert.equal(estadoMesociclo(MESO, "2026-11-11").esDescarga, true, "la última semana es la de descarga");
  assert.equal(estadoMesociclo(MESO, "2026-11-15").restan, 1);
  assert.equal(estadoMesociclo(MESO, "2026-11-16").estado, "terminado");
  assert.equal(mesocicloActual([MESO], "2026-10-05").id, "m1"); assert.equal(mesocicloActual([MESO], "2026-11-16"), null); assert.equal(mesocicloActual(undefined, HOY), null);
});
test("mesociclos: poner y quitar mantiene el bloque de descarga y no duplica", () => {
  const aj = ajustesBase();
  ponerMesociclo(aj, MESO);
  assert.equal(aj.mesociclos.length, 1);
  assert.deepEqual(aj.bloques.find((b) => b.id === idBloqueDe("m1")), { id: "meso-m1", inicio: "2026-11-09", fin: "2026-11-15", tipo: "deload", grupos: [] });
  ponerMesociclo(aj, { ...MESO, semanas: 4 });
  assert.equal(aj.mesociclos.length, 1); assert.equal(aj.bloques.filter((b) => b.id === "meso-m1").length, 1);
  assert.equal(aj.bloques.find((b) => b.id === "meso-m1").inicio, "2026-10-26");
  ponerMesociclo(aj, { ...MESO, descarga: false });
  assert.equal(aj.bloques.some((b) => b.id === "meso-m1"), false);
  ponerMesociclo(aj, MESO); quitarMesociclo(aj, "m1");
  assert.equal(aj.mesociclos.length, 0); assert.equal(aj.bloques.length, 0);
});
test("mesociclos: resumen con datos hasta hoy", () => {
  const m = modelo((w) => ({ kg: 100, rpe: 8 }));
  const meso = { id: "m1", nombre: "X", inicio: masDias(HOY, -42), semanas: 8, descarga: false };
  const R = resumenMesociclo(A(m), meso);
  assert.equal(R.semanasTotales, 8); assert.equal(R.filas.length, 7, "solo las semanas ya empezadas");
  assert.equal(R.sesiones, 12, "6 semanas con datos × 2 sesiones"); assert.equal(R.rpe, 8);
  assert.ok(Number.isFinite(R.volumen));
});

/* ---------- molestias ---------- */
const mo = (o) => ({ id: "x" + Math.random(), fecha: "2026-11-10", articulacion: "hombro", lado: "der", nivel: 2, ejercicioId: "press", nota: "", ...o });
test("molestias: validación", () => {
  assert.deepEqual(validarMolestia(mo(), HOY), []);
  assert.ok(validarMolestia(mo({ fecha: "2026-12-01" }), HOY).length, "futura");
  assert.ok(validarMolestia(mo({ articulacion: "dedo" }), HOY).length);
  assert.ok(validarMolestia(mo({ nivel: 6 }), HOY).length); assert.ok(validarMolestia(mo({ nivel: 2.5 }), HOY).length);
  assert.ok(validarMolestia(mo({ lado: "arriba" }), HOY).length);
  assert.deepEqual(validarMolestia(mo({ lado: null }), HOY), []);
  assert.ok(validarMolestia(null, HOY).length);
});
test("molestias: resumen, persistencia y semanas", () => {
  const l = [mo({ id: "a", fecha: "2026-11-15", nivel: 3 }), mo({ id: "b", fecha: "2026-11-13", nivel: 4 }), mo({ id: "c", fecha: "2026-11-05", nivel: 3 }),
    mo({ id: "d", fecha: "2026-09-01", nivel: 5 }), mo({ id: "e", articulacion: "rodilla", fecha: "2026-11-01", nivel: 1 })];
  const R = resumenMolestias(l, HOY);
  assert.deepEqual(R.map((x) => x.id), ["hombro", "rodilla"], "la persistente va primero");
  const h = R[0];
  assert.equal(h.persistente, true); assert.equal(h.n7, 2); assert.equal(h.n30, 3); assert.equal(h.max30, 4);
  assert.ok(Math.abs(h.media30 - 10 / 3) < 1e-9); assert.equal(h.ultima, "2026-11-15");
  assert.equal(h.semanas.length, 8); assert.equal(h.semanas[7], null, "semana en curso, sin anotaciones"); assert.equal(h.semanas[6], 3.5, "semana del 9 al 15");
  assert.equal(R[1].persistente, false);
  assert.deepEqual(resumenMolestias([], HOY), []);
  assert.equal(resumenMolestias([mo({ fecha: "2026-09-01" })], HOY).length, 0, "más de 60 días no cuenta");
});
test("molestias: por ejercicio y orden", () => {
  const l = [mo({ id: "a", ejercicioId: "press", nivel: 2 }), mo({ id: "b", ejercicioId: "press", nivel: 4, fecha: "2026-11-12" }), mo({ id: "c", ejercicioId: "remo", nivel: 5 }), mo({ id: "d", ejercicioId: null })];
  assert.deepEqual(porEjercicio(l, HOY), [{ ejercicioId: "press", n: 2, max: 4 }, { ejercicioId: "remo", n: 1, max: 5 }]);
  assert.deepEqual(deEjercicio(l, "press").map((x) => x.id), ["b", "a"]);
  assert.equal(ordenar(l)[0].fecha, "2026-11-12");
});

/* ---------- tarjeta ---------- */
test("tarjeta: totales, ejercicios principales, récords y «más»", () => {
  const ses = { rutina: "Torso", fecha: "2026-11-14", duracion: 70, ejercicios: [
    { ejercicioId: "a", nombre: "Press banca", series: [{ peso: 100, reps: 5, tipo: "normal", hecha: true }, { peso: 60, reps: 10, tipo: "calentamiento", hecha: true }, { peso: 100, reps: 4, tipo: "fallo", hecha: true }] },
    { ejercicioId: "b", nombre: "Dominadas", series: [{ peso: 0, reps: 10, tipo: "normal", hecha: true }, { peso: 0, reps: 8, tipo: "normal", hecha: false }] },
    { ejercicioId: "c", nombre: "Vacío", series: [{ peso: 20, reps: 10, tipo: "calentamiento", hecha: true }] },
    ...["d", "e", "f", "g", "h"].map((id) => ({ ejercicioId: id, nombre: id, series: [{ peso: 10, reps: 10, tipo: "normal", hecha: true }] })) ] };
  const t = datosTarjeta(ses, ["Dominadas"]);
  assert.equal(t.titulo, "Torso"); assert.equal(t.series, 8); assert.equal(t.volumen, 100 * 5 + 100 * 4 + 5 * 100);
  assert.equal(t.ejercicios.length, 6); assert.equal(t.mas, 1);
  assert.equal(t.ejercicios[0].nombre, "Dominadas", "el récord va primero"); assert.equal(t.ejercicios[0].pr, true); assert.equal(t.prs, 1);
  assert.equal(t.ejercicios[0].peso, 0); assert.equal(t.ejercicios[0].reps, 10);
  assert.ok(!t.ejercicios.some((e) => e.nombre === "Vacío"));
  const v = datosTarjeta({ fecha: "2026-11-14", ejercicios: [] });
  assert.equal(v.titulo, "Entrenamiento"); assert.equal(v.series, 0); assert.equal(v.duracion, null);
});

test("resumen del mesociclo: la semana de descarga no cuenta como pérdida de fuerza", () => {
  const inicio = masDias(HOY, -28);
  const bl = [{ id: "d", inicio: masDias(inicio, 21), fin: masDias(inicio, 27), tipo: "deload", grupos: [] }];
  const m = modelo((w) => ({ kg: w <= 1 ? 80 : 100, rpe: 8 }), { bloques: bl });
  const R = resumenMesociclo(A(m), { id: "m", nombre: "X", inicio, semanas: 4, descarga: true });
  assert.ok(R.e1rm.pct == null || R.e1rm.pct >= 0, "pct " + R.e1rm.pct);
});

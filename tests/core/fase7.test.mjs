// Estadística básica y datos de la tarjeta para compartir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { media, mediana, desviacion, rangos, spearman, mediaConIntervalo } from "../../src/core/estadistica.js";
import { datosTarjeta } from "../../src/core/tarjeta.js";

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

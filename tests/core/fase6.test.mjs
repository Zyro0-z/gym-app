// Fase 6: lógica pura de la tarjeta de instalación, la leyenda del mapa corporal y el resumen
// textual de las gráficas.
import test from "node:test";
import assert from "node:assert/strict";
import { debeMostrarse, esIOS } from "../../src/ui/instalar.js";
import { nivelDe, rangosNiveles } from "../../src/ui/cuerpo.js";
import { describirSerie } from "../../src/ui/graficas.js";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const base = { ua: IPHONE, plataforma: "iPhone", toques: 5, standalone: false, modoStandalone: false, visto: false };

test("instalar: solo en Safari de iOS, sin instalar y sin haberla cerrado", () => {
  assert.equal(debeMostrarse(base), true);
  assert.equal(debeMostrarse({ ...base, standalone: true }), false, "instalada (navigator.standalone)");
  assert.equal(debeMostrarse({ ...base, modoStandalone: true }), false, "instalada (display-mode)");
  assert.equal(debeMostrarse({ ...base, visto: true }), false, "ya cerrada");
  assert.equal(debeMostrarse({ ...base, ua: IPHONE.replace("Version/18.1", "CriOS/130.0") }), false, "Chrome en iOS");
  assert.equal(debeMostrarse({ ...base, ua: "Mozilla/5.0 (X11; Linux x86_64) Chrome/130", plataforma: "Linux x86_64", toques: 0 }), false, "escritorio");
  assert.equal(esIOS({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605", plataforma: "MacIntel", toques: 5 }), true, "iPad que se presenta como Mac");
  assert.equal(esIOS({ ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605", plataforma: "MacIntel", toques: 0 }), false, "Mac de verdad");
});

test("mapa corporal: niveles 0-4 y rangos de la leyenda sin huecos ni solapes", () => {
  assert.equal(nivelDe(0, 40), 0); assert.equal(nivelDe(null, 40), 0); assert.equal(nivelDe(5, 0), 0);
  assert.equal(nivelDe(1, 40), 1); assert.equal(nivelDe(10, 40), 1); assert.equal(nivelDe(11, 40), 2); assert.equal(nivelDe(40, 40), 4);
  assert.deepEqual(rangosNiveles(40), [{ nivel: 1, desde: 1, hasta: 10 }, { nivel: 2, desde: 11, hasta: 20 }, { nivel: 3, desde: 21, hasta: 30 }, { nivel: 4, desde: 31, hasta: 40 }]);
  assert.deepEqual(rangosNiveles(2), [{ nivel: 2, desde: 1, hasta: 1 }, { nivel: 4, desde: 2, hasta: 2 }]);
  for (const max of [1, 3, 7, 13, 213]) {
    const r = rangosNiveles(max);
    assert.equal(r[0].desde, 1); assert.equal(r[r.length - 1].hasta, max);
    for (let i = 1; i < r.length; i++) assert.equal(r[i].desde, r[i - 1].hasta + 1);
    for (const x of r) for (let v = x.desde; v <= x.hasta; v++) assert.equal(nivelDe(v, max), x.nivel, "valor " + v + " de " + max);
  }
});

test("gráficas: resumen textual con extremos, último y tendencia", () => {
  const f = (v) => v + " kg", n = (i) => "S" + (i + 1);
  assert.equal(describirSerie([], f), "Sin datos.");
  assert.equal(describirSerie([null, 5], f, n), "Un dato: 5 kg (S2).");
  assert.equal(describirSerie([10, 12, 20, 22], f, n), "Mínimo 10 kg (S1); máximo 22 kg (S4); último 22 kg (S4). Tendencia al alza.");
  assert.match(describirSerie([20, 20, 20.1, 20], f), /Tendencia estable\.$/);
  assert.match(describirSerie([30, 28, 10, 9], f), /Tendencia a la baja\.$/);
  assert.doesNotMatch(describirSerie([0, 0, 5, 6], f), /NaN|Infinity|Tendencia/);
});

test("ultimasSemanasRapido da lo mismo que ultimasSemanas", async () => {
  const { ultimasSemanas, ultimasSemanasRapido } = await import("../../src/core/semanal.js");
  const { analizar } = await import("../../src/core/analisis.js");
  const { fixture } = await import("../golden/fixture.mjs");
  const { desdeLegacy } = await import("../../src/migracion/index.js");
  const A = analizar(desdeLegacy(fixture()), "2026-11-16");
  for (const n of [8, 26, 52]) assert.deepEqual(ultimasSemanasRapido(A.C, A.sesiones, n), ultimasSemanas(A.C, A.sesiones, n));
  assert.ok(ultimasSemanasRapido(A.C, A.sesiones, 52).some((x) => x.vol > 0));
});

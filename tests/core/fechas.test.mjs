import { test } from "node:test";
import assert from "node:assert/strict";
import { numDia, deNum, masDias, diaSemana, lunesDe, menosMeses, finDeMes, fechaISO, minutosDelDia } from "../../src/core/fechas.js";
import { fmt, kgCorto, leerNumero } from "../../src/core/formato.js";
import { canon, levenshtein } from "../../src/core/nombres.js";

test("días y semanas ISO", () => {
  assert.equal(deNum(numDia("2026-11-15")), "2026-11-15");
  assert.equal(diaSemana("2026-11-15"), 7);          // domingo
  assert.equal(diaSemana("2026-11-16"), 1);          // lunes
  assert.equal(lunesDe("2026-11-15"), "2026-11-09");
  assert.equal(lunesDe("2026-11-09"), "2026-11-09");
  assert.equal(masDias("2026-03-28", 2), "2026-03-30"); // cambio de hora: días naturales
  assert.equal(lunesDe("2027-01-01"), "2026-12-28");
});
test("meses como el calendario", () => {
  assert.equal(menosMeses("2026-08-31", 6), "2026-02-28");
  assert.equal(menosMeses("2026-11-15", 6), "2026-05-15");
  assert.equal(menosMeses("2026-03-31", 1), "2026-02-28");
  assert.equal(menosMeses("2024-03-31", 1), "2024-02-29");
  assert.equal(finDeMes("2026-02-10"), "2026-02-28");
});
test("fechas y horas", () => {
  assert.equal(fechaISO("2026-02-30"), null);
  assert.equal(fechaISO(" 2026-02-28 "), "2026-02-28");
  assert.equal(minutosDelDia("17:35"), 1055);
  assert.equal(minutosDelDia(600), 600);
  assert.equal(minutosDelDia(null), null);
});
test("números en español", () => {
  assert.equal(fmt(12345.678, 1), "12.345,7");
  assert.equal(fmt(-0.25, 2), "-0,25");
  assert.equal(kgCorto(82.5), "82,5");
  assert.equal(kgCorto(80), "80");
  assert.equal(leerNumero("82,5"), 82.5);
  assert.equal(leerNumero("82.5"), 82.5);
  assert.ok(Number.isNaN(leerNumero("8a")));
});
test("nombres", () => {
  assert.equal(canon("Press  Militar-Máquina"), "pressmilitarmaquina");
  assert.equal(levenshtein("prensainclinda", "prensainclinada", 2), 1);
  assert.equal(levenshtein("abc", "xyzw", 2), 3);
});

test("finDeMes acepta fecha completa y mes «AAAA-MM»", () => {
  assert.equal(finDeMes("2026-10-05"), "2026-10-31");
  assert.equal(finDeMes("2026-10"), "2026-10-31");
  assert.equal(finDeMes("2028-02"), "2028-02-29");
});

// Insignias de liga: estructura de las 15 ligas × completa/simple × división, sin depender del dibujo exacto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crearInsignias } from "../../src/ui/insignias.js";

const I = crearInsignias();
const variantes = [];
for (let n = 1; n <= 15; n++) for (const s of [false, true]) for (const d of ["", "I", "II", "III"]) variantes.push([n, s, d]);

test("hay 15 ligas con nombre", () => {
  assert.equal(I.total, 15);
  assert.equal(I.nombres.length, 15);
  assert.ok(I.nombres.every((x) => x && typeof x === "string"));
});

test("cada variante es un SVG accesible de 128×128 con id propios y sin repeticiones", () => {
  for (const [n, s, d] of variantes) {
    const x = I.svg(n, s, d), pre = "L" + String(n).padStart(2, "0") + (s ? "s" : "") + "-";
    assert.match(x, /^<svg [^>]*viewBox="0 0 128 128" width="128" height="128"/, `${n}${s ? "s" : ""}${d}`);
    assert.match(x, /role="img" aria-label="Liga /);
    assert.match(x, /<title>.+<\/title>/);
    const ids = [...x.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(ids.length > 0);
    assert.equal(new Set(ids).size, ids.length, "ids repetidos");
    assert.ok(ids.every((i) => i.startsWith(pre)), "id sin prefijo de liga: " + ids.find((i) => !i.startsWith(pre)));
    const refs = [...x.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
    assert.ok(refs.every((r) => ids.includes(r)), "referencia sin definir: " + refs.find((r) => !ids.includes(r)));
  }
});

test("la división se refleja en el nombre accesible y Leyenda no lleva numeral", () => {
  assert.match(I.svg(5, false, "II"), /aria-label="Liga Plata II"/);
  assert.equal(I.svg(15, false, "III"), I.svg(15, false, ""));
});

test("las animaciones respetan prefers-reduced-motion", () => {
  for (const [n, s, d] of variantes) {
    const x = I.svg(n, s, d);
    if (x.includes("@keyframes")) assert.match(x, /prefers-reduced-motion:reduce/);
  }
});

test("la salida es determinista", () => {
  const J = crearInsignias();
  for (const [n, s, d] of variantes) assert.equal(J.svg(n, s, d), I.svg(n, s, d));
});

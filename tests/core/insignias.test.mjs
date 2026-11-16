// Las insignias (SVG generado) no cambian al partir el generador en módulos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { crearInsignias } from "../../src/ui/insignias.js";

// Huella de todas las variantes (15 ligas × completa/simple × división) del generador de la versión 2.0
const HUELLA = process.env.HUELLA_INSIGNIAS || "849809b8afcc4cec34e608473066e3d08336870cf435b7c913c3c9459ac69b99";
const huella = (I) => { const h = createHash("sha256"); for (let n = 1; n <= 15; n++) for (const s of [false, true]) for (const d of ["", "I", "II", "III"]) h.update(I.svg(n, s, d)); return h.digest("hex"); };

test("las 15 insignias, en todas sus variantes, son idénticas a las de la versión 2.0", () => {
  const I = crearInsignias();
  assert.equal(I.total, 15);
  assert.equal(huella(I), HUELLA);
});

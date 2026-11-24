// La copia en la nube no pisa una copia más reciente del servidor, y «Subir ahora» puede forzarlo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hayConflicto, subirSinPisar } from "../../src/data/nube.js";

const T = Date.parse("2026-11-20T10:00:00.000Z");
const ultima = { at: new Date(T).toISOString() };
const cliente = (previa) => { const llamadas = []; return { llamadas, info: async () => previa, subir: async (url, frase, texto) => { llamadas.push(texto); return { at: T + 5000, bytes: texto.length }; } }; };
const n = (u) => ({ url: "https://x", ultima: u });

test("hayConflicto: sin copia en el servidor no hay; con una más nueva que la última de este dispositivo, sí", () => {
  assert.equal(hayConflicto(null, null), false);
  assert.equal(hayConflicto(null, ultima), false);
  assert.equal(hayConflicto({ at: T }, ultima), false);
  assert.equal(hayConflicto({ at: T + 800 }, ultima), false);
  assert.equal(hayConflicto({ at: T + 60000 }, ultima), true);
  assert.equal(hayConflicto({ at: T }, null), true);
});

test("dispositivo nuevo con copia en el servidor: no sube y marca el conflicto", async () => {
  const c = cliente({ at: T, bytes: 1000 });
  await assert.rejects(subirSinPisar(c, n(null), "clave", "datos vacíos"), (e) => e.conflicto === true && /más reciente/.test(e.message));
  assert.deepEqual(c.llamadas, []);
});

test("otra copia más reciente en el servidor: no sube; con forzar, sí", async () => {
  const c = cliente({ at: T + 3600000, bytes: 1000 });
  await assert.rejects(subirSinPisar(c, n(ultima), "clave", "a"), (e) => e.conflicto === true);
  assert.deepEqual(c.llamadas, []);
  const r = await subirSinPisar(c, n(ultima), "clave", "a", { forzar: true });
  assert.equal(r.bytes, 1);
  assert.deepEqual(c.llamadas, ["a"]);
});

test("primera subida o servidor al día: sube", async () => {
  const c1 = cliente(null);
  await subirSinPisar(c1, n(null), "clave", "uno");
  const c2 = cliente({ at: T });
  await subirSinPisar(c2, n(ultima), "clave", "dos");
  assert.deepEqual([c1.llamadas, c2.llamadas], [["uno"], ["dos"]]);
});

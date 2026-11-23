// Copias de seguridad (parte pura): crear, leer, recordatorio y ajustes incompletos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leerCopia, crearCopia, estadoCopia, completarAjustes } from "../../src/data/modelo.js";

// Modelo ya convertido del conjunto sintético (tests/golden/modelo-sintetico.json)
const modelo = () => { const m = JSON.parse(readFileSync(new URL("../golden/modelo-sintetico.json", import.meta.url), "utf8")); return Object.assign(m, { ajustes: completarAjustes(m.ajustes) }); };

test("copias: nueva y de la versión 2.0; rechaza las más nuevas y las de la versión 1", () => {
  const p = modelo();
  const copia = crearCopia(p, "2026-11-15T12:00:00.000Z");
  const r = leerCopia(JSON.stringify(copia));
  assert.equal(r.origen, "v3");
  assert.equal(copia.esquema, 4);
  assert.deepEqual(r.medidas, []);
  assert.equal(r.sesiones.length, p.sesiones.length);
  // una copia de la versión 2.0 (version 2, esquema 3, sin medidas) se sigue aceptando
  const v2 = Object.assign({}, copia, { version: 2, esquema: 3 }); delete v2.medidas;
  const r2 = leerCopia(JSON.stringify(v2));
  assert.equal(r2.origen, "v2"); assert.deepEqual(r2.medidas, []); assert.equal(r2.ajustes.entreno.barra, 20);
  assert.deepEqual(r.sesiones, p.sesiones);
  assert.throws(() => leerCopia(JSON.stringify({ version: 1, schema: 2, sessions: [{}], templates: [], configs: {} })), /versión muy antigua/);
  assert.throws(() => leerCopia(JSON.stringify({ version: 4, sesiones: [] })), /más nueva/);
  assert.throws(() => leerCopia(JSON.stringify({ version: 3, esquema: 5, sesiones: [] })), /más nueva/);
  assert.throws(() => leerCopia("no es json"), /JSON/);
  assert.throws(() => leerCopia(JSON.stringify({ hola: 1 })), /no contiene sesiones/);
  assert.throws(() => leerCopia(JSON.stringify({ version: 2, sesiones: [{}], catalogo: [], rutinas: [], pesajes: [] })), /dañada/);
});

test("recordatorio de copia: más de 7 días o más de 5 sesiones nuevas", () => {
  const ahora = Date.parse("2026-11-15T12:00:00Z");
  assert.equal(estadoCopia(null, 3, ahora).avisar, true);
  assert.equal(estadoCopia(null, 0, ahora).avisar, false);
  assert.equal(estadoCopia({ at: "2026-11-10T12:00:00Z", sesiones: 10 }, 12, ahora).avisar, false);
  assert.equal(estadoCopia({ at: "2026-11-01T12:00:00Z", sesiones: 10 }, 10, ahora).avisar, true);
  assert.equal(estadoCopia({ at: "2026-11-14T12:00:00Z", sesiones: 10 }, 16, ahora).avisar, true);
});

test("ajustes incompletos se completan con los de base", () => {
  const a = completarAjustes({ apariencia: { acento: "verde" } });
  assert.equal(a.apariencia.acento, "verde");
  assert.equal(a.apariencia.tema, "auto");
  assert.equal(a.entreno.descanso, 90);
});

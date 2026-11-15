// Migración del formato antiguo al modelo nuevo y copias de seguridad (parte pura).
import { test } from "node:test";
import assert from "node:assert/strict";
import { planMigracion, leerCopia, crearCopia, estadoCopia, convertirBorrador, rescatarSesiones, completarAjustes } from "../../src/data/modelo.js";
import { desdeLegacy } from "../../src/core/legacy.js";
import { analizar } from "../../src/core/analisis.js";
import { fixture } from "../golden/fixture.mjs";

const viejo = () => {
  const d = fixture();
  return { schema: 2, sessions: d.sessions, templates: d.templates, configs: d.configs, library: d.library,
    settings: { restTimerPresets: [45, 90], defaultRestDuration: 120, weightStep: 1.25, keepScreenAwake: false, backup: { at: "2026-11-01T10:00:00.000Z", sessions: 70 } },
    draft: { template: "Torso A", date: "2026-11-15", start: 1763200000000, editPath: null, rest: { fin: 1763200090000, total: 90, avisado: false },
      exercises: [{ name: "Press banca barra", target: 4, sets: [{ weight: "92,5", reps: "8", setType: "", done: true }, { weight: "92,5", reps: "", setType: "", done: false }] }] } };
};

test("la migración conserva íntegro el original en «legacy»", () => {
  const v = viejo();
  const antes = JSON.stringify(v);
  const p = planMigracion(v, { ahora: "2026-11-15T12:00:00.000Z", tema: "oscuro" });
  assert.equal(JSON.stringify(v), antes, "no modifica la entrada");
  for (const k of ["sessions", "templates", "configs", "settings", "library", "draft"])
    assert.equal(JSON.stringify(p.legacy.datos[k]), JSON.stringify(v[k]), k);
});

test("el análisis tras migrar es el mismo que el del golden master", () => {
  const v = viejo();
  const p = planMigracion(v);
  const directo = desdeLegacy(v);
  for (const fecha of ["2026-09-17", "2026-11-15"]) {
    const a = analizar(p, fecha), b = analizar(directo, fecha);
    assert.deepEqual(a.semanas, b.semanas);
    assert.deepEqual(a.racha, b.racha);
    assert.equal(a.liga.general.hoy.sc, b.liga.general.hoy.sc);
    assert.deepEqual(Array.from(a.diagnostico.values()).map((d) => d.estado), Array.from(b.diagnostico.values()).map((d) => d.estado));
  }
});

test("ajustes, tema y borrador se conservan", () => {
  const p = planMigracion(viejo(), { tema: "oscuro" });
  assert.equal(p.ajustes.entreno.descanso, 120);
  assert.deepEqual(p.ajustes.entreno.presets, [45, 90]);
  assert.equal(p.ajustes.entreno.pasoPeso, 1.25);
  assert.equal(p.ajustes.entreno.pantallaEncendida, false);
  assert.equal(p.ajustes.apariencia.tema, "oscuro");
  assert.deepEqual(p.ajustes.copia, { at: "2026-11-01T10:00:00.000Z", sesiones: 70 });
  assert.equal(p.borrador.rutina, "Torso A");
  assert.equal(p.borrador.ejercicios[0].ejercicioId, "pressbancabarra");
  assert.deepEqual(p.borrador.ejercicios[0].series[0], { peso: "92,5", reps: "8", tipo: "normal", hecha: true });
  assert.equal(p.borrador.descanso.total, 90);
  assert.ok(p.ajustes.migracion.errores.length > 0, "los errores de la configuración antigua quedan en el informe");
  assert.equal(convertirBorrador({ editPath: "x", exercises: [] }), null, "una edición a medias no es un entrenamiento");
});

test("instalación vacía o sólo con ajustes", () => {
  const p = planMigracion({ settings: { defaultRestDuration: 60 } });
  assert.equal(p.sesiones.length, 0);
  assert.equal(p.ajustes.entreno.descanso, 60);
  assert.equal(p.ajustes.grupos.length, 8, "grupos de base");
});

test("copias: nueva, antigua y seed; rechaza las más nuevas", () => {
  const p = planMigracion(viejo());
  const copia = crearCopia(p, "2026-11-15T12:00:00.000Z");
  const r = leerCopia(JSON.stringify(copia));
  assert.equal(r.origen, "v2");
  assert.equal(r.sesiones.length, p.sesiones.length);
  assert.deepEqual(r.sesiones, p.sesiones);
  const d = fixture();
  const r1 = leerCopia(JSON.stringify({ version: 1, schema: 2, sessions: d.sessions, templates: d.templates, configs: d.configs, settings: {}, library: d.library }));
  assert.equal(r1.origen, "v1");
  assert.equal(r1.sesiones.length, d.sessions.length);
  const seed = leerCopia(JSON.stringify(d));
  assert.equal(seed.sesiones.length, d.sessions.length);
  assert.throws(() => leerCopia(JSON.stringify({ version: 3, sesiones: [] })), /más nueva/);
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

test("rescate de sesiones escritas por una versión antigua después de migrar", () => {
  const p = planMigracion(viejo());
  const otra = { path: "Workouts/2026-11-16 Torso A.md", fm: { type: "workout", template: "Torso A", date: "2026-11-16", start: "18:00", end: "19:00", duration: 60,
    exercises: [{ name: "Press banca barra", sets: [{ weight: 95, reps: 6, unit: "kg" }] }] } };
  const r = rescatarSesiones([...viejo().sessions, otra], p.sesiones);
  assert.equal(r.length, 1);
  assert.equal(r[0].fecha, "2026-11-16");
});

test("ajustes incompletos se completan con los de base", () => {
  const a = completarAjustes({ apariencia: { acento: "verde" } });
  assert.equal(a.apariencia.acento, "verde");
  assert.equal(a.apariencia.tema, "auto");
  assert.equal(a.entreno.descanso, 90);
});

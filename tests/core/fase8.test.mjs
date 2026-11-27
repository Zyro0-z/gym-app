// Copias antiguas, ajustes retirados y sonido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crearCopia, leerCopia, completarAjustes, ajustesBase } from "../../src/data/modelo.js";
import { validarCopia } from "../../src/data/esquema.js";

const modelo = () => { const m = JSON.parse(readFileSync(new URL("../golden/modelo-sintetico.json", import.meta.url), "utf8")); return Object.assign(m, { ajustes: completarAjustes(m.ajustes), medidas: [], molestias: [] }); };

/* ---------- copias antiguas ---------- */
test("copia: molestias y medidas antiguas se conservan; los ajustes de funciones retiradas se descartan", () => {
  const p = modelo();
  p.molestias = [{ id: "mo-1", fecha: "2026-11-10", articulacion: "hombro", nivel: 3 }]; p.medidas = [{ fecha: "2026-11-10", cintura: 82 }];
  p.ajustes.mesociclos = [{ id: "m1", nombre: "Volumen", inicio: "2026-10-05", semanas: 6 }]; p.ajustes.gimnasios = [{ id: "a", nombre: "A", barra: 15, discos: [10, 5] }]; p.ajustes.gimnasioActivo = "a";
  const r = leerCopia(JSON.stringify(crearCopia(p, "2026-11-15T12:00:00.000Z")));
  assert.deepEqual(r.molestias, p.molestias); assert.deepEqual(r.medidas, p.medidas);
  for (const k of ["mesociclos", "gimnasios", "gimnasioActivo", "ligas", "ocultos"]) assert.equal(k in r.ajustes, false, k);
  assert.equal(r.ajustes.entreno.barra, 15, "la barra del gimnasio activo pasa a Entrenamiento"); assert.deepEqual(r.ajustes.entreno.discos, [10, 5]);
  const vieja = crearCopia(modelo(), "2026-11-15T12:00:00.000Z"); delete vieja.molestias; vieja.ajustes.nube = { activa: true, url: "https://x.example" };
  const v = leerCopia(JSON.stringify(vieja));
  assert.deepEqual(v.molestias, []); assert.equal("nube" in v.ajustes, false);
});
test("copia: «molestias» y «medidas» tienen que ser listas", () => {
  const base = () => crearCopia(modelo(), "2026-11-15T12:00:00.000Z");
  assert.deepEqual(validarCopia(base()), []);
  assert.match(validarCopia(Object.assign(base(), { molestias: "no" })).join("; "), /molestias/);
  assert.match(validarCopia(Object.assign(base(), { medidas: "no" })).join("; "), /medidas/);
});
test("ajustes: acentos y escalas retirados pasan al más parecido", () => {
  const ap = (x) => completarAjustes({ apariencia: x }).apariencia;
  assert.equal(ap({ acento: "cian" }).acento, "turquesa"); assert.equal(ap({ acento: "lima" }).acento, "verde"); assert.equal(ap({ acento: "oro" }).acento, "oro");
  assert.equal(ap({ mapa: "fuego" }).mapa, "termico"); assert.equal(ap({ mapa: "hielo" }).mapa, "hielo");
  assert.equal("mapaA" in ap({ mapa: "personal", mapaA: "#fff", mapaB: "#000" }), false);
});

/* ---------- sonido ---------- */
function falsoAudio(estado = "running") {
  const log = { osc: 0, resumes: 0 };
  class Falso {
    constructor() { this.state = estado; this.currentTime = 0; this.destination = {}; }
    resume() { log.resumes++; return Promise.resolve().then(() => { if (this.state !== "closed") this.state = "running"; }); }
    createOscillator() { log.osc++; return { frequency: {}, connect: (g) => g, start() {}, stop() {} }; }
    createGain() { const g = { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (d) => d }; return g; }
  }
  return { Falso, log };
}
test("sonido: la campana suena con el contexto activo y, parado, reintenta al reanudarse", async () => {
  const { Falso, log } = falsoAudio("suspended");
  globalThis.window = { AudioContext: Falso };
  const s = await import("../../src/ui/sonido.js?t=" + Math.random());
  assert.equal(s.estadoSonido(), "sin contexto"); assert.equal(s.campana(), false, "sin contexto no suena");
  s.prepararSonido();
  assert.equal(s.estadoSonido(), "suspended");
  assert.equal(s.campana(), false, "parado: devuelve false pero reintenta");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(s.estadoSonido(), "running"); assert.equal(log.osc, 2, "tras reanudar suenan las dos notas");
  assert.equal(s.campana(), true); assert.equal(log.osc, 4);
  s.reanudarSonido();
  delete globalThis.window;
});
test("sonido: sin AudioContext no falla", async () => {
  globalThis.window = {};
  const s = await import("../../src/ui/sonido.js?t=" + Math.random());
  assert.doesNotThrow(() => { s.prepararSonido(); s.reanudarSonido(); }); assert.equal(s.campana(), false);
  delete globalThis.window;
});

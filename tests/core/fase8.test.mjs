// Fase 5: cifrado de extremo a extremo, cliente de la copia en la nube, copias con molestias y mesociclos, y sonido.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generarClave, normalizarClave, problemaDeClave, identidad, cifrar, descifrar } from "../../src/core/cifrado.js";
import { crearNube, normalizarUrl } from "../../src/data/nube.js";
import { crearCopia, leerCopia, completarAjustes, ajustesBase } from "../../src/data/modelo.js";
import { validarCopia } from "../../src/data/esquema.js";

const IT = 1000;
const modelo = () => { const m = JSON.parse(readFileSync(new URL("../golden/modelo-sintetico.json", import.meta.url), "utf8")); return Object.assign(m, { ajustes: completarAjustes(m.ajustes), medidas: [], molestias: [] }); };

/* ---------- cifrado ---------- */
test("clave: formato, normalización y validación", () => {
  const k = generarClave();
  assert.match(k, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){7}$/);
  assert.notEqual(k, generarClave());
  assert.equal(normalizarClave(k.toLowerCase().replaceAll("-", " ")), k, "minúsculas y sin guiones se aceptan");
  assert.equal(problemaDeClave(k), null);
  assert.match(problemaDeClave("corta"), /12 caracteres/);
  assert.equal(problemaDeClave("una frase bastante larga"), null);
});
test("identidad: determinista, distinta por clave, y el token no revela el id", async () => {
  const a = await identidad("clave de prueba 1", IT), b = await identidad("clave de prueba 1", IT), c = await identidad("clave de prueba 2", IT);
  assert.deepEqual(a, b);
  assert.match(a.id, /^[0-9a-f]{32}$/); assert.match(a.token, /^[0-9a-f]{64}$/);
  assert.notEqual(a.id, c.id); assert.notEqual(a.token, c.token);
  assert.ok(!a.token.startsWith(a.id));
  const k = generarClave();
  assert.deepEqual(await identidad(k, IT), await identidad(k.toLowerCase().replaceAll("-", ""), IT), "mismo resultado con la clave escrita de otra forma");
});
test("cifrado: ida y vuelta con texto largo y caracteres especiales; cada sobre es distinto", async () => {
  const texto = JSON.stringify({ ñ: "áéíóú ✓ 💪", n: Array.from({ length: 5000 }, (_, i) => i) });
  const s1 = await cifrar(texto, "frase secreta larga", { it: IT }), s2 = await cifrar(texto, "frase secreta larga", { it: IT });
  assert.equal(s1.v, 1); assert.equal(s1.it, IT);
  assert.notEqual(s1.ct, s2.ct); assert.notEqual(s1.sal, s2.sal); assert.notEqual(s1.iv, s2.iv);
  assert.equal(await descifrar(s1, "frase secreta larga"), texto);
  assert.equal(s1.gz, true); assert.ok(s1.ct.length < texto.length, "comprimido");
  assert.ok(!JSON.stringify(s1).includes("áéíóú"), "el sobre no contiene el texto en claro");
});
test("cifrado: clave incorrecta, sobre alterado y formato desconocido fallan con motivo legible", async () => {
  const s = await cifrar("hola", "frase secreta larga", { it: IT });
  await assert.rejects(descifrar(s, "otra frase secreta"), /no es la de esta copia/);
  const alterado = { ...s, ct: s.ct.slice(0, -4) + (s.ct.endsWith("AAAA") ? "BBBB" : "AAAA") };
  await assert.rejects(descifrar(alterado, "frase secreta larga"), /alterada/);
  await assert.rejects(descifrar({ ...s, iv: s.iv.replace(/.$/, s.iv.endsWith("A") ? "B" : "A") }, "frase secreta larga"), /alterada|no es la de esta copia/);
  await assert.rejects(descifrar({ ...s, v: 2 }, "frase secreta larga"), /formato/);
  await assert.rejects(descifrar(null, "x"), /formato/);
  assert.equal(await descifrar(s, "frase secreta larga"), "hola");
});
test("cifrado: el sobre va ligado a su versión (AAD): no se puede cambiar el campo de compresión sin romperlo", async () => {
  const s = await cifrar("hola mundo", "frase secreta larga", { it: IT });
  await assert.rejects(descifrar({ ...s, gz: !s.gz }, "frase secreta larga"));
});

/* ---------- cliente de la nube ---------- */
const resp = (estado, cuerpo) => ({ ok: estado >= 200 && estado < 300, status: estado, json: async () => { if (cuerpo === undefined) throw new Error("sin cuerpo"); return cuerpo; } });
test("normalizarUrl: https, localhost y rechazo del resto", () => {
  assert.equal(normalizarUrl("https://avisos.example.workers.dev/"), "https://avisos.example.workers.dev");
  assert.equal(normalizarUrl(" https://x.example/api// "), "https://x.example/api");
  assert.equal(normalizarUrl("http://localhost:8787"), "http://localhost:8787");
  assert.equal(normalizarUrl("http://127.0.0.1:8787/"), "http://127.0.0.1:8787");
  for (const m of ["http://x.example", "ftp://x.example", "x.example", "", null, undefined, "javascript:alert(1)"]) assert.equal(normalizarUrl(m), null, String(m));
});
test("nube: subir manda el sobre cifrado con el token, bajar lo descifra, y el servidor no recibe la clave ni el texto", async () => {
  const llamadas = []; let guardado = null;
  const fetchFn = async (url, init) => {
    llamadas.push({ url, init });
    if (init.method === "PUT") { guardado = init.body; return resp(200, { ok: true, at: 5, bytes: init.body.length }); }
    return guardado ? { ok: true, status: 200, json: async () => JSON.parse(guardado) } : resp(404, { error: "no hay copia" });
  };
  const nube = crearNube({ fetchFn, it: IT }), frase = "frase secreta larga", { id, token } = await identidad(frase, IT);
  const r = await nube.subir("https://w.example/", frase, "TEXTO-SECRETO-DE-LA-COPIA");
  assert.equal(r.bytes, guardado.length);
  assert.equal(llamadas[0].url, "https://w.example/v1/copia/" + id);
  assert.equal(llamadas[0].init.method, "PUT"); assert.equal(llamadas[0].init.headers.Authorization, "Bearer " + token);
  assert.ok(!guardado.includes("TEXTO-SECRETO") && !guardado.includes(frase) && !guardado.includes(token), "nada en claro en lo enviado");
  assert.equal(await nube.bajar("https://w.example", frase), "TEXTO-SECRETO-DE-LA-COPIA");
  assert.equal(llamadas[1].init.method, "GET");
  await assert.rejects(nube.bajar("https://w.example", "otra frase secreta"), /clave no es la de esta copia/);
});
test("nube: info (incluye 404 → null), borrar y errores legibles", async () => {
  const modo = { estado: 200 };
  const fetchFn = async (url, init) => url.endsWith("/info") ? (modo.estado === 404 ? resp(404, { error: "no hay copia" }) : resp(modo.estado, { bytes: 10, at: 7 })) : resp(modo.estado, modo.estado < 300 ? { ok: true } : { error: "x" });
  const nube = crearNube({ fetchFn, it: IT });
  assert.deepEqual(await nube.info("https://w.example", "frase secreta larga"), { bytes: 10, at: 7 });
  modo.estado = 404; assert.equal(await nube.info("https://w.example", "frase secreta larga"), null);
  modo.estado = 403; await assert.rejects(nube.borrar("https://w.example", "frase secreta larga"), /no coincide con la de la copia/);
  modo.estado = 401; await assert.rejects(nube.info("https://w.example", "frase secreta larga"), /no acepta el acceso/);
  modo.estado = 413; await assert.rejects(nube.subir("https://w.example", "frase secreta larga", "x"), /demasiado grande/);
  modo.estado = 500; await assert.rejects(nube.borrar("https://w.example", "frase secreta larga"), /respondió 500/);
  await assert.rejects(nube.subir("http://inseguro.example", "frase secreta larga", "x"), /no es válida/);
  await assert.rejects(crearNube({ fetchFn: async () => { throw new TypeError("red"); }, it: IT }).info("https://w.example", "frase secreta larga"), /No se pudo conectar/);
});

/* ---------- copias con molestias y mesociclos ---------- */
const mo = (o) => ({ id: "mo-1", fecha: "2026-11-10", articulacion: "hombro", lado: "der", nivel: 3, ejercicioId: "pressbancabarra", nota: "", ...o });
test("copia: molestias y mesociclos hacen ida y vuelta; una copia sin ellos se sigue leyendo", () => {
  const p = modelo();
  p.molestias = [mo()];
  p.ajustes.mesociclos = [{ id: "m1", nombre: "Volumen", inicio: "2026-10-05", semanas: 6, descarga: true }];
  const r = leerCopia(JSON.stringify(crearCopia(p, "2026-11-15T12:00:00.000Z")));
  assert.deepEqual(r.molestias, p.molestias); assert.deepEqual(r.ajustes.mesociclos, p.ajustes.mesociclos);
  const vieja = crearCopia(modelo(), "2026-11-15T12:00:00.000Z"); delete vieja.molestias; delete vieja.ajustes.mesociclos; delete vieja.ajustes.nube;
  const v = leerCopia(JSON.stringify(vieja));
  assert.deepEqual(v.molestias, []); assert.deepEqual(v.ajustes.mesociclos, []); assert.equal(v.ajustes.nube.activa, false);
});
test("copia: se rechazan molestias y mesociclos mal formados con motivo", () => {
  const base = () => crearCopia(modelo(), "2026-11-15T12:00:00.000Z");
  assert.deepEqual(validarCopia(Object.assign(base(), { molestias: [mo()] })), []);
  const casos = [
    [{ molestias: "no" }, /molestias/], [{ molestias: [mo({ nivel: 9 })] }, /molestia 1/], [{ molestias: [mo({ articulacion: "dedo" })] }, /molestia 1/],
    [{ molestias: [mo(), mo()] }, /repetido/], [{ molestias: [mo({ id: "" })] }, /identificador/],
  ];
  for (const [parche, re] of casos) assert.match(validarCopia(Object.assign(base(), parche)).join("; "), re);
  const c = base(); c.ajustes.mesociclos = [{ id: "m", nombre: "x", inicio: "no-fecha", semanas: 4 }];
  assert.match(validarCopia(c).join("; "), /mesociclos/);
  const d = base(); d.ajustes.mesociclos = "no"; assert.match(validarCopia(d).join("; "), /mesociclos/);
});
test("ajustes: valores por defecto de mesociclos y nube", () => {
  const a = ajustesBase();
  assert.deepEqual(a.mesociclos, []); assert.equal(a.nube.activa, false); assert.equal(a.nube.auto, true); assert.equal(a.nube.url, "");
  assert.equal(completarAjustes({ nube: { activa: true, url: "https://x.example" } }).nube.auto, true, "completa los campos que faltan");
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

import { molestiaReciente } from "../../src/core/molestias.js";

test("molestia reciente: nivel ≥ 3, últimos 21 días, solo ese ejercicio", () => {
  const l = [
    { id: "a", ejercicioId: "press", fecha: "2026-11-10", nivel: 3, articulacion: "hombro" },
    { id: "b", ejercicioId: "press", fecha: "2026-11-20", nivel: 2, articulacion: "hombro" },
    { id: "c", ejercicioId: "remo", fecha: "2026-11-22", nivel: 4, articulacion: "codo" },
    { id: "d", ejercicioId: "press", fecha: "2026-10-01", nivel: 5, articulacion: "hombro" },
  ];
  assert.equal(molestiaReciente(l, "press", "2026-11-24").id, "a", "la de nivel 2 no cuenta; la de octubre es demasiado antigua");
  assert.equal(molestiaReciente(l, "press", "2026-12-02"), null, "a los 22 días ya no avisa");
  assert.equal(molestiaReciente(l, "remo", "2026-11-24").id, "c");
  assert.equal(molestiaReciente(l, "sentadilla", "2026-11-24"), null);
  assert.equal(molestiaReciente(l, "press", "2026-11-05"), null, "las anotaciones futuras no cuentan");
});

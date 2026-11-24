// Mapa corporal: cada músculo del catálogo tiene región, las vistas declaradas coinciden con el SVG y las regiones antiguas se migran.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MUSCULOS } from "../../src/core/musculos.js";
import { VISTA_MUSCULO, vistaPara, encaja } from "../../src/ui/cuerpo.js";
import { migrarRegiones, REGIONES_BASE, completarAjustes } from "../../src/data/modelo.js";

const svg = readFileSync(new URL("../../assets/cuerpo-muscular.svg", import.meta.url), "utf8");
const regiones = [...svg.matchAll(/<path id="m-([a-z-]+?)-([icd])-(\d+)" data-v="([fe])"/g)].map((m) => ({ musculo: m[1], lado: m[2], v: m[4], id: m[1] + "-" + m[2] + "-" + m[3] }));

test("ids de región únicos y todos los músculos tienen alguna", () => {
  assert.equal(new Set(regiones.map((r) => r.id)).size, regiones.length);
  const con = new Set(regiones.map((r) => r.musculo));
  for (const m of MUSCULOS) assert.ok(con.has(m.id), "sin región: " + m.id);
  for (const m of con) assert.ok(MUSCULOS.some((x) => x.id === m), "región de un músculo desconocido: " + m);
});

test("VISTA_MUSCULO coincide con las vistas en las que el SVG dibuja cada músculo", () => {
  for (const m of MUSCULOS) {
    const vistas = [...new Set(regiones.filter((r) => r.musculo === m.id).map((r) => r.v))].sort().join("");
    assert.equal([...VISTA_MUSCULO[m.id]].sort().join(""), vistas, m.id);
  }
});

test("vistaPara elige la vista con menos recorte", () => {
  assert.equal(vistaPara(["pecho-esternal", "triceps-lateral-medial"]), "frente");
  assert.equal(vistaPara(["dorsal", "biceps"]), "ambas");
  assert.equal(vistaPara(["dorsal", "triceps-lateral-medial", "gluteo-mayor"]), "espalda");
  assert.equal(vistaPara([]), "ambas");
});

test("los grupos base y el patrón «músculo-*» encajan con las regiones, sin cruces entre músculos", () => {
  const ids = regiones.map((r) => r.id);
  for (const [g, tokens] of Object.entries(REGIONES_BASE)) assert.ok(ids.some((id) => tokens.some((t) => encaja(id, t))), "grupo sin regiones: " + g);
  for (const m of MUSCULOS) assert.ok(ids.filter((id) => encaja(id, m.id + "-*")).every((id) => regiones.find((r) => r.id === id).musculo === m.id), m.id);
});

test("migrarRegiones: diagrama antiguo → músculos; lo nuevo no cambia", () => {
  assert.deepEqual(migrarRegiones(["chest-*"]), ["pecho-*"]);
  assert.deepEqual(migrarRegiones(["lats-*", "traps-*"]), ["dorsal-*", "redondo-*", "trapecio-*", "romboides-*"]);
  assert.deepEqual(migrarRegiones(["quads-*", "hip-flexor-*", "knee-*"]), ["recto-femoral-*", "vastos-*"]);
  assert.deepEqual(migrarRegiones(["biceps-*"]), ["biceps-*", "braquial-*"]);
  assert.deepEqual(migrarRegiones(["triceps-long-left", "triceps-lateral-right"]), ["triceps-largo-*", "triceps-lateral-medial-*"]);
  assert.deepEqual(migrarRegiones(["triceps-largo-*", "pecho-clavicular-*"]), ["triceps-largo-*", "pecho-clavicular-*"]);
  assert.deepEqual(migrarRegiones([]), []);
  const a = completarAjustes({ grupos: [{ nombre: "Pecho", color: null, regiones: ["chest-*"] }] });
  assert.deepEqual(a.grupos[0].regiones, ["pecho-*"]);
  assert.deepEqual(completarAjustes(completarAjustes({ grupos: a.grupos })).grupos, a.grupos);
});

test("el mapa es simétrico: cada músculo de cada cara tiene región a la izquierda y a la derecha", () => {
  const lados = new Map();
  for (const r of regiones) { const k = r.musculo + "|" + r.v; lados.set(k, (lados.get(k) || new Set()).add(r.lado)); }
  for (const [k, l] of lados) assert.deepEqual([...l].sort(), ["d", "i"], k);
});

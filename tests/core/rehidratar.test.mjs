// El análisis que llega del Worker (aPlano → structuredClone → rehidratar) es igual al directo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { analizar } from "../../src/core/analisis.js";
import { aPlano, rehidratar } from "../../src/core/rehidratar.js";
import { desdeLegacy } from "../../src/migracion/index.js";
import { fixture } from "../golden/fixture.mjs";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const conjuntos = [["sintetico", desdeLegacy(fixture()), ["2026-07-08", "2026-11-15", "2027-01-10"]]];
if (existsSync(RAIZ + "seed.json")) conjuntos.push(["seed", desdeLegacy(JSON.parse(readFileSync(RAIZ + "seed.json", "utf8"))), ["2026-10-28", "2026-11-15"]]);

// Comparación profunda que ignora funciones y la referencia `ref` (se restaura aparte)
function igual(a, b, ruta, vistos = new Map()) {
  if (typeof a === "function" || typeof b === "function") return;
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) assert.fail(ruta + ": " + String(a) + " ≠ " + String(b));
  if (vistos.get(a) === b) return;
  vistos.set(a, b);
  if (a instanceof Map) {
    assert.ok(b instanceof Map, ruta); assert.equal(a.size, b.size, ruta);
    const ea = [...a], eb = [...b];   // las claves pueden ser objetos (clonados): por orden
    ea.forEach(([k, v], i) => { igual(k, eb[i][0], ruta + "<clave " + i + ">", vistos); igual(v, eb[i][1], ruta + "<" + i + ">", vistos); });
    return;
  }
  if (a instanceof Set) { assert.deepEqual([...a], [...b], ruta); return; }
  const ka = Object.keys(a).filter((k) => typeof a[k] !== "function" && k !== "C"), kb = Object.keys(b).filter((k) => typeof b[k] !== "function" && k !== "C");
  assert.deepEqual(ka.sort(), kb.sort(), ruta);
  for (const k of ka) igual(a[k], b[k], ruta + "." + k, vistos);
}

for (const [nombre, modelo, fechas] of conjuntos) for (const hoy of fechas)
  test("rehidratar " + nombre + " " + hoy, () => {
    const A = analizar(modelo, hoy);
    const B = rehidratar(structuredClone(aPlano(analizar(modelo, hoy))), modelo);
    igual(A, B, "A");
    // las funciones dan lo mismo
    for (const p of A.progresion.values()) if (!p.sinDatos) {
      const q = B.progresion.get(p.k);
      assert.equal(B.proximaVez(q), A.proximaVez(p));
      assert.deepEqual(B.incrementoDe(q), A.incrementoDe(p));
      assert.deepEqual(B.avisosProgresion(q), A.avisosProgresion(p));
      assert.equal(B.progresionDe(p.k), q);
    }
    for (const per of ["sem", "7d", "30d", "all"]) assert.deepEqual(B.balance(per), A.balance(per));
    assert.deepEqual([...B.C.horario], [...A.C.horario]);
    for (const d of ["2026-08-01", hoy]) assert.deepEqual(B.C.bloquesActivos(d), A.C.bloquesActivos(d));
    for (const x of A.series.slice(0, 50)) assert.equal(B.C.grupoDe(x.ejercicio), A.C.grupoDe(x.ejercicio));
    if (A.liga.ok) {
      for (const [k, e] of A.liga.ejercicios) { const f = B.liga.ejercicios.get(k); if (e.hoy && e.hoy.nivel) { assert.equal(B.liga.faltaTxt(f), A.liga.faltaTxt(e)); assert.deepEqual(B.liga.progreso(f.hoy), A.liga.progreso(e.hoy)); } }
      for (const [k, g] of A.liga.grupos) { const f = B.liga.grupos.get(k); if (g.hoy.nivel) assert.equal(B.liga.faltaGrupoTxt(f.hoy), A.liga.faltaGrupoTxt(g.hoy)); assert.deepEqual(B.liga.mensual(f.linea, ["2026-09", "2026-10"]), A.liga.mensual(g.linea, ["2026-09", "2026-10"])); }
      assert.equal(B.liga.pct(50), A.liga.pct(50));
    }
    for (const s of B.sesiones) assert.ok(s.ref && s.ref.id === s.id, "ref restaurada");
  });

test("aPlano no deja funciones (structuredClone no falla)", () => {
  const P = aPlano(analizar(conjuntos[0][1], "2026-11-15"));
  assert.doesNotThrow(() => structuredClone(P));
});

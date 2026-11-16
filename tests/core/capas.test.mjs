// Reglas de dependencia entre capas (docs/ARQUITECTURA.md §2), leyendo los imports de cada fichero.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const ficheros = (d) => readdirSync(d).flatMap((f) => { const r = join(d, f); return statSync(r).isDirectory() ? ficheros(r) : r.endsWith(".js") ? [r] : []; });
const capa = (f) => { const r = relative(SRC, f); return r.includes("/") ? r.split("/")[0] : r.replace(/\.js$/, ""); };
const importa = (f) => [...readFileSync(f, "utf8").matchAll(/(?:import|export)\s[^;]*?from\s*"([^"]+)"|import\(\s*"([^"]+)"\s*\)|new URL\(\s*"([^"]+\.js)"/g)]
  .map((m) => m[1] || m[2] || m[3]).filter((x) => x.startsWith(".")).map((x) => normalize(join(dirname(f), x)));

// capa → capas que NO puede importar
const PROHIBIDO = {
  core: ["data", "ui", "views", "store", "app", "migracion", "worker"],
  migracion: ["data", "ui", "views", "store", "app", "worker"],
  data: ["ui", "views", "store", "app", "worker"],
  worker: ["data", "ui", "views", "store", "app", "migracion"],
  ui: ["views", "store", "app", "data", "migracion", "worker"],
  store: ["ui", "views", "app"],
};

test("src/core no importa nada de src/migracion (ni de capas superiores)", () => {
  const malos = [];
  for (const f of ficheros(SRC + "core")) for (const d of importa(f)) if (capa(d) !== "core") malos.push(relative(SRC, f) + " → " + relative(SRC, d));
  assert.deepEqual(malos, []);
});

test("reglas de dependencia entre capas", () => {
  const malos = [];
  for (const f of ficheros(SRC)) {
    const c = capa(f), no = PROHIBIDO[c] || [];
    for (const d of importa(f)) if (no.includes(capa(d))) malos.push(relative(SRC, f) + " → " + relative(SRC, d));
  }
  assert.deepEqual(malos, []);
});

test("ningún fichero fuente pasa de ~350 líneas", () => {
  const largos = [];
  for (const f of [...ficheros(SRC), ...readdirSync(SRC + "ui").filter((x) => x.endsWith(".css")).map((x) => SRC + "ui/" + x)]) {
    const n = readFileSync(f, "utf8").split("\n").length;
    if (n > 360 && !EXCEPCIONES[relative(SRC, f)]) largos.push(relative(SRC, f) + " (" + n + ")");
  }
  assert.deepEqual(largos, []);
});
// Justificadas en docs/ARQUITECTURA.md
const EXCEPCIONES = { "ui/componentes.css": "hoja de estilos de todos los componentes; partirla añade peticiones sin ganar claridad" };

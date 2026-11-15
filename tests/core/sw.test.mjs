// El service worker cachea todos los ficheros que carga la app (si falta uno, offline se rompe).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const sw = readFileSync(join(RAIZ, "sw.js"), "utf8");
const lista = JSON.parse(sw.match(/const FICHEROS = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]$/, "]"));

test("FICHEROS incluye cada módulo y hoja de estilo de src/", () => {
  const faltan = [];
  for (const d of ["src", "src/ui", "src/views", "src/core", "src/data"])
    for (const f of readdirSync(join(RAIZ, d))) if (/\.(js|css)$/.test(f) && !lista.includes(join(d, f))) faltan.push(join(d, f));
  assert.deepEqual(faltan, []);
});

test("todos los ficheros de FICHEROS existen", () => {
  for (const f of lista) if (f !== "./") assert.ok(existsSync(join(RAIZ, f)), f);
});

test("index.html solo enlaza ficheros cacheados", () => {
  const html = readFileSync(join(RAIZ, "index.html"), "utf8");
  for (const m of html.matchAll(/(?:href|src)="([^"#:]+)"/g)) assert.ok(lista.includes(m[1]), m[1]);
});

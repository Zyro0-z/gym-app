// Comprobación de textos (regla 0.5 y 0.6): ni vocabulario de la versión anterior ni emojis en la app.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ficheros = (d) => readdirSync(d).flatMap((n) => { const r = join(d, n); return statSync(r).isDirectory() ? ficheros(r) : /\.(js|css|html|webmanifest)$/.test(n) ? [r] : []; });
const todos = [...ficheros(join(RAIZ, "src")), join(RAIZ, "index.html"), join(RAIZ, "manifest.webmanifest"), join(RAIZ, "sw.js")];

test("sin vocabulario de Obsidian, LiftOff ni Dataview", () => {
  const malos = todos.flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => [f, i + 1, l]))
    .filter(([, , l]) => /obsidian|liftoff|\bdataview\b|\bvault\b|frontmatter/i.test(l.replace(/new DataView\(/g, "")));
  assert.deepEqual(malos.map(([f, n]) => f.slice(RAIZ.length) + ":" + n), []);
});

test("sin emojis", () => {
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
  const malos = todos.flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => [f, i + 1, l])).filter(([, , l]) => EMOJI.test(l));
  assert.deepEqual(malos.map(([f, n]) => f.slice(RAIZ.length) + ":" + n), []);
});

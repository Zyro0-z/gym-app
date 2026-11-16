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
  for (const d of ["src", "src/ui", "src/views", "src/core", "src/data", "src/worker", "src/migracion"])
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

// ── Precaché completo: todo lo que carga la app, siguiendo los imports desde index.html ──
const referencias = (fichero) => {
  const txt = readFileSync(join(RAIZ, fichero), "utf8"), base = fichero.includes("/") ? fichero.slice(0, fichero.lastIndexOf("/") + 1) : "";
  const out = [];
  const res = (r) => { const u = new URL(r, "http://x/" + base); return u.pathname.slice(1); };
  if (fichero.endsWith(".html")) for (const m of txt.matchAll(/(?:href|src)="([^"#:]+)"/g)) out.push(res(m[1]));
  if (fichero.endsWith(".js")) {
    for (const m of txt.matchAll(/(?:import|export)\s[^;]*?from\s*"([^"]+)"/g)) out.push(res(m[1]));
    for (const m of txt.matchAll(/import\(\s*"([^"]+)"\s*\)/g)) out.push(res(m[1]));
    for (const m of txt.matchAll(/new\s+(?:Shared)?Worker\(\s*new URL\(\s*"([^"]+)"\s*,\s*import\.meta\.url/g)) out.push(res(m[1]));
    for (const m of txt.matchAll(/fetch\(\s*"([^"]+\.(?:svg|json|png))"/g)) out.push(m[1]);
  }
  if (fichero.endsWith(".css")) for (const m of txt.matchAll(/url\(\s*["']?([^"')#:]+)["']?\s*\)/g)) out.push(res(m[1]));
  return out;
};

test("todo lo que importa la app (desde index.html, recursivo) está en FICHEROS", () => {
  const vistos = new Set(), cola = ["index.html"], faltan = [];
  while (cola.length) {
    const f = cola.pop();
    if (vistos.has(f)) continue;
    vistos.add(f);
    if (!lista.includes(f)) faltan.push(f);
    if (/\.(html|js|css)$/.test(f) && existsSync(join(RAIZ, f))) cola.push(...referencias(f));
  }
  assert.deepEqual(faltan, []);
  assert.ok(vistos.size > 40, "el recorrido encuentra los módulos (" + vistos.size + ")");
});

test("la versión del service worker no se edita a mano: «dev» en el repo", () => {
  assert.match(sw, /const V = "dev";/);
});

test("estampar la versión: cambia si cambia el contenido o la lista", async () => {
  const { mkdtempSync, cpSync, writeFileSync, appendFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { estampar, huella } = await import("../../tools/estampar-version.mjs");
  const tmp = mkdtempSync(join(tmpdir(), "gym-sw-"));
  for (const f of ["index.html", "manifest.webmanifest", "sw.js", "src", "assets", "icons"]) cpSync(join(RAIZ, f), join(tmp, f), { recursive: true });
  const h1 = huella(tmp);
  appendFileSync(join(tmp, "src/ui/base.css"), "\n/* cambio */\n");
  const h2 = huella(tmp);
  assert.notEqual(h1, h2, "un cambio de contenido cambia la huella");
  const v = estampar(tmp, "abcdef0123");
  assert.equal(v, "gym-abcdef0-" + h2);
  assert.match(readFileSync(join(tmp, "sw.js"), "utf8"), new RegExp(`const V = "${v}"`));
  writeFileSync(join(tmp, "sw.js"), readFileSync(join(RAIZ, "sw.js"), "utf8").replace('"icons/icon-512.png",', ""));
  assert.notEqual(huella(tmp), h2, "un cambio en la lista cambia la huella");
});

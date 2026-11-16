// Estampa la versión del service worker en una copia publicable de la app.
//   node tools/estampar-version.mjs <carpeta> [commit]
// En el repo, sw.js lleva `const V = "dev"`. Aquí se sustituye por «gym-<commit>-<huella>», donde la
// huella es un hash de la lista FICHEROS y del contenido de cada fichero. Si cambia un fichero o la
// lista, cambia la versión, y el service worker instala una caché nueva completa.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export function huella(raiz) {
  const sw = readFileSync(join(raiz, "sw.js"), "utf8");
  const lista = JSON.parse(sw.match(/const FICHEROS = (\[[\s\S]*?\]);/)[1].replace(/,\s*\]$/, "]"));
  const h = createHash("sha256");
  h.update(JSON.stringify(lista));
  // sw.js también cuenta (sin la línea de la versión, que es lo que se estampa)
  h.update(sw.replace(/const V = "[^"]*"/, ""));
  for (const f of lista) if (f !== "./") { h.update("\0" + f + "\0"); h.update(readFileSync(join(raiz, f))); }
  return h.digest("hex").slice(0, 10);
}

export function estampar(raiz, commit = "local") {
  const f = join(raiz, "sw.js");
  const sw = readFileSync(f, "utf8");
  if (!/const V = "[^"]*"/.test(sw)) throw new Error("sw.js no tiene `const V = \"…\"`");
  const v = "gym-" + String(commit).slice(0, 7) + "-" + huella(raiz);
  writeFileSync(f, sw.replace(/const V = "[^"]*"/, `const V = "${v}"`));
  return v;
}

if (process.argv[1] && process.argv[1].endsWith("estampar-version.mjs")) {
  const [raiz, commit] = process.argv.slice(2);
  if (!raiz) { console.error("Uso: node tools/estampar-version.mjs <carpeta> [commit]"); process.exit(2); }
  console.log(estampar(raiz, commit));
}

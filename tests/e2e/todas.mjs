// Ejecuta todas las pruebas e2e en serie con un motor. Uso: node tests/e2e/todas.mjs [chromium|webkit]
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const motor = process.argv[2] || "chromium";
// capturas.mjs es el recorrido visual (se lanza aparte); todas.mjs es este fichero
const FUERA = new Set(["todas.mjs", "capturas.mjs"]);
const pruebas = readdirSync(AQUI).filter((f) => f.endsWith(".mjs") && !FUERA.has(f)).sort();
const fallos = [];
for (const f of pruebas) {
  console.log("\n▶", f, motor);
  const r = spawnSync(process.execPath, [AQUI + f, motor], { stdio: "inherit", cwd: AQUI + ".." });
  if (r.status !== 0) fallos.push(f);
}
console.log(fallos.length ? "\nFallan: " + fallos.join(", ") : "\nTodas las e2e en verde (" + pruebas.length + ", " + motor + ")");
process.exit(fallos.length ? 1 : 0);

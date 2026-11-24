// Importar tablas de estándares desde Ajustes › Avanzado.
// Uso: node e2e/tablas.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8800;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 500) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));

const dir = mkdtempSync(join(tmpdir(), "tablas-"));
const buena = join(dir, "buena.json"), mala = join(dir, "mala.json");
const filas = (k) => [60, 80, 100].map((pc, i) => ({ pc, niveles: [10 + k + i, 20 + k + i, 30 + k + i, 40 + k + i, 50 + k + i] }));
writeFileSync(buena, JSON.stringify({ tipo: "gym-estandares", version: 1, estandares: { "hack-squat": filas(0), squat: filas(5) } }));
writeFileSync(mala, JSON.stringify({ squat: [{ pc: 80, niveles: [1, 2] }] }));

await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.estandares = { squat: [{ pc: 80, niveles: [1, 2, 3, 4, 5] }], "bench-press": [{ pc: 80, niveles: [1, 2, 3, 4, 5] }] }; }));
await p.evaluate(() => window.__gym.nav.ir("avanzado")); await espera(700);

paso("un archivo con formato incorrecto se rechaza y no cambia nada");
let [fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Importar tablas", { exact: true }).click()]);
await fc.setFiles(mala); await espera(600);
assert.ok(await p.getByText("No se pudo importar").isVisible());
await p.getByRole("button", { name: /Aceptar|OK|Vale/ }).first().click(); await espera(400);
let e = await estado();
assert.equal(e.ajustes.estandares.squat.length, 1);

paso("un archivo correcto añade tablas y sustituye las que tienen el mismo nombre");
[fc] = await Promise.all([p.waitForEvent("filechooser"), p.getByText("Importar tablas", { exact: true }).click()]);
await fc.setFiles(buena); await espera(600);
await p.getByRole("button", { name: "Importar", exact: true }).click(); await espera(900);
e = await estado();
assert.equal(e.ajustes.estandares.squat.length, 3);
assert.equal(e.ajustes.estandares["hack-squat"].length, 3);
assert.equal(e.ajustes.estandares["bench-press"].length, 1);
assert.ok(await p.getByText("hack-squat").isVisible());

assert.deepEqual(errores, []);
await b.close(); srv.close();
console.log("OK tablas");

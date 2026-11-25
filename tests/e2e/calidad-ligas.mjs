// Calidad de los datos: resolver en bloque «Factor de liga sin revisar» y «Sin referencia de liga».
// Uso: node e2e/calidad-ligas.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8801;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 500) => p.waitForTimeout(ms);
const estado = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado)));

await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(() => window.__gym.store.guardarAjustes((a) => { a.estandares = { squat: [{ pc: 80, niveles: [1, 2, 3, 4, 5] }] }; }));
await p.evaluate(() => window.__gym.store.guardarCatalogo([
  { id: "sentadilla", nombre: "Sentadilla", grupo: "Pierna", tipoAncla: "peso", rangoReps: { min: 6, max: 8 }, estandar: { slug: "squat", factor: 1, revisado: false } },
  { id: "pajaros", nombre: "Pájaros en máquina", grupo: "Hombro", tipoAncla: "peso", rangoReps: { min: 12, max: 15 } },
]));
await p.evaluate(() => window.__gym.nav.ir("calidad")); await espera(700);

paso("«Dar por revisados» confirma el factor sin cambiarlo y el aviso desaparece");
await p.getByRole("button", { name: "Dar por revisados" }).click(); await espera(700);
let e = await estado();
assert.deepEqual(e.catalogo.find((c) => c.id === "sentadilla").estandar, { slug: "squat", factor: 1, revisado: true });
assert.equal(await p.getByText("Factor de liga sin revisar").count(), 0);

paso("«Marcar sin estándar» saca el ejercicio del aviso");
await p.getByRole("button", { name: "Marcar sin estándar" }).click(); await espera(700);
e = await estado();
assert.deepEqual(e.catalogo.find((c) => c.id === "pajaros").estandar, { sin: true });
assert.equal(await p.getByText("Sin referencia de liga").count(), 0);

assert.deepEqual(errores, []);
await b.close(); srv.close();
console.log("OK calidad-ligas");

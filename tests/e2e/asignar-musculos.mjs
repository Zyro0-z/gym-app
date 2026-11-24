// Mapa por músculos con un catálogo sin músculos: aviso claro y asignación automática desde el catálogo base.
// Uso: node e2e/asignar-musculos.mjs [chromium|webkit]
import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
import { servir } from "../serve.mjs";

const motor = process.argv[2] || "chromium", nav = { chromium, webkit }[motor];
const PUERTO = 8798;
const srv = await servir(PUERTO);
const b = await nav.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: motor === "chromium" })).newPage();
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
const paso = (t) => console.log("·", t);
const espera = (ms = 450) => p.waitForTimeout(ms);

await p.goto(`http://127.0.0.1:${PUERTO}/`);
await p.waitForFunction(() => window.__gym);
await p.evaluate(async () => {
  const s = window.__gym.store;
  const ej = (id, nombre) => ({ id, nombre, grupo: null, unilateral: false, tipoAncla: "peso", tipoMaterial: null, incremento: null, rangoReps: null, top: false, estandar: null });
  const f = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const ses = (n, ejId, nombre) => ({ id: f + "-t-" + n, rutina: "Push", fecha: f, inicio: "10:00", fin: "11:00", duracion: 60,
    ejercicios: [{ ejercicioId: ejId, nombre, tipo: "peso", series: [1, 2, 3].map(() => ({ peso: 40, reps: 10, tipo: "normal", hecha: true })) }] });
  await s.guardarCatalogo([ej("pressplano(manc)", "Press Plano (Manc)"), ej("pressinclinado(manc)", "Press Inclinado (Manc)"), ej("raro", "Ejercicio raro")]);
  await s.importar({ sesiones: [ses(1, "pressplano(manc)", "Press Plano (Manc)"), ses(2, "pressinclinado(manc)", "Press Inclinado (Manc)")], catalogo: s.estado.catalogo, rutinas: [], pesajes: [], medidas: [], molestias: [], ajustes: s.estado.ajustes }, "borrar");
});
await p.reload(); await p.waitForFunction(() => window.__gym); await espera(800);
await p.getByRole("tab", { name: /Progreso/ }).click(); await espera();
await p.getByText("Músculos", { exact: true }).first().click(); await espera();
await p.getByText("Músculos", { exact: true }).nth(1).click(); await espera();
await p.getByText("8 semanas", { exact: true }).click(); await espera();

paso("sin músculos asignados el mapa lo explica y ofrece asignarlos");
let txt = await p.locator("#app").innerText();
assert.match(txt, /Ejercicios sin músculos asignados/);
assert.match(txt, /Asignar músculos automáticamente/);
assert.match(txt, /Ejercicio raro/, "el que no está en el catálogo base se lista para asignarlo a mano");

paso("al asignar, el mapa detallado separa pecho superior y resto de pecho");
await p.getByText("Asignar músculos automáticamente").click(); await espera(800);
txt = await p.locator("#app").innerText();
assert.match(txt, /Pecho superior \(clavicular\)/);
assert.match(txt, /Pecho medio e inferior \(esternal\)/);
assert.doesNotMatch(txt, /Ejercicios sin músculos asignados/);
const e = await p.evaluate(() => JSON.parse(JSON.stringify(window.__gym.store.estado.catalogo)));
assert.deepEqual(e.find((x) => x.id === "pressinclinado(manc)").musculos.p, ["pecho-clavicular"]);
assert.deepEqual(e.find((x) => x.id === "pressplano(manc)").musculos.p, ["pecho-esternal"]);
assert.equal(e.find((x) => x.id === "raro").musculos, undefined);

assert.deepEqual(errores, [], "sin errores en consola");
console.log("OK asignar-musculos (" + motor + ")");
await b.close(); srv.close && srv.close();

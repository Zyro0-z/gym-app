// Validación de copias (src/data/esquema.js): las buenas pasan; cada tipo de error se rechaza con
// un motivo legible y leerCopia no devuelve nada (así importar no toca ningún dato).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validarCopia } from "../../src/data/esquema.js";
import { crearCopia, leerCopia, planMigracion } from "../../src/data/modelo.js";
import { fixture } from "../golden/fixture.mjs";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const buena = () => JSON.parse(JSON.stringify(crearCopia(planMigracion(fixture()), "2026-11-15T12:00:00.000Z")));

test("copias válidas: sintética y la real (seed.json) migradas y exportadas", () => {
  assert.deepEqual(validarCopia(buena()), []);
  if (existsSync(RAIZ + "seed.json")) assert.deepEqual(validarCopia(crearCopia(planMigracion(JSON.parse(readFileSync(RAIZ + "seed.json", "utf8"))))), []);
});

const CASOS = [
  ["sin lista de sesiones", (o) => { delete o.sesiones; }, /falta la lista «sesiones»/],
  ["sin catálogo", (o) => { delete o.catalogo; }, /falta la lista «catalogo»/],
  ["pesajes no es lista", (o) => { o.pesajes = {}; }, /falta la lista «pesajes»/],
  ["versión más nueva", (o) => { o.version = 99; }, /versión de copia no soportada/],
  ["esquema más nuevo", (o) => { o.esquema = 99; }, /esquema de datos no soportado/],
  ["ajustes con otro formato", (o) => { o.ajustes = [1]; }, /ajustes/],
  ["sesión sin id", (o) => { delete o.sesiones[0].id; }, /sin identificador/],
  ["ids de sesión repetidos", (o) => { o.sesiones[1].id = o.sesiones[0].id; }, /identificador repetido/],
  ["fecha imposible", (o) => { o.sesiones[0].fecha = "2026-02-30"; }, /fecha imposible/],
  ["fecha con formato raro", (o) => { o.sesiones[0].fecha = "30/01/2026"; }, /fecha imposible/],
  ["hora no válida", (o) => { o.sesiones[0].inicio = "25:00"; }, /hora de inicio o fin/],
  ["duración negativa", (o) => { o.sesiones[0].duracion = -5; }, /duración no válida/],
  ["ejercicios no es lista", (o) => { o.sesiones[0].ejercicios = "x"; }, /sin lista de ejercicios/],
  ["ejercicio sin id", (o) => { delete o.sesiones[0].ejercicios[0].ejercicioId; }, /sin identificador de ejercicio/],
  ["peso como texto", (o) => { o.sesiones[0].ejercicios[0].series[0].peso = "80"; }, /peso no válido/],
  ["peso negativo", (o) => { o.sesiones[0].ejercicios[0].series[0].peso = -1; }, /peso no válido/],
  ["repeticiones nulas", (o) => { o.sesiones[0].ejercicios[0].series[0].reps = null; }, /repeticiones no válidas/],
  ["tipo de serie desconocido", (o) => { o.sesiones[0].ejercicios[0].series[0].tipo = "superserie"; }, /tipo de serie desconocido/],
  ["RPE fuera de rango", (o) => { o.sesiones[0].ejercicios[0].series[0].rpe = 11; }, /RPE fuera de rango/],
  ["RPE con paso raro", (o) => { o.sesiones[0].ejercicios[0].series[0].rpe = 8.3; }, /RPE fuera de rango/],
  ["recuperación fuera de rango", (o) => { o.sesiones[0].recuperacion = { estres: 9 }; }, /de 1 a 5/],
  ["ejercicio repetido en el catálogo", (o) => { o.catalogo[1].id = o.catalogo[0].id; }, /repetido en el catálogo/],
  ["rutina sin nombre", (o) => { o.rutinas[0].nombre = ""; }, /incompleta/],
  ["rutina repetida", (o) => { o.rutinas[1].id = o.rutinas[0].id; }, /repetida/],
  ["pesaje con fecha imposible", (o) => { o.pesajes[0].fecha = "2026-13-01"; }, /pesaje 1: fecha imposible/],
  ["pesaje sin kg", (o) => { delete o.pesajes[0].kg; }, /peso no válido/],
  ["medidas no es lista", (o) => { o.medidas = "x"; }, /«medidas» no es una lista/],
  ["medida imposible", (o) => { o.medidas = [{ fecha: "2026-11-01", cintura: -3 }]; }, /«cintura» no válida/],
];

for (const [nombre, romper, motivo] of CASOS)
  test("copia inválida: " + nombre, () => {
    const o = buena(); romper(o);
    const p = validarCopia(o);
    assert.ok(p.length > 0, "debería rechazarse");
    assert.match(p.join("; "), motivo);
    assert.throws(() => leerCopia(JSON.stringify(o)), (e) => /dañada|no soportad|más nueva|no contiene sesiones/.test(e.message) && !/undefined|\[object/.test(e.message));
  });

test("muchos errores: se informa de unos pocos, no de todos", () => {
  const o = buena();
  for (const s of o.sesiones) s.fecha = "x";
  assert.equal(validarCopia(o).length, 3);
});

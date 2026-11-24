// Genera una copia de demostración con datos sintéticos «vivos»: el historial del modelo de pruebas
// desplazado en bloques de 7 días hasta terminar ayer, más RPE, recuperación, molestias, medidas,
// mesociclo y dos gimnasios. Uso: node tools/demo.mjs [salida.json]
import { readFileSync, writeFileSync } from "node:fs";
import { crearCopia, leerCopia } from "../src/data/modelo.js";

const base = JSON.parse(readFileSync(new URL("../tests/golden/modelo-sintetico.json", import.meta.url), "utf8"));
const iso = (d) => d.toISOString().slice(0, 10);
const dia = (s) => new Date(s + "T12:00:00Z");
const mas = (s, n) => { const d = dia(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

const hoy = process.env.HOY || new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
const ayer = mas(hoy, -1);
const ultima = base.sesiones.map((s) => s.fecha).sort().at(-1);
const desp = Math.floor((dia(ayer) - dia(ultima)) / 864e5 / 7) * 7;
const mov = (f) => (f ? mas(f, desp) : f);

const e = JSON.parse(JSON.stringify(base));
e.sesiones.forEach((s) => { s.fecha = mov(s.fecha); });
e.pesajes.forEach((p) => { p.fecha = mov(p.fecha); });
e.sesiones.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

// RPE en las series de trabajo y recuperación en las 14 últimas sesiones
let k = 0;
for (const s of e.sesiones) {
  for (const ex of s.ejercicios) {
    const n = ex.series.filter((x) => x.tipo !== "calentamiento").length;
    let i = 0;
    for (const x of ex.series) { if (x.tipo === "calentamiento") continue; x.rpe = Math.min(10, 7 + (i / Math.max(1, n - 1)) * 2.5 + ((k++ % 3) - 1) * 0.5); x.rpe = Math.round(x.rpe * 2) / 2; i++; }
  }
}
e.sesiones.slice(-14).forEach((s, i) => { s.recuperacion = { sueno: 5.5 + ((i * 7) % 5) * 0.5, estres: 1 + (i % 4), energia: 2 + ((i * 3) % 4) }; });
e.sesiones.at(-1).nota = "Buenas sensaciones; el hombro derecho molesta al bajar la barra.";

// Hoy toca entrenar
const dow = ((dia(hoy).getUTCDay() + 6) % 7) + 1;
e.ajustes.horario = { ...e.ajustes.horario, [dow]: "Torso A" };

// Dos gimnasios
e.ajustes.gimnasios = [{ id: "principal", nombre: "Gimnasio", barra: 20, discos: [1.25, 2.5, 5, 10, 15, 20, 25] }, { id: "casa", nombre: "Casa", barra: 15, discos: [1.25, 2.5, 5, 10] }];
e.ajustes.gimnasioActivo = "principal";
e.sesiones.filter((_, i) => i % 9 === 4).forEach((s) => { s.gimnasio = "casa"; });

// Mesociclo de 8 semanas que empezó hace 4 (lunes)
const lunes = (f) => mas(f, -(((dia(f).getUTCDay() + 6) % 7)));
e.ajustes.mesociclos = [{ id: "demo1", nombre: "Bloque de fuerza", inicio: mas(lunes(hoy), -28), semanas: 8, descarga: false }];

// Molestias y medidas
const ej = e.catalogo.find((c) => /banca/i.test(c.nombre)) || e.catalogo[0];
e.molestias = [
  { id: "mo-d1", fecha: mas(hoy, -2), articulacion: "hombro", lado: "der", nivel: 3, ejercicioId: ej.id, nota: "al bajar la barra" },
  { id: "mo-d2", fecha: mas(hoy, -9), articulacion: "hombro", lado: "der", nivel: 2, ejercicioId: ej.id, nota: "" },
  { id: "mo-d3", fecha: mas(hoy, -16), articulacion: "hombro", lado: "der", nivel: 2, nota: "" },
  { id: "mo-d4", fecha: mas(hoy, -23), articulacion: "codo", lado: "izq", nivel: 1, nota: "tras el curl" },
  { id: "mo-d5", fecha: mas(hoy, -19), articulacion: "espalda-baja", lado: "ambos", nivel: 2, nota: "" },
];
e.medidas = [0, 1, 2, 3, 4, 5].map((i) => ({ fecha: mas(hoy, -150 + i * 28), cintura: 83 - i * 0.3, pecho: 100 + i * 0.5, brazo: 35.5 + i * 0.4, muslo: 56 + i * 0.5, cadera: 95, cuello: 38 }));

const copia = crearCopia(e, new Date().toISOString());
leerCopia(JSON.stringify(copia));   // valida contra el esquema; lanza si algo no encaja
const salida = process.argv[2] || "gym-demo.json";
writeFileSync(salida, JSON.stringify(copia));
console.log(salida + ": " + e.sesiones.length + " sesiones, " + e.pesajes.length + " pesajes, " + e.molestias.length + " molestias, hasta " + e.sesiones.at(-1).fecha + " (hoy " + hoy + ")");

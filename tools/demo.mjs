// Genera una copia de demostración con la rutina real de Sergio (Torso Fuerza, Piernas + Core, Push y Pull) durante 12 semanas
// terminando ayer, con progresión, RPE, peso corporal, medidas, molestias, mesociclo, dos gimnasios y los músculos de cada ejercicio
// asignados desde el catálogo base (así el mapa por músculos se ve completo).
// Uso: node tools/demo.mjs [salida.json]      ·      node tools/demo.mjs --sintetico [salida.json]  (el historial del modelo de pruebas)
import { readFileSync, writeFileSync } from "node:fs";
import { crearCopia, leerCopia } from "../src/data/modelo.js";
import { canon } from "../src/core/nombres.js";
import { baseDe } from "../src/core/musculos.js";

const args = process.argv.slice(2);
const sintetico = args.includes("--sintetico");
const salida = args.filter((a) => !a.startsWith("--"))[0] || "gym-demo.json";

const iso = (d) => d.toISOString().slice(0, 10);
const dia = (s) => new Date(s + "T12:00:00Z");
const mas = (s, n) => { const d = dia(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const dow = (s) => ((dia(s).getUTCDay() + 6) % 7) + 1;           // 1 = lunes … 7 = domingo
const lunes = (s) => mas(s, -(dow(s) - 1));
const hoy = process.env.HOY || new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
const ayer = mas(hoy, -1);
const base = JSON.parse(readFileSync(new URL("../tests/golden/modelo-sintetico.json", import.meta.url), "utf8"));

const molestiasDe = (ejId) => [
  { id: "mo-d1", fecha: mas(hoy, -2), articulacion: "hombro", lado: "der", nivel: 3, ejercicioId: ejId, nota: "al bajar la barra" },
  { id: "mo-d2", fecha: mas(hoy, -9), articulacion: "hombro", lado: "der", nivel: 2, ejercicioId: ejId, nota: "" },
  { id: "mo-d3", fecha: mas(hoy, -16), articulacion: "hombro", lado: "der", nivel: 2, nota: "" },
  { id: "mo-d4", fecha: mas(hoy, -23), articulacion: "codo", lado: "izq", nivel: 1, nota: "tras el curl" },
  { id: "mo-d5", fecha: mas(hoy, -19), articulacion: "espalda-baja", lado: "ambos", nivel: 2, nota: "" },
];
const medidasDe = () => [0, 1, 2, 3, 4, 5].map((i) => ({ fecha: mas(hoy, -150 + i * 28), cintura: 83 - i * 0.3, pecho: 100 + i * 0.5, brazo: 35.5 + i * 0.4, muslo: 56 + i * 0.5, cadera: 95, cuello: 38 }));
const gimnasios = [{ id: "principal", nombre: "Gimnasio", barra: 20, discos: [1.25, 2.5, 5, 10, 15, 20, 25] }, { id: "casa", nombre: "Casa", barra: 15, discos: [1.25, 2.5, 5, 10] }];

function sinteticoModelo() {
  const ultima = base.sesiones.map((s) => s.fecha).sort().at(-1);
  const desp = Math.floor((dia(ayer) - dia(ultima)) / 864e5 / 7) * 7;
  const e = JSON.parse(JSON.stringify(base));
  e.sesiones.forEach((s) => { s.fecha = mas(s.fecha, desp); });
  e.pesajes.forEach((p) => { p.fecha = mas(p.fecha, desp); });
  e.sesiones.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  let k = 0;
  for (const s of e.sesiones) for (const ex of s.ejercicios) {
    const n = ex.series.filter((x) => x.tipo !== "calentamiento").length;
    let i = 0;
    for (const x of ex.series) { if (x.tipo === "calentamiento") continue; x.rpe = Math.round(Math.min(10, 7 + (i / Math.max(1, n - 1)) * 2.5 + ((k++ % 3) - 1) * 0.5) * 2) / 2; i++; }
  }
  e.sesiones.slice(-14).forEach((s, i) => { s.recuperacion = { sueno: 5.5 + ((i * 7) % 5) * 0.5, estres: 1 + (i % 4), energia: 2 + ((i * 3) % 4) }; });
  e.sesiones.at(-1).nota = "Buenas sensaciones; el hombro derecho molesta al bajar la barra.";
  e.ajustes.horario = { ...e.ajustes.horario, [dow(hoy)]: "Torso A" };
  e.ajustes.gimnasios = gimnasios; e.ajustes.gimnasioActivo = "principal";
  e.sesiones.filter((_, i) => i % 9 === 4).forEach((s) => { s.gimnasio = "casa"; });
  e.ajustes.mesociclos = [{ id: "demo1", nombre: "Bloque de fuerza", inicio: mas(lunes(hoy), -28), semanas: 8, descarga: false }];
  e.molestias = molestiasDe((e.catalogo.find((c) => /banca/i.test(c.nombre)) || e.catalogo[0]).id);
  e.medidas = medidasDe();
  return e;
}

// ── Rutina real: [nombre, series, repsMin, repsMax, kg al empezar, kg que sube por semana, tipo de serie especial] ──
const SEMANAS = 12;
const RUTINAS = [
  { nombre: "Torso Fuerza", dow: 1, inicio: "17:30", ejercicios: [
    ["Press Banca (Barra)", 3, 4, 4, 107, 0.75, "top"], ["Press Inclinado (Manc)", 3, 8, 10, 30, 0.5], ["Remo Pecho Apoyado", 3, 8, 10, 60, 0.75],
    ["Jalón al Pecho", 3, 10, 12, 62.5, 0.5], ["Press Francés (Barra Z)", 3, 10, 12, 30, 0.5], ["Curl Bíceps Mancuernas", 3, 10, 12, 14, 0.25]] },
  { nombre: "Piernas + Core", dow: 3, inicio: "18:00", ejercicios: [
    ["Sentadilla Hack", 4, 6, 8, 100, 1.25], ["Extensión Cuádriceps", 3, 12, 15, 55, 0.75], ["Curl Femoral Tumbado", 4, 10, 12, 40, 0.5],
    ["Gemelos de Pie", 4, 15, 15, 80, 1], ["Crunch Abdominal (Polea Alta)", 3, 15, 20, 40, 0.5], ["Elevaciones Laterales (Polea)", 4, 12, 15, 7.5, 0.25]] },
  { nombre: "Push", dow: 5, inicio: "17:30", ejercicios: [
    ["Press Plano (Manc)", 3, 10, 12, 32, 0.5], ["Press Militar (Máquina)", 3, 10, 12, 45, 0.75], ["Aperturas Polea (Baja a Alta)", 4, 12, 15, 10, 0.25],
    ["Elevaciones Laterales (Manc)", 4, 15, 15, 9, 0.25], ["Tríceps Polea Alta (Cuerda)", 4, 12, 15, 25, 0.5]] },
  { nombre: "Pull", dow: 6, inicio: "11:00", ejercicios: [
    ["Remo Polea Baja", 3, 10, 12, 55, 0.75], ["Remo Alto Iso-Lateral", 3, 10, 12, 40, 0.5], ["Pájaros (Máquina)", 4, 15, 20, 30, 0.5],
    ["Bíceps Polea Baja", 3, 12, 15, 20, 0.5], ["Curl Martillo", 3, 10, 12, 14, 0.25], ["Face-Pull", 3, 10, 10, 20, 0.5]] },
];
const DESCANSOS = { "Press Banca (Barra)": 180, "Sentadilla Hack": 150, "Press Militar (Máquina)": 120 };
const id = (nombre) => canon(nombre);
const redondea = (kg, paso) => Math.round(kg / paso) * paso;
const azar = (i) => (((i * 7919 + 13) % 101) / 101);          // determinista: la copia sale igual cada día

function modeloSergio() {
  const catalogo = [], vistos = new Set();
  for (const r of RUTINAS) for (const [nombre, , min, max] of r.ejercicios) {
    if (vistos.has(id(nombre))) continue;
    vistos.add(id(nombre));
    const b = baseDe(nombre);
    if (!b) throw new Error("Sin coincidencia en el catálogo base: " + nombre);
    catalogo.push({ id: id(nombre), nombre, grupo: b.grupo, unilateral: b.unilateral, tipoAncla: "peso", tipoMaterial: b.tipoMaterial, incremento: null,
      rangoReps: { min, max }, top: nombre === "Press Banca (Barra)", estandar: null, musculos: JSON.parse(JSON.stringify(b.musculos)),
      ...(DESCANSOS[nombre] ? { descanso: DESCANSOS[nombre] } : {}) });
  }
  const rutinas = RUTINAS.map((r) => ({ id: id(r.nombre), nombre: r.nombre, ejercicios: r.ejercicios.map(([n, s]) => ({ ejercicioId: id(n), series: s })) }));

  const sesiones = [];
  const lun0 = mas(lunes(ayer), -7 * (SEMANAS - 1));
  let n = 0, k = 0;
  for (let w = 0; w < SEMANAS; w++) for (const r of RUTINAS) {
    const fecha = mas(lun0, w * 7 + r.dow - 1);
    if (fecha > ayer) continue;
    const descarga = w === 7 ? 0.9 : 1;                              // semana de descarga
    const ejercicios = r.ejercicios.map(([nombre, ns, min, max, kg0, inc, especial], j) => {
      const paso = /Manc|Mancuernas|Martillo/.test(nombre) ? 1 : nombre.includes("Barra") ? 2.5 : 2.5;
      const kg = redondea((kg0 + inc * w) * descarga, nombre.includes("Banca") ? 1.25 : paso === 1 ? 1 : 2.5);
      const series = [];
      if (especial === "top" || nombre === "Sentadilla Hack") for (const f of [0.4, 0.65, 0.85]) series.push({ peso: redondea(kg * f, 2.5), reps: f > 0.8 ? 3 : 6, tipo: "calentamiento", hecha: true });
      for (let s = 0; s < ns; s++, k++) {
        const top = especial === "top" && s === 0;
        const pesoS = especial === "top" ? (top ? kg : redondea(kg * 0.96, 1.25)) : kg;
        const reps = especial === "top" ? 4 - (azar(k) > 0.93 ? 1 : 0)
          : Math.max(min, max - Math.floor(azar(k) * 3) - (s > 0 ? Math.floor(s * azar(k + 1) * 1.6) : 0));
        const ultima = s === ns - 1 && j >= 3 && azar(k + 5) > 0.55;
        const rpe = especial === "top" ? (top ? 8.5 + (azar(k) > 0.5 ? 0.5 : 0) : 9) : Math.min(10, Math.round((7 + (s / Math.max(1, ns - 1)) * 2 + azar(k) * 0.9) * 2) / 2);
        series.push({ peso: pesoS, reps, tipo: ultima ? "fallo" : "normal", hecha: true, rpe: ultima ? 10 : rpe });
      }
      return { ejercicioId: id(nombre), nombre, tipo: "peso", series };
    });
    const dur = 62 + Math.round(azar(n + 3) * 22);
    const [hh, mm] = r.inicio.split(":").map(Number), fin = hh * 60 + mm + dur;
    const sesion = { id: fecha + "-demo-" + String(n).padStart(5, "0"), rutina: r.nombre, fecha, inicio: r.inicio,
      fin: String(Math.floor(fin / 60)).padStart(2, "0") + ":" + String(fin % 60).padStart(2, "0"), duracion: dur, ejercicios };
    if (n % 9 === 4) sesion.gimnasio = "casa";
    sesion.recuperacion = { sueno: 5 + Math.round(azar(n) * 4) / 2, estres: 1 + Math.floor(azar(n + 1) * 4), energia: 2 + Math.floor(azar(n + 2) * 3) };
    sesiones.push(sesion); n++;
  }
  sesiones.at(-1).nota = "Buenas sensaciones; el hombro derecho molesta al bajar la barra.";

  const pesajes = [];
  for (let d = -SEMANAS * 7; d <= -1; d += 3) pesajes.push({ fecha: mas(hoy, d), kg: Math.round((78.2 + (d + SEMANAS * 7) * 0.028 + (azar(d + 200) - 0.5) * 0.7) * 10) / 10 });

  const ajustes = JSON.parse(JSON.stringify(base.ajustes));
  ajustes.horario = { 1: "Torso Fuerza", 2: "Descanso", 3: "Piernas + Core", 4: "Descanso", 5: "Push", 6: "Pull", 7: "Off" };
  ajustes.gimnasios = gimnasios; ajustes.gimnasioActivo = "principal";
  ajustes.mesociclos = [{ id: "demo1", nombre: "Bloque de fuerza", inicio: mas(lunes(hoy), -28), semanas: 8, descarga: false }];
  ajustes.bloques = []; ajustes.umbrales = [];
  return { sesiones, catalogo, rutinas, pesajes, ajustes, molestias: molestiasDe(id("Press Banca (Barra)")), medidas: medidasDe() };
}

const e = sintetico ? sinteticoModelo() : modeloSergio();
const copia = crearCopia(e, new Date().toISOString());
leerCopia(JSON.stringify(copia));   // valida contra el esquema; lanza si algo no encaja
writeFileSync(salida, JSON.stringify(copia));
console.log(salida + ": " + e.sesiones.length + " sesiones, " + e.pesajes.length + " pesajes, " + e.molestias.length + " molestias, hasta " + e.sesiones.at(-1).fecha + " (hoy " + hoy + ")");

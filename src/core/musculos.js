// Músculos y catálogo base. La taxonomía es la que usarán el volumen fraccional y el mapa corporal:
// cada ejercicio declara músculos principales (cuentan 1 serie) y secundarios (cuentan una fracción).
// El reparto principal/secundario del catálogo base es cualitativo (revisiones de EMG y biomecánica);
// se puede corregir ejercicio a ejercicio en Ajustes › Ejercicios.
import { canon } from "./nombres.js";

export const MUSCULOS = [
  { id: "pecho-clavicular", nombre: "Pectoral clavicular", grupo: "Pecho" },
  { id: "pecho-esternal", nombre: "Pectoral esternal", grupo: "Pecho" },
  { id: "deltoide-anterior", nombre: "Deltoides anterior", grupo: "Hombro" },
  { id: "deltoide-lateral", nombre: "Deltoides lateral", grupo: "Hombro" },
  { id: "deltoide-posterior", nombre: "Deltoides posterior", grupo: "Hombro" },
  { id: "manguito", nombre: "Manguito rotador", grupo: "Hombro" },
  { id: "triceps-largo", nombre: "Tríceps (cabeza larga)", grupo: "Tríceps" },
  { id: "triceps-lateral-medial", nombre: "Tríceps (lateral y medial)", grupo: "Tríceps" },
  { id: "biceps", nombre: "Bíceps", grupo: "Bíceps" },
  { id: "braquial", nombre: "Braquial y braquiorradial", grupo: "Bíceps" },
  { id: "antebrazo", nombre: "Antebrazo", grupo: "Antebrazo" },
  { id: "dorsal", nombre: "Dorsal ancho", grupo: "Espalda" },
  { id: "redondo", nombre: "Redondo mayor", grupo: "Espalda" },
  { id: "trapecio-superior", nombre: "Trapecio superior", grupo: "Espalda" },
  { id: "trapecio-medio", nombre: "Trapecio medio e inferior", grupo: "Espalda" },
  { id: "romboides", nombre: "Romboides", grupo: "Espalda" },
  { id: "erectores", nombre: "Erectores lumbares", grupo: "Espalda" },
  { id: "serrato", nombre: "Serrato anterior", grupo: "Pecho" },
  { id: "recto-abdominal", nombre: "Recto abdominal", grupo: "Core" },
  { id: "oblicuos", nombre: "Oblicuos", grupo: "Core" },
  { id: "recto-femoral", nombre: "Recto femoral", grupo: "Pierna" },
  { id: "vastos", nombre: "Vastos (cuádriceps)", grupo: "Pierna" },
  { id: "aductores", nombre: "Aductores", grupo: "Pierna" },
  { id: "gluteo-mayor", nombre: "Glúteo mayor", grupo: "Pierna" },
  { id: "gluteo-medio", nombre: "Glúteo medio", grupo: "Pierna" },
  { id: "isquiotibiales", nombre: "Isquiotibiales", grupo: "Pierna" },
  { id: "gemelos", nombre: "Gemelos", grupo: "Pierna" },
  { id: "soleo", nombre: "Sóleo", grupo: "Pierna" },
];
export const MUSCULO = new Map(MUSCULOS.map((m) => [m.id, m]));
export const nombreMusculo = (id) => (MUSCULO.has(id) ? MUSCULO.get(id).nombre : id);

// [nombre, grupo, principales, secundarios, extra]
const B = [
  ["Press banca", "Pecho", ["pecho-esternal", "pecho-clavicular"], ["deltoide-anterior", "triceps-lateral-medial", "triceps-largo"], { material: "barra" }],
  ["Press plano con mancuernas", "Pecho", ["pecho-esternal", "pecho-clavicular"], ["deltoide-anterior", "triceps-lateral-medial", "triceps-largo"], { material: "mancuerna" }],
  ["Press inclinado con mancuernas", "Pecho", ["pecho-clavicular"], ["pecho-esternal", "deltoide-anterior", "triceps-lateral-medial"], { material: "mancuerna" }],
  ["Press inclinado con barra", "Pecho", ["pecho-clavicular"], ["pecho-esternal", "deltoide-anterior", "triceps-lateral-medial"], { material: "barra" }],
  ["Aperturas en polea", "Pecho", ["pecho-esternal", "pecho-clavicular"], ["deltoide-anterior"], { material: "polea" }],
  ["Aperturas con mancuernas", "Pecho", ["pecho-esternal"], ["pecho-clavicular", "deltoide-anterior"], { material: "mancuerna" }],
  ["Press en máquina", "Pecho", ["pecho-esternal"], ["pecho-clavicular", "deltoide-anterior", "triceps-lateral-medial"], { material: "máquina" }],
  ["Fondos en paralelas", "Pecho", ["pecho-esternal", "triceps-lateral-medial"], ["deltoide-anterior", "triceps-largo"], { modoCarga: "lastre" }],
  ["Press militar con barra", "Hombro", ["deltoide-anterior", "deltoide-lateral"], ["triceps-lateral-medial", "trapecio-superior", "serrato"], { material: "barra" }],
  ["Press militar en máquina", "Hombro", ["deltoide-anterior", "deltoide-lateral"], ["triceps-lateral-medial"], { material: "máquina" }],
  ["Press militar con mancuernas", "Hombro", ["deltoide-anterior", "deltoide-lateral"], ["triceps-lateral-medial", "trapecio-superior"], { material: "mancuerna" }],
  ["Elevaciones laterales con mancuernas", "Hombro", ["deltoide-lateral"], ["trapecio-superior", "manguito"], { material: "mancuerna" }],
  ["Elevaciones laterales en polea", "Hombro", ["deltoide-lateral"], ["trapecio-superior"], { material: "polea", unilateral: true }],
  ["Pájaros en máquina", "Hombro", ["deltoide-posterior"], ["trapecio-medio", "romboides"], { material: "máquina" }],
  ["Face pull", "Hombro", ["deltoide-posterior", "trapecio-medio"], ["manguito", "romboides"], { material: "polea" }],
  ["Jalón al pecho", "Espalda", ["dorsal", "redondo"], ["biceps", "braquial", "trapecio-medio"], { material: "polea" }],
  ["Dominadas", "Espalda", ["dorsal", "redondo"], ["biceps", "braquial", "trapecio-medio", "romboides"], { modoCarga: "lastre" }],
  ["Dominadas asistidas", "Espalda", ["dorsal", "redondo"], ["biceps", "braquial", "trapecio-medio"], { modoCarga: "asistido" }],
  ["Remo con barra", "Espalda", ["dorsal", "trapecio-medio", "romboides"], ["deltoide-posterior", "biceps", "erectores"], { material: "barra" }],
  ["Remo con mancuerna", "Espalda", ["dorsal", "trapecio-medio", "romboides"], ["deltoide-posterior", "biceps"], { material: "mancuerna", unilateral: true }],
  ["Remo en polea baja", "Espalda", ["dorsal", "trapecio-medio", "romboides"], ["deltoide-posterior", "biceps", "redondo"], { material: "polea" }],
  ["Remo pecho apoyado", "Espalda", ["trapecio-medio", "romboides", "dorsal"], ["deltoide-posterior", "biceps"], { material: "máquina" }],
  ["Remo alto iso-lateral", "Espalda", ["trapecio-medio", "romboides", "deltoide-posterior"], ["dorsal", "biceps"], { material: "máquina" }],
  ["Encogimientos", "Espalda", ["trapecio-superior"], ["antebrazo"], { material: "mancuerna" }],
  ["Peso muerto", "Pierna", ["gluteo-mayor", "isquiotibiales", "erectores"], ["vastos", "aductores", "trapecio-superior", "antebrazo", "dorsal"], { material: "barra" }],
  ["Peso muerto rumano", "Pierna", ["isquiotibiales", "gluteo-mayor"], ["erectores", "aductores", "antebrazo"], { material: "barra" }],
  ["Sentadilla", "Pierna", ["vastos", "gluteo-mayor", "recto-femoral"], ["aductores", "erectores", "isquiotibiales"], { material: "barra" }],
  ["Sentadilla hack", "Pierna", ["vastos", "recto-femoral"], ["gluteo-mayor", "aductores"], { material: "máquina" }],
  ["Prensa de piernas", "Pierna", ["vastos", "recto-femoral", "gluteo-mayor"], ["aductores", "isquiotibiales"], { material: "máquina" }],
  ["Zancadas", "Pierna", ["vastos", "gluteo-mayor"], ["recto-femoral", "aductores", "gluteo-medio", "isquiotibiales"], { material: "mancuerna", unilateral: true }],
  ["Sentadilla búlgara", "Pierna", ["vastos", "gluteo-mayor"], ["aductores", "gluteo-medio", "recto-femoral"], { material: "mancuerna", unilateral: true }],
  ["Hip thrust", "Pierna", ["gluteo-mayor"], ["isquiotibiales", "aductores", "gluteo-medio"], { material: "barra" }],
  ["Extensión de cuádriceps", "Pierna", ["recto-femoral", "vastos"], [], { material: "máquina" }],
  ["Curl femoral tumbado", "Pierna", ["isquiotibiales"], ["gemelos"], { material: "máquina" }],
  ["Curl femoral sentado", "Pierna", ["isquiotibiales"], ["gemelos"], { material: "máquina" }],
  ["Gemelos de pie", "Pierna", ["gemelos"], ["soleo"], { material: "máquina" }],
  ["Gemelos sentado", "Pierna", ["soleo"], ["gemelos"], { material: "máquina" }],
  ["Curl con barra", "Bíceps", ["biceps"], ["braquial", "antebrazo"], { material: "barra" }],
  ["Curl con mancuernas", "Bíceps", ["biceps"], ["braquial", "antebrazo"], { material: "mancuerna" }],
  ["Curl martillo", "Bíceps", ["braquial"], ["biceps", "antebrazo"], { material: "mancuerna" }],
  ["Curl en polea baja", "Bíceps", ["biceps"], ["braquial", "antebrazo"], { material: "polea" }],
  ["Curl predicador", "Bíceps", ["biceps"], ["braquial"], { material: "máquina" }],
  ["Extensión de tríceps en polea", "Tríceps", ["triceps-lateral-medial"], ["triceps-largo"], { material: "polea" }],
  ["Press francés", "Tríceps", ["triceps-largo", "triceps-lateral-medial"], [], { material: "barra" }],
  ["Extensión de tríceps sobre la cabeza", "Tríceps", ["triceps-largo"], ["triceps-lateral-medial"], { material: "polea" }],
  ["Crunch en polea alta", "Core", ["recto-abdominal"], ["oblicuos"], { material: "polea" }],
  ["Elevación de piernas colgado", "Core", ["recto-abdominal"], ["oblicuos", "antebrazo"], {}],
  ["Plancha", "Core", ["recto-abdominal", "oblicuos"], ["erectores", "serrato"], {}],
];

// Alias de nombres que Sergio ya usa (id canónico → nombre del catálogo base)
const ALIAS = { pressplano: "press plano con mancuernas", pressinclinado: "press inclinado con mancuernas", sentadillahack: "sentadilla hack",
  tricepspolea: "extensión de tríceps en polea", tricepspoleaaltacuerda: "extensión de tríceps en polea", facepull: "face pull" };

export const CATALOGO_BASE = B.map(([nombre, grupo, p, s, x]) => ({ id: canon(nombre), nombre, grupo, unilateral: !!x.unilateral, tipoAncla: "peso",
  tipoMaterial: x.material || null, incremento: null, rangoReps: null, top: false, estandar: null, musculos: { p, s }, ...(x.modoCarga ? { modoCarga: x.modoCarga } : {}) }));
const POR_ID = new Map(CATALOGO_BASE.map((c) => [c.id, c]));

/** Entrada del catálogo base para un nombre (o id), o null. */
export function baseDe(nombre) {
  const k = canon(nombre);
  if (POR_ID.has(k)) return POR_ID.get(k);
  if (ALIAS[k]) return POR_ID.get(canon(ALIAS[k])) || null;
  return null;
}

/** Ejercicios del catálogo base que aún no están en `catalogo`. */
export const baseQueFalta = (catalogo) => { const ya = new Set(catalogo.map((c) => c.id)); return CATALOGO_BASE.filter((c) => !ya.has(c.id)); };

/** Lleva los campos de músculos y carga del catálogo base a un ejercicio nuevo. */
export function conBase(ej) {
  const b = baseDe(ej.nombre);
  if (!b) return ej;
  return Object.assign({}, ej, { grupo: ej.grupo || b.grupo, unilateral: ej.unilateral || b.unilateral, tipoMaterial: ej.tipoMaterial || b.tipoMaterial,
    musculos: JSON.parse(JSON.stringify(b.musculos)) }, b.modoCarga ? { modoCarga: b.modoCarga } : {});
}

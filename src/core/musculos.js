// Músculos y catálogo base. La taxonomía es la que usarán el volumen fraccional y el mapa corporal:
// cada ejercicio declara músculos principales (cuentan 1 serie) y secundarios (cuentan una fracción).
// El reparto principal/secundario del catálogo base es cualitativo (revisiones de EMG y biomecánica);
// se puede corregir ejercicio a ejercicio en Ajustes › Ejercicios.
import { canon } from "./nombres.js";
import { B, LIGA } from "./catalogo-base-datos.js";

export const MUSCULOS = [
  { id: "pecho-clavicular", nombre: "Pecho superior (clavicular)", grupo: "Pecho" },
  { id: "pecho-esternal", nombre: "Pecho medio e inferior (esternal)", grupo: "Pecho" },
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

// Alias de nombres que Sergio ya usa (nombre → nombre del catálogo base). Las claves se normalizan con `clave`.
const ALIAS_NOMBRES = {
  "Press plano": "Press plano con mancuernas", "Press plano (Manc)": "Press plano con mancuernas",
  "Press inclinado": "Press inclinado con mancuernas", "Press inclinado (Manc)": "Press inclinado con mancuernas",
  "Press banca (Barra)": "Press banca", "Press militar (Máquina)": "Press militar en máquina",
  "Press francés (Barra Z)": "Press francés", "Curl bíceps mancuernas": "Curl con mancuernas", "Curl bíceps": "Curl con mancuernas",
  "Extensión cuádriceps": "Extensión de cuádriceps", "Crunch abdominal (Polea alta)": "Crunch en polea alta",
  "Elevaciones laterales (Polea)": "Elevaciones laterales en polea", "Elevaciones laterales (Manc)": "Elevaciones laterales con mancuernas",
  "Aperturas polea (Baja a alta)": "Aperturas en polea baja a alta", "Aperturas polea": "Aperturas en polea",
  "Tríceps polea": "Extensión de tríceps en polea", "Tríceps polea alta (Cuerda)": "Extensión de tríceps en polea", "Tríceps polea alta cuerda": "Extensión de tríceps en polea",
  "Remo polea baja": "Remo en polea baja", "Pájaros (Máquina)": "Pájaros en máquina", "Bíceps polea baja": "Curl en polea baja",
  "Face-pull": "Face pull", "Remo pecho apoyado (Máquina)": "Remo pecho apoyado",
};
/** Clave de comparación: como `canon`, sin paréntesis (los usa Sergio para el material: «Press Plano (Manc)»). */
const clave = (n) => canon(n).replace(/[()]/g, "");
const ALIAS = Object.fromEntries(Object.entries(ALIAS_NOMBRES).map(([k, v]) => [clave(k), v]));

export const CATALOGO_BASE = B.map(([nombre, grupo, p, s, x]) => ({ id: canon(nombre), nombre, grupo, unilateral: !!x.unilateral, tipoAncla: "peso",
  tipoMaterial: x.material || null, incremento: null, rangoReps: null, top: false, estandar: null, musculos: { p, s }, ...(x.modoCarga ? { modoCarga: x.modoCarga } : {}) }));
const POR_ID = new Map(CATALOGO_BASE.map((c) => [c.id, c]));

/** Entrada del catálogo base para un nombre (o id), o null. */
export function baseDe(nombre) {
  const k = clave(nombre);
  if (POR_ID.has(k)) return POR_ID.get(k);
  if (ALIAS[k]) return POR_ID.get(canon(ALIAS[k])) || null;
  const sinParentesis = clave(String(nombre).replace(/\([^)]*\)/g, ""));
  return sinParentesis !== k && POR_ID.has(sinParentesis) ? POR_ID.get(sinParentesis) : null;
}

/**
 * Referencia de liga (`estandar`) del catálogo base para un ejercicio, solo si su tabla existe en `tablas` (ajustes.estandares).
 * Factor 1: misma barra/máquina/mancuerna que la tabla. Sin tabla o sin correspondencia devuelve null.
 */
export function estandarDe(nombre, tablas) {
  const b = baseDe(nombre), slug = b && LIGA[b.nombre];
  if (!slug || !tablas) return null;
  const real = Object.keys(tablas).find((k) => canon(k) === canon(slug));
  return real ? { slug: real, factor: 1, revisado: false, aproximado: false, polea: b.tipoMaterial === "polea" } : null;
}

/** Ejercicios del catálogo base que aún no están en `catalogo`. */
export const baseQueFalta = (catalogo) => {
  const ya = new Set(catalogo.map((c) => c.id));
  for (const c of catalogo) { const b = baseDe(c.nombre); if (b) ya.add(b.id); }   // «Press Banca (Barra)» ya cubre «Press banca»
  return CATALOGO_BASE.filter((c) => !ya.has(c.id));
};

/** Lleva los campos de músculos y carga del catálogo base a un ejercicio nuevo. */
export function conBase(ej, tablas) {
  const b = baseDe(ej.nombre);
  if (!b) return ej;
  const est = ej.estandar ? null : estandarDe(ej.nombre, tablas);
  return Object.assign({}, ej, est ? { estandar: est } : {}, { grupo: ej.grupo || b.grupo, unilateral: ej.unilateral || b.unilateral, tipoMaterial: ej.tipoMaterial || b.tipoMaterial,
    musculos: JSON.parse(JSON.stringify(b.musculos)) }, b.modoCarga ? { modoCarga: b.modoCarga } : {});
}

/**
 * Ejercicios del catálogo que trabajan el mismo músculo principal que `id` (para sustituirlo cuando la máquina está ocupada).
 * Primero los que comparten todos sus músculos principales, luego los que comparten alguno; a igualdad, por nombre.
 * Sin músculos principales declarados devuelve [].
 */
export function equivalentes(catalogo, id) {
  const base = catalogo.find((c) => c.id === id), p = base && base.musculos ? base.musculos.p : [];
  if (!p.length) return [];
  return catalogo.filter((c) => c.id !== id && c.musculos && c.musculos.p.some((m) => p.includes(m)))
    .map((c) => { const comun = c.musculos.p.filter((m) => p.includes(m)).length; return { c, comun, igual: comun === p.length && c.musculos.p.length === p.length }; })
    .sort((a, b) => (b.igual - a.igual) || (b.comun - a.comun) || a.c.nombre.localeCompare(b.c.nombre, "es"))
    .map((x) => x.c);
}

/**
 * Completa desde el catálogo base los ejercicios que no tienen músculos (junto con grupo, material y modo de carga si faltan) y los que
 * no tienen referencia de liga (si su tabla existe en `tablas`). No toca lo que ya está asignado ni los marcados «sin estándar».
 * `sinCoincidencia` lista los ejercicios sin músculos que el catálogo base no conoce.
 * @returns {{catalogo:object[], cambiados:number, sinCoincidencia:object[], conLiga:number}}
 */
export function asignarMusculos(catalogo, tablas) {
  const sinCoincidencia = [];
  let cambiados = 0, conLiga = 0;
  const salida = catalogo.map((ej) => {
    const b = baseDe(ej.nombre) || baseDe(ej.id), faltanMus = !(ej.musculos && (ej.musculos.p.length || ej.musculos.s.length));
    if (!b) { if (faltanMus) sinCoincidencia.push(ej); return ej; }
    const est = ej.estandar ? null : estandarDe(b.nombre, tablas);
    if (!faltanMus && !est) return ej;
    cambiados++; if (est) conLiga++;
    const r = Object.assign({}, ej);
    if (faltanMus) Object.assign(r, { grupo: ej.grupo || b.grupo, tipoMaterial: ej.tipoMaterial || b.tipoMaterial, musculos: JSON.parse(JSON.stringify(b.musculos)) }, b.modoCarga && !ej.modoCarga ? { modoCarga: b.modoCarga } : {});
    if (est) r.estandar = est;
    return r;
  });
  return { catalogo: salida, cambiados, sinCoincidencia, conLiga };
}

/**
 * Entradas del catálogo que son el mismo ejercicio del catálogo base con otro nombre («Press banca» y «Press Banca (Barra)»).
 * Se conserva la que lleva el nombre del catálogo base (o, si no está, la primera) y las demás se unen a ella.
 * @returns {{conservar:object, unir:object[]}[]}
 */
export function duplicadosBase(catalogo) {
  const grupos = new Map();
  for (const c of catalogo) { const b = baseDe(c.nombre) || baseDe(c.id); if (b) { const g = grupos.get(b.id) || []; g.push(c); grupos.set(b.id, g); } }
  const salida = [];
  for (const [id, g] of grupos) {
    if (g.length < 2) continue;
    const conservar = g.find((c) => c.id === id) || g[0];
    salida.push({ conservar, unir: g.filter((c) => c !== conservar) });
  }
  return salida;
}

/** La entrada conservada completa lo que le falta (rango de repeticiones, top set, descanso, incremento, estándar, nota) con lo de la descartada. */
export function fusionarAjustes(conservada, descartada) {
  const r = Object.assign({}, conservada);
  for (const k of ["rangoReps", "incremento", "estandar", "notaFija", "descanso", "tipoAncla", "unilateral", "modoCarga"]) if (r[k] == null && descartada[k] != null) r[k] = descartada[k];
  if (descartada.top) r.top = true;
  return r;
}

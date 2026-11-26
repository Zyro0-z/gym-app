// Modelo de datos (esquema 4, docs/ESQUEMA.md) y conversiones puras (sin IndexedDB): se prueban en node.
import { validarCopia, textoProblemas } from "./esquema.js";

export const ESQUEMA = 4;          // versión de los datos (1-2: formato antiguo; 3: modelo estructurado; 4: RPE, superseries, medidas…)
export const VERSION_COPIA = 3;    // versión del fichero de copia de seguridad (acepta 2 y 3)

export const GRUPOS_BASE = ["Pecho", "Espalda", "Pierna", "Hombro", "Bíceps", "Tríceps", "Core", "Antebrazo"];
export const REGIONES_BASE = {
  Pecho: ["pecho-*"], Espalda: ["dorsal-*", "redondo-*", "trapecio-*", "romboides-*", "erectores-*"], Hombro: ["deltoide-*", "manguito-*"],
  "Bíceps": ["biceps-*", "braquial-*"], "Tríceps": ["triceps-*"], Core: ["recto-abdominal-*", "oblicuos-*", "serrato-*"],
  Pierna: ["recto-femoral-*", "vastos-*", "aductores-*", "gluteo-*", "isquiotibiales-*", "gemelos-*", "soleo-*"], Antebrazo: ["antebrazo-*"],
};
// Regiones del diagrama anterior (body-muscles) → regiones por músculo. Gana la primera que encaje por prefijo.
const REGIONES_ANTIGUAS = [
  ["chest-upper", ["pecho-clavicular-*"]], ["chest-lower", ["pecho-esternal-*"]], ["chest", ["pecho-*"]],
  ["lats", ["dorsal-*", "redondo-*"]], ["traps-upper", ["trapecio-superior-*"]], ["traps", ["trapecio-*", "romboides-*"]],
  ["spine", ["erectores-*"]], ["lower-back", ["erectores-*"]],
  ["shoulder-front", ["deltoide-anterior-*"]], ["shoulder-side", ["deltoide-lateral-*"]], ["deltoid-rear", ["deltoide-posterior-*", "manguito-*"]],
  ["biceps-", ["biceps-*", "braquial-*"]], ["triceps-long", ["triceps-largo-*"]], ["triceps-lateral-left", ["triceps-lateral-medial-*"]], ["triceps-lateral-right", ["triceps-lateral-medial-*"]],
  ["abs", ["recto-abdominal-*"]], ["obliques", ["oblicuos-*"]], ["serratus", ["serrato-*"]],
  ["quads", ["recto-femoral-*", "vastos-*"]], ["adductors", ["aductores-*"]], ["hamstrings", ["isquiotibiales-*"]],
  ["calves-soleus", ["soleo-*"]], ["calves", ["gemelos-*", "soleo-*"]], ["gluteus", ["gluteo-*"]], ["forearm", ["antebrazo-*"]],
];
const SIN_REGION_ANTIGUA = ["head", "face", "neck", "nape", "knee", "foot", "hand", "elbow", "tibialis", "hip-flexor", "shoulder-"];
const coincide = (t, k) => t === k || t.startsWith(k.endsWith("-") ? k : k + "-");
/** Convierte las regiones guardadas de un grupo al diagrama por músculos. Las que ya son nuevas se dejan como están. */
export function migrarRegiones(tokens) {
  if (!Array.isArray(tokens)) return [];
  const ant = (t) => typeof t === "string" && (REGIONES_ANTIGUAS.some(([k]) => coincide(t, k)) || SIN_REGION_ANTIGUA.some((k) => coincide(t, k)));
  // El grupo Bíceps de antes era solo «biceps-*» y ahora incluye el braquial: también es el diagrama antiguo.
  const biceps = tokens.length === 1 && tokens[0] === "biceps-*";
  if (!biceps && !tokens.some(ant)) return tokens;
  const out = [];
  const poner = (t) => { if (!out.includes(t)) out.push(t); };
  for (const t of tokens) {
    if (typeof t !== "string") continue;
    const m = REGIONES_ANTIGUAS.find(([k]) => coincide(t, k));
    if (m) m[1].forEach(poner);
    else if (t === "biceps-*") { poner("biceps-*"); poner("braquial-*"); }
    else if (!ant(t)) poner(t);
  }
  return out;
}
export const ACENTOS = ["azul", "indigo", "morado", "rosa", "rojo", "naranja", "verde", "grafito"];

/** Ajustes por defecto de una instalación nueva. */
export function ajustesBase() {
  return {
    version: 2,
    apariencia: { tema: "auto", acento: "azul", haptica: true, acentoColor: "#3B82F6", mapa: "termico", mapaA: "#FFD27A", mapaB: "#E0467A" },
    entreno: { descanso: 90, presets: [30, 60, 90, 120, 180], pasoPeso: 2.5, sonido: true, pantallaEncendida: true,
      barra: 20, discos: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5],        // calculadora de discos
      controlesBloqueo: false,                                        // Media Session (experimental)
      push: { activo: false, url: "" } },                             // aviso por un servidor propio
    analisis: { fraccionSecundaria: 0.5 },                             // series de un músculo secundario cuentan esta fracción
    gimnasios: [], gimnasioActivo: null,                                // perfiles de gimnasio (barra y discos); vacío = uno implícito
    horario: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
    bloques: [], umbrales: [],
    objetivos: { seriesSemana: [], incrementos: [{ tipo: "máquina", kg: 2.5 }, { tipo: "polea", kg: 2.5 }, { tipo: "mancuerna", kg: 2 }, { tipo: "barra", kg: 2.5 }] },
    cuerpo: { sexo: null, fases: [] },
    copiasInternas: { cada: 5 },               // una copia interna cada N sesiones nuevas
    avisoCopia: { pospuestoHasta: null },
    grupos: GRUPOS_BASE.map((nombre) => ({ nombre, color: null, regiones: REGIONES_BASE[nombre].slice() })),
    ligas: { activa: false, escala: [], puntos: 5, margen: 1, semCarga: 8, semSeries: 4, correccionPolea: 1 },
    estandares: {},
    copia: null,
    // Propuesta de descarga (docs/ESQUEMA.md): caída de e1RM ≥ caidaPct % en ≥ `ejercicios` ejercicios,
    // RPE medio que sube ≥ rpeSube, o sueño medio < `sueno` h; solo tras ≥ semanasMin semanas sin descarga
    descarga: { caidaPct: 3, ejercicios: 2, rpeSube: 1, sueno: 7, semanasMin: 6, pospuestaHasta: null, descartadaEn: null },
    csv: { separador: ";", decimal: "," },
    mesociclos: [],                            // [{ id, nombre, inicio, semanas, descarga }] (core/mesociclos.js)
    nube: { activa: false, url: "", auto: true, ultima: null },   // copia cifrada opcional (core/cifrado.js, data/nube.js)
  };
}

/** Combina unos ajustes guardados con los de base (claves nuevas de versiones futuras). */
export function completarAjustes(a) {
  const b = ajustesBase();
  if (!a) return b;
  const out = Object.assign({}, b, a);
  for (const k of ["apariencia", "entreno", "objetivos", "cuerpo", "ligas", "copiasInternas", "avisoCopia", "descarga", "csv", "analisis", "nube"]) out[k] = Object.assign({}, b[k], a[k] || {});
  out.entreno.push = Object.assign({}, b.entreno.push, (a.entreno && a.entreno.push) || {});
  out.horario = Object.assign({}, b.horario, a.horario || {});
  if (!Array.isArray(out.grupos) || !out.grupos.length) out.grupos = b.grupos;
  else out.grupos = out.grupos.map((g) => (g && Array.isArray(g.regiones) ? Object.assign({}, g, { regiones: migrarRegiones(g.regiones) }) : g));
  return out;
}

// ─────────── copias de seguridad ───────────

export function crearCopia(estado, ahora = new Date().toISOString()) {
  return { app: "gym", version: VERSION_COPIA, esquema: ESQUEMA, exportado: ahora,
    sesiones: estado.sesiones, catalogo: estado.catalogo, rutinas: estado.rutinas, pesajes: estado.pesajes, medidas: estado.medidas || [], molestias: estado.molestias || [], ajustes: estado.ajustes };
}

/** Lee el texto de una copia (nueva, antigua o seed.json) y devuelve el modelo. Lanza Error con un motivo legible. */
export function leerCopia(texto, { ahora = new Date().toISOString() } = {}) {
  let o;
  try { o = JSON.parse(texto); } catch (e) { throw new Error("El archivo no es una copia válida (no es JSON)."); }
  if (!o || typeof o !== "object") throw new Error("El archivo no es una copia válida.");
  if (o.version > VERSION_COPIA || o.esquema > ESQUEMA) throw new Error("La copia es de una versión más nueva de la app. Actualiza la app antes de importarla.");
  if (o.version >= 2 && Array.isArray(o.sesiones)) {
    const problemas = validarCopia(o, { version: VERSION_COPIA, esquema: ESQUEMA });
    if (problemas.length) throw new Error(textoProblemas(problemas));
    return { sesiones: o.sesiones, catalogo: o.catalogo, rutinas: o.rutinas, pesajes: o.pesajes, medidas: o.medidas || [], molestias: o.molestias || [], ajustes: completarAjustes(o.ajustes), borrador: null, origen: "v" + o.version };
  }
  if (Array.isArray(o.sessions)) throw new Error("La copia es de una versión muy antigua de la app (anterior a la 2.0) y ya no se puede importar.");
  throw new Error("El archivo no contiene sesiones: no parece una copia de esta app.");
}

export const DIAS_AVISO = 7, SESIONES_AVISO = 5;
/**
 * ¿Toca recordar la copia? Más de 7 días o más de 5 sesiones nuevas desde la última copia
 * EXPORTADA (las internas no cuentan: viven en el mismo iPhone). `pospuestoHasta` (ISO) la calla.
 */
export function estadoCopia(copia, nSesiones, ahora = Date.now(), pospuestoHasta = null) {
  const pospuesto = !!pospuestoHasta && Date.parse(pospuestoHasta) > ahora;
  if (!copia || !copia.at) return { nunca: true, avisar: nSesiones > 0, dias: null, nuevas: nSesiones, fecha: null, pospuesto, tarjeta: nSesiones > 0 && !pospuesto };
  const dias = Math.floor((ahora - Date.parse(copia.at)) / 864e5);
  const nuevas = Math.max(0, nSesiones - (copia.sesiones || 0));
  const avisar = dias > DIAS_AVISO || nuevas > SESIONES_AVISO;
  return { nunca: false, dias, nuevas, fecha: copia.at.slice(0, 10), avisar, pospuesto, tarjeta: avisar && !pospuesto };
}

// ─────────── copias internas (en IndexedDB) ───────────

export const N_RESPALDOS = 3;
export const CLAVES_RESPALDO = Array.from({ length: N_RESPALDOS }, (_, i) => "respaldo-auto-" + (i + 1));
/** Foto completa de los datos para una copia interna. Pura. */
export function instantanea(estado, motivo, ahora = new Date().toISOString()) {
  const datos = { sesiones: estado.sesiones || [], catalogo: estado.catalogo || [], rutinas: estado.rutinas || [], pesajes: estado.pesajes || [], ajustes: estado.ajustes || null };
  if (estado.medidas) datos.medidas = estado.medidas;
  if (estado.molestias) datos.molestias = estado.molestias;
  const r = { fecha: ahora, motivo, esquema: ESQUEMA, sesiones: datos.sesiones.length, bytes: 0, datos };
  r.bytes = JSON.stringify(datos).length;
  return r;
}

/** Id de una sesión nueva: ordena por fecha y hora de inicio. */
export const idSesion = (fecha, inicioMs) => fecha + "-" + String(inicioMs).padStart(13, "0").slice(-13) + "-" + Math.random().toString(36).slice(2, 6);

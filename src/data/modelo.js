// Modelo de datos de la versión 2 y conversiones puras (sin IndexedDB): se prueban en node.
import { desdeLegacy, convertirSesiones } from "../core/legacy.js";
import { canon } from "../core/nombres.js";
import { validarCopia, textoProblemas } from "./esquema.js";

export const ESQUEMA = 3;          // versión de los datos (1-2: formato antiguo; 3: modelo estructurado)
export const VERSION_COPIA = 2;    // versión del fichero de copia de seguridad
export const CLAVES_ANTIGUAS = ["sessions", "templates", "configs", "settings", "library", "draft"];

export const GRUPOS_BASE = ["Pecho", "Espalda", "Pierna", "Hombro", "Bíceps", "Tríceps", "Core", "Antebrazo"];
export const REGIONES_BASE = {
  Pecho: ["chest-*"], Espalda: ["lats-*", "traps-*", "spine", "lower-back-*"], Hombro: ["shoulder-front-*", "shoulder-side-*", "deltoid-rear-*"],
  "Bíceps": ["biceps-*"], "Tríceps": ["triceps-*"], Core: ["abs-*", "obliques-*", "serratus-*"],
  Pierna: ["quads-*", "adductors-*", "hamstrings-*", "calves-*", "tibialis-*", "hip-flexor-*", "gluteus-*"], Antebrazo: ["forearm-*"],
};
export const ACENTOS = ["azul", "indigo", "morado", "rosa", "rojo", "naranja", "verde", "grafito"];

/** Ajustes por defecto de una instalación nueva. */
export function ajustesBase() {
  return {
    version: 2,
    apariencia: { tema: "auto", acento: "azul", haptica: true },
    entreno: { descanso: 90, presets: [30, 60, 90, 120, 180], pasoPeso: 2.5, sonido: true, pantallaEncendida: true },
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
    migracion: null,
  };
}

/** Combina unos ajustes guardados con los de base (claves nuevas de versiones futuras). */
export function completarAjustes(a) {
  const b = ajustesBase();
  if (!a) return b;
  const out = Object.assign({}, b, a);
  for (const k of ["apariencia", "entreno", "objetivos", "cuerpo", "ligas", "copiasInternas", "avisoCopia"]) out[k] = Object.assign({}, b[k], a[k] || {});
  out.horario = Object.assign({}, b.horario, a.horario || {});
  if (!Array.isArray(out.grupos) || !out.grupos.length) out.grupos = b.grupos;
  return out;
}

const TIPO_SERIE = { working: "normal", failure: "fallo", warmup: "calentamiento", drop: "descendente" };

/** Borrador de la versión 1 (entrenamiento a medias) → borrador nuevo. */
export function convertirBorrador(d) {
  if (!d || d.editPath || !Array.isArray(d.exercises)) return null;
  return {
    rutina: d.template && d.template !== "Workout" ? d.template : null,
    fecha: d.date || null,
    inicio: Number(d.start) || Date.now(),
    ejercicios: d.exercises.map((e) => ({
      ejercicioId: canon(e.name), nombre: e.name, objetivo: Number(e.target) || 3,
      series: (e.sets || []).map((s) => ({ peso: String(s.weight ?? ""), reps: String(s.reps ?? ""), tipo: TIPO_SERIE[s.setType] || "normal", hecha: !!s.done })),
    })),
    descanso: d.rest ? { fin: d.rest.fin, total: d.rest.total, avisado: !!d.rest.avisado } : null,
  };
}

/** Ajustes de la versión 1 (settings + tema) sobre los ajustes convertidos de la configuración. */
function mezclarSettings(ajustes, settings, tema) {
  const a = completarAjustes(ajustes);
  const s = settings || {};
  if (Number(s.defaultRestDuration) > 0) a.entreno.descanso = Number(s.defaultRestDuration);
  if (Array.isArray(s.restTimerPresets) && s.restTimerPresets.length) a.entreno.presets = s.restTimerPresets.map(Number).filter((n) => n > 0);
  if (Number(s.weightStep) > 0) a.entreno.pasoPeso = Number(s.weightStep);
  if (s.keepScreenAwake === false) a.entreno.pantallaEncendida = false;
  if (s.backup && s.backup.at) a.copia = { at: s.backup.at, sesiones: Number(s.backup.sessions) || 0 };
  if (tema === "oscuro" || tema === "claro" || tema === "auto") a.apariencia.tema = tema;
  return a;
}

/**
 * Plan de migración del formato antiguo (claves de kv) al modelo nuevo. Puro.
 * Devuelve lo que hay que escribir; `legacy` es la copia íntegra que se conserva.
 */
export function planMigracion(viejo, { ahora = new Date().toISOString(), tema = null } = {}) {
  const datos = {};
  for (const k of CLAVES_ANTIGUAS) datos[k] = viejo[k] === undefined ? null : viejo[k];
  const m = desdeLegacy({ sessions: datos.sessions || [], templates: datos.templates || [], configs: datos.configs || {},
    settings: datos.settings || {}, library: datos.library || [] });
  const ajustes = mezclarSettings(m.ajustes, datos.settings, tema);
  ajustes.migracion = { fecha: ahora, desde: viejo.schema || 1, sesiones: m.sesiones.length, errores: m.informe.errores, avisos: m.informe.avisos };
  return {
    legacy: { fecha: ahora, schema: viejo.schema || 1, datos },
    sesiones: m.sesiones, catalogo: m.catalogo, rutinas: m.rutinas, pesajes: m.pesajes, ajustes,
    borrador: convertirBorrador(datos.draft),
  };
}

/** Sesiones antiguas que aparecieron después de migrar (otra versión abierta) → las que faltan. */
export function rescatarSesiones(sessionsViejas, existentes) {
  const rutas = new Set(existentes.map((s) => s.origen && s.origen.ruta).filter(Boolean));
  const nuevas = (sessionsViejas || []).filter((s) => s && s.path && !rutas.has(s.path));
  return convertirSesiones(nuevas).map((s, i) => Object.assign(s, { id: s.fecha + "-r" + Date.now().toString(36) + "-" + i }));
}

// ─────────── copias de seguridad ───────────

export function crearCopia(estado, ahora = new Date().toISOString()) {
  return { app: "gym", version: VERSION_COPIA, esquema: ESQUEMA, exportado: ahora,
    sesiones: estado.sesiones, catalogo: estado.catalogo, rutinas: estado.rutinas, pesajes: estado.pesajes, ajustes: estado.ajustes };
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
    return { sesiones: o.sesiones, catalogo: o.catalogo, rutinas: o.rutinas, pesajes: o.pesajes, ajustes: completarAjustes(o.ajustes), borrador: null, origen: "v" + o.version };
  }
  if (Array.isArray(o.sessions)) {
    if (o.schema > 2) throw new Error("La copia es de una versión más nueva de la app.");
    const p = planMigracion(o, { ahora });
    return { sesiones: p.sesiones, catalogo: p.catalogo, rutinas: p.rutinas, pesajes: p.pesajes, ajustes: p.ajustes, borrador: null, origen: "v1" };
  }
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
  const r = { fecha: ahora, motivo, esquema: ESQUEMA, sesiones: datos.sesiones.length, bytes: 0, datos };
  r.bytes = JSON.stringify(datos).length;
  return r;
}

/** Id de una sesión nueva: ordena por fecha y hora de inicio. */
export const idSesion = (fecha, inicioMs) => fecha + "-" + String(inicioMs).padStart(13, "0").slice(-13) + "-" + Math.random().toString(36).slice(2, 6);

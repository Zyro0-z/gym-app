// Conversión del formato antiguo al modelo estructurado: plantillas, sesiones y el modelo completo.
import { canon, sinTildes, riqueza } from "../core/nombres.js";
import { fechaISO } from "../core/fechas.js";
import { aKg, DIAS } from "./claves.js";
import { comoTexto, asArray, numCfg, parseRango, parseKg } from "./lineas.js";
import { leerConfig } from "./config.js";
import { SIN_CATEGORIZAR, GRUPOS_ESPERADOS } from "../core/constantes.js";

/** Plantillas antiguas → [{nombre, ejercicios:[{nombre, target}]}] (3 series si falta). */
export function leerPlantillas(templates) {
  const out = [];
  for (const t of templates || []) {
    const fm = t.fm || t;
    if (String(fm.type || "").trim() !== "workout-template") continue;
    const nombre = String(fm.name || String(t.path || "").split("/").pop().replace(/\.md$/, "")).trim();
    const ejercicios = [];
    for (const ex of asArray(fm.exercises)) {
      if (!ex || !ex.name) continue;
      ejercicios.push({ nombre: String(ex.name).trim(), target: Number(ex.targetSets) || 3 });
    }
    out.push({ nombre, ejercicios });
  }
  return out;
}

const TIPO_SERIE = { working: "normal", failure: "fallo", warmup: "calentamiento", drop: "descendente" };
const TIPO_EJ = { weight: "peso", duration: "duracion", timer: "temporizador" };
const hhmm = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
  return String(v);
};

/** Sesiones antiguas → sesiones del modelo nuevo (orden y contenido conservados). */
export function convertirSesiones(sessions) {
  const out = [];
  (sessions || []).forEach((s, i) => {
    const fm = s.fm || {};
    if (String(fm.type || "").trim() !== "workout") return;
    const nombreArchivo = String(s.path || "").split("/").pop().replace(/\.md$/, "");
    let fecha = typeof fm.date === "string" ? fechaISO(fm.date.slice(0, 10)) : null;
    if (!fecha && /^\d{4}-\d{2}-\d{2}/.test(nombreArchivo)) fecha = fechaISO(nombreArchivo.slice(0, 10));
    const dur = Number(fm.duration);
    out.push({
      id: (fecha || "0000-00-00") + "-v1-" + String(i).padStart(5, "0"),
      rutina: fm.template ? String(fm.template) : null,
      fecha,
      inicio: hhmm(fm.start),
      fin: hhmm(fm.end),
      duracion: fm.duration == null || fm.duration === "" || !Number.isFinite(dur) ? null : dur,
      ejercicios: asArray(fm.exercises).filter((ex) => ex && ex.name).map((ex) => {
        const tipoEj = String(ex.exerciseType || "weight").toLowerCase();
        return {
          ejercicioId: canon(String(ex.name).trim()),
          nombre: String(ex.name).trim(),
          tipo: TIPO_EJ[tipoEj] || tipoEj,
          series: asArray(ex.sets).filter(Boolean).map((st) => {
            const t = String(st.setType || "working").toLowerCase();
            const serie = { peso: aKg(Number(st.weight) || 0, st.unit), reps: Number(st.reps) || 0, tipo: TIPO_SERIE[t] || t, hecha: true };
            const seg = Number(st.durationSeconds) || 0;
            if (seg) serie.segundos = seg;
            return serie;
          }),
        };
      }),
      origen: { version: 1, ruta: s.path || null, ...(fm.reps_por_lado ? { repsPorLado: true } : {}) },
    });
  });
  return out;
}

/**
 * Nombre a mostrar de cada ejercicio: la grafía del mapeo de grupos; si no está, la
 * variante más usada en las sesiones; a igualdad, la que conserva mayúsculas y tildes.
 * `cuenta`: Map clave → Map(grafía → nº de series contadas).
 */
export function resolverNombre(clave, porDefecto, GRUPOS, cuenta) {
  const e = GRUPOS.mapa.get(clave);
  if (e && e.nombre) return e.nombre;
  const m = cuenta.get(clave);
  if (!m) return porDefecto;
  let mejor = porDefecto, mc = -1, mr = -1;
  for (const [v, n] of m) {
    const r = riqueza(v);
    if (n > mc || (n === mc && r > mr)) { mejor = v; mc = n; mr = r; }
  }
  return mejor;
}


const CUENTA = { normal: true, fallo: true };

/**
 * Datos antiguos completos ({sessions, templates, configs, settings, library}) → modelo
 * de la versión 2 ({sesiones, catalogo, rutinas, pesajes, ajustes, informe}). Puro.
 * `informe` lleva los errores y avisos de la configuración antigua, para enseñarlos una vez.
 */
export function desdeLegacy(datos) {
  const cfg = leerConfig(datos.configs || {});
  const { GRUPOS, UNILATERALES, OBJETIVOS, ESTANDARES } = cfg;
  const sesiones = convertirSesiones(datos.sessions);
  const plantillas = leerPlantillas(datos.templates);

  // Orden de lectura de la versión 1: de la sesión más reciente a la más antigua (estable).
  const ordenadas = sesiones.map((s, i) => [s, i]).sort((a, b) =>
    (b[0].fecha ? Date.parse(b[0].fecha) : 0) - (a[0].fecha ? Date.parse(a[0].fecha) : 0) || a[1] - b[1]).map((x) => x[0]);

  // Grafía de cada grupo: la primera que aparece al recorrer las series en ese orden.
  const grafia = new Map();
  const nombreGrupo = (g) => { const k = canon(g); if (!grafia.has(k)) grafia.set(k, String(g).trim()); return grafia.get(k); };
  const grupoRaw = (n) => { const e = GRUPOS.mapa.get(canon(n)); return e ? e.grupo : SIN_CATEGORIZAR; };
  const cuenta = new Map();
  for (const s of ordenadas) for (const ex of s.ejercicios) for (const st of ex.series) {
    const vale = CUENTA[st.tipo] && (ex.tipo === "duracion" ? (st.segundos || 0) > 0 : st.reps > 0);
    if (!vale) continue;
    nombreGrupo(grupoRaw(ex.nombre));
    const k = canon(ex.nombre);
    if (!cuenta.has(k)) cuenta.set(k, new Map());
    cuenta.get(k).set(ex.nombre, (cuenta.get(k).get(ex.nombre) || 0) + 1);
  }
  for (const m of ESTANDARES.mapa.values()) nombreGrupo(grupoRaw(m.nombre));
  for (const v of GRUPOS.mapa.values()) nombreGrupo(v.grupo);

  // Catálogo: primero el mapeo de grupos (en su orden), luego el resto de nombres conocidos.
  const catalogo = new Map();
  const tipoAnclaDe = new Map();
  for (const s of ordenadas) for (const ex of s.ejercicios) if (!tipoAnclaDe.has(ex.ejercicioId)) tipoAnclaDe.set(ex.ejercicioId, ex.tipo);
  for (const l of datos.library || []) {
    const k = canon(l && l.name);
    if (k && !tipoAnclaDe.has(k)) tipoAnclaDe.set(k, TIPO_EJ[String(l.exerciseType || "weight").toLowerCase()] || "peso");
  }
  const alta = (nombre) => {
    const k = canon(nombre);
    if (!k || catalogo.has(k)) return;
    const g = GRUPOS.mapa.get(k);
    catalogo.set(k, { id: k, nombre: resolverNombre(k, String(nombre).trim(), GRUPOS, cuenta), grupo: g ? nombreGrupo(g.grupo) : null,
      unilateral: UNILATERALES.set.has(k), tipoAncla: tipoAnclaDe.get(k) || "peso", tipoMaterial: null, incremento: null,
      rangoReps: null, top: false, estandar: null });
  };
  for (const v of GRUPOS.mapa.values()) alta(v.nombre);
  for (const s of ordenadas) for (const ex of s.ejercicios) alta(ex.nombre);
  for (const p of plantillas) for (const e of p.ejercicios) alta(e.nombre);
  for (const n of UNILATERALES.nombres) alta(n);
  for (const o of OBJETIVOS.mapa.values()) alta(o.nombre);
  for (const e of ESTANDARES.mapa.values()) alta(e.nombre);
  for (const l of datos.library || []) if (l && l.name) alta(l.name);
  for (const [k, o] of OBJETIVOS.mapa) {
    const c = catalogo.get(k);
    c.rangoReps = { min: o.min, max: o.max };
    c.top = o.top;
    c.incremento = o.inc;
    c.tipoMaterial = o.tipo ? o.tipo.tipo : null;
  }
  for (const [k, e] of ESTANDARES.mapa) {
    catalogo.get(k).estandar = e.sinEstandar ? { sin: true }
      : { slug: e.slug, factor: e.factorBase, revisado: e.revisado, aproximado: e.aprox, polea: !!e.polea };
  }

  const rutinas = plantillas.map((p) => ({ id: canon(p.nombre), nombre: p.nombre,
    ejercicios: p.ejercicios.map((e) => ({ ejercicioId: canon(e.nombre), series: e.target })) }));

  const horario = {};
  for (let i = 1; i <= 7; i++) horario[i] = cfg.HORARIO.mapa.get(i) || null;
  const colores = cfg.COLORES.mapa;
  const regiones = new Map(cfg.REGIONES.map((r) => [canon(r.grupo), r.tokens]));
  const grupos = [];
  const vistos = new Set();
  for (const v of GRUPOS.mapa.values()) {
    const n = nombreGrupo(v.grupo), k = canon(n);
    if (vistos.has(k)) continue;
    vistos.add(k);
    const c = colores.get(k);
    grupos.push({ nombre: n, color: c ? { oscuro: c.oscuro, claro: c.claro } : null, regiones: regiones.get(k) || [] });
  }
  const L = cfg.LIGAS_CFG;
  const ajustes = {
    version: 2,
    horario,
    bloques: cfg.BLOQUES.map((b, i) => ({ id: "b" + i, inicio: b.inicio, fin: b.fin, tipo: b.tipo, grupos: b.gruposTxt.slice() })),
    umbrales: Array.from(cfg.UMBRALES.values()).map((u) => ({ rutina: u.plantilla, maxDur: u.maxDur, maxSerie: u.maxSerie })),
    objetivos: { seriesSemana: cfg.VOLUMEN_OBJ.lista.map((o) => ({ grupo: o.grupo, min: o.min, max: o.max })),
                 incrementos: OBJETIVOS.tipos.map((t) => ({ tipo: t.tipo, kg: t.kg })) },
    cuerpo: { sexo: cfg.PESO.sexo, fases: cfg.PESO.fases.map((f) => ({ tipo: f.tipo, desde: f.desde })) },
    grupos,
    ligas: { activa: L.ok, escala: L.lista.map((x) => ({ nombre: x.nombre, desde: x.desde, hasta: x.hasta === Infinity ? null : x.hasta, ndiv: x.ndiv })),
             puntos: L.puntos, margen: L.margen, semCarga: L.semCarga, semSeries: L.semSeries, correccionPolea: ESTANDARES.correccionPolea },
    estandares: Object.fromEntries(Array.from(ESTANDARES.tablas.values()).map((t) => [t.slug, t.filas.map((f) => ({ pc: f.pc, niveles: f.niveles.slice() }))])),
  };
  return {
    sesiones,
    catalogo: Array.from(catalogo.values()),
    rutinas,
    pesajes: cfg.PESO.registros.map((r) => ({ fecha: r.fecha, kg: r.kg })),
    ajustes,
    informe: { errores: cfg.errores, avisos: cfg.avisos },
  };
}

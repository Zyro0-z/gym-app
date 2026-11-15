// Lectura del formato ANTIGUO (versión 1 de la app): sesiones en `fm`, plantillas y
// ajustes como textos de líneas «clave:: valor». Se usa una sola vez, al migrar los datos
// (y al importar una copia antigua), para obtener el modelo estructurado de la versión 2.
// Reproduce exactamente las reglas de lectura de la versión 1: qué líneas se aceptan,
// cuáles se rechazan y por qué. Puro: no toca DOM ni almacenamiento.

import { canon, sinTildes, riqueza } from "./nombres.js";
import { fechaISO } from "./fechas.js";

const LB_A_KG = 0.45359237;
export const aKg = (w, unidad) => (String(unidad || "kg").toLowerCase().indexOf("lb") === 0 ? w * LB_A_KG : w);

// Claves con las que la versión 1 guardaba cada texto de ajustes en IndexedDB (y en sus copias).
// Parecen rutas, pero son solo nombres de clave: hay que conservarlos tal cual para poder migrar.
export const ARCHIVOS = {
  grupos: "Gym/Config/grupos-musculares.md",
  regiones: "Gym/Config/regiones-svg.md",
  horario: "Gym/Config/horario-semanal.md",
  peso: "Gym/Config/peso-corporal.md",
  unilaterales: "Gym/Config/unilaterales.md",
  objetivos: "Gym/Config/objetivos.md",
  volumen: "Gym/Config/volumen-objetivo.md",
  colores: "Gym/Config/colores-grupos.md",
  ligas: "Gym/Config/ligas.md",
  estandares: "Gym/Config/estandares.md",
};
export const SIN_CATEGORIZAR = "Sin categorizar";
export const GRUPOS_ESPERADOS = ["Pecho", "Espalda", "Pierna", "Hombro", "Bíceps", "Tríceps"];
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const META = { file: 1, tipo: 1, type: 1, tags: 1, tag: 1, aliases: 1, alias: 1,
  cssclass: 1, cssclasses: 1, position: 1, mapa: 1, titulo: 1, descripcion: 1, nota: 1, notas: 1 };

// ─────────── Lectura de líneas «clave:: valor» ───────────
// Un valor puede ser número, booleano, fecha o lista separada por comas, y cada clave se
// guarda también en su forma simplificada. Las reglas de abajo dependen de esto: por
// ejemplo, «78,5» sin unidad es la lista [78, 5] y por eso se rechaza.
class Fecha { constructor(iso) { this.iso = iso; } toISODate() { return this.iso; } toString() { return this.iso; } }
const simple = (k) => k.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "");
function valor(raw) {
  const t = raw.trim();
  if (t === "") return null;
  const lit = (x) => {
    x = x.trim();
    if (/^-?\d+(\.\d+)?$/.test(x)) return { ok: true, v: Number(x) };
    if (/^(true|false)$/i.test(x)) return { ok: true, v: /^true$/i.test(x) };
    if (/^\d{4}-\d{2}-\d{2}$/.test(x) && fechaISO(x)) return { ok: true, v: new Fecha(x) };
    return { ok: false };
  };
  const u = lit(t);
  if (u.ok) return u.v;
  if (t.includes(",")) {
    const partes = t.split(",").map(lit);
    if (partes.every((p) => p.ok)) return partes.map((p) => p.v);
  }
  return t;
}
export function leerLineas(texto) {
  const page = {};
  let cuerpo = String(texto || "");
  const m = cuerpo.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    cuerpo = cuerpo.slice(m[0].length);
    for (const l of m[1].split("\n")) {
      const q = l.match(/^([^:\s][^:]*):\s*(.*)$/);
      if (q) page[q[1].trim()] = valor(q[2]) ?? q[2];
    }
  }
  const anadir = (k, v) => {
    if (v === null || k.includes("`")) return;
    for (const key of new Set([k, simple(k)])) {
      if (!key || key === "file") continue;
      if (key in page) page[key] = (Array.isArray(page[key]) ? page[key] : [page[key]]).concat(Array.isArray(v) ? [v] : [v]);
      else page[key] = v;
    }
  };
  for (const linea of cuerpo.split("\n")) {
    const r = linea.match(/^[\s>]*(?:[-*+]\s+)?(?:\*\*|__)?([^:\n]+?)(?:\*\*|__)?::[ \t]*(.*)$/);
    if (r) anadir(r[1].trim(), valor(r[2]));
  }
  return page;
}

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
function comoTexto(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v.toISODate === "function") return v.toISODate();
  if (Array.isArray(v)) return v.map(comoTexto).join(", ");
  return String(v);
}
const numCfg = (t) => parseFloat(String(t).replace(",", "."));
const NUM_CFG = "(\\d+(?:[.,]\\d+)?)";
function camposConfig(cfg) {
  const out = [], vistos = new Set();
  for (const k of Object.keys(cfg)) {
    if (META[k.toLowerCase()] || vistos.has(canon(k))) continue;
    vistos.add(canon(k));
    out.push({ clave: k, valores: asArray(cfg[k]) });
  }
  return out;
}
function parseRango(t) {
  const m = String(t).trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return { error: "se espera «mínimo-máximo», por ejemplo «8-12»" };
  const min = parseInt(m[1], 10), max = parseInt(m[2], 10);
  if (!(min >= 1)) return { error: "el mínimo tiene que ser 1 o más" };
  if (min > max) return { error: "el mínimo (" + min + ") es mayor que el máximo (" + max + ")" };
  return { min, max };
}
const parseKg = (s) => {
  const m = String(s).trim().match(/^\+\s*(\d+(?:[.,]\d+)?)\s*(kg)?$/i);
  const n = m ? parseFloat(m[1].replace(",", ".")) : NaN;
  return n > 0 ? n : null;
};

/**
 * Lee todos los textos de configuración antiguos. Devuelve las estructuras con las que
 * calculaba la versión 1, más `errores` [{archivo, linea, motivo}] y `avisos` [texto]
 * en el mismo orden en que los producía.
 */
export function leerConfig(configs) {
  const errores = [], avisos = [];
  const pagina = (ruta) => {
    const k = Object.keys(configs || {}).find((x) => x === ruta || x === ruta + ".md" || x.replace(/\.md$/, "") === ruta);
    return k ? leerLineas(configs[k]) : null;
  };

  // Grupos musculares:  Ejercicio:: Grupo   ·   mapa:: Ejercicio | Grupo
  const GRUPOS = { mapa: new Map(), existe: false };
  {
    const cfg = pagina(ARCHIVOS.grupos);
    if (cfg) {
      GRUPOS.existe = true;
      for (const k of Object.keys(cfg)) {
        if (META[k.toLowerCase()]) continue;
        const vals = asArray(cfg[k]);
        if (!vals.length) continue;
        const g = String(vals[vals.length - 1]).trim();
        if (!g) continue;
        if (!GRUPOS.mapa.has(canon(k))) GRUPOS.mapa.set(canon(k), { grupo: g, nombre: k });
      }
      for (const linea of asArray(cfg.mapa)) {
        const partes = String(linea).split("|");
        if (partes.length < 2) continue;
        const n = partes[0].trim(), g = partes[1].trim();
        if (n && g) GRUPOS.mapa.set(canon(n), { grupo: g, nombre: n });
      }
    }
  }

  const cfgHorario = pagina(ARCHIVOS.horario);
  // Umbrales de duración por plantilla:  umbral:: Pierna | duración 240 | por serie 25
  const UMBRALES = new Map();
  if (cfgHorario) {
    for (const raw of asArray(cfgHorario.umbral)) {
      const linea = comoTexto(raw);
      const err = (m) => errores.push({ archivo: ARCHIVOS.horario, linea: "umbral:: " + linea, motivo: m });
      const p = linea.split("|").map((x) => x.trim());
      if (p.length < 2 || !p[0]) { err("se espera «Plantilla | duración N | por serie N»; no se aplica"); continue; }
      const u = { plantilla: p[0], maxDur: null, maxSerie: null };
      let ok = true;
      for (const par of p.slice(1)) {
        const m = sinTildes(par).match(/^(duracion|por\s+serie)\s+(\d+(?:[.,]\d+)?)\s*(min)?$/);
        const n = m ? parseFloat(m[2].replace(",", ".")) : NaN;
        if (!m || !(n > 0)) { err("parámetro no reconocido «" + par + "» (usa «duración 240» o «por serie 25»); la línea no se aplica"); ok = false; break; }
        if (m[1] === "duracion") u.maxDur = n; else u.maxSerie = n;
      }
      if (!ok) continue;
      if (UMBRALES.has(canon(p[0]))) avisos.push("Hay más de un umbral para «" + p[0] + "»: se usa el último.");
      UMBRALES.set(canon(p[0]), u);
    }
  }

  // Bloques:  bloque:: inicio | fin | tipo [| grupos]
  const BLOQUES = [];
  if (cfgHorario) {
    const conocidos = new Set(GRUPOS_ESPERADOS.map(canon));
    for (const v of GRUPOS.mapa.values()) conocidos.add(canon(v.grupo));
    for (const raw of asArray(cfgHorario.bloque)) {
      const linea = comoTexto(raw);
      const err = (m) => errores.push({ archivo: ARCHIVOS.horario, linea: "bloque:: " + linea, motivo: m });
      const p = linea.split("|").map((x) => x.trim());
      if (p.length < 3 || p.length > 4) { err("se esperan 3 o 4 campos «inicio | fin | tipo | grupos»; no se aplica"); continue; }
      const ini = fechaISO(p[0]), fin = fechaISO(p[1]);
      if (!ini || !fin) { err("fecha no válida (usa AAAA-MM-DD); no se aplica"); continue; }
      if (fin < ini) { err("la fecha de fin es anterior a la de inicio; no se aplica"); continue; }
      if (!p[2]) { err("falta el tipo («deload» u otro texto); no se aplica"); continue; }
      const grupos = p.length === 4 ? p[3].split(",").map((x) => x.trim()).filter(Boolean) : [];
      const raros = grupos.filter((g) => !conocidos.has(canon(g)));
      if (raros.length) err((raros.length === 1 ? "grupo que no existe" : "grupos que no existen") + " en tu taxonomía: " + raros.join(", ") +
                            ". El bloque SÍ se aplica tal cual: revisa la grafía");
      BLOQUES.push({ inicio: ini, fin, tipo: p[2], esDeload: canon(p[2]) === "deload", grupos: grupos.map(canon), gruposTxt: grupos, linea });
    }
    for (let i = 0; i < BLOQUES.length; i++)
      for (let j = i + 1; j < BLOQUES.length; j++)
        if (BLOQUES[i].inicio <= BLOQUES[j].fin && BLOQUES[j].inicio <= BLOQUES[i].fin)
          avisos.push("Bloques solapados: «" + BLOQUES[i].tipo + "» y «" + BLOQUES[j].tipo + "». Se combinan: objetivo = unión de grupos; cada uno protege a los suyos.");
  }

  // Peso corporal, sexo y fases
  const PESO = { existe: false, registros: [], sexo: null, fases: [] };
  {
    const cfg = pagina(ARCHIVOS.peso);
    if (cfg) {
      PESO.existe = true;
      const err = (l, m) => errores.push({ archivo: ARCHIVOS.peso, linea: l, motivo: m });
      for (const k of Object.keys(cfg)) {
        if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(k)) { err(k + ":: …", "fecha en formato no reconocido: usa AAAA-MM-DD; no se aplica"); continue; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
        if (!fechaISO(k)) { err(k + ":: …", "fecha imposible; no se aplica"); continue; }
        const v = cfg[k];
        const vals = Array.isArray(v) ? v : [v];
        if (vals.some((x) => typeof x === "number")) { err(k + ":: …", "falta la unidad: escríbelo como «78,5 kg»; no se aplica"); continue; }
        if (vals.length > 1) avisos.push("Peso corporal: la fecha " + k + " aparece " + vals.length + " veces; se usa la última.");
        const t = comoTexto(vals[vals.length - 1]).trim();
        const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)\.?$/i);
        if (!m) { err(k + ":: " + t, "no se reconoce el peso (ejemplo válido: «78,5 kg»); no se aplica"); continue; }
        const kg = aKg(parseFloat(m[1].replace(",", ".")), m[2]);
        if (!(kg >= 35 && kg <= 250)) { err(k + ":: " + t, "fuera del rango 35-250 kg, ¿errata?; no se aplica"); continue; }
        PESO.registros.push({ fecha: k, kg });
      }
      PESO.registros.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
      const s = sinTildes(comoTexto(cfg.sexo));
      if (/^(hombre|h|masculino|varon)$/.test(s)) PESO.sexo = "h";
      else if (/^(mujer|m|femenino)$/.test(s)) PESO.sexo = "m";
      else if (s) err("sexo:: " + comoTexto(cfg.sexo), "valor no reconocido (usa «hombre» o «mujer»)");
      const vistasDesde = new Map();
      for (const raw of asArray(cfg.objetivo)) {
        const linea = comoTexto(raw).trim();
        if (!linea) continue;
        const e2 = (m) => err("objetivo:: " + linea, m);
        const p = linea.split("|").map((x) => x.trim());
        const tipo = sinTildes(p[0]);
        if (["bulk", "cut", "mantener"].indexOf(tipo) < 0) { e2("valor no reconocido (usa «bulk», «cut» o «mantener»); no se aplica"); continue; }
        let desde = null;
        if (p.length > 2) { e2("sobran campos: «objetivo | desde AAAA-MM-DD»; no se aplica"); continue; }
        if (p.length === 2) {
          const m = sinTildes(p[1]).match(/^desde\s+(\S+)$/);
          desde = m ? fechaISO(m[1]) : null;
          if (!desde) { e2("se espera «desde AAAA-MM-DD» detrás de la barra; no se aplica"); continue; }
        }
        const k = desde || "";
        if (vistasDesde.has(k)) avisos.push("Hay más de un objetivo de peso " + (desde ? "con desde " + desde : "sin fecha") + ": se usa el último.");
        vistasDesde.set(k, { tipo, desde });
      }
      PESO.fases = Array.from(vistasDesde.values()).sort((a, b) => ((a.desde || "") < (b.desde || "") ? -1 : 1));
    }
  }

  // Unilaterales:  unilateral:: Curl mancuernas
  const UNILATERALES = { existe: false, set: new Set(), nombres: [] };
  {
    const cfg = pagina(ARCHIVOS.unilaterales);
    if (cfg) {
      UNILATERALES.existe = true;
      for (const raw of asArray(cfg.unilateral)) {
        const n = comoTexto(raw).trim();
        if (!n) { errores.push({ archivo: ARCHIVOS.unilaterales, linea: "unilateral::", motivo: "vacío: falta el nombre del ejercicio; no se aplica" }); continue; }
        if (UNILATERALES.set.has(canon(n))) { avisos.push("«" + n + "» está repetido en unilaterales: cuenta una vez."); continue; }
        UNILATERALES.set.add(canon(n));
        UNILATERALES.nombres.push(n);
      }
    }
  }

  // Objetivos de repeticiones e incrementos:  Ejercicio:: 6-10 | top | +5 | máquina   ·   incremento:: máquina | +2,5
  const OBJETIVOS = { existe: false, mapa: new Map(), tipos: [] };
  {
    const cfg = pagina(ARCHIVOS.objetivos);
    if (cfg) {
      OBJETIVOS.existe = true;
      for (const raw of asArray(cfg.incremento)) {
        const linea = comoTexto(raw).trim();
        const p = linea.split("|").map((x) => x.trim());
        const kg = p.length === 2 ? parseKg(p[1]) : null;
        if (!p[0] || kg == null) {
          errores.push({ archivo: ARCHIVOS.objetivos, linea: "incremento:: " + linea, motivo: "se espera «tipo | +N», por ejemplo «máquina | +2,5»; no se aplica" });
          continue;
        }
        OBJETIVOS.tipos.push({ tipo: p[0], k: canon(p[0]), kg });
      }
      const tipoDe = (x) => OBJETIVOS.tipos.filter((ti) => ti.k === canon(x))[0] || null;
      for (const c of camposConfig(cfg)) {
        if (canon(c.clave) === "incremento") continue;
        const t = comoTexto(c.valores[c.valores.length - 1]).trim();
        const err = (m) => errores.push({ archivo: ARCHIVOS.objetivos, linea: c.clave + ":: " + t, motivo: m + "; no se aplica" });
        if (c.valores.length > 1) avisos.push("«" + c.clave + "» aparece " + c.valores.length + " veces en objetivos: se usa la última.");
        if (!t) { err("sin rango"); continue; }
        const p = t.split("|").map((x) => x.trim());
        const r = parseRango(p[0]);
        if (r.error) { err(r.error); continue; }
        const o = { nombre: c.clave, min: r.min, max: r.max, top: false, inc: null, tipo: null };
        let mal = null;
        for (const campo of p.slice(1)) {
          if (canon(campo) === "top") o.top = true;
          else if (/^\+/.test(campo)) { o.inc = parseKg(campo); if (o.inc == null) mal = "incremento no válido «" + campo + "» (usa «+2,5»)"; }
          else if (tipoDe(campo)) o.tipo = tipoDe(campo);
          else mal = "«" + campo + "» no es «top», ni un incremento «+N», ni un tipo de incremento (" +
                     (OBJETIVOS.tipos.map((x) => x.tipo).join(", ") || "no hay ninguno declarado") + ")";
          if (mal) break;
        }
        if (mal) { err(mal); continue; }
        OBJETIVOS.mapa.set(canon(c.clave), o);
      }
    }
  }

  // Series semanales objetivo:  Pecho:: 12-16
  const VOLUMEN_OBJ = { existe: false, lista: [] };
  {
    const cfg = pagina(ARCHIVOS.volumen);
    if (cfg) {
      VOLUMEN_OBJ.existe = true;
      const conocidos = new Set(Array.from(GRUPOS.mapa.values()).map((v) => canon(v.grupo)));
      for (const c of camposConfig(cfg)) {
        const t = comoTexto(c.valores[c.valores.length - 1]).trim();
        const linea = c.clave + ":: " + t;
        const r = parseRango(t);
        if (r.error) { errores.push({ archivo: ARCHIVOS.volumen, linea, motivo: r.error + "; no se aplica" }); continue; }
        if (!conocidos.has(canon(c.clave)))
          errores.push({ archivo: ARCHIVOS.volumen, linea, motivo: "«" + c.clave + "» no es ningún grupo muscular: se muestra, pero ninguna serie puede contar para él. Revisa la grafía" });
        VOLUMEN_OBJ.lista.push({ grupo: c.clave, min: r.min, max: r.max });
      }
    }
  }

  // Colores de grupo:  Pecho:: #F2727F | #C73A50   (oscuro | claro)
  const COLORES = { existe: false, mapa: new Map() };
  {
    const cfg = pagina(ARCHIVOS.colores);
    if (cfg) {
      COLORES.existe = true;
      for (const c of camposConfig(cfg)) {
        const t = comoTexto(c.valores[c.valores.length - 1]);
        const hex = t.match(/#[0-9a-f]{6}\b/gi) || [];
        if (!hex.length) {
          errores.push({ archivo: ARCHIVOS.colores, linea: c.clave + ":: " + t, motivo: "se espera un color como #F2727F (y otro para el tema claro, tras «|»); no se aplica" });
          continue;
        }
        COLORES.mapa.set(canon(c.clave), { nombre: c.clave, oscuro: hex[0], claro: hex[1] || hex[0] });
      }
    }
  }

  // Escala de ligas
  const LIGAS_CFG = { existe: false, ok: false, lista: [], puntos: 5, margen: 1, semCarga: 8, semSeries: 4 };
  {
    const cfg = pagina(ARCHIVOS.ligas);
    if (cfg) {
      LIGAS_CFG.existe = true;
      const out = LIGAS_CFG;
      const err = (l, m) => errores.push({ archivo: ARCHIVOS.ligas, linea: l, motivo: m });
      const ajuste = (clave, campo, valido, pide) => {
        const vals = asArray(cfg[clave]);
        if (!vals.length) return;
        const t = comoTexto(vals[vals.length - 1]).trim(), n = numCfg(t);
        if (valido(n)) out[campo] = n;
        else err(clave + ":: " + t, "se espera " + pide + "; se usa " + String(out[campo]).replace(".", ","));
      };
      const semanas = (n) => Number.isInteger(n) && n >= 1;
      ajuste("puntos-sobre-elite", "puntos", (n) => n > 0, "un número mayor que 0");
      ajuste("margen-descenso", "margen", (n) => n >= 0, "un número (0 o más)");
      ajuste("semanas-carga", "semCarga", semanas, "un número entero de semanas");
      ajuste("semanas-series", "semSeries", semanas, "un número entero de semanas");
      const deElite = (m) => 95 + ((m - 1) / 0.1) * out.puntos;
      const rP = new RegExp("^p\\s*" + NUM_CFG + "\\s*-\\s*" + NUM_CFG + "$");
      const rE = new RegExp("^elite\\s*" + NUM_CFG + "\\s*(?:-\\s*" + NUM_CFG + "|(\\+))$");
      let roto = false;
      for (const raw of asArray(cfg.liga)) {
        const linea = comoTexto(raw).trim();
        const mal = (m) => { err("liga:: " + linea, m); roto = true; };
        const p = linea.split("|").map((x) => x.trim());
        if (p.length !== 3 || !p[0]) { mal("se esperan 3 campos «nombre | tramo | divisiones»"); continue; }
        const t = sinTildes(p[1]).replace(/\s+/g, " ");
        let desde, hasta, m;
        if ((m = t.match(rP))) { desde = numCfg(m[1]); hasta = numCfg(m[2]); if (hasta > 95) { mal("un tramo en percentil no puede pasar de p95 (Elite): por encima usa «elite A-B»"); continue; } }
        else if ((m = t.match(rE))) { desde = deElite(numCfg(m[1])); hasta = m[3] ? Infinity : deElite(numCfg(m[2])); if (numCfg(m[1]) < 1) { mal("«elite» empieza en 1,00 (la carga Elite)"); continue; } }
        else { mal("tramo no reconocido «" + p[1] + "» (usa «p 40-50» o «elite 1,10-1,20», o «elite 1,20+» en la última)"); continue; }
        if (!(hasta > desde)) { mal("el final del tramo no es mayor que el principio"); continue; }
        const d = canon(p[2]);
        if (d !== "divisiones" && d !== "sindivisiones") { mal("tercer campo no reconocido (usa «divisiones» o «sin divisiones»)"); continue; }
        out.lista.push({ nombre: p[0], desde, hasta, ndiv: d === "divisiones" && hasta !== Infinity ? 3 : 1, linea });
      }
      const L = out.lista;
      if (L.length && Math.abs(L[0].desde) > 1e-9) { err("liga:: " + L[0].linea, "la primera liga tiene que empezar en p 0"); roto = true; }
      for (let i = 1; i < L.length; i++)
        if (Math.abs(L[i].desde - L[i - 1].hasta) > 1e-6) { err("liga:: " + L[i].linea, "no empieza donde acaba «" + L[i - 1].nombre + "»: hay un hueco o un solape"); roto = true; }
      out.ok = L.length > 0 && !roto;
      if (L.length && !out.ok) avisos.push("La escala de ligas tiene errores: las ligas no se muestran hasta corregirla.");
    }
  }

  // Estándares de fuerza: mapeo «Ejercicio:: slug | factor N | aproximado | polea», tablas «slug:: pc | 5 niveles»
  const ESTANDARES = { existe: false, mapa: new Map(), tablas: new Map(), correccionPolea: 1, lineaPolea: null };
  {
    const cfg = pagina(ARCHIVOS.estandares);
    if (cfg) {
      const out = ESTANDARES;
      out.existe = true;
      const err = (l, m) => errores.push({ archivo: ARCHIVOS.estandares, linea: l, motivo: m });
      const esNum = (x) => /^\d+(?:[.,]\d+)?$/.test(x);
      const vistas = new Set(), filas = new Map();
      for (const k of Object.keys(cfg)) {
        if (canon(k) !== "correccionpolea" || out.lineaPolea) continue;
        const raw = cfg[k];
        const t = comoTexto(raw).trim();
        out.lineaPolea = k + ":: " + t;
        const m = sinTildes(t).match(new RegExp("^(?:factor\\s+)?" + NUM_CFG + "$"));
        if (Array.isArray(raw) || !m) { err(out.lineaPolea, "se espera «factor N», por ejemplo «factor 1,4»; no se aplica"); continue; }
        const v = numCfg(m[1]);
        if (!(v > 0 && v <= 5)) { err(out.lineaPolea, "la corrección tiene que estar entre 0 y 5; no se aplica"); continue; }
        out.correccionPolea = v;
      }
      for (const k of Object.keys(cfg)) {
        if (META[k.toLowerCase()] || canon(k) === "correccionpolea") continue;
        for (const raw of asArray(cfg[k])) {
          const t = comoTexto(raw).trim();
          const firma = canon(k) + "::" + t;
          if (!t || vistas.has(firma)) continue;
          vistas.add(firma);
          const p = t.split("|").map((x) => x.trim());
          if (p.length === 6 && p.every(esNum)) {
            const v = p.map(numCfg);
            const niveles = v.slice(1);
            if (!(v[0] >= 30 && v[0] <= 250)) { err(k + ":: " + t, "peso corporal fuera de 30-250 kg; la fila no se aplica"); continue; }
            if (!niveles.every((n, i) => n > 0 && (i === 0 || n > niveles[i - 1]))) { err(k + ":: " + t, "los cinco niveles tienen que ir de menor a mayor; la fila no se aplica"); continue; }
            const f = filas.get(canon(k)) || { slug: k, filas: new Map() };
            if (f.filas.has(v[0])) avisos.push("Estándar «" + k + "»: la fila de " + v[0] + " kg está repetida; se usa la última.");
            f.filas.set(v[0], niveles);
            filas.set(canon(k), f);
            continue;
          }
          const linea = k + ":: " + t;
          if (canon(p[0]) === "sinestandar") { out.mapa.set(canon(k), { nombre: k, sinEstandar: true, linea }); continue; }
          if (!/^[a-z0-9-]+$/i.test(p[0])) { err(linea, "se espera «estándar | factor N», con el estándar escrito como en Strength Level (por ejemplo «chest-press»); no se aplica"); continue; }
          const e = { nombre: k, slug: p[0], factor: 1, revisado: false, aprox: false, linea };
          let mal = null;
          for (const campo of p.slice(1)) {
            const m = sinTildes(campo).match(new RegExp("^factor\\s+" + NUM_CFG + "$"));
            if (m && numCfg(m[1]) > 0 && numCfg(m[1]) <= 10) { e.factor = numCfg(m[1]); e.revisado = true; }
            else if (canon(campo) === "aproximado") e.aprox = true;
            else if (canon(campo) === "polea") e.polea = true;
            else { mal = "«" + campo + "» no es «factor N» (entre 0 y 10), «aproximado» ni «polea»"; break; }
          }
          if (mal) { err(linea, mal + "; no se aplica"); continue; }
          if (out.mapa.has(canon(k)) && out.mapa.get(canon(k)).linea !== linea)
            avisos.push("«" + k + "» aparece más de una vez en estándares: se usa la última.");
          out.mapa.set(canon(k), e);
        }
      }
      for (const f of filas.values()) {
        const pcs = Array.from(f.filas.keys()).sort((a, b) => a - b);
        out.tablas.set(canon(f.slug), { slug: f.slug, filas: pcs.map((pc) => ({ pc, niveles: f.filas.get(pc) })) });
      }
      for (const e of out.mapa.values())
        if (!e.sinEstandar && !out.tablas.has(canon(e.slug)))
          err(e.linea, "no hay ninguna tabla «" + e.slug + "» en estándares; el ejercicio queda sin liga");
      for (const e of out.mapa.values()) {
        if (e.sinEstandar) continue;
        e.factorBase = e.factor;
        if (e.polea) e.factor = e.factorBase * out.correccionPolea;
      }
    }
  }

  // Horario semanal:  Lunes:: Rutina
  const HORARIO = { mapa: new Map(), existe: false };
  if (cfgHorario) {
    HORARIO.existe = true;
    for (const k of Object.keys(cfgHorario)) {
      if (META[k.toLowerCase()]) continue;
      const vals = asArray(cfgHorario[k]);
      if (!vals.length) continue;
      const v = String(vals[vals.length - 1]).trim();
      if (!v) continue;
      for (let i = 1; i <= 7; i++) if (canon(DIAS[i]) === canon(k)) { if (!HORARIO.mapa.has(i)) HORARIO.mapa.set(i, v); break; }
    }
  }

  // Regiones del diagrama corporal:  Grupo:: chest-* lats-*
  const REGIONES = [];
  {
    const cfg = pagina(ARCHIVOS.regiones);
    if (cfg) {
      const vistos = new Set();
      for (const k of Object.keys(cfg)) {
        if (META[k.toLowerCase()] || vistos.has(canon(k))) continue;
        const vals = asArray(cfg[k]);
        if (!vals.length) continue;
        const tokens = String(vals[vals.length - 1]).trim().split(/\s+/).filter(Boolean);
        if (tokens.length) { vistos.add(canon(k)); REGIONES.push({ grupo: String(k).trim(), tokens }); }
      }
    }
  }

  return { GRUPOS, UMBRALES, BLOQUES, PESO, UNILATERALES, OBJETIVOS, VOLUMEN_OBJ, COLORES, LIGAS_CFG, ESTANDARES, HORARIO, REGIONES, errores, avisos };
}

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

export { comoTexto, DIAS };

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

// Ajustes antiguos (1/2): grupos, umbrales de duración, bloques, peso corporal, unilaterales y objetivos de repeticiones. Mismas reglas que la versión 1.
import { canon, sinTildes, riqueza } from "../core/nombres.js";
import { fechaISO } from "../core/fechas.js";
import { aKg, ARCHIVOS, DIAS, META } from "./claves.js";
import { leerLineas, simple, valor, asArray, comoTexto, numCfg, NUM_CFG, camposConfig, parseRango, parseKg } from "./lineas.js";
import { SIN_CATEGORIZAR, GRUPOS_ESPERADOS } from "../core/constantes.js";

export function leerConfigEntreno({ pagina, errores, avisos }) {
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
  return { GRUPOS, UMBRALES, BLOQUES, PESO, UNILATERALES, OBJETIVOS, cfgHorario };
}

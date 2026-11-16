// Lectura de los textos de ajustes de la versión 1: líneas «clave:: valor» y sus valores.
import { canon, sinTildes, riqueza } from "../core/nombres.js";
import { fechaISO } from "../core/fechas.js";
import { aKg, META, DIAS } from "./claves.js";

// ─────────── Lectura de líneas «clave:: valor» ───────────
// Un valor puede ser número, booleano, fecha o lista separada por comas, y cada clave se
// guarda también en su forma simplificada. Las reglas de abajo dependen de esto: por
// ejemplo, «78,5» sin unidad es la lista [78, 5] y por eso se rechaza.
class Fecha { constructor(iso) { this.iso = iso; } toISODate() { return this.iso; } toString() { return this.iso; } }
export const simple = (k) => k.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "");
export function valor(raw) {
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

export const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
export function comoTexto(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v.toISODate === "function") return v.toISODate();
  if (Array.isArray(v)) return v.map(comoTexto).join(", ");
  return String(v);
}
export const numCfg = (t) => parseFloat(String(t).replace(",", "."));
export const NUM_CFG = "(\\d+(?:[.,]\\d+)?)";
export function camposConfig(cfg) {
  const out = [], vistos = new Set();
  for (const k of Object.keys(cfg)) {
    if (META[k.toLowerCase()] || vistos.has(canon(k))) continue;
    vistos.add(canon(k));
    out.push({ clave: k, valores: asArray(cfg[k]) });
  }
  return out;
}
export function parseRango(t) {
  const m = String(t).trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return { error: "se espera «mínimo-máximo», por ejemplo «8-12»" };
  const min = parseInt(m[1], 10), max = parseInt(m[2], 10);
  if (!(min >= 1)) return { error: "el mínimo tiene que ser 1 o más" };
  if (min > max) return { error: "el mínimo (" + min + ") es mayor que el máximo (" + max + ")" };
  return { min, max };
}
export const parseKg = (s) => {
  const m = String(s).trim().match(/^\+\s*(\d+(?:[.,]\d+)?)\s*(kg)?$/i);
  const n = m ? parseFloat(m[1].replace(",", ".")) : NaN;
  return n > 0 ? n : null;
};

/**
 * Lee todos los textos de configuración antiguos. Devuelve las estructuras con las que
 * calculaba la versión 1, más `errores` [{archivo, linea, motivo}] y `avisos` [texto]
 * en el mismo orden en que los producía.
 */

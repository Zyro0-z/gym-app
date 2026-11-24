// Validación de una copia de seguridad (versión 2 o posterior) ANTES de tocar ningún dato.
// Sin librerías. Devuelve una lista de problemas en frases legibles; vacía si la copia es válida.
// El modelo está descrito campo a campo en docs/ESQUEMA.md.
import { fechaISO } from "../core/fechas.js";
import { validarMolestia } from "../core/molestias.js";

export const TIPOS_SERIE = ["normal", "calentamiento", "fallo", "descendente"];
export const TIPOS_EJERCICIO = ["peso", "duracion", "temporizador", "reps"];
export const MEDIDAS = ["cintura", "pecho", "brazo", "muslo", "cadera", "cuello"];
const MAX_PROBLEMAS = 3;

const esTexto = (v) => typeof v === "string" && v.trim() !== "";
const esNum = (v) => typeof v === "number" && Number.isFinite(v);
const opcional = (v) => v === undefined || v === null;
const hora = (v) => opcional(v) || (typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v) && +v.split(":")[0] < 24 && +v.split(":")[1] < 60);
export const rpeValido = (v) => esNum(v) && v >= 5 && v <= 10 && Number.isInteger(v * 2);

/**
 * @param {object} o       copia ya leída con JSON.parse
 * @param {object} limites { version, esquema }: lo más nuevo que entiende esta versión de la app
 * @returns {string[]}     problemas (como mucho unos pocos, para no abrumar)
 */
export function validarCopia(o, { version = 3, esquema = 4 } = {}) {
  const p = [];
  const mal = (t) => { p.push(t); return p.length >= MAX_PROBLEMAS * 4; };
  if (!o || typeof o !== "object" || Array.isArray(o)) return ["el archivo no contiene un objeto de copia"];
  if (!esNum(o.version) || o.version < 2 || o.version > version) mal("versión de copia no soportada (" + JSON.stringify(o.version) + ")");
  if (o.esquema !== undefined && (!esNum(o.esquema) || o.esquema < 3 || o.esquema > esquema)) mal("esquema de datos no soportado (" + JSON.stringify(o.esquema) + ")");
  for (const k of ["sesiones", "catalogo", "rutinas", "pesajes"]) if (!Array.isArray(o[k])) mal("falta la lista «" + k + "»");
  if (o.medidas !== undefined && !Array.isArray(o.medidas)) mal("«medidas» no es una lista");
  if (o.molestias !== undefined && !Array.isArray(o.molestias)) mal("«molestias» no es una lista");
  if (o.ajustes !== undefined && o.ajustes !== null && (typeof o.ajustes !== "object" || Array.isArray(o.ajustes))) mal("los ajustes no tienen el formato esperado");
  if (p.length) return p.slice(0, MAX_PROBLEMAS);

  const ids = new Set();
  o.sesiones.some((s, i) => {
    const q = "sesión " + (i + 1) + (s && esTexto(s.fecha) ? " (" + s.fecha + ")" : "");
    if (!s || typeof s !== "object") return mal(q + ": no es una sesión");
    if (!esTexto(s.id)) return mal(q + ": sin identificador");
    if (ids.has(s.id)) return mal(q + ": identificador repetido");
    ids.add(s.id);
    if (!fechaISO(s.fecha)) return mal(q + ": fecha imposible o ausente (" + JSON.stringify(s.fecha) + ")");
    if (!hora(s.inicio) || !hora(s.fin)) return mal(q + ": hora de inicio o fin no válida");
    if (!opcional(s.duracion) && !(esNum(s.duracion) && s.duracion >= 0)) return mal(q + ": duración no válida");
    if (!opcional(s.rutina) && typeof s.rutina !== "string") return mal(q + ": rutina no válida");
    if (!opcional(s.nota) && typeof s.nota !== "string") return mal(q + ": la nota no es texto");
    if (!opcional(s.gimnasio) && !esTexto(s.gimnasio)) return mal(q + ": gimnasio no válido");
    if (!opcional(s.recuperacion)) {
      const r = s.recuperacion;
      if (typeof r !== "object") return mal(q + ": recuperación no válida");
      if (!opcional(r.sueno) && !(esNum(r.sueno) && r.sueno >= 0 && r.sueno <= 24)) return mal(q + ": horas de sueño fuera de rango");
      for (const k of ["estres", "energia"]) if (!opcional(r[k]) && !(Number.isInteger(r[k]) && r[k] >= 1 && r[k] <= 5)) return mal(q + ": «" + k + "» debe ir de 1 a 5");
    }
    if (!Array.isArray(s.ejercicios)) return mal(q + ": sin lista de ejercicios");
    return s.ejercicios.some((e, j) => {
      const qe = q + ", ejercicio " + (j + 1) + (e && esTexto(e.nombre) ? " «" + e.nombre + "»" : "");
      if (!e || typeof e !== "object" || !esTexto(e.ejercicioId)) return mal(qe + ": sin identificador de ejercicio");
      if (!opcional(e.tipo) && !TIPOS_EJERCICIO.includes(e.tipo)) return mal(qe + ": tipo de ejercicio desconocido");
      if (!Array.isArray(e.series)) return mal(qe + ": sin lista de series");
      return e.series.some((st, k) => {
        const qs = qe + ", serie " + (k + 1);
        if (!st || typeof st !== "object") return mal(qs + ": no es una serie");
        if (!(esNum(st.peso) && st.peso >= 0 && st.peso < 2000)) return mal(qs + ": peso no válido (" + JSON.stringify(st.peso) + ")");
        if (!(esNum(st.reps) && st.reps >= 0 && st.reps < 1000)) return mal(qs + ": repeticiones no válidas (" + JSON.stringify(st.reps) + ")");
        if (!opcional(st.segundos) && !(esNum(st.segundos) && st.segundos >= 0)) return mal(qs + ": segundos no válidos");
        if (!opcional(st.tipo) && !TIPOS_SERIE.includes(st.tipo)) return mal(qs + ": tipo de serie desconocido (" + JSON.stringify(st.tipo) + ")");
        if (!opcional(st.hecha) && typeof st.hecha !== "boolean") return mal(qs + ": «hecha» no es sí/no");
        if (!opcional(st.rpe) && !rpeValido(st.rpe)) return mal(qs + ": RPE fuera de rango (5 a 10, de 0,5 en 0,5)");
        return false;
      });
    });
  });

  const gims = o.ajustes && o.ajustes.gimnasios;
  if (gims !== undefined && gims !== null) {
    if (!Array.isArray(gims)) mal("los gimnasios no tienen el formato esperado");
    else gims.some((g, i) => (!g || !esTexto(g.id) || !esTexto(g.nombre) || !esNum(g.barra) || !Array.isArray(g.discos) || !g.discos.every((d) => esNum(d) && d > 0)) && mal("gimnasio " + (i + 1) + ": incompleto"));
  }
  const idsCat = new Set();
  o.catalogo.some((c, i) => {
    if (!c || !esTexto(c.id) || !esTexto(c.nombre)) return mal("ejercicio " + (i + 1) + " del catálogo: sin identificador o sin nombre");
    if (idsCat.has(c.id)) return mal("ejercicio «" + c.nombre + "» repetido en el catálogo");
    idsCat.add(c.id);
    if (!opcional(c.modoCarga) && !["total", "lastre", "asistido"].includes(c.modoCarga)) return mal("ejercicio «" + c.nombre + "»: modo de carga no válido");
    if (!opcional(c.musculos) && !(c.musculos && Array.isArray(c.musculos.p) && Array.isArray(c.musculos.s) && [...c.musculos.p, ...c.musculos.s].every(esTexto))) return mal("ejercicio «" + c.nombre + "»: músculos no válidos");
    if (!opcional(c.notaFija) && typeof c.notaFija !== "string") return mal("ejercicio «" + c.nombre + "»: la nota fija no es texto");
    return false;
  });
  const idsRut = new Set();
  o.rutinas.some((r, i) => {
    if (!r || !esTexto(r.id) || !esTexto(r.nombre) || !Array.isArray(r.ejercicios)) return mal("rutina " + (i + 1) + ": incompleta");
    if (idsRut.has(r.id)) return mal("rutina «" + r.nombre + "» repetida");
    idsRut.add(r.id);
    return r.ejercicios.some((e) => {
      if (!e || !esTexto(e.ejercicioId)) return mal("rutina «" + r.nombre + "»: un ejercicio sin identificador");
      if (!opcional(e.series) && !(Number.isInteger(e.series) && e.series >= 0 && e.series <= 50)) return mal("rutina «" + r.nombre + "»: número de series no válido");
      if (!opcional(e.rpe) && !rpeValido(e.rpe)) return mal("rutina «" + r.nombre + "»: RPE objetivo fuera de rango");
      return false;
    });
  });
  o.pesajes.some((x, i) => {
    if (!x || !fechaISO(x.fecha)) return mal("pesaje " + (i + 1) + ": fecha imposible o ausente");
    if (!(esNum(x.kg) && x.kg > 0 && x.kg < 700)) return mal("pesaje del " + x.fecha + ": peso no válido");
    return false;
  });
  (o.medidas || []).some((x, i) => {
    if (!x || !fechaISO(x.fecha)) return mal("medida " + (i + 1) + ": fecha imposible o ausente");
    for (const k of MEDIDAS) if (!opcional(x[k]) && !(esNum(x[k]) && x[k] > 0 && x[k] < 400)) return mal("medida del " + x.fecha + ": «" + k + "» no válida");
    return false;
  });
  const idsMo = new Set();
  (o.molestias || []).some((x, i) => {
    const f = validarMolestia(x, null);
    if (f.length) return mal("molestia " + (i + 1) + ": " + f[0].toLowerCase());
    if (typeof x.id !== "string" || !x.id || idsMo.has(x.id)) return mal("molestia " + (i + 1) + ": identificador ausente o repetido");
    idsMo.add(x.id);
    return false;
  });
  const mesos = o.ajustes && o.ajustes.mesociclos;
  if (mesos !== undefined && mesos !== null && !(Array.isArray(mesos) && mesos.every((m) => m && esTexto(m.id) && esTexto(m.nombre) && fechaISO(m.inicio) && Number.isInteger(m.semanas)))) mal("los mesociclos no tienen el formato esperado");
  return p.slice(0, MAX_PROBLEMAS);
}

/** Texto para el usuario con los problemas de una copia. */
export const textoProblemas = (p) => "La copia está dañada y no se ha tocado ningún dato: " + p.join("; ") + ".";

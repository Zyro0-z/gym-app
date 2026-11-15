// Semáforo de progreso por ejercicio y flecha de tendencia.
import { numDia } from "./fechas.js";
import { pocoFiable } from "./sesiones.js";
import { MIN_SESIONES_VEREDICTO, VENTANA_SESIONES, DIAS_ESTANCADO, DIAS_INACTIVO, UMBRAL_RETROCESO,
  FLECHA_PLANA_PCT, FLECHA_FUERTE_PCT, CHISPA_REGISTROS } from "./constantes.js";

/** Estados del semáforo, de más a menos urgente. */
export const ESTADOS = {
  retrocede: { orden: 0, texto: "Retrocede", tono: "bad" },
  estancado: { orden: 1, texto: "Estancado", tono: "warn" },
  sinPR: { orden: 2, texto: "Sin récord reciente", tono: "neutro" },
  deload: { orden: 2.4, texto: "En descarga", tono: "neutro" },
  foco: { orden: 2.6, texto: "Fuera de foco", tono: "neutro" },
  progresa: { orden: 3, texto: "Progresa", tono: "ok" },
  inactivo: { orden: 4, texto: "Inactivo", tono: "neutro" },
  sinDatos: { orden: 5, texto: "Sin datos suficientes", tono: "neutro" },
  sinPeso: { orden: 6, texto: "Sin peso", tono: "neutro" },
};

/**
 * Pendiente por mínimos cuadrados de los 3 últimos 1RM de sesión (x = 0, 1, 2), en % del
 * 1RM medio por registro. Es una pista visual, no una estadística.
 */
export function tendencia(hist) {
  if (!hist || hist.length < 3) return null;
  const y = hist.slice(-3).map((h) => h.mejorRM);
  const n = y.length, mx = (n - 1) / 2;
  const my = y.reduce((a, v) => a + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (y[i] - my); den += (i - mx) * (i - mx); }
  if (!(my > 0) || !(den > 0)) return null;
  const pct = (num / den / my) * 100;
  const a = Math.abs(pct);
  const flecha = a < FLECHA_PLANA_PCT ? "→" : a < FLECHA_FUERTE_PCT ? (pct > 0 ? "↗" : "↘") : pct > 0 ? "↑" : "↓";
  const dir = a < FLECHA_PLANA_PCT ? "plana" : (pct > 0 ? "sube" : "baja") + (a < FLECHA_FUERTE_PCT ? "Leve" : "");
  return { flecha, dir, pct };
}

/** Últimos CHISPA_REGISTROS 1RM de sesión (con null a la izquierda si faltan). */
export function ultimosRM(e) {
  const v = e.hist.slice(-CHISPA_REGISTROS).map((h) => h.mejorRM);
  while (v.length < CHISPA_REGISTROS) v.unshift(null);
  return v;
}

/**
 * Diagnóstico de un ejercicio. Las sesiones hechas mientras un bloque protegía a su grupo
 * no se comparan ni cuentan como días sin récord; y si hoy está protegido, retrocede y
 * estancado se sustituyen por un estado neutro.
 */
export function diagnosticar(C, e) {
  const hoy = C.hoy;
  if (!e.hist.length) return { e, estado: "sinPeso", nSes: 0, diasSinPR: null, tend: null };
  const h = e.hist.filter((x) => !C.bloqueProtector(e.grupo, x.dia));
  const excluidas = e.hist.length - h.length;
  if (!h.length) return { e, estado: "sinDatos", nSes: 0, diasSinPR: null, excluidas, todasProtegidas: true, tend: null };
  const nSes = h.length;
  const diasInactivo = numDia(hoy) - numDia(e.hist[e.hist.length - 1].dia);
  const mejorGlobal = Math.max.apply(null, h.map((x) => x.mejorRM));
  const primeroMax = h.filter((x) => x.mejorRM >= mejorGlobal - 1e-9)[0];
  const diasSinPR = numDia(hoy) - numDia(primeroMax.dia) - C.diasProtegidos(e.grupo, primeroMax.dia, hoy);
  const r = { e, nSes, diasSinPR, excluidas, diasInactivo };
  if (nSes < MIN_SESIONES_VEREDICTO) r.estado = "sinDatos";
  else {
    const rec = h.slice(-VENTANA_SESIONES), ant = h.slice(0, -VENTANA_SESIONES);
    const rmRec = Math.max.apply(null, rec.map((x) => x.mejorRM));
    const rmAnt = ant.length ? Math.max.apply(null, ant.map((x) => x.mejorRM)) : 0;
    r.rmRec = rmRec; r.rmAnt = rmAnt;
    r.flojo = rec.concat(ant).filter((x) => (x.mejorRM === rmRec || x.mejorRM === rmAnt) && pocoFiable(x.mejorRMReps)).length > 0;
    if (diasInactivo > DIAS_INACTIVO) r.estado = "inactivo";
    else if (rmRec > rmAnt) r.estado = "progresa";
    else if (rmRec < rmAnt * UMBRAL_RETROCESO) r.estado = "retrocede";
    else if (diasSinPR >= DIAS_ESTANCADO) r.estado = "estancado";
    else r.estado = "sinPR";
  }
  const hoyProt = C.bloqueProtector(e.grupo, hoy);
  if (hoyProt && (r.estado === "retrocede" || r.estado === "estancado")) {
    r.seria = r.estado;
    r.bloque = hoyProt;
    r.estado = hoyProt.esDeload ? "deload" : "foco";
  }
  r.tend = r.estado === "inactivo" ? null : tendencia(h);
  return r;
}

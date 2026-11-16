// Propuesta de descarga (deload). Regla configurable en Ajustes (ajustes.descarga) y documentada
// en docs/ARQUITECTURA.md. Solo PROPONE: la descarga la programa el usuario.
//
// Se propone cuando se cumplen las dos cosas:
//   1. han pasado al menos `semanasMin` semanas desde la última descarga (o desde la primera sesión);
//   2. aparece al menos una señal, comparando las 2 últimas semanas completas con las 2 anteriores
//      (los días de descarga no cuentan en ninguna de las dos):
//        · el mejor e1RM baja ≥ `caidaPct` % en ≥ `ejercicios` ejercicios;
//        · el RPE medio sube ≥ `rpeSube` puntos (hacen falta RPE en las dos);
//        · el sueño medio de las 2 últimas semanas es < `sueno` horas (hacen falta ≥ 2 registros).
// No se propone si está pospuesta (`pospuestaHasta` > hoy) o se descartó hace menos de 14 días.
import { lunesDe, masDias, numDia } from "./fechas.js";
import { enDescarga } from "./fatiga.js";
import { esRpe } from "./rpe.js";

const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
const fmt1 = (x) => String(Math.round(x * 10) / 10).replace(".", ",");

export function propuestaDescarga(A, reglas, hoy = A.hoy) {
  const R = Object.assign({ caidaPct: 3, ejercicios: 2, rpeSube: 1, sueno: 7, semanasMin: 6 }, reglas || {});
  const no = (motivo) => ({ proponer: false, motivo, motivos: [] });
  if (!A.sesiones.length) return no("sin sesiones");
  if (R.pospuestaHasta && R.pospuestaHasta > hoy) return no("pospuesta");
  if (R.descartadaEn && numDia(hoy) - numDia(R.descartadaEn) < 14) return no("descartada");
  const descargas = (A.C.bloques || []).filter((b) => b.esDeload && b.inicio <= hoy).map((b) => b.fin).sort();
  const desde = descargas.length ? descargas[descargas.length - 1] : A.sesiones.map((s) => s.dia).sort()[0];
  const semanas = Math.floor((numDia(hoy) - numDia(desde)) / 7);
  if (semanas < R.semanasMin) return Object.assign(no("pronto"), { semanas });
  if (descargas.length && descargas[descargas.length - 1] >= hoy) return no("en descarga");

  const lunes = lunesDe(hoy);
  const recientes = [masDias(lunes, -14), masDias(lunes, -1)], previas = [masDias(lunes, -28), masDias(lunes, -15)];
  const dentro = (d, [a, b]) => d >= a && d <= b && !enDescarga(A.C, d);
  const motivos = [];
  // e1RM
  let caen = 0, comparados = 0;
  for (const e of A.ejercicios) {
    let r = 0, p = 0;
    for (const h of e.hist) { if (dentro(h.dia, recientes)) r = Math.max(r, h.mejorRM); else if (dentro(h.dia, previas)) p = Math.max(p, h.mejorRM); }
    if (r > 0 && p > 0) { comparados++; if ((1 - r / p) * 100 >= R.caidaPct) caen++; }
  }
  if (caen >= R.ejercicios) motivos.push("El e1RM ha bajado un " + fmt1(R.caidaPct) + " % o más en " + caen + " de " + comparados + " ejercicios.");
  // RPE y sueño (sesiones guardadas)
  const rpe = { r: [], p: [] }, sueno = [];
  for (const s of A.sesiones) {
    const ref = s.ref; if (!ref) continue;
    const enR = dentro(s.dia, recientes), enP = dentro(s.dia, previas);
    if (!enR && !enP) continue;
    for (const e of ref.ejercicios || []) for (const st of e.series || []) if (esRpe(st.rpe) && st.tipo !== "calentamiento") (enR ? rpe.r : rpe.p).push(st.rpe);
    if (enR && ref.recuperacion && typeof ref.recuperacion.sueno === "number") sueno.push(ref.recuperacion.sueno);
  }
  const rr = media(rpe.r), rp = media(rpe.p);
  if (rr != null && rp != null && rr - rp >= R.rpeSube) motivos.push("El RPE medio ha subido de " + fmt1(rp) + " a " + fmt1(rr) + ".");
  const sm = sueno.length >= 2 ? media(sueno) : null;
  if (sm != null && sm < R.sueno) motivos.push("Has dormido " + fmt1(sm) + " h de media, menos de " + fmt1(R.sueno) + " h.");
  return { proponer: motivos.length > 0, motivo: motivos.length ? "señales" : "sin señales", motivos, semanas, inicio: lunes === hoy ? hoy : masDias(lunes, 7) };     // el lunes: hoy mismo; si no, el lunes que viene
}

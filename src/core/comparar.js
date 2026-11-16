// Comparar dos periodos del mismo largo (función NUEVA sobre el análisis; no cambia ningún número).
// Si el periodo actual está en curso, el anterior se recorta a los mismos días, para que la
// comparación sea justa (no se compara medio mes con un mes entero).
import { masDias, numDia, menosMeses } from "./fechas.js";

export const PERIODOS = [
  { id: "4s", texto: "4 semanas" },
  { id: "mes", texto: "Mes" },
  { id: "3m", texto: "3 meses" },
];

/** Rangos { actual: [desde, hasta], anterior: [desde, hasta], dias } para un periodo terminado hoy. */
export function rangos(id, hoy) {
  if (id === "mes") {
    const desde = hoy.slice(0, 8) + "01", dias = numDia(hoy) - numDia(desde) + 1;
    const ant = menosMeses(desde, 1);
    return { actual: [desde, hoy], anterior: [ant, masDias(ant, dias - 1) < desde ? masDias(ant, dias - 1) : masDias(desde, -1)], dias };
  }
  const dias = id === "3m" ? numDia(hoy) - numDia(menosMeses(hoy, 3)) : 28;
  const desde = masDias(hoy, -(dias - 1));
  return { actual: [desde, hoy], anterior: [masDias(desde, -dias), masDias(desde, -1)], dias };
}

function resumen(A, [a, b]) {
  const dentro = (d) => d >= a && d <= b;
  const ses = A.sesiones.filter((s) => dentro(s.dia));
  let series = 0, volumen = 0;
  const grupos = new Map(), mejores = new Map();
  for (const x of A.series) {
    if (!dentro(x.dia)) continue;
    if (x.st.paraSeries) { series++; volumen += x.st.volumen || 0; const g = A.C.nombreGrupo(x.grupo); grupos.set(g, (grupos.get(g) || 0) + 1); }
    if (x.st.paraPR && x.st.oneRM > 0) { const m = mejores.get(x.k); if (!m || x.st.oneRM > m.rm) mejores.set(x.k, { rm: x.st.oneRM, nombre: x.ejercicio }); }
  }
  const dur = ses.map((s) => s.ref && s.ref.duracion).filter((v) => typeof v === "number" && v > 0);
  return { desde: a, hasta: b, sesiones: ses.length, series, volumen, duracion: dur.length ? dur.reduce((x, y) => x + y, 0) / dur.length : null, grupos, mejores };
}

/** Diferencia en %, o null si no hay base (no se inventa un «+100 %» desde cero). */
export const pct = (actual, anterior) => (anterior > 0 && actual != null ? (actual / anterior - 1) * 100 : null);

export function compararPeriodos(A, id, hoy = A.hoy) {
  const r = rangos(id, hoy);
  const act = resumen(A, r.actual), ant = resumen(A, r.anterior);
  const ejercicios = [];
  for (const [k, m] of act.mejores) { const p = ant.mejores.get(k); if (p) ejercicios.push({ k, nombre: m.nombre, actual: m.rm, anterior: p.rm, pct: pct(m.rm, p.rm) }); }
  ejercicios.sort((x, y) => y.pct - x.pct);
  const nombres = new Set([...act.grupos.keys(), ...ant.grupos.keys()]);
  const grupos = [...nombres].map((g) => ({ grupo: g, actual: act.grupos.get(g) || 0, anterior: ant.grupos.get(g) || 0 })).sort((x, y) => y.actual - x.actual);
  return { id, dias: r.dias, actual: act, anterior: ant, ejercicios, grupos, enCurso: id === "mes" };
}

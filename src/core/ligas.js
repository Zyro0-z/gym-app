// Ligas: el mejor 1RM estimado de las últimas semanas, comparado con estándares de fuerza
// a tu peso corporal de ese día, convertido a una «puntuación» (percentil hasta Elite y,
// por encima, puntos por cada ×0,10 de la carga Elite) y de ahí a liga y división.
import { canon } from "./nombres.js";
import { numDia, menosMeses, finDeMes } from "./fechas.js";
import { fmt } from "./formato.js";
import { LIGA_REPS_MAX, MESES } from "./constantes.js";

const PCT = [5, 20, 50, 80, 95]; // Beginner … Elite

export function calcularLigas(C, SESIONES, TODAS) {
  const pesoOk = C.peso.registros.length > 0;
  const ok = C.ligas.ok && C.estandares.size > 0 && pesoOk;
  const out = { ok, ejercicios: new Map(), grupos: new Map(), general: null, cambios: [], fueraDeTabla: [] };
  if (!ok) return out;
  const L = C.ligas.lista, cfg = C.ligas;

  const nivelesEn = (tabla, pc) => {
    const f = tabla.filas;
    if (pc <= f[0].pc) return f[0].niveles;
    if (pc >= f[f.length - 1].pc) return f[f.length - 1].niveles;
    for (let i = 1; i < f.length; i++)
      if (pc <= f[i].pc) {
        const u = (pc - f[i - 1].pc) / (f[i].pc - f[i - 1].pc);
        return f[i].niveles.map((v, j) => f[i - 1].niveles[j] + (v - f[i - 1].niveles[j]) * u);
      }
    return f[f.length - 1].niveles;
  };
  const puntuacion = (carga, niv) => {
    if (carga >= niv[4]) return 95 + ((carga / niv[4] - 1) / 0.1) * cfg.puntos;
    let x0 = 0, y0 = 0;
    for (let i = 0; i < 5; i++) {
      if (carga <= niv[i]) return y0 + ((PCT[i] - y0) * (carga - x0)) / (niv[i] - x0);
      x0 = niv[i]; y0 = PCT[i];
    }
    return 95;
  };
  const F = funcionesLiga(C);
  const nivelDe = F.nivelDe;
  Object.assign(out, F);
  const ndHoy = numDia(C.hoy);

  const deloadEn = (dia, grupo) => C.bloquesActivos(dia).some((b) => b.esDeload && C.protege(b, canon(grupo)));
  const cand = new Map();
  for (const [k, m] of C.estandares) {
    const obj = C.objetivos.get(k);
    const nombre = m.nombre, grupo = C.grupoDe(k);
    const e = { k, m, obj, nombre, grupo, series: [], motivo: null, codigo: null, tabla: m.sinEstandar ? null : C.tablas.get(canon(m.slug)) || null };
    if (m.sinEstandar) { e.codigo = "sinEstandar"; e.motivo = "sin estándar razonable"; }
    else if (!e.tabla) { e.codigo = "sinTabla"; e.motivo = "falta la tabla «" + m.slug + "» en los estándares"; }
    else if (!obj) { e.codigo = "sinRango"; e.motivo = "sin rango de repeticiones: la liga sólo cuenta series dentro de tu rango"; }
    else
      for (const s of SESIONES) {
        if (!s.dia) continue;
        for (const ex of s.ejercicios) {
          if (ex.k !== k) continue;
          for (const st of ex.sets) {
            if (!st.paraPR || st.reps < obj.min || (st.reps > obj.max && st.reps > LIGA_REPS_MAX)) continue;
            e.series.push({ st, s, nd: numDia(s.dia), pc: C.pesoEn(s.dia), deload: deloadEn(s.dia, grupo) });
          }
        }
      }
    cand.set(k, e);
  }
  const crudo = (e, nd) => {
    let mejor = null, sinPeso = 0;
    for (const c of e.series) {
      if (c.nd > nd || c.nd <= nd - cfg.semCarga * 7 || c.deload) continue;
      if (!c.pc) { sinPeso++; continue; }
      if (!mejor || c.st.oneRM > mejor.st.oneRM) mejor = c;
    }
    if (!mejor) return { sc: null, sinPeso };
    const niv = nivelesEn(e.tabla, mejor.pc.kg), carga = mejor.st.oneRM * e.m.factor;
    return { sc: puntuacion(carga, niv), mejor, niv, carga };
  };
  // Días (número absoluto) de cada serie por ejercicio, para contar sin recorrer TODAS cada vez
  const diasPorEj = new Map();
  for (const x of TODAS) { if (!x.dia) continue; let v = diasPorEj.get(x.k); if (!v) diasPorEj.set(x.k, (v = [])); v.push(numDia(x.dia)); }
  const seriesEn = (k, nd) => { let n = 0; for (const d of diasPorEj.get(k) || []) if (d <= nd && d > nd - cfg.semSeries * 7) n++; return n; };
  const conMargen = (puntos) => {
    let actual = null;
    return puntos.map((p) => {
      if (p.sc == null) actual = null;
      else {
        const raw = nivelDe(p.sc);
        if (!actual || raw.ord >= actual.ord || p.sc < actual.desde - cfg.margen) actual = raw;
      }
      return Object.assign({}, p, { nivel: actual });
    });
  };
  // Una comprobación por semana, el mismo día de la semana que hoy, desde MESES atrás
  const primera = SESIONES.filter((s) => s.dia).map((s) => numDia(s.dia)).reduce((a, b) => Math.min(a, b), ndHoy);
  const desde = Math.max(primera, numDia(menosMeses(C.hoy, MESES)) - 7);
  const cortes = [];
  for (let nd = ndHoy; nd >= desde - 7; nd -= 7) cortes.unshift(nd);
  out.cortes = cortes;

  const porCorte = cortes.map(() => new Map());
  for (const e of cand.values()) {
    const linea = cortes.map((nd, i) => {
      const r = e.motivo ? { sc: null } : crudo(e, nd);
      if (r.sc != null && !e.m.aprox) {
        const peso = seriesEn(e.k, nd);
        if (peso > 0) {
          const g = porCorte[i].get(canon(e.grupo)) || { grupo: e.grupo, v: [] };
          g.v.push({ sc: r.sc, peso });
          porCorte[i].set(canon(e.grupo), g);
        }
      }
      return Object.assign({ nd }, r);
    });
    e.linea = conMargen(linea);
    e.hoy = e.linea[e.linea.length - 1];
    if (!e.motivo && e.hoy.sc == null) {
      e.codigo = e.hoy.sinPeso ? "antesDelPeso" : "sinSeries";
      e.motivo = e.hoy.sinPeso ? "sus series en rango son de antes de tu primer peso corporal"
        : "sin series de " + e.obj.min + " reps o más (y como mucho " + Math.max(e.obj.max, LIGA_REPS_MAX) + ") en las últimas " + cfg.semCarga + " semanas";
    }
    if (e.hoy.mejor && (e.hoy.mejor.pc.kg < e.tabla.filas[0].pc || e.hoy.mejor.pc.kg > e.tabla.filas[e.tabla.filas.length - 1].pc)) out.fueraDeTabla.push(e.nombre);
    e.series4 = seriesEn(e.k, ndHoy);
    out.ejercicios.set(e.k, e);
  }
  const gruposVistos = new Map();
  porCorte.forEach((m) => { for (const [k, g] of m) gruposVistos.set(k, g.grupo); });
  const media = (v) => v.reduce((a, x) => a + x.sc * x.peso, 0) / v.reduce((a, x) => a + x.peso, 0);
  for (const [k, grupo] of gruposVistos) {
    const linea = conMargen(cortes.map((nd, i) => { const g = porCorte[i].get(k); return { nd, sc: g ? media(g.v) : null, n: g ? g.v.length : 0 }; }));
    out.grupos.set(k, { k, grupo, linea, hoy: linea[linea.length - 1] });
  }
  const lineaGen = conMargen(cortes.map((nd, i) => {
    const v = Array.from(porCorte[i].values()).map((g) => media(g.v));
    return { nd, sc: v.length ? v.reduce((a, x) => a + x, 0) / v.length : null, n: v.length };
  }));
  out.general = { linea: lineaGen, hoy: lineaGen[lineaGen.length - 1] };

  const cambio = (tipo, nombre, linea, k) => {
    if (linea.length < 2) return;
    const a = linea[linea.length - 2].nivel, b = linea[linea.length - 1].nivel;
    if (!a || !b || a.ord === b.ord) return;
    out.cambios.push({ tipo, k, sube: b.ord > a.ord, nombre, nivel: b });
  };
  cambio("general", "Liga general", lineaGen, "");
  for (const g of out.grupos.values()) cambio("grupo", g.grupo, g.linea, g.k);
  for (const e of out.ejercicios.values()) cambio("ejercicio", e.nombre, e.linea, e.k);

  return out;
}

/**
 * Consultas de la liga que solo dependen de la configuración (no de las sesiones). Van aparte para
 * poder reconstruirlas en el hilo principal cuando el análisis llega del Worker (ver rehidratar.js).
 */
export function funcionesLiga(C) {
  const L = C.ligas.lista, cfg = C.ligas, ndHoy = numDia(C.hoy);
  const cargaDe = (sc, niv) => {
    if (sc >= 95) return niv[4] * (1 + ((sc - 95) / cfg.puntos) * 0.1);
    let x0 = 0, y0 = 0;
    for (let i = 0; i < 5; i++) {
      if (sc <= PCT[i]) return x0 + ((niv[i] - x0) * (sc - y0)) / (PCT[i] - y0);
      x0 = niv[i]; y0 = PCT[i];
    }
    return niv[4];
  };
  const nivelDe = (sc) => {
    let i = 0;
    while (i < L.length - 1 && sc >= L[i].hasta) i++;
    const l = L[i], w = (l.hasta - l.desde) / l.ndiv;
    const d = l.ndiv === 1 ? 0 : Math.max(0, Math.min(l.ndiv - 1, Math.floor((sc - l.desde) / w)));
    const div = l.ndiv === 3 ? ["III", "II", "I"][d] : "";
    return { i, d, ord: i * 3 + d, liga: l.nombre, div, txt: l.nombre + (div ? " " + div : ""),
             desde: l.desde + d * w, hasta: l.ndiv === 1 ? l.hasta : l.desde + (d + 1) * w, insignia: Math.min(i + 1, 15),
             chevrones: l.ndiv === 3 ? d + 1 : 0 };
  };
  const pct = (sc) => (sc <= 95 ? "≈ p" + Math.round(sc) : "Elite ×" + fmt(1 + ((sc - 95) / cfg.puntos) * 0.1, 2));

  const progreso = (p) => {
    const n = p.nivel;
    if (!n || n.hasta === Infinity) return { frac: 1, siguiente: null };
    return { frac: Math.max(0, Math.min(1, (p.sc - n.desde) / (n.hasta - n.desde))), siguiente: nivelDe(n.hasta + 1e-9), retenido: p.sc < n.desde };
  };
  const falta = (e) => {
    const p = e.hoy, pr = progreso(p);
    if (!pr.siguiente || !p.mejor) return null;
    const rmObj = cargaDe(Math.max(p.nivel.hasta, p.sc), p.niv) / e.m.factor;
    const reps = p.mejor.st.reps;
    return { siguiente: pr.siguiente, kg: rmObj - p.mejor.st.oneRM, reps, mas: rmObj / (reps === 1 ? 1 : 1 + reps / 30) - p.mejor.st.peso };
  };
  const faltaTxt = (e) => {
    const fa = falta(e);
    if (!fa) return "máximo";
    const u = e.hoy.mejor.st.unilateral ? "/lado" : "";
    return "te faltan " + (fa.kg < 0.05 ? "menos de 0,1" : fmt(fa.kg, 1)) + " kg de 1RM" + (u ? " por lado" : "") + " para " + fa.siguiente.txt +
      " (≈ +" + (fa.mas < 0.05 ? "0,1" : fmt(fa.mas, 1)) + " kg × " + fa.reps + " reps" + u + ")";
  };
  const faltaGrupoTxt = (p) => {
    const pr = progreso(p);
    if (!pr.siguiente) return "máximo";
    const n = p.nivel.hasta - p.sc;
    return "te faltan " + (n < 0.05 ? "menos de 0,1" : fmt(n, 1)) + " puntos de percentil para " + pr.siguiente.txt;
  };
  // Nivel a final de cada mes: la última comprobación semanal de ese mes
  const mensual = (linea, meses) => meses.map((m) => {
    const fin = Math.min(numDia(finDeMes(m)), ndHoy);
    let r = null;
    for (const p of linea) if (p.nd <= fin) r = p;
    return r && r.nivel ? r : null;
  });
  return { nivelDe, pct, progreso, falta, faltaTxt, faltaGrupoTxt, mensual };
}

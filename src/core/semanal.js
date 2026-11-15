// Semana a semana: volumen y series, racha, «hoy toca», series frente al objetivo semanal,
// reparto por grupo y balance por periodo.
import { canon } from "./nombres.js";
import { claveSemana, lunesDe, masDias, diaSemana, numDia, ddmm } from "./fechas.js";
import { fmt } from "./formato.js";
import { SEMANAS, GRUPOS_ESPERADOS, DIAS_SEMANA } from "./constantes.js";
import { esDescanso } from "./contexto.js";

export const sumVol = (ss) => ss.reduce((a, s) => a + s.volumen, 0);
export const sumSer = (ss) => ss.reduce((a, s) => a + s.series, 0);
export const deSemana = (SESIONES, ref) => { const k = claveSemana(ref); return SESIONES.filter((s) => s.dia && claveSemana(s.dia) === k); };

/** Las últimas SEMANAS semanas ISO (la última es la actual). */
export function ultimasSemanas(C, SESIONES, n = SEMANAS) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const ref = masDias(C.hoy, -7 * i);
    const ss = deSemana(SESIONES, ref);
    out.push({ clave: claveSemana(ref), etiqueta: ddmm(lunesDe(ref)), vol: sumVol(ss), ser: sumSer(ss), n: ss.length });
  }
  return out;
}

export function resumenSemana(C, SESIONES) {
  const act = deSemana(SESIONES, C.hoy), prev = deSemana(SESIONES, masDias(C.hoy, -7));
  const fiables = SESIONES.filter((s) => s.dur.fiable);
  const va = sumVol(act), vp = sumVol(prev);
  return {
    act: { vol: va, ser: sumSer(act), n: act.length }, prev: { vol: vp, ser: sumSer(prev), n: prev.length },
    deltaPct: vp > 0 ? ((va - vp) / vp) * 100 : null, primeraSemana: !(vp > 0) && va > 0,
    mediaDur: fiables.length ? fiables.reduce((a, s) => a + s.dur.min, 0) / fiables.length : null,
    fiables: fiables.length, total: SESIONES.length,
  };
}

/** Racha en semanas ISO: una semana sin ninguna sesión la corta. */
export function racha(C, SESIONES) {
  const conSesion = new Set();
  for (const s of SESIONES) if (s.dia) conSesion.add(claveSemana(s.dia));
  let n = 0, viva = false, semanasSinEntrenar = null;
  const ultima = SESIONES.filter((s) => s.dia)[0];
  if (ultima) {
    let cursor = lunesDe(ultima.dia);
    while (conSesion.has(cursor)) { n += 1; cursor = masDias(cursor, -7); }
    semanasSinEntrenar = Math.round((numDia(lunesDe(C.hoy)) - numDia(lunesDe(ultima.dia))) / 7);
    viva = semanasSinEntrenar <= 1;
  }
  const estado = !n ? "" : semanasSinEntrenar === 0 ? "viva" : semanasSinEntrenar === 1 ? "viva · falta esta semana" : "cortada hace " + semanasSinEntrenar + " semanas";
  const texto = !n ? "—" : n + (n === 1 ? " semana seguida · " : " semanas seguidas · ") + estado;
  return { racha: n, viva, semanasSinEntrenar, estado, texto };
}

/** «Hoy toca»: rutina del horario y su estado (descanso, pendiente, hecho, otra). */
export function hoyToca(C, SESIONES, progresionDe) {
  const diaHoy = diaSemana(C.hoy);
  const esperado = C.horario.get(diaHoy);
  if (!esperado) return null;
  const logsHoy = SESIONES.filter((s) => s.dia === C.hoy);
  const descanso = esDescanso(esperado);
  const coincide = logsHoy.filter((s) => canon(s.plantilla) === canon(esperado));
  const estado = descanso ? "descanso" : !logsHoy.length ? "pendiente" : coincide.length ? "hecho" : "otra";
  const pl = C.plantillas.get(canon(esperado));
  const porG = new Map();
  if (pl) for (const e of pl.ejercicios) porG.set(C.grupoDe(e.k), (porG.get(C.grupoDe(e.k)) || 0) + e.target);
  const gHoy = Array.from(porG.entries()).sort((a, b) => b[1] - a[1])[0];
  const plSub = estado === "pendiente" || estado === "hecho" ? pl : null;
  const subidas = plSub ? plSub.ejercicios.map((e) => progresionDe(e.k)).filter((p) => p && p.clave === "sube") : [];
  return {
    dia: diaHoy, nombreDia: DIAS_SEMANA[diaHoy], esperado, descanso, estado, rutina: pl || null, grupo: gHoy ? gHoy[0] : null,
    objetivo: !descanso && pl ? pl.ejercicios.reduce((a, e) => a + e.target, 0) : null,
    hechas: sumSer(coincide.length ? coincide : logsHoy), logsHoy, coincide, subidas,
  };
}

/** Series semanales por grupo frente al objetivo, con las previstas hasta el domingo. */
export function seriesObjetivo(C, SESIONES, TODAS) {
  if (!C.volumenObj.length) return null;
  const seriesSemana = (ref) => {
    const k = claveSemana(ref), m = new Map();
    for (const x of TODAS) {
      if (!x.dia || claveSemana(x.dia) !== k) continue;
      const g = m.get(canon(x.grupo)) || { grupo: x.grupo, n: 0 };
      g.n += 1;
      m.set(canon(x.grupo), g);
    }
    return m;
  };
  const deloadEn = (ref, grupo) => {
    const lunes = lunesDe(ref);
    for (let i = 0; i < 7; i++) for (const b of C.bloquesActivos(masDias(lunes, i))) if (b.esDeload && C.protege(b, canon(grupo))) return b;
    return null;
  };
  const refAnt = masDias(C.hoy, -7);
  const sAct = seriesSemana(C.hoy), sAnt = seriesSemana(refAnt);
  const nDe = (m, g) => (m.get(canon(g)) || { n: 0 }).n;
  const prevista = new Map(), diasPrevistos = [], sinPlantilla = [];
  if (C.horario.size) {
    const hayLogHoy = SESIONES.some((s) => s.dia === C.hoy);
    const wd = diaSemana(C.hoy);
    for (let i = 0; i <= 7 - wd; i++) {
      const dia = masDias(C.hoy, i);
      if (i === 0 && hayLogHoy) continue;
      const rutina = C.horario.get(diaSemana(dia));
      if (!rutina || esDescanso(rutina)) continue;
      const pl = C.plantillas.get(canon(rutina));
      if (!pl) { sinPlantilla.push(rutina); continue; }
      let enDeload = false;
      for (const e of pl.ejercicios) {
        const g = canon(C.grupoDe(e.k));
        const deload = C.bloquesActivos(dia).some((b) => b.esDeload && C.protege(b, g));
        if (deload) enDeload = true;
        prevista.set(g, (prevista.get(g) || 0) + (deload ? Math.ceil(e.target / 2) : e.target));
      }
      diasPrevistos.push({ dia, wd: diaSemana(dia), rutina: pl.nombre, hoy: i === 0, deload: enDeload });
    }
  }
  const prevDe = (g) => prevista.get(canon(g)) || 0;
  // Semana cerrada: sólo hechas. Semana en curso: hechas + previstas al cierre.
  const estadoAnt = (n, o) => (n < o.min ? (deloadEn(refAnt, o.grupo) ? { estado: "deload" } : { estado: "debajo", faltan: o.min - n })
    : n > o.max ? { estado: "encima" } : { estado: "enRango" });
  const estadoCierre = (hechas, prev, o) => {
    const total = hechas + prev;
    if (total < o.min) return deloadEn(C.hoy, o.grupo) ? { estado: "deload" } : { estado: "noLlega", faltan: o.min - total };
    if (total > o.max) return { estado: "encima" };
    return { estado: prev ? "llegara" : "enRango" };
  };
  const lista = C.volumenObj.map((o) => {
    const hechas = nDe(sAct, o.grupo), previstas = prevDe(o.grupo), anterior = nDe(sAnt, o.grupo);
    return { grupo: o.grupo, min: o.min, max: o.max, hechas, previstas, anterior,
      cierre: estadoCierre(hechas, previstas, o), ant: estadoAnt(anterior, o), deloadHoy: !!deloadEn(C.hoy, o.grupo) };
  });
  const total = (o) => o.hechas + o.previstas;
  const conObj = new Set(C.volumenObj.map((o) => canon(o.grupo)));
  return {
    lista, semana: lunesDe(C.hoy), diasPrevistos, sinPlantilla,
    sinObjetivo: Array.from(sAct.entries()).filter(([k]) => !conObj.has(k)).map(([, g]) => ({ grupo: g.grupo, n: g.n })),
    noLlegan: lista.filter((o) => total(o) < o.min && !o.deloadHoy).length,
    encima: lista.filter((o) => total(o) > o.max).length,
    enDeload: lista.filter((o) => total(o) < o.min && o.deloadHoy).length,
  };
}

/** Series y volumen por grupo de la semana en curso, y grupos objetivo sin entrenar. */
export function grupoSemana(C, TODAS) {
  const kAct = claveSemana(C.hoy);
  const porGrupo = new Map();
  for (const x of TODAS.filter((x) => x.dia && claveSemana(x.dia) === kAct)) {
    const g = porGrupo.get(x.grupo) || { grupo: x.grupo, ser: 0, vol: 0 };
    g.ser += 1; g.vol += x.st.volumen;
    porGrupo.set(x.grupo, g);
  }
  const activosHoy = C.bloquesActivos(C.hoy);
  const conObjetivo = activosHoy.filter((b) => b.gruposTxt.length);
  let objetivo = GRUPOS_ESPERADOS;
  if (conObjetivo.length) {
    const v = new Set(); objetivo = [];
    for (const b of conObjetivo) for (const g of b.gruposTxt) if (!v.has(canon(g))) { v.add(canon(g)); objetivo.push(g); }
  }
  return { lista: Array.from(porGrupo.values()).sort((a, b) => b.ser - a.ser),
    ausentes: porGrupo.size ? objetivo.map(C.nombreGrupo).filter((g) => !porGrupo.has(g)) : null, bloquesHoy: activosHoy };
}

/** Volumen de cada grupo en cada una de las semanas dadas. */
export function volumenPorGrupo(TODAS, semanas) {
  const grupos = Array.from(new Set(TODAS.map((x) => x.grupo))).sort();
  return grupos.map((g) => ({ grupo: g, semanas: semanas.map((s) => TODAS.filter((x) => x.grupo === g && x.dia && claveSemana(x.dia) === s.clave).reduce((a, x) => a + x.st.volumen, 0)) }));
}

export const PERIODOS = {
  sem: { texto: "Esta semana", ok: (C, d) => claveSemana(d) === claveSemana(C.hoy) },
  "7d": { texto: "7 días", ok: (C, d) => d >= masDias(C.hoy, -6) },
  "30d": { texto: "30 días", ok: (C, d) => d >= masDias(C.hoy, -29) },
  all: { texto: "Todo", ok: () => true },
};

/** Series por grupo (clave canónica) en un periodo; los grupos conocidos empiezan en 0. */
export function balance(C, TODAS, periodo) {
  const P = PERIODOS[periodo] || PERIODOS.sem;
  const series = {};
  for (const g of C.conGrupo) series[canon(g.grupo)] = 0;
  let total = 0;
  for (const x of TODAS) {
    if (!x.dia || !P.ok(C, x.dia)) continue;
    const k = canon(x.grupo);
    series[k] = (series[k] || 0) + 1;
    total++;
  }
  return { series, total };
}

export { fmt };

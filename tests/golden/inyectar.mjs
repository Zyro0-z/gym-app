// Parches EN MEMORIA sobre el dashboard antiguo para volcar sus resultados intermedios.
// El fichero original no se toca: se lee, se insertan sentencias de volcado en puntos
// concretos y se sirve la copia parcheada sólo durante la generación del golden master.

const PUNTOS = [
  // al principio: el contenedor del volcado y un serializador sin ciclos
  {
    antes: null,
    codigo: `
window.__G = {};
const __dia = (d) => d && typeof d.toISODate === "function" ? d.toISODate() : d;
const __ser = (x, vistos) => {
  vistos = vistos || new WeakSet();
  if (x == null || typeof x === "number" || typeof x === "string" || typeof x === "boolean") return x === Infinity ? "Infinity" : x;
  if (typeof x === "function") return undefined;
  if (typeof x.toISODate === "function") return x.toISODate();
  if (vistos.has(x)) return "[ciclo]";
  vistos.add(x);
  let r;
  if (x instanceof Map) r = { __map: Array.from(x.entries()).map((e) => [__ser(e[0], vistos), __ser(e[1], vistos)]) };
  else if (x instanceof Set) r = { __set: Array.from(x.values()).map((v) => __ser(v, vistos)) };
  else if (Array.isArray(x)) r = x.map((v) => __ser(v, vistos));
  else { r = {}; for (const k of Object.keys(x)) { const v = __ser(x[k], vistos); if (v !== undefined) r[k] = v; } }
  vistos.delete(x);
  return r;
};
`,
  },
  // «Hoy toca»
  {
    tras: /^    const subidas = plSub \? .*$/m,
    codigo: `
window.__G.hoy = { esperado, estadoHoy, descanso, gHoy: gHoy ? gHoy[0] : null,
  objetivo: !descanso && pl ? pl.ejercicios.reduce((a, e) => a + e.target, 0) : null,
  hechas: sumSer(coincide.length ? coincide : logsHoy), logsHoy: logsHoy.map((s) => s.plantilla),
  subidas: subidas.map((p) => ({ k: p.k, pesoMax: p.pesoMax, inc: __ser(incrementoDe(p)) })) };
`,
  },
  // series semanales frente a objetivo
  {
    tras: /^  const enDeload = VOLUMEN_OBJ\.lista\.filter.*$/m,
    codigo: `
window.__G.seriesObjetivo = {
  lista: VOLUMEN_OBJ.lista.map((o) => ({ grupo: o.grupo, min: o.min, max: o.max, hechas: nDe(sAct, o.grupo), previstas: prevDe(o.grupo),
    anterior: nDe(sAnt, o.grupo), cierre: estadoCierre(nDe(sAct, o.grupo), prevDe(o.grupo), o).txt, ant: estadoObj(nDe(sAnt, o.grupo), o, refAnt).txt,
    deloadHoy: !!deloadEn(HOY, o.grupo) })),
  noLlegan, encima, enDeload, diasPrevistos, sinPlantillaPrev,
  sAct: Array.from(sAct.values()), sAnt: Array.from(sAnt.values()), prevista: __ser(prevista) };
`,
  },
  // texto del peso corporal
  {
    tras: /^  dv\.paragraph\(L\.join\("\\n\\n"\)\);$/m,
    antesDeLinea: true,
    codigo: `window.__G.pesoTexto = L.slice();`,
  },
  // volcado final, justo antes de dibujar Calidad de los datos
  {
    tras: /^plegable\("calidad", /m,
    antesDeLinea: true,
    codigo: `
{
  const G = window.__G;
  const P = (p) => p ? { nd: p.nd, sc: p.sc == null ? null : p.sc, sinPeso: p.sinPeso, carga: p.carga,
    nivel: p.nivel ? { txt: p.nivel.txt, ord: p.nivel.ord, desde: p.nivel.desde, hasta: p.nivel.hasta === Infinity ? "Infinity" : p.nivel.hasta, insignia: p.nivel.insignia } : null,
    mejor: p.mejor ? { oneRM: p.mejor.st.oneRM, peso: p.mejor.st.peso, reps: p.mejor.st.reps, dia: __dia(p.mejor.s.dia), pc: p.mejor.pc.kg } : null,
    niv: p.niv || null } : null;
  G.config = __ser({ GRUPOS, UNILATERALES, OBJETIVOS, VOLUMEN_OBJ, COLORES, PLANTILLAS, LIGAS_CFG, ESTANDARES, PESO, HORARIO, UMBRALES, BLOQUES,
    ERRORES_CONFIG, AVISOS_CONFIG });
  G.hoyISO = __dia(HOY);
  G.sesiones = SESIONES.map((s) => ({ dia: __dia(s.dia), plantilla: s.plantilla, series: s.series, volumen: s.volumen,
    descartadas: s.descartadas, sinPeso: s.sinPeso, dur: s.dur,
    ejercicios: s.ejercicios.map((e) => ({ nombre: e.nombre, tipoEj: e.tipoEj, unilateral: e.unilateral,
      sets: e.sets.map((st) => ({ peso: st.peso, reps: st.reps, segundos: st.segundos, tipo: st.tipo, paraSeries: st.paraSeries, paraPR: st.paraPR, volumen: st.volumen, oneRM: st.oneRM })) })) }));
  G.ejercicios = EJERCICIOS.map((e) => ({ k: canon(e.nombre), nombre: e.nombre, grupo: e.grupo, ser: e.ser, serSinPeso: e.serSinPeso, vol: e.vol,
    unilateral: e.unilateral,
    pesoMax: e.pesoMax ? { peso: e.pesoMax.st.peso, reps: e.pesoMax.st.reps, dia: __dia(e.pesoMax.dia) } : null,
    rmMax: e.rmMax ? { oneRM: e.rmMax.st.oneRM, peso: e.rmMax.st.peso, reps: e.rmMax.st.reps, dia: __dia(e.rmMax.dia) } : null,
    hist: e.hist.map((h) => ({ dia: __dia(h.dia), mejorRM: h.mejorRM, mejorRMReps: h.mejorRMReps, vol: h.vol, ser: h.ser })),
    chispa: chispaDe(e) }));
  G.diagnostico = diagnostico.map((d) => ({ k: canon(d.e.nombre), estado: d.estado, detalle: d.detalle, nSes: d.nSes, diasSinPR: d.diasSinPR,
    tend: d.tend || null }));
  G.progresion = PROGRESION.map((p) => p.sinDatos ? { k: p.k, sinDatos: true } : {
    k: p.k, clave: p.clave, estado: p.estado, target: p.target, pesoMax: p.pesoMax, piramide: p.piramide, pocas: p.pocas,
    sinPlantilla: p.sinPlantilla, unilateral: p.unilateral, ses: __dia(p.ses.dia), plantilla: p.ses.plantilla,
    work: p.work.map((st) => [st.peso, st.reps]), avisos: avisosProgresion(p), inc: __ser(incrementoDe(p)), proxima: proximaVez(p),
    rango: rangoTxt(p) });
  G.liga = { ok: LIGA.ok };
  if (LIGA.ok) {
    G.liga.ejercicios = Array.from(LIGA.ejercicios.values()).map((e) => ({ k: e.k, nombre: e.nombre, grupo: e.grupo, motivo: e.motivo,
      series4: e.series4, aprox: !!e.m.aprox, hoy: P(e.hoy), linea: e.linea.map(P), falta: e.hoy && e.hoy.nivel ? LIGA.faltaTxt(e) : null,
      progreso: e.hoy && e.hoy.nivel ? __ser(LIGA.progreso(e.hoy)) : null }));
    G.liga.grupos = Array.from(LIGA.grupos.values()).map((g) => ({ k: g.k, grupo: g.grupo, hoy: P(g.hoy), linea: g.linea.map(P),
      falta: g.hoy.nivel ? LIGA.faltaGrupoTxt(g.hoy) : null }));
    G.liga.general = { hoy: P(LIGA.general.hoy), linea: LIGA.general.linea.map(P), pct: LIGA.general.hoy.sc == null ? null : LIGA.pct(LIGA.general.hoy.sc),
      falta: LIGA.general.hoy.nivel ? LIGA.faltaGrupoTxt(LIGA.general.hoy) : null };
    G.liga.cambios = LIGA.cambios.map((c) => c.txt);
    G.liga.fueraDeTabla = LIGA.fueraDeTabla.slice();
  }
  G.semanas = semanas;
  G.resumen = { act: { vol: sumVol(act), ser: sumSer(act), n: act.length }, prev: { vol: sumVol(prev), ser: sumSer(prev), n: prev.length },
    delta, mediaDur, fiables: fiables.length, total: SESIONES.length };
  G.racha = { racha, rachaViva, semanasSinEntrenar, textoRacha, estadoRacha };
  {
    const diaUlt = ultima.dia ? ultima.dia.toFormat("yyyy-MM-dd") : null;
    const nuevos = [];
    for (const e of EJERCICIOS) {
      if (!e.rmMax || !e.rmMax.dia) continue;
      const esRM = e.rmMax.dia.toFormat("yyyy-MM-dd") === diaUlt;
      const esPeso = e.pesoMax && e.pesoMax.dia && e.pesoMax.dia.toFormat("yyyy-MM-dd") === diaUlt;
      if (esRM || esPeso) nuevos.push({ k: canon(e.nombre), peso: esPeso ? e.pesoMax.st.peso : null, rm: esRM ? e.rmMax.st.oneRM : null });
    }
    G.nuevosPR = nuevos;
  }
  G.alerta = diagnostico.filter((d) => d.estado === "🟡 Estancado" || d.estado === "🔴 Retrocediendo").map((d) => canon(d.e.nombre));
  // Esta semana por grupo, volumen por grupo y semana, y el balance por periodo (mismas expresiones)
  {
    const kAct = claveSemana(HOY);
    const porGrupo = new Map();
    for (const x of TODAS.filter((x) => x.dia && claveSemana(x.dia) === kAct)) {
      const g = porGrupo.get(x.grupo) || { grupo: x.grupo, ser: 0, vol: 0 };
      g.ser += 1; g.vol += x.st.volumen; porGrupo.set(x.grupo, g);
    }
    const activosHoy = bloquesActivos(HOY);
    const conObjetivo = activosHoy.filter((b) => b.gruposTxt.length);
    let objetivo = GRUPOS_ESPERADOS;
    if (conObjetivo.length) { const v = new Set(); objetivo = []; for (const b of conObjetivo) for (const g of b.gruposTxt) if (!v.has(canon(g))) { v.add(canon(g)); objetivo.push(g); } }
    G.grupoSemana = { lista: Array.from(porGrupo.values()).sort((a, b) => b.ser - a.ser),
      ausentes: porGrupo.size ? objetivo.map(nombreGrupo).filter((g) => !porGrupo.has(g)) : null,
      bloquesHoy: activosHoy.map((b) => b.tipo) };
    const gv = Array.from(new Set(TODAS.map((x) => x.grupo))).sort();
    G.volGrupo = gv.map((g) => ({ grupo: g, semanas: semanas.map((s) => TODAS.filter((x) => x.grupo === g && x.dia && claveSemana(x.dia) === s.clave).reduce((a, x) => a + x.st.volumen, 0)) }));
    const PER = { sem: (d) => claveSemana(d) === claveSemana(HOY), "7d": (d) => d >= HOY.minus({ days: 6 }), "30d": (d) => d >= HOY.minus({ days: 29 }), all: () => true };
    G.balance = {};
    for (const id of Object.keys(PER)) {
      const series = {};
      for (const v of Array.from(GRUPOS.mapa.values())) series[canon(v.grupo)] = 0;
      let total = 0;
      for (const x of TODAS) { if (!x.dia || !PER[id](x.dia)) continue; const k = canon(x.grupo); series[k] = (series[k] || 0) + 1; total++; }
      G.balance[id] = { series, total };
    }
  }
  G.peso = PESO.registros.length ? analizarPeso().puntos.map((x) => ({ fecha: x.fecha, kg: x.kg, media: x.media, ritmo: x.ritmo, dir: x.dir,
    color: x.color, desvio: x.desvio == null ? null : x.desvio, fase: x.fase ? x.fase.tipo : null })) : [];
  G.calidad = { L: L.slice(), limpio, resumen: resumenCal,
    malasDur: malasDur.map((s) => ({ dia: __dia(s.dia), min: s.dur.min, motivo: s.dur.motivo })),
    sinCat: sinCat.slice(), variantes: variantes.map((v) => ({ nombre: v.nombre, cands: v.cands })),
    errores: ERRORES_CONFIG.map((x) => ({ archivo: x.archivo, linea: x.linea })), avisos: AVISOS_CONFIG.length,
    sinMapeoCfg: Array.from(sinMapeoCfg.values()), sumaLados: sumaLados.map((x) => ({ dia: __dia(x.s.dia), ej: x.ex.nombre, serie: x.i + 1, peso: x.st.peso, reps: x.st.reps })),
    fueraPlantilla: Array.from(fueraPlantilla.values()).map((f) => ({ nombre: f.nombre, n: f.n, ultima: __dia(f.ultima.dia), plantilla: f.ultima.plantilla })),
    plantillasPerdidas: Array.from(plantillasPerdidas.values()), ligaAvisos, totalSinPeso, descartadas,
    sinLinea: Array.from(OBJETIVOS.mapa.values()).filter((o) => !ESTANDARES.mapa.has(canon(o.nombre))).map((o) => o.nombre),
    explicitos: Array.from(ESTANDARES.mapa.values()).filter((e) => e.sinEstandar).map((e) => e.nombre),
    sinFactor: Array.from(ESTANDARES.mapa.values()).filter((e) => !e.sinEstandar && !e.revisado).map((e) => e.nombre),
    aprox: Array.from(ESTANDARES.mapa.values()).filter((e) => e.aprox).map((e) => e.nombre),
    poleas: Array.from(ESTANDARES.mapa.values()).filter((e) => e.polea).map((e) => e.nombre),
    sinColor: (() => { const r = []; for (const v of Array.from(GRUPOS.mapa.values())) if (!COLORES.mapa.has(canon(v.grupo)) && r.indexOf(nombreGrupo(v.grupo)) < 0) r.push(nombreGrupo(v.grupo)); return r; })(),
    gl: HAY_GL ? SESIONES.filter((s) => s.dia && isoDe(s.dia) < PESO.registros[0].fecha).length : null };
}
`,
  },
];

export function parchear(codigo) {
  let out = codigo;
  for (const p of PUNTOS) {
    if (p.antes === null) { out = p.codigo + "\n" + out; continue; }
    const m = out.match(p.tras);
    if (!m) throw new Error("No se encuentra el punto de inyección " + p.tras);
    const i = p.antesDeLinea ? m.index : m.index + m[0].length;
    out = out.slice(0, i) + (p.antesDeLinea ? p.codigo + "\n" : "\n" + p.codigo) + out.slice(i);
  }
  return out;
}

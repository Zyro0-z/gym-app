// El núcleo nuevo (src/core) reproduce los resultados del dashboard de la versión 1.
// Compara, campo a campo, con el golden master de tests/golden/<conjunto>/<fecha>.json.
//   node --test tests/core/
// Los textos que la versión 2 redacta de otra forma (sin emojis ni vocabulario antiguo) se
// comparan a través de un traductor explícito, para que sólo cuente la lógica.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { desdeLegacy } from "../../src/migracion/index.js";
import { analizar } from "../../src/core/analisis.js";
import { canon } from "../../src/core/nombres.js";
import { fmt, conSigno } from "../../src/core/formato.js";
import { ddmm, numDia } from "../../src/core/fechas.js";
import { rangoTxt } from "../../src/core/progresion.js";
import { fixture } from "../golden/fixture.mjs";

const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const GOLDEN = RAIZ + "tests/golden/";
const existe = (f) => access(f).then(() => true, () => false);

// ─── comparación con tolerancia y ruta del primer fallo ───
function igual(a, b, ruta, errores) {
  if (errores.length > 40) return;
  if (typeof a === "number" && typeof b === "number") {
    if (!(a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)))) errores.push(ruta + ": " + a + " ≠ " + b);
    return;
  }
  if (a === b) return;
  if (a == null || b == null || typeof a !== "object" || typeof b !== "object") { errores.push(ruta + ": " + JSON.stringify(a) + " ≠ " + JSON.stringify(b)); return; }
  if (Array.isArray(a) !== Array.isArray(b)) { errores.push(ruta + ": tipo distinto"); return; }
  const claves = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of claves) igual(a[k], b[k], ruta + "." + k, errores);
}

// ─── traductores a los textos de la versión 1 ───
const ESTADO_V1 = { retrocede: "🔴 Retrocediendo", estancado: "🟡 Estancado", sinPR: "⏳ Sin PR reciente", deload: "🛌 En deload",
  foco: "🎯 Fuera de foco", progresa: "🟢 Progresando", inactivo: "💤 Inactivo", sinDatos: "⚪ Sin datos", sinPeso: "⚪ Sin peso" };
function detalleV1(d) {
  const nota = d.excluidas ? " · " + d.excluidas + " ses. en bloque sin comparar" : "";
  if (d.estado === "sinPeso") return "sólo series sin peso registrado";
  if (d.todasProtegidas) return "todas sus sesiones (" + d.excluidas + ") están en bloques protegidos";
  let det;
  if (d.nSes < 3) det = d.nSes + " de 3 sesiones necesarias";
  else if ((d.seria || d.estado) === "inactivo") det = "sin entrenar hace " + d.diasInactivo + " días";
  else det = (d.flojo ? "≈ " : "") + "RM_rec " + fmt(d.rmRec, 1) + " vs RM_ant " + fmt(d.rmAnt, 1) + " kg · " + d.diasSinPR + " d sin PR";
  det += nota;
  if (d.seria) det = "sería " + ESTADO_V1[d.seria].replace(/^\S+\s/, "").toLowerCase() + "; «" + d.bloque.tipo + "» hasta " + ddmm(d.bloque.fin) +
    (d.bloque.esDeload ? "" : ", fuera de su objetivo") + ": no se juzga · " + det;
  return det;
}
const avisoV1 = (t) => t.replace(/^Pocas series/, "⚠ Pocas series").replace(/^sin rutina «/, "sin plantilla «");
const proximaV1 = (t) => t.replace("(sin incremento definido)", "(sin incremento en objetivos)");
const motivoLigaV1 = (e) => ({ sinEstandar: "sin estándar razonable (estandares)", sinTabla: "falta la tabla «" + (e.m && e.m.slug) + "» en estandares",
  sinRango: "sin rango en objetivos: la liga sólo cuenta series dentro de tu rango" })[e.codigo] || e.motivo;
const codigoDur = (m) => (m == null ? null : /^irreal/.test(m) ? "irreal" : /^inconsistente/.test(m) ? "inconsistente" : /^sospechosa/.test(m) ? "sospechosa" : "sinDato");
const cierreV1 = (c) => ({ deload: "🛌 deload, no se juzga", noLlega: "🔻 no llegará · faltarán " + c.faltan, encima: "🔺 por encima al cierre",
  llegara: "✅ llegará al rango", enRango: "✅ en rango" })[c.estado];
const antV1 = (c) => ({ deload: "🛌 deload, no se juzga", debajo: "🔻 por debajo", encima: "🔺 por encima", enRango: "✅ en rango" })[c.estado];
const EMOJI_PESO = { verde: "🟢", ambar: "🟡", rojo: "🔴", neutro: "⚪" };
function pesoTextoV1(R, puntos) {
  if (!R) return undefined;
  const pesoTxt = (kg) => fmt(kg, 1) + " kg", V = 21, L = [];
  const ult = R.ultimo;
  if (R.cambio) {
    const { mi, mf, dif } = R.cambio;
    L.push("**" + (Math.abs(dif) < 0.05 ? "Sin cambio" : dif > 0 ? "Has ganado " + pesoTxt(dif) : "Has perdido " + pesoTxt(-dif)) +
      "** desde el " + ddmm(R.inicio) + " · media de tus primeros " + V + " días " + pesoTxt(mi) + " → últimos " + V + " días " + pesoTxt(mf));
  } else L.push("**Sin tendencia aún** · " + R.n + (R.n === 1 ? " registro" : " registros") + (R.n > 1 ? " en " + R.dias + " días" : "") + " · último " + pesoTxt(ult.kg) + " (" + ddmm(ult.fecha) + ")");
  const o = R.objetivo;
  if (o.estado === "sin") L.push("SIN OBJETIVO");
  else if (o.estado === "futura") L.push("Objetivo desde el " + ddmm(o.desde));
  else if (o.estado === "referencia") L.push("Objetivo **mantener** · referencia " + o.n + "/" + o.necesarios + " registros");
  else if (o.estado === "mantener") L.push(EMOJI_PESO[o.color] + " Objetivo **mantener**: tu media de " + V + " días está a " + conSigno(o.desvio, 1) +
    " kg de tu referencia (" + pesoTxt(o.ref) + "), " + (o.color === "verde" ? "dentro" : "fuera") + " de la banda ±" + fmt(o.banda, 1) + " kg.");
  else if (o.estado === "ritmo") L.push(EMOJI_PESO[o.color] + " Objetivo **" + o.tipo + "** · ritmo actual " + conSigno(o.ritmo, 2) + " kg/semana (" + o.dir + "), " +
    { verde: "a favor de tu objetivo", ambar: "estable: no avanza hacia tu objetivo", rojo: "en contra de tu objetivo" }[o.color] + ".");
  else L.push("Objetivo **" + o.tipo + "** · sin color aún");
  if (R.hayObjetivo) L.push("<small>🟢 a favor · 🟡 estable · 🔴 en contra · ⚪ sin datos · ┄ media " + V + " d" +
    (puntos.length > puntos.filter((x) => x.dia > numDia(R.hoy) - 180).length ? " · últimos 180 días" : "") + "</small>");
  return L;
}
const P = (p) => p ? { nd: p.nd, sc: p.sc == null ? null : p.sc, sinPeso: p.sinPeso, carga: p.carga,
  nivel: p.nivel ? { txt: p.nivel.txt, ord: p.nivel.ord, desde: p.nivel.desde, hasta: p.nivel.hasta === Infinity ? "Infinity" : p.nivel.hasta, insignia: p.nivel.insignia } : null,
  mejor: p.mejor ? { oneRM: p.mejor.st.oneRM, peso: p.mejor.st.peso, reps: p.mejor.st.reps, dia: p.mejor.s.dia, pc: p.mejor.pc.kg } : null, niv: p.niv || null } : null;
const sinUndef = (o) => JSON.parse(JSON.stringify(o));
const porK = (lista) => Object.fromEntries(lista.map((x) => [x.k, x]));
const txtCambio = (c) => (c.sube ? "🏆 Ascenso: " : "🔻 Descenso: ") + c.nombre + " → " + c.nivel.txt;
const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Proyección del análisis nuevo con la forma del volcado antiguo. */
function proyectar(A, informe) {
  const C = A.C;
  const R = {};
  R.hoyISO = A.hoy;
  R.sesiones = A.sesiones.map((s) => ({ dia: s.dia, plantilla: s.plantilla, series: s.series, volumen: s.volumen, descartadas: s.descartadas, sinPeso: s.sinPeso,
    dur: { min: s.dur.min, fiable: s.dur.fiable, codigo: codigoDur(s.dur.motivo) },
    ejercicios: s.ejercicios.map((e) => ({ nombre: e.nombre, tipoEj: e.tipoEj, unilateral: e.unilateral,
      sets: e.sets.map((st) => ({ peso: st.peso, reps: st.reps, segundos: st.segundos, paraSeries: st.paraSeries, paraPR: st.paraPR, volumen: st.volumen, oneRM: st.oneRM })) })) }));
  R.ejercicios = porK(A.ejercicios.map((e) => ({ k: e.k, nombre: e.nombre, grupo: e.grupo, ser: e.ser, serSinPeso: e.serSinPeso, vol: e.vol, unilateral: e.unilateral,
    pesoMax: e.pesoMax ? { peso: e.pesoMax.st.peso, reps: e.pesoMax.st.reps, dia: e.pesoMax.dia } : null,
    rmMax: e.rmMax ? { oneRM: e.rmMax.st.oneRM, peso: e.rmMax.st.peso, reps: e.rmMax.st.reps, dia: e.rmMax.dia } : null,
    hist: e.hist.map((h) => ({ dia: h.dia, mejorRM: h.mejorRM, mejorRMReps: h.mejorRMReps, vol: h.vol, ser: h.ser })) })));
  R.diagnostico = porK(Array.from(A.diagnostico.values()).map((d) => ({ k: d.e.k, estado: ESTADO_V1[d.estado], detalle: detalleV1(d), nSes: d.nSes, diasSinPR: d.diasSinPR,
    tend: d.tend ? { flecha: d.tend.flecha, pct: d.tend.pct } : null })));
  R.progresion = porK(Array.from(A.progresion.values()).map((p) => p.sinDatos ? { k: p.k, sinDatos: true } : {
    k: p.k, clave: p.clave, estado: { sube: "⬆ Sube carga", "mantén": "→ Mantén", debajo: "⚠ Por debajo del rango" }[p.clave], target: p.target, pesoMax: p.pesoMax,
    piramide: p.piramide, pocas: p.pocas, sinPlantilla: p.sinPlantilla, unilateral: p.unilateral, ses: p.ses.dia, plantilla: p.ses.plantilla,
    work: p.work.map((st) => [st.peso, st.reps]), avisos: A.avisosProgresion(p).map(avisoV1), inc: sinUndef(A.incrementoDe(p)), proxima: proximaV1(A.proximaVez(p)), rango: rangoTxt(p) }));
  const L = A.liga;
  R.liga = { ok: L.ok };
  if (L.ok) {
    R.liga.ejercicios = porK(Array.from(L.ejercicios.values()).map((e) => ({ k: e.k, nombre: e.nombre, grupo: e.grupo, motivo: e.motivo == null ? null : motivoLigaV1(e),
      series4: e.series4, aprox: !!e.m.aprox, hoy: P(e.hoy), linea: e.linea.map(P), falta: e.hoy && e.hoy.nivel ? L.faltaTxt(e) : null,
      progreso: e.hoy && e.hoy.nivel ? sinUndef(L.progreso(e.hoy)) : null })));
    R.liga.grupos = porK(Array.from(L.grupos.values()).map((g) => ({ k: g.k, grupo: g.grupo, hoy: P(g.hoy), linea: g.linea.map(P), falta: g.hoy.nivel ? L.faltaGrupoTxt(g.hoy) : null })));
    R.liga.general = { hoy: P(L.general.hoy), linea: L.general.linea.map(P), pct: L.general.hoy.sc == null ? null : L.pct(L.general.hoy.sc),
      falta: L.general.hoy.nivel ? L.faltaGrupoTxt(L.general.hoy) : null };
    R.liga.cambios = L.cambios.map(txtCambio).sort();
    R.liga.fueraDeTabla = L.fueraDeTabla.slice().sort();
  }
  R.semanas = A.semanas;
  const r = A.resumen;
  R.resumen = { act: r.act, prev: r.prev, delta: r.deltaPct != null ? (r.deltaPct >= 0 ? "▲ +" : "▼ ") + fmt(r.deltaPct, 1) + " %" : r.primeraSemana ? "▲ primera semana con datos" : "—",
    mediaDur: r.mediaDur, fiables: r.fiables, total: r.total };
  R.racha = { racha: A.racha.racha, rachaViva: A.racha.viva, semanasSinEntrenar: A.racha.semanasSinEntrenar, textoRacha: A.racha.texto, estadoRacha: A.racha.estado };
  R.nuevosPR = A.nuevosPR.map((x) => ({ k: x.e.k, peso: x.peso, rm: x.rm }));
  R.alerta = Array.from(A.diagnostico.values()).filter((d) => d.estado === "retrocede" || d.estado === "estancado").map((d) => d.e.k);
  const gs = A.grupoSemana;
  R.grupoSemana = { lista: gs.lista, ausentes: gs.ausentes, bloquesHoy: gs.bloquesHoy.map((b) => b.tipo) };
  R.volGrupo = A.volumenPorGrupo;
  R.balance = Object.fromEntries(["sem", "7d", "30d", "all"].map((id) => [id, A.balance(id)]));
  R.peso = A.peso.puntos.map((x) => ({ fecha: x.fecha, kg: x.kg, media: x.media, ritmo: x.ritmo, dir: x.dir, color: x.color, desvio: x.desvio == null ? null : x.desvio, fase: x.fase ? x.fase.tipo : null }));
  R.pesoTexto = A.resumenPeso ? pesoTextoV1(Object.assign({ hoy: A.hoy }, A.resumenPeso), A.peso.puntos) : undefined;
  const h = A.hoyToca;
  if (h) R.hoy = { esperado: h.esperado, estadoHoy: h.estado, descanso: h.descanso, gHoy: h.grupo, objetivo: h.objetivo, hechas: h.hechas,
    logsHoy: h.logsHoy.map((s) => s.plantilla), subidas: h.subidas.map((p) => ({ k: p.k, pesoMax: p.pesoMax, inc: sinUndef(A.incrementoDe(p)) })) };
  const so = A.seriesObjetivo;
  if (so) R.seriesObjetivo = { lista: so.lista.map((o) => ({ grupo: o.grupo, min: o.min, max: o.max, hechas: o.hechas, previstas: o.previstas, anterior: o.anterior,
      cierre: cierreV1(o.cierre), ant: antV1(o.ant), deloadHoy: o.deloadHoy })), noLlegan: so.noLlegan, encima: so.encima, enDeload: so.enDeload,
    diasPrevistos: so.diasPrevistos.map((d) => DIAS[d.wd].slice(0, 3).toLowerCase() + " " + d.rutina + (d.hoy ? " (hoy)" : "") + (d.deload ? " (deload)" : "")),
    sinPlantillaPrev: so.sinPlantilla };
  const q = A.calidad;
  const errores = informe.errores.map((x) => ({ archivo: x.archivo, linea: x.linea }));
  if (q.avisos.some((a) => a.codigo === "sinSexo") && !informe.errores.some((x) => /^sexo/.test(x.linea))) errores.push({ archivo: "Gym/Config/peso-corporal.md", linea: "sexo::" });
  R.calidad = {
    malasDur: q.malasDur.map((s) => ({ dia: s.dia, min: s.dur.min, codigo: codigoDur(s.dur.motivo) })),
    sinCat: q.sinCat, variantes: q.variantes.map((v) => ({ nombre: v.nombre, cands: v.cands.map((c) => ({ nombre: c.nombre, grupo: canon(c.grupo), distancia: c.distancia })) })),
    errores: errores.map((e) => e.archivo + " · " + e.linea).sort(), avisos: informe.avisos.length + q.avisos.filter((a) => a.codigo !== "sinSexo").length,
    sinMapeoCfg: q.sinMapeoCfg.map((x) => x.nombre + " (" + x.de.join(" y ") + ")").sort(),
    sumaLados: q.sumaLados.map((x) => ({ dia: x.s.dia, ej: x.ex.nombre, serie: x.i + 1, peso: x.st.peso, reps: x.st.reps })),
    fueraPlantilla: q.fueraPlantilla.map((f) => ({ nombre: f.nombre, n: f.n, ultima: f.ultima.dia, plantilla: f.ultima.plantilla })).sort((a, b) => (a.nombre < b.nombre ? -1 : 1)),
    plantillasPerdidas: q.plantillasPerdidas.map((x) => x.nombre + " (" + x.n + ")").sort(),
    ligaAvisos: { sinEstandar: q.ligas.sinEstandar.length, sinFactor: q.ligas.sinFactor.length, pesoViejo: q.ligas.pesoViejo },
    totalSinPeso: q.totalSinPeso, descartadas: q.descartadas,
    sinLinea: q.ligas.sinEstandar.slice().sort(), explicitos: q.ligas.explicitos.slice().sort(), sinFactor: q.ligas.sinFactor.slice().sort(),
    aprox: q.ligas.aprox.slice().sort(), poleas: q.ligas.poleas.slice().sort(), sinColor: q.sinColor.slice().sort(),
    gl: C.peso.registros.length && C.peso.sexo ? A.sesiones.filter((s) => s.dia && s.dia < C.peso.registros[0].fecha).length : null,
  };
  return R;
}

/** El volcado antiguo, con la misma forma (listas por clave y ordenadas donde el orden no significa nada). */
function normalizarGolden(G) {
  const R = {};
  R.hoyISO = G.hoyISO;
  R.sesiones = G.sesiones.map((s) => ({ dia: s.dia, plantilla: s.plantilla, series: s.series, volumen: s.volumen, descartadas: s.descartadas, sinPeso: s.sinPeso,
    dur: { min: s.dur.min, fiable: s.dur.fiable, codigo: codigoDur(s.dur.motivo) },
    ejercicios: s.ejercicios.map((e) => ({ nombre: e.nombre, tipoEj: e.tipoEj, unilateral: e.unilateral,
      sets: e.sets.map((st) => ({ peso: st.peso, reps: st.reps, segundos: st.segundos, paraSeries: st.paraSeries, paraPR: st.paraPR, volumen: st.volumen, oneRM: st.oneRM })) })) }));
  R.ejercicios = porK(G.ejercicios.map((e) => { const x = Object.assign({}, e); delete x.chispa; return x; }));
  R.diagnostico = porK(G.diagnostico);
  R.progresion = porK(G.progresion);
  R.liga = { ok: G.liga.ok };
  if (G.liga.ok) {
    R.liga.ejercicios = porK(G.liga.ejercicios);
    R.liga.grupos = porK(G.liga.grupos);
    R.liga.general = G.liga.general;
    R.liga.cambios = G.liga.cambios.slice().sort();
    R.liga.fueraDeTabla = G.liga.fueraDeTabla.slice().sort();
  }
  R.semanas = G.semanas;
  R.resumen = G.resumen;
  R.racha = G.racha;
  R.nuevosPR = G.nuevosPR;
  R.alerta = G.alerta;
  R.grupoSemana = G.grupoSemana;
  R.volGrupo = G.volGrupo;
  R.balance = G.balance;
  R.peso = G.peso;
  R.pesoTexto = G.pesoTexto ? G.pesoTexto.map((t) => (/^(Sin `objetivo::`|Tu `objetivo::`)/.test(t) ? "SIN OBJETIVO" : t)) : undefined;
  if (G.hoy) R.hoy = G.hoy;
  if (G.seriesObjetivo) { R.seriesObjetivo = Object.assign({}, G.seriesObjetivo); delete R.seriesObjetivo.sAct; delete R.seriesObjetivo.sAnt; delete R.seriesObjetivo.prevista; }
  const q = G.calidad;
  R.calidad = {
    malasDur: q.malasDur.map((s) => ({ dia: s.dia, min: s.min, codigo: codigoDur(s.motivo) })),
    sinCat: q.sinCat, variantes: q.variantes.map((v) => ({ nombre: v.nombre, cands: v.cands.map((c) => ({ nombre: c.nombre, grupo: canon(c.grupo), distancia: c.distancia })) })),
    errores: q.errores.map((e) => e.archivo + " · " + e.linea).sort(), avisos: q.avisos,
    sinMapeoCfg: q.sinMapeoCfg.map((x) => x.nombre + " (" + x.de.join(" y ") + ")").sort(),
    sumaLados: q.sumaLados, fueraPlantilla: q.fueraPlantilla.slice().sort((a, b) => (a.nombre < b.nombre ? -1 : 1)),
    plantillasPerdidas: q.plantillasPerdidas.map((x) => x.nombre + " (" + x.n + ")").sort(),
    ligaAvisos: q.ligaAvisos, totalSinPeso: q.totalSinPeso, descartadas: q.descartadas,
    sinLinea: q.sinLinea.slice().sort(), explicitos: q.explicitos.slice().sort(), sinFactor: q.sinFactor.slice().sort(),
    aprox: q.aprox.slice().sort(), poleas: q.poleas.slice().sort(), sinColor: q.sinColor.slice().sort(), gl: q.gl,
  };
  return R;
}

const conjuntos = [["sintetico", async () => fixture()]];
if (await existe(RAIZ + "seed.json")) conjuntos.push(["seed", async () => JSON.parse(await readFile(RAIZ + "seed.json", "utf8"))]);

for (const [nombre, cargar] of conjuntos) {
  const dir = GOLDEN + nombre + "/";
  if (!(await existe(dir))) continue;
  const datos = await cargar();
  const modelo = desdeLegacy(datos);
  for (const f of (await readdir(dir)).filter((x) => x.endsWith(".json")).sort()) {
    const fecha = f.slice(0, 10);
    test(`golden ${nombre} ${fecha}`, async () => {
      const G = JSON.parse(await readFile(dir + f, "utf8"));
      const nuevo = sinUndef(proyectar(analizar(modelo, fecha), modelo.informe));
      const viejo = sinUndef(normalizarGolden(G));
      const errores = [];
      for (const k of Object.keys(viejo)) igual(nuevo[k], viejo[k], k, errores);
      assert.deepEqual(errores, [], errores.slice(0, 25).join("\n"));
    });
  }
}

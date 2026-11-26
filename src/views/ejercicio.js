// Detalle de ejercicio (e1RM, próxima vez, estado, récords y sesiones) y detalle de grupo muscular.
import { e1rmAjustado, esRpe, rpeTxt } from "../core/rpe.js";
import { h, poner } from "../ui/dom.js";
import { activo } from "../data/modulos.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, vacio, chip, segmentado } from "../ui/controles.js";
import { graficaLinea, graficaBarras } from "../ui/graficas.js";
import { insignia } from "../ui/insignias.js";
import { colorGrupo } from "../ui/tema.js";
import { fmt, plural } from "../core/formato.js";
import { canon } from "../core/nombres.js";
import { numDia, deNum, menosMeses, claveSemana } from "../core/fechas.js";
import { ESTADOS } from "../core/estancamiento.js";
import { kg, kgTotal, fechaCorta, capital } from "../ui/textos.js";
import { tonoEstado, iconoTend, flechaEstado, pctTxt, micro } from "./progreso.js";
import { ligaVigente } from "./ligas.js";
import { e1rmReciente, ruidoE1rm, prPorRango, bandaRuido } from "../core/prescripcion.js";
import { deEjercicio, nombreArticulacion } from "../core/molestias.js";
import { anotarMolestia } from "./molestias.js";
import { nombreMusculo } from "../core/musculos.js";
import { diagramaCuerpo } from "../ui/cuerpo.js";
import { abrirSesionDelDia } from "./comun.js";

const RANGOS = [{ valor: "1M", texto: "1 mes", corto: "1M" }, { valor: "3M", texto: "3 meses", corto: "3M" }, { valor: "6M", texto: "6 meses", corto: "6M" }, { valor: "Todo", texto: "Todo", corto: "Todo" }];
const MATERIAL = { maquina: "máquina", máquina: "máquina", polea: "polea", mancuerna: "mancuerna", barra: "barra" };
const flecha = (ic) => (ic === "sube" ? "↑ " : ic === "baja" ? "↓ " : "→ ");
const serieTxt = (st) => (st.peso > 0 ? fmt(st.peso, Number.isInteger(st.peso) ? 0 : 1) + "×" + st.reps : st.reps + " reps");

/** Mejor e1RM ajustado por RPE de la última sesión del ejercicio con alguna serie con RPE, o null. */
function rmConRpe(sesiones, k) {
  let ult = null;
  for (const s of sesiones) for (const e of s.ejercicios) {
    if (e.ejercicioId !== k || !e.series.some((st) => esRpe(st.rpe))) continue;
    if (!ult || s.fecha > ult.s.fecha || (s.fecha === ult.s.fecha && s.id > ult.s.id)) ult = { s, e };
  }
  if (!ult) return null;
  let mejor = null;
  for (const st of ult.e.series) {
    if (st.tipo === "calentamiento" || st.hecha === false || !esRpe(st.rpe)) continue;
    const v = e1rmAjustado(st.peso, st.reps, st.rpe);
    if (v > 0 && (!mejor || v > mejor.kg)) mejor = { kg: v, st };
  }
  return mejor;
}

export function vistaEjercicio([k], app) {
  const { store } = app;
  let rango = "Todo";
  const buscar = () => store.analisis().ejercicios.find((e) => e.k === k);
  const cat = () => store.estado.catalogo.find((c) => c.id === k);
  return {
    titulo: () => { const e = buscar(), c = cat(); return e ? e.nombre : c ? c.nombre : "Ejercicio"; },
    tituloAtras: "Ejercicio",
    grande: true,
    derecha: () => [h("button", { class: "btn-barra", "aria-label": "Cómo se calcula", onClick: () => comoSeCalcula(app) }, icono("info"))],
    bajoTitulo: () => {
      const e = buscar(), c = cat(), grupos = store.estado.ajustes.grupos;
      const g = (e && e.grupo) || (c && c.grupo), dg = e ? store.analisis().diagnostico.get(k) : null;
      const tags = [c && c.tipoMaterial ? MATERIAL[c.tipoMaterial] || c.tipoMaterial : null, c && c.rangoReps ? c.rangoReps.min + "–" + c.rangoReps.max + " reps" : null, c && c.unilateral ? "por lado" : null].filter(Boolean);
      return h("div", { class: "ficha-tags" },
        g ? h("span", { class: "ej-tag" }, h("i", { class: "punto-grupo", style: { background: colorGrupo(grupos, g) } }), g) : null,
        ...tags.map((t) => h("span", { class: "ej-tag" }, t)),
        dg ? h("span", { class: "ficha-estado" }, chip(ESTADOS[dg.estado].texto, tonoEstado(dg.estado), { relleno: true })) : null);
    },
    render(c) {
      const A = store.analisis(), e = buscar();
      if (!e) { poner(c, vacio({ icono: "pesa", titulo: "Sin sesiones", texto: "Aún no has registrado este ejercicio." })); return; }
      const d = A.diagnostico.get(k), p = A.progresionDe(k);
      const desde = rango === "Todo" ? "0000" : menosMeses(A.hoy, { "1M": 1, "3M": 3, "6M": 6 }[rango]);
      const hist = e.hist.filter((x) => x.mejorRM > 0 && x.dia >= desde);
      const actual = e.hist.length ? e.hist[e.hist.length - 1].mejorRM : 0;
      const t = d && d.tend, ic = iconoTend(t);
      const ajustado = rmConRpe(store.estado.sesiones, k);
      const rec1 = e1rmReciente(e), ruido = ruidoE1rm(e.hist);
      const grafica = hist.length ? graficaLinea({ alto: 160, record: hist.length > 2, zonas: (A.C.bloques || []).filter((b) => b.esDeload).map((b) => ({ x0: numDia(b.inicio), x1: numDia(b.fin) + 1, texto: "Descarga" })), puntos: hist.map((x) => ({ x: numDia(x.dia), y: x.mejorRM, detalle: capital(fechaCorta(x.dia, A.hoy)) + " · " + x.mejorRMReps + " reps" })),
        formato: (v) => kg(v), ejeX: (n) => fechaCorta(deNum(n)), etiqueta: "e1RM por sesión",
        banda: ruido && hist.length > 2 ? bandaRuido(e.hist, ruido.sd).filter((b) => b.dia >= desde).map((b) => ({ x: numDia(b.dia), lo: b.lo, hi: b.hi })) : null }) : h("p", { class: "etiqueta", style: { padding: "24px 0", textAlign: "center" } }, "Sin sesiones en este periodo.");
      const pctChip = t && ic ? pctTxt(t.pct) : null;
      const sub1 = (pctChip ? flecha(ic) + pctChip : "") + (ruido ? (pctChip ? " · " : "") + "ruido ±" + fmt(ruido.sd, 1) + " kg" : "");
      const out = [
        seccion({}, h("div", { class: "tarjeta tarjeta-ficha" },
          h("div", { class: "tele-2" + (ajustado ? "" : " uno") },
            h("div", { class: "tele" }, h("div", { class: "tele-et" }, "e1RM última sesión"), h("div", { class: "tele-cifra num" }, fmt(actual, 1), h("small", null, " kg")), sub1 ? h("div", { class: "tele-sub num" }, sub1) : null),
            ajustado ? h("div", { class: "tele acc" }, h("div", { class: "tele-et" }, "Ajustado por RPE"), h("div", { class: "tele-cifra num" }, fmt(ajustado.kg, 1), h("small", null, " kg")),
              h("div", { class: "tele-sub num" }, fmt(ajustado.st.peso, Number.isInteger(ajustado.st.peso) ? 0 : 1) + " × " + ajustado.st.reps + " @" + rpeTxt(ajustado.st.rpe) + (rec1 ? " · Fiabilidad " + rec1.confianza : ""))) : null),
          h("div", { class: "ficha-ctl" },
            ruido && hist.length > 2 ? h("span", { class: "leyenda-banda" }, h("i"), "Franja ±" + fmt(ruido.sd, 1) + " kg (ruido personal)") : h("span"),
            micro(RANGOS, rango, (v) => { rango = v; this.render(c); }, "Rango")),
          grafica,
          e.hist.length < 3 ? h("div", { class: "etiqueta", style: { marginTop: "6px" } }, "Con 3 sesiones o más se calcula la tendencia.") : null)),
      ];
      const mc = cat() && cat().musculos;
      const on = (id) => activo(store.estado.ajustes, id);
      if (on("ficha.mapa") && mc && ((mc.p && mc.p.length) || (mc.s && mc.s.length))) {
        const sec = (mc.s || []).filter((m) => !(mc.p || []).includes(m));
        const lista = (xs) => xs.map(nombreMusculo).join(", ");
        out.push(seccion({}, h("div", { class: "tarjeta tarjeta-musc" },
          diagramaCuerpo([...(mc.p || []).map((m) => ({ nombre: nombreMusculo(m), tokens: [m + "-*"], valor: 2 })), ...sec.map((m) => ({ nombre: nombreMusculo(m), tokens: [m + "-*"], valor: 1 }))],
            { etiqueta: "Músculos de " + (e.nombre || "este ejercicio"), unidad: (v) => (v >= 2 ? "principal" : "secundario"), vista: "ambas", mini: true }),
          h("div", { class: "pila musc-lista" },
            mc.p && mc.p.length ? h("div", null, h("div", { class: "musc-et" }, "Principales"), h("div", { class: "musc-p" }, lista(mc.p))) : null,
            sec.length ? h("div", null, h("div", { class: "musc-et sec" }, "Secundarios"), h("div", { class: "musc-s" }, lista(sec))) : null))));
      }
      if (p && on("ficha.proxima")) {
        const txt = A.proximaVez(p);
        if (txt) out.push(seccion({}, h("div", { class: "tarjeta tarjeta-prox" },
          h("div", null, h("div", { class: "tele-et acc" }, "Próxima sesión"), h("div", { class: "prox-txt" }, capital(txt))))));
      }
      const mol = deEjercicio(store.estado.molestias || [], k);
      if (on("molestias")) out.push(seccion({ cab: "Molestias" },
        lista([...mol.slice(0, 3).map((m) => celda({ titulo: nombreArticulacion(m.articulacion), sub: capital(fechaCorta(m.fecha, A.hoy)) + (m.nota ? " · " + m.nota : ""), valor: chip("Nivel " + m.nivel, m.nivel >= 4 ? "bad" : m.nivel === 3 ? "warn" : null), alPulsar: () => anotarMolestia(app, {}, m) })),
          celda({ titulo: "Anotar molestia", estilo: "accion", alPulsar: () => anotarMolestia(app, { ejercicioId: k }) })])));
      const L = A.liga, le = L && L.ok ? L.ejercicios.get(k) : null;
      const estado = [];
      if (d) estado.push(celda({ titulo: "Semáforo", valor: chip(ESTADOS[d.estado].texto, tonoEstado(d.estado)) }));
      if (d && d.diasSinPR != null) estado.push(celda({ titulo: "Días sin récord", valor: String(d.diasSinPR) }));
      const vle = on("ligas") ? ligaVigente(le) : null;
      if (vle) estado.push(celda({ titulo: "Liga", sub: vle.viejo ? "Última conocida" : capital(L.faltaTxt(le)), valor: h("span", { class: "valor-tend" }, insignia(vle.p.nivel, 20), vle.p.nivel.txt), chevron: true, alPulsar: () => app.nav.ir("liga/ejercicio/" + encodeURIComponent(k)) }));
      else if (on("ligas") && le && le.motivo) estado.push(celda({ titulo: "Liga", sub: capital(le.motivo) }));
      if (estado.length) out.push(seccion({ cab: "Estado" }, lista(estado)));
      const rec = [];
      if (e.rmMax) rec.push(celda({ titulo: "e1RM", valor: kg(e.rmMax.st.oneRM) + " · " + fechaCorta(e.rmMax.dia, A.hoy) }));
      if (e.pesoMax) rec.push(celda({ titulo: "Más peso", valor: serieTxt(e.pesoMax.st) + " · " + fechaCorta(e.pesoMax.dia, A.hoy) }));
      const mejorVol = e.hist.reduce((m, x) => (!m || x.vol > m.vol ? x : m), null);
      if (mejorVol && mejorVol.vol) rec.push(celda({ titulo: "Volumen en una sesión", valor: kgTotal(mejorVol.vol) }));
      if (rec.length) out.push(seccion({ cab: "Récords" }, lista(rec)));
      const porRango = prPorRango(e);
      if (porRango.length) out.push(seccion({ cab: "Récords por repeticiones" },
        lista(porRango.map((x) => celda({ titulo: x.rango.txt + (x.rango.id === "1" ? " repetición" : " reps"), sub: capital(fechaCorta(x.dia, A.hoy)), valor: serieTxt({ peso: x.peso, reps: x.reps }) })))));
      out.push(seccion({ cab: "Sesiones" }, lista(e.hist.slice().reverse().slice(0, 30).map((x) => celda({ titulo: capital(fechaCorta(x.dia, A.hoy)), sub: x.series.map(serieTxt).join(" · "),
        valor: x.mejorRM ? fmt(x.mejorRM, 1) : null, chevron: true,
        alPulsar: () => abrirSesionDelDia(app, store.estado.sesiones.filter((s) => s.fecha === x.dia && s.ejercicios.some((y) => y.ejercicioId === k)), capital(fechaCorta(x.dia, A.hoy))) })))));
      poner(c, out);
    },
  };
}
vistaEjercicio.pestana = "progreso";

export function comoSeCalcula(app) {
  const p = (t) => h("p", { class: "t-subhead", style: { marginBottom: "10px" } }, t);
  app.abrirHoja({
    titulo: "Cómo se calcula", cancelar: null, alturas: ["media", "grande"],
    accion: { texto: "Listo", alPulsar: () => {} },
    render(c) {
      poner(c,
        seccion({ cab: "e1RM" }, h("div", { class: "tarjeta" }, p("Es el peso que podrías levantar una vez, estimado con la fórmula de Epley: peso × (1 + reps / 30). Solo cuentan las series con peso que no son de calentamiento."))),
        seccion({ cab: "Ajustado por RPE" }, h("div", { class: "tarjeta" }, p("Si anotas el RPE, las repeticiones que te quedaban en reserva (10 − RPE) se suman a las hechas antes de aplicar Epley: 100 kg × 5 a RPE 8 cuenta como 100 kg × 7. Es una referencia aparte; no cambia el e1RM, las tendencias ni las ligas."))),
        seccion({ cab: "Semáforo" }, h("div", { class: "tarjeta" }, p("Compara tu mejor e1RM reciente con el anterior. Estancado: muchos días sin récord. Retrocede: el e1RM baja. Los días de descarga no cuentan."))),
        seccion({ cab: "Próxima vez" }, h("div", { class: "tarjeta" }, p("Doble progresión: cuando todas las series llegan al máximo del rango de repeticiones, sube el peso con el incremento del ejercicio y vuelve al mínimo del rango."))),
        seccion({ cab: "Ligas" }, h("div", { class: "tarjeta" }, p("Tu e1RM se compara con tablas de estándares según tu peso corporal. La liga de un grupo es la media de sus ejercicios, ponderada por las series. Para bajar de división hay un margen, así que un mal día no te hace descender."))));
    },
  });
}

/** Detalle de un grupo muscular: series por semana frente al objetivo, ejercicios y liga. */
export function vistaGrupo([nombre], app) {
  const { store } = app;
  return {
    titulo: nombre, tituloAtras: nombre.length > 12 ? "Grupo" : nombre, grande: true,
    render(c) {
      const A = store.analisis(), grupos = store.estado.ajustes.grupos;
      const k = canon(nombre);
      const semanas = A.semanas.slice(-8);
      const porSem = semanas.map((s) => A.series.filter((x) => x.dia && canon(x.grupo) === k && claveSemana(x.dia) === s.clave).length);
      const obj = (A.C.volumenObj || []).find((o) => canon(o.grupo) === k);
      const ejs = A.ejercicios.filter((e) => canon(e.grupo) === k);
      const L = A.liga, lg = L && L.ok ? L.grupos.get(k) : null;
      const color = colorGrupo(grupos, nombre);
      poner(c,
        seccion({ cab: "Series por semana" + (obj ? " · objetivo " + obj.min + "–" + obj.max : "") }, h("div", { class: "tarjeta" },
          h("div", { class: "resumen-grafica" }, h("div", { class: "etiqueta" }, "Esta semana"), h("div", { class: "cifra" }, String(porSem[porSem.length - 1] || 0), h("span", { class: "ud" }, " series"))),
          graficaBarras({ datos: semanas.map((s, i) => ({ etiqueta: s.etiqueta, partes: [{ valor: porSem[i], color }] })), banda: obj ? [obj.min, obj.max] : null, formato: (v) => plural(Math.round(v), "serie", "series"),
            detalle: (d) => "semana del " + d.etiqueta, etiqueta: "Series de " + nombre + " por semana" }))),
        ligaVigente(lg) ? seccion({}, lista([celda({ izquierda: insignia(ligaVigente(lg).p.nivel, 32), titulo: "Liga de " + nombre, sub: ligaVigente(lg).viejo ? "Última conocida" : null, valor: ligaVigente(lg).p.nivel.txt, chevron: true,
          alPulsar: () => app.nav.ir("liga/grupo/" + encodeURIComponent(k)) })])) : null,
        ejs.length ? seccion({ cab: "Ejercicios" }, lista(ejs.sort((a, b) => b.ser - a.ser).map((e) => {
          const d = A.diagnostico.get(e.k);
          return celda({ titulo: e.nombre, sub: plural(e.ser, "serie", "series") + " en total", valor: h("span", { class: "valor-tend" }, flechaEstado(d), e.rmMax ? kg(e.rmMax.st.oneRM) : "—"),
            chevron: true, alPulsar: () => app.nav.ir("ejercicio/" + encodeURIComponent(e.k)) });
        }))) : vacio({ icono: "pesa", titulo: "Sin ejercicios", texto: "Aún no has registrado ejercicios de este grupo." }));
    },
  };
}
vistaGrupo.pestana = "progreso";

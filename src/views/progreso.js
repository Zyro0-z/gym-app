// Progreso: «¿voy bien?». Segmentado Resumen · Ejercicios · Músculos · Cuerpo.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, vacio, chip, segmentado } from "../ui/controles.js";
import { graficaBarras, graficaLinea, sparkline } from "../ui/graficas.js";
import { diagramaCuerpo } from "../ui/cuerpo.js";
import { insignia } from "../ui/insignias.js";
import { colorGrupo } from "../ui/tema.js";
import { fmt, plural, conSigno } from "../core/formato.js";
import { canon, sinTildes } from "../core/nombres.js";
import { deNum, masDias, claveSemana, menosMeses } from "../core/fechas.js";
import { ultimasSemanasRapido } from "../core/semanal.js";
import { ESTADOS } from "../core/estancamiento.js";
import { compararPeriodo, estadoObjetivoSemana, fraccionSemana } from "../core/presentacion.js";
import { kgTotal, kg, minutos, fechaCorta, capital } from "../ui/textos.js";
import { abrirPesaje } from "./pesaje.js";
import { ligaVigente } from "./ligas.js";
import { elegirRutina } from "./hoy.js";

const SEGMENTOS = [{ valor: "resumen", texto: "Resumen" }, { valor: "ejercicios", texto: "Ejercicios" }, { valor: "musculos", texto: "Músculos" }, { valor: "cuerpo", texto: "Cuerpo" }];
/** Sin preferencia guardada y sin series esta semana, Músculos abre en el primer periodo con series (semana, 30 días o todo) para no enseñar un mapa vacío. */
const periodoGuardado = () => { try { return localStorage.getItem("gym-periodo-musculos"); } catch (e) { return null; } };
const leerPref = (k, d) => { try { return localStorage.getItem("gym-" + k) || d; } catch (e) { return d; } };
const ponerPref = (k, v) => { try { localStorage.setItem("gym-" + k, v); } catch (e) {} };

export const TONO = { bad: "bad", warn: "warn", ok: "ok", neutro: null };
export const tonoEstado = (estado) => TONO[(ESTADOS[estado] || {}).tono] || null;
export const iconoTend = (t) => (!t ? null : t.dir === "plana" ? "igual" : t.dir.startsWith("sube") ? "sube" : "baja");
export const pctTxt = (p) => conSigno(p, Math.abs(p) < 10 ? 1 : 0) + " %";

export function vistaProgreso(_p, app) {
  const { store } = app;
  const periodoMusculos = (A) => periodoGuardado() || ["sem", "30d"].find((x) => A.balance(x).total) || "all";
  let seg = leerPref("progreso", "resumen"), q = "", semVol = leerPref("periodo-volumen", null), periodo = leerPref("periodo-musculos", "sem"), rango = leerPref("rango-cuerpo", "3M");
  const def = {
    titulo: "Progreso",
    bajoTitulo: () => segmentado(SEGMENTOS, seg, (v) => { seg = v; ponerPref("progreso", v); pintarCuerpo(); }, { etiqueta: "Sección" }),
    render(c) { def._c = c; pintarCuerpo(); },
  };
  function pintarCuerpo() {
    const c = def._c; if (!c) return;
    const A = store.analisis();
    if (!A.sesiones.length && seg !== "cuerpo") {
      poner(c, vacio({ icono: "progreso", titulo: "Aún no hay datos", texto: "Cuando registres entrenamientos verás aquí tu progreso.", acciones: [{ texto: "Empezar entrenamiento", alPulsar: () => elegirRutina(app) }] }));
      return;
    }
    if (seg === "resumen") poner(c, resumen(A, app, semVol, (v) => { semVol = v; ponerPref("periodo-volumen", v); pintarCuerpo(); }));
    else if (seg === "ejercicios") poner(c, ejercicios(A, app, q, (v) => { q = v; }));
    else if (seg === "musculos") poner(c, musculos(A, app, periodoMusculos(A), (v) => { periodo = v; ponerPref("periodo-musculos", v); pintarCuerpo(); }));
    else poner(c, cuerpo(A, app, rango, (v) => { rango = v; ponerPref("rango-cuerpo", v); pintarCuerpo(); }));
  }
  return def;
}

// ─────────── Resumen ───────────

const PERIODOS_VOL = [{ valor: "8", texto: "8 semanas" }, { valor: "26", texto: "6 meses" }, { valor: "52", texto: "1 año" }];

/** Resumen: una gráfica principal (volumen semanal con periodo) y debajo el detalle, en listas. */
// Semanas de 6 meses y 1 año, una vez por análisis (cambiar de periodo no recalcula)
const cacheSemanas = new WeakMap();
function semanasDe(A, k) {
  let c = cacheSemanas.get(A); if (!c) cacheSemanas.set(A, (c = {}));
  return c[k] || (c[k] = ultimasSemanasRapido(A.C, A.sesiones, k));
}

function resumen(A, app, semVol, cambiarSem) {
  const r = A.resumen, grupos = app.store.estado.ajustes.grupos;
  const fr = fraccionSemana(A.hoy), cmp = compararPeriodo(r.act.vol, r.prev.vol, fr);
  const delta = cmp.tipo === "pct" ? chip(cmp.texto, cmp.mejora ? "ok" : "warn", { icono: cmp.mejora ? "sube" : "baja" }) : chip(cmp.texto, null);
  // Sin preferencia guardada, el primer periodo con volumen (para no abrir con una gráfica vacía)
  const deN = (k) => (k === 8 ? A.semanas.slice(-8) : semanasDe(A, k));
  let n = PERIODOS_VOL.some((p) => p.valor === semVol) ? +semVol : null, semanas;
  if (n) semanas = deN(n);
  else for (const k of [8, 26, 52]) { n = k; semanas = deN(k); if (semanas.some((x) => x.vol > 0)) break; }
  const media = semanas.reduce((a, s) => a + s.vol, 0) / (semanas.length || 1);
  const out = [];
  out.push(seccion({ pie: media > 0 ? "Toca una barra para ver su semana. Media del periodo: " + kgTotal(media) + " por semana." : null }, h("div", { class: "tarjeta" },
    h("div", { class: "fila entre" }, h("div", { class: "etiqueta" }, "Volumen esta semana"), r.act.vol || r.prev.vol ? delta : null),
    h("div", { class: "cifra t-title1 c-accent" }, kgTotal(r.act.vol)),
    h("div", { class: "t-subhead c-2", style: { marginTop: "2px" } }, [plural(r.act.ser, "serie", "series"), plural(r.act.n, "sesión", "sesiones"), r.mediaDur ? "media " + minutos(r.mediaDur) : null].filter(Boolean).join(" · ")),
    h("div", { style: { margin: "14px 0 2px" } }, segmentado(PERIODOS_VOL, String(n), cambiarSem, { etiqueta: "Periodo de la gráfica" })),
    semanas.some((x) => x.vol > 0)
      ? graficaBarras({ datos: semanas.map((s, i) => ({ etiqueta: s.etiqueta, valor: s.vol, ser: s.ser, activa: i === semanas.length - 1 })), formato: (v) => kgTotal(v),
        detalle: (d) => "semana del " + d.etiqueta + " · " + plural(d.ser, "serie", "series"), etiqueta: "Volumen semanal, " + PERIODOS_VOL.find((p) => +p.valor === n).texto })
      : h("p", { class: "etiqueta grafica-vacia", style: { height: "180px" } }, "Sin sesiones en este periodo."))));

  const so = A.seriesObjetivo;
  if (so && so.lista.length) {
    const tope = Math.max(...so.lista.map((o) => Math.max(o.max, o.hechas + o.previstas)), 1);
    out.push(seccion({ cab: "Series por grupo · objetivo semanal", pie: so.lista.some((o) => o.previstas) ? "La barra clara son las series previstas hasta el domingo." : null },
      lista(so.lista.map((o) => {
        const est = o.cierre.estado;
        const marca = est === "enRango" || est === "llegara" ? chip(est === "llegara" ? "Llegarás" : "En rango", "ok", { icono: "check" })
          : est === "noLlega" ? (estadoObjetivoSemana(o.cierre, fr).tipo === "deficit" ? chip("Faltan " + o.cierre.faltan, "warn") : chip("En curso", null)) : est === "encima" ? chip("Por encima", "warn") : est === "deload" ? chip("Descarga", "accent") : null;
        return celda({ punto: colorGrupo(grupos, o.grupo), titulo: o.grupo, sub: h("span", { class: "barra-objetivo" }, barraObjetivo(o, tope), h("span", { class: "num" }, o.hechas + (o.previstas ? " + " + o.previstas : "") + " de " + o.min + "–" + o.max)),
          valor: marca, alPulsar: () => app.nav.ir("grupo/" + encodeURIComponent(o.grupo)) });
      }))));
  }

  const desde = masDias(A.hoy, -30);
  const recientes = A.ejercicios.filter((e) => e.rmMax && e.rmMax.dia && e.rmMax.dia >= desde).sort((a, b) => (a.rmMax.dia < b.rmMax.dia ? 1 : -1)).slice(0, 5);
  if (recientes.length) out.push(seccion({ cab: "Récords de los últimos 30 días" }, lista(recientes.map((e) => celda({ titulo: e.nombre, sub: "e1RM " + kg(e.rmMax.st.oneRM),
    valor: capital(fechaCorta(e.rmMax.dia, A.hoy)), chevron: true, alPulsar: () => app.nav.ir("ejercicio/" + encodeURIComponent(e.k)) })))));

  const avisos = [...A.diagnostico.values()].filter((d) => d.estado === "retrocede" || d.estado === "estancado").sort((a, b) => ESTADOS[a.estado].orden - ESTADOS[b.estado].orden);
  if (avisos.length) out.push(seccion({ cab: "Avisos" }, lista(avisos.map((d) => celda({ titulo: d.e.nombre, sub: d.diasSinPR != null ? plural(d.diasSinPR, "día", "días") + " sin récord" : null,
    valor: chip(ESTADOS[d.estado].texto, tonoEstado(d.estado)), chevron: true, alPulsar: () => app.nav.ir("ejercicio/" + encodeURIComponent(d.e.k)) })))));

  const L = A.liga;
  const vg = L && L.ok ? ligaVigente(L.general) : null;
  out.push(seccion({ cab: "Más análisis" }, lista([
    vg ? celda({ izquierda: insignia(vg.p.nivel, 32), titulo: "Liga", sub: vg.viejo ? "Última conocida" : null, valor: vg.p.nivel.txt, chevron: true, alPulsar: () => app.nav.ir("ligas") }) : null,
    celda({ titulo: "Series por músculo", sub: "Volumen semanal efectivo, con recuento fraccional", chevron: true, alPulsar: () => app.nav.ir("musculos") }),
    celda({ titulo: "Fatiga y descarga", sub: "Semana a semana: e1RM, RPE y recuperación", chevron: true, alPulsar: () => app.nav.ir("fatiga") }),
    celda({ titulo: "Rendimiento y recuperación", sub: "Cómo rindes según el sueño, el estrés y la energía", chevron: true, alPulsar: () => app.nav.ir("rendimiento") }),
    celda({ titulo: "Molestias articulares", sub: "Dónde, cuánto y con qué ejercicio", valor: (app.store.estado.molestias || []).length ? String(app.store.estado.molestias.length) : null, chevron: true, alPulsar: () => app.nav.ir("molestias") }),
    celda({ titulo: "Mesociclos", sub: "Bloques de semanas y su resumen", chevron: true, alPulsar: () => app.nav.ir("mesociclos") }),
    A.porGimnasio && A.porGimnasio.length ? celda({ titulo: "Por gimnasio", sub: "Tu e1RM en cada gimnasio, ejercicio a ejercicio", chevron: true, alPulsar: () => app.nav.ir("porGimnasio") }) : null,
    celda({ titulo: "Comparar periodos", sub: "4 semanas, mes o 3 meses frente al anterior", chevron: true, alPulsar: () => app.nav.ir("comparar") }),
  ].filter(Boolean))));
  return out;
}

function barraObjetivo(o, tope) {
  const el = h("span", { class: "barra-obj", "aria-hidden": "true" });
  el.append(h("i", { class: "banda", style: { left: (o.min / tope * 100) + "%", width: ((o.max - o.min) / tope * 100) + "%" } }),
    h("i", { class: "previstas", style: { width: ((o.hechas + o.previstas) / tope * 100) + "%" } }),
    h("i", { class: "hechas", style: { width: (o.hechas / tope * 100) + "%" } }));
  return el;
}

// ─────────── Ejercicios ───────────

function ejercicios(A, app, q, guardarQ) {
  const grupos = app.store.estado.ajustes.grupos;
  const buscador = h("input", { type: "search", class: "buscador", placeholder: "Buscar ejercicio", value: q, "aria-label": "Buscar ejercicio", autocomplete: "off", autocorrect: "off", spellcheck: false });
  const res = h("div");
  const pintar = () => {
    const t = sinTildes(buscador.value);
    const vis = A.ejercicios.filter((e) => !t || sinTildes(e.nombre).includes(t));
    const porG = new Map();
    for (const e of vis) { const g = e.grupo || "Sin grupo"; if (!porG.has(g)) porG.set(g, []); porG.get(g).push(e); }
    const orden = grupos.map((g) => g.nombre).filter((g) => porG.has(g)).concat([...porG.keys()].filter((g) => !grupos.some((x) => x.nombre === g)));
    poner(res, !vis.length ? h("p", { class: "seccion-pie", style: { textAlign: "center", padding: "16px" } }, "Ningún ejercicio coincide.") : null,
      orden.map((g) => seccion({ cab: g }, lista(porG.get(g).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((e) => {
        const d = A.diagnostico.get(e.k), ic = iconoTend(d && d.tend);
        return celda({ titulo: e.nombre, sub: d ? ESTADOS[d.estado].texto : null,
          valor: h("span", { class: "valor-tend" }, e.hist.length >= 3 ? sparkline(e.hist.slice(-8).map((x) => x.mejorRM), { ancho: 48, alto: 18 }) : null,
            ic ? h("span", { class: "c-" + (ic === "sube" ? "ok" : ic === "baja" ? "bad" : "2") }, icono(ic, { tam: 16, grosor: 2.2 })) : null, e.rmMax ? kg(e.rmMax.st.oneRM) : "—"),
          chevron: true, alPulsar: () => app.nav.ir("ejercicio/" + encodeURIComponent(e.k)) });
      })))));
  };
  buscador.addEventListener("input", () => { guardarQ(buscador.value); pintar(); });
  pintar();
  return [h("div", { class: "seccion junta" }, buscador), res];
}

// ─────────── Músculos ───────────

const PERIODOS_M = [{ valor: "sem", texto: "Semana" }, { valor: "30d", texto: "30 días" }, { valor: "all", texto: "Todo" }];

function musculos(A, app, periodo, cambiar) {
  const grupos = app.store.estado.ajustes.grupos;
  const b = A.balance(periodo);
  const okDia = periodo === "sem" ? (d) => claveSemana(d) === claveSemana(A.hoy) : periodo === "30d" ? (d) => d >= masDias(A.hoy, -29) : () => true;
  const vol = new Map();
  for (const x of A.series) if (x.dia && okDia(x.dia)) vol.set(canon(x.grupo), (vol.get(canon(x.grupo)) || 0) + (x.st.volumen || 0));
  const filas = grupos.map((g) => ({ nombre: g.nombre, k: canon(g.nombre), ser: b.series[canon(g.nombre)] || 0, vol: vol.get(canon(g.nombre)) || 0, g }));
  const diagrama = diagramaCuerpo(filas.filter((f) => f.g.regiones && f.g.regiones.length).map((f) => ({ nombre: f.nombre, tokens: f.g.regiones, valor: f.ser })),
    { etiqueta: "Series por grupo muscular", unidad: (v) => plural(v, "serie", "series") });
  const semanas = A.semanas.slice(-8);
  const vpg = A.volumenPorGrupo;
  const datos = semanas.map((s, i) => ({ etiqueta: s.etiqueta, partes: vpg.map((g) => ({ valor: g.semanas[g.semanas.length - semanas.length + i] || 0, color: colorGrupo(grupos, g.grupo) })) }));
  return [
    h("div", { class: "seccion junta" }, segmentado(PERIODOS_M, periodo, cambiar, { etiqueta: "Periodo" })),
    seccion({ pie: plural(b.total, "serie", "series") + " en el periodo. Más intensidad, más series." }, h("div", { class: "tarjeta" }, diagrama)),
    seccion({ cab: "Grupos, de más a menos series" }, lista(filas.sort((a, z) => z.ser - a.ser).map((f) => celda({ punto: colorGrupo(grupos, f.nombre), titulo: f.nombre, sub: f.vol ? kgTotal(f.vol) : null,
      valor: h("span", { class: "num" }, plural(f.ser, "serie", "series")), chevron: true, alPulsar: () => app.nav.ir("grupo/" + encodeURIComponent(f.nombre)) })))),
    seccion({ cab: "Volumen por grupo · 8 semanas" }, h("div", { class: "tarjeta" },
      graficaBarras({ datos, formato: (v) => kgTotal(v), detalle: (d) => "semana del " + d.etiqueta, etiqueta: "Volumen por grupo en las últimas 8 semanas" }),
      h("div", { class: "leyenda" }, vpg.map((g) => h("span", null, h("i", { style: { background: colorGrupo(grupos, g.grupo) } }), g.grupo))))),
  ];
}

// ─────────── Cuerpo ───────────

const RANGOS = [{ valor: "1M", texto: "1M" }, { valor: "3M", texto: "3M" }, { valor: "6M", texto: "6M" }, { valor: "Todo", texto: "Todo" }];
const FASES = { bulk: "volumen", cut: "definición", mantener: "mantenimiento" };

function cuerpo(A, app, rango, cambiar) {
  const { store } = app;
  const pes = store.estado.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const nMed = (store.estado.medidas || []).length;
  const medidas = seccion({}, lista([celda({ titulo: "Medidas corporales", valor: nMed ? String(nMed) : "Ninguna", chevron: true, alPulsar: () => app.nav.ir("medidas") })]));
  if (!pes.length) return [vacio({ icono: "bascula", titulo: "Apunta tu peso", texto: "Con dos pesajes verás la tendencia. Las ligas también lo necesitan.", acciones: [{ texto: "Añadir pesaje", alPulsar: () => abrirPesaje(app) }] }), medidas];
  const rp = A.resumenPeso, ult = rp && rp.ultimo;
  const desde = rango === "Todo" ? "0000" : menosMeses(A.hoy, { "1M": 1, "3M": 3, "6M": 6 }[rango]);
  const pts = A.peso.puntos.filter((p) => p.fecha >= desde);
  const puntos = pts.map((p) => ({ x: p.dia, y: p.kg, detalle: capital(fechaCorta(p.fecha, A.hoy)) }));
  const medias = pts.filter((p) => p.media != null).map((p) => ({ x: p.dia, y: p.media }));
  const ob = rp && rp.objetivo;
  let estado = null;
  if (ob && ob.estado === "ritmo") estado = chip((ob.ritmo != null ? conSigno(ob.ritmo, 2) + " kg/sem · " : "") + (ob.color === "verde" ? "a favor" : ob.color === "rojo" ? "en contra" : "estable"), ob.color === "verde" ? "ok" : ob.color === "rojo" ? "bad" : "warn");
  else if (ob && ob.estado === "mantener") estado = chip(ob.color === "verde" ? "Dentro de la banda" : "Fuera de la banda", ob.color === "verde" ? "ok" : "bad");
  else if (ob && (ob.estado === "referencia" || ob.estado === "sinColor")) estado = chip("Faltan pesajes para la tendencia");
  const fase = rp && rp.fase ? "Fase de " + (FASES[rp.fase.tipo] || rp.fase.tipo) + " desde el " + fechaCorta(rp.fase.desde, A.hoy) : null;
  return [
    seccion({}, h("div", { class: "tarjeta" },
      h("div", { class: "fila entre" }, h("div", { class: "cifra t-title1 c-accent" }, fmt(ult ? ult.kg : pes[0].kg, 1), h("span", { class: "ud" }, " kg")),
        ult && ult.media != null ? h("div", { class: "etiqueta num" }, "media " + fmt(ult.media, 1)) : null),
      fase ? h("div", { class: "t-subhead c-2", style: { marginTop: "2px" } }, fase) : null,
      estado ? h("div", { style: { marginTop: "6px" } }, estado) : null,
      h("div", { style: { margin: "12px 0 4px" } }, segmentado(RANGOS, rango, cambiar, { etiqueta: "Rango" })),
      puntos.length ? graficaLinea({ puntos, secundaria: medias, formato: (v) => kg(v), ejeX: (n) => fechaCorta(deNum(n)), area: false, etiqueta: "Peso corporal" })
        : h("p", { class: "etiqueta", style: { padding: "24px 0", textAlign: "center" } }, "Sin pesajes en este periodo."))),
    medidas,
    rp && rp.cambio ? h("p", { class: "seccion t-subhead" }, (rp.cambio.dif >= 0 ? "Has ganado " : "Has perdido ") + fmt(Math.abs(rp.cambio.dif), 1) + " kg desde el " + fechaCorta(rp.inicio, A.hoy) + ".") : null,
    seccion({ cab: "Pesajes", accion: { texto: "Añadir", alPulsar: () => abrirPesaje(app) } }, lista(pes.slice(0, 60).map((p) => celda({ titulo: capital(fechaCorta(p.fecha, A.hoy)), valor: kg(p.kg), chevron: true,
      alPulsar: () => abrirPesaje(app, p),
      alBorrar: async () => { await store.guardarPesajes(store.estado.pesajes.filter((x) => !(x.fecha === p.fecha && x.kg === p.kg))); app.toast("Pesaje borrado", { icono: "papelera" }); } })))),
  ];
}


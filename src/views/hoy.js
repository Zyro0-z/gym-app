// Hoy: «¿qué hago ahora?». Tarjeta de lo que toca (o del entrenamiento en curso), la semana,
// series y racha, la última sesión, el peso y el acceso a otra rutina.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, anillo, vacio, chip, boton, avisoCompacto } from "../ui/controles.js";
import { fechaCabecera, capital, fechaRelativa, kg, fechaCorta, reloj, minutos, kgTotal } from "../ui/textos.js";
import { masDias, lunesDe, diaSemana } from "../core/fechas.js";
import { plural, kgCorto, fmt } from "../core/formato.js";
import { canon } from "../core/nombres.js";
import { lineaSesion, sesionesOrdenadas, totalesSesion } from "./comun.js";
import { empezarEntreno, abrirEntreno, mostrarResumen } from "./entreno.js";
import { abrirPesaje } from "./pesaje.js";
import { importarCopia, exportarCopia } from "./datos.js";
import { nuevaRutina } from "./editores.js";
import { programarDescarga, posponerDescarga } from "./fatiga.js";
import { mostrarInstalar, marcarVisto } from "../ui/instalar.js";
import { propuestaDescarga } from "../core/descarga.js";
import { mesocicloActual, estadoMesociclo } from "../core/mesociclos.js";
import { sparkline } from "../ui/graficas.js";
import { sugerirCarga } from "../core/sugerencia.js";

export function vistaHoy(_p, app) {
  const { store } = app;
  let reloj1 = 0;
  const def = {
    titulo: "Hoy",
    sobre: () => fechaCabecera(store.hoy()),
    bajoTitulo: () => {
      const A = store.analisis(), b = A.C.bloquesActivos(A.hoy).find((x) => x.esDeload);
      if (b) return chip("Descarga hasta el " + fechaCorta(b.fin, A.hoy), "accent");
      const m = mesocicloActual(store.estado.ajustes.mesociclos, A.hoy);
      return m ? chip(m.nombre + " · semana " + estadoMesociclo(m, A.hoy).semana + " de " + m.semanas, null) : null;
    },
    alOcultar: () => clearInterval(reloj1),
    destruir: () => clearInterval(reloj1),
    render(c) {
      clearInterval(reloj1);
      const est = store.estado;
      if (!est.rutinas.length && !est.sesiones.length && !est.borrador) {
        poner(c, vacio({ icono: "lista", titulo: "Crea tu primera rutina", texto: "Una rutina es la lista de ejercicios de un día de entrenamiento.",
          acciones: [{ texto: "Crear rutina", alPulsar: () => nuevaRutina(app) },
            { texto: "Importar copia", estilo: "texto", alPulsar: () => importarCopia(app) }] }));
        return;
      }
      const A = store.analisis();
      poner(c, tarjetaHoy(A, est, app), avisoInstalar(def, c), avisoDescarga(A, app), semana(A, est), avisoCopia(app), lineas(A, est, app));
      if (est.borrador) {
        const t = c.querySelector("[data-reloj-hoy]");
        reloj1 = setInterval(() => { if (t && store.estado.borrador) t.textContent = reloj((Date.now() - store.estado.borrador.inicio) / 1000); }, 1000);
      }
    },
  };
  return def;
}

function siguienteRutina(A) {
  for (let i = 1; i <= 7; i++) {
    const d = masDias(A.hoy, i), r = A.C.horario.get(diaSemana(d));
    if (r && canon(r) !== "descanso") return { rutina: r, dia: d, i };
  }
  return null;
}

/** Hoja para elegir con qué rutina entrenar (o un entrenamiento libre). */
export function elegirRutina(app) {
  const { store } = app;
  app.abrirHoja({
    titulo: "Empezar entrenamiento", alturas: ["media", "grande"],
    render(c) {
      const rs = store.estado.rutinas;
      poner(c,
        rs.length ? seccion({ cab: "Rutinas" }, lista(rs.map((r) => celda({ titulo: r.nombre, sub: plural(r.ejercicios.length, "ejercicio", "ejercicios") + " · " + plural(r.ejercicios.reduce((a, e) => a + (e.series || 0), 0), "serie", "series"),
          chevron: true, alPulsar: () => { app.cerrarHoja(); empezarEntreno(r.nombre); } })))) : null,
        seccion({}, lista([celda({ titulo: "Entrenamiento libre", chevron: true, alPulsar: () => { app.cerrarHoja(); empezarEntreno(null); } })])));
    },
  });
}

function tarjetaHoy(A, est, app) {
  if (est.borrador) {
    const b = est.borrador;
    const hechas = b.ejercicios.reduce((a, e) => a + e.series.filter((s) => s.hecha).length, 0);
    return h("div", { class: "seccion compacta" }, h("div", { class: "hero", role: "region", "aria-label": "Entrenamiento en curso" },
      h("div", { class: "hero-top" }, h("span", { class: "hero-kicker" }, "En curso")),
      h("h2", { class: "hero-title" }, b.rutina || "Entrenamiento libre"),
      h("div", { class: "hero-meta num" }, plural(hechas, "serie hecha", "series hechas")),
      h("div", { class: "cta-split" }, h("button", { class: "btn", onClick: () => abrirEntreno() }, icono("play"), h("span", null, "Continuar · "), h("span", { class: "num", dataset: { relojHoy: "1" } }, reloj((Date.now() - b.inicio) / 1000))))));
  }
  const t = A.hoyToca;
  const sig = siguienteRutina(A);
  let titulo, meta = [], extra = null, accion, repetir = null, cifra = null, kicker = "Sesión de hoy";
  if (t && !t.descanso && t.estado === "hecho") {
    titulo = t.esperado;
    const s = t.coincide[0] || t.logsHoy[0];
    const ses = s && est.sesiones.find((x) => x.id === s.id);
    extra = chip("Hecho" + (s && s.dur && s.dur.min ? " · " + s.dur.min + " min" : "") + " · " + plural(t.hechas, "serie", "series"), "ok", { icono: "check" });
    accion = ses ? boton("Ver resumen", () => mostrarResumen(ses), { estilo: "gris" }) : null;
  } else if (t && !t.descanso) {
    titulo = t.esperado;
    const n = t.rutina ? t.rutina.ejercicios.length : 0;
    const dur = duracionTipica(est, t.esperado);
    meta = [n ? plural(n, "ejercicio", "ejercicios") : null, t.objetivo ? plural(t.objetivo, "serie", "series") : null, dur ? "~" + minutos(dur) : null].filter(Boolean);
    if (!t.rutina) meta = ["La rutina «" + t.esperado + "» no existe"];
    if (t.estado === "otra") extra = chip("Hoy ya entrenaste otra rutina", null);
    accion = boton("Empezar sesión", () => (t.rutina ? empezarEntreno(t.esperado) : elegirRutina(app)), { icono: "play" });
    repetir = ultimaDe(est, t.esperado);
    cifra = cifraClave(A, t.rutina);
  } else if (t && t.descanso) {
    kicker = "Hoy";
    titulo = "Descanso";
    meta = sig ? [(sig.i === 1 ? "Mañana: " : capital(fechaRelativa(sig.dia, A.hoy)) + ": ") + sig.rutina] : [];
    if (t.logsHoy.length) extra = chip("Hoy ya entrenaste", "ok", { icono: "check" });
    accion = boton("Entrenar igualmente", () => elegirRutina(app), { estilo: "gris" });
  } else {
    kicker = "Hoy";
    titulo = "Sin plan";
    meta = [sig ? "Próxima: " + sig.rutina + ", " + fechaRelativa(sig.dia, A.hoy) : "Asigna rutinas a los días en Ajustes › Horario."];
    accion = boton("Empezar entrenamiento", () => elegirRutina(app), { icono: "play" });
    repetir = ultimaDe(est, null);
  }
  const otra = repetir ? h("button", { class: "btn-cuadrado", onClick: () => empezarEntreno(repetir.rutina, { desde: repetir }),
    "aria-label": "Repetir la última sesión" + (repetir.rutina ? " de " + repetir.rutina : "") + ", del " + fechaCorta(repetir.fecha, A.hoy) }, icono("repetir")) : null;
  return h("div", { class: "seccion compacta" }, h("div", { class: "hero", role: "region", "aria-label": kicker + ": " + titulo },
    h("div", { class: "hero-top" }, h("span", { class: "hero-kicker" }, kicker)),
    h("h2", { class: "hero-title" }, titulo),
    meta.length ? h("div", { class: "hero-meta num" }, meta.join(" · ")) : null,
    cifra ? h("div", { class: "cifra-clave" },
      h("div", { class: "izq" }, h("div", { class: "etiqueta" }, "Objetivo principal"), h("div", { class: "nombre" }, cifra.nombre),
        cifra.ajuste ? h("span", { class: "ajuste num" }, cifra.ajuste) : null),
      h("div", { class: "der num" }, h("div", { class: "cifra" }, kgCorto(cifra.peso), h("small", null, " kg")), h("div", { class: "reps" }, "× " + plural(cifra.reps, "rep", "reps")))) : null,
    extra ? h("div", { class: "hero-extra" }, extra) : null,
    accion ? h("div", { class: ["cta-split", !otra && "solo"] }, accion, otra) : null));
}

/** Mediana de la duración de las últimas sesiones de la rutina (minutos), si hay al menos dos. */
function duracionTipica(est, nombre) {
  const d = sesionesOrdenadas(est).filter((s) => s.rutina === nombre && s.duracion > 0).slice(0, 4).map((s) => s.duracion).sort((a, b) => a - b);
  return d.length >= 2 ? d[Math.floor(d.length / 2)] : null;
}

/** Cifra clave de la sesión: la carga sugerida para el primer ejercicio de la rutina que tenga una. */
function cifraClave(A, rutina) {
  if (!rutina) return null;
  try {
    for (const e of rutina.ejercicios.slice(0, 3)) {
      const p = A.progresionDe(e.k), s = p ? sugerirCarga(p, A.incrementoDe(p)) : null;
      if (s) {
        const d = Math.round((s.peso - p.pesoMax) * 100) / 100, rpe = p.obj && p.obj.rpeObjetivo > 0 ? p.obj.rpeObjetivo : null;
        const aj = d > 0 ? "Sube " + kgCorto(d) + " kg" : d < 0 ? "Baja " + kgCorto(-d) + " kg" : "Mismo peso";
        return { nombre: e.nombre, peso: s.peso, reps: s.reps, ajuste: aj + (rpe ? " · @" + kgCorto(rpe) : "") };
      }
    }
  } catch (err) { /* sin sugerencia */ }
  return null;
}

/** Última sesión de la rutina `nombre` (o la última de todas si es null). */
function ultimaDe(est, nombre) {
  const l = sesionesOrdenadas(est).filter((s) => (nombre ? s.rutina === nombre : true) && s.ejercicios && s.ejercicios.length);
  return l[0] || null;
}

/** «Esta semana»: anillo y días en una fila, series frente al objetivo y racha. */
function semana(A, est) {
  const lunes = lunesDe(A.hoy), hechos = new Set(est.sesiones.map((s) => s.fecha));
  const letras = ["L", "M", "X", "J", "V", "S", "D"];
  const tira = h("div", { class: "tira-semana", role: "list", "aria-label": "Días de esta semana" }, letras.map((l, i) => {
    const d = masDias(lunes, i), r = A.C.horario.get(i + 1), desc = !r || canon(r) === "descanso";
    const estado = hechos.has(d) ? "hecho" : d >= A.hoy && !desc ? "previsto" : "nada";
    return h("div", { class: ["dia-sem", d === A.hoy && "hoy", estado], role: "listitem", "aria-label": l + ": " + (estado === "hecho" ? "entrenado" : estado === "previsto" ? r : "descanso") },
      h("span", { class: "letra" }, l), h("span", { class: "marca" }));
  }));
  const so = A.seriesObjetivo;
  const hechas = so ? so.lista.reduce((a, g) => a + g.hechas, 0) : A.resumen.act.ser;
  const objetivo = so ? so.lista.reduce((a, g) => a + g.min, 0) : 0;
  const previstas = so ? so.lista.reduce((a, g) => a + g.previstas, 0) : 0;
  const r = A.racha, n = r.viva ? r.racha : 0;
  const frac = objetivo ? hechas / objetivo : 0;
  const anilloEl = anillo({ frac, tam: 56, grosor: 6.5, ok: objetivo > 0 && hechas >= objetivo, etiqueta: objetivo ? hechas + " de " + objetivo + " series" : plural(hechas, "serie", "series") + " esta semana",
    centro: h("div", { class: "centro-anillo" }, objetivo ? Math.round(frac * 100) + " %" : String(hechas)) });
  const rachaEl = h("span", { class: ["racha-pill", "num", !r.viva && "apagada"], "aria-label": plural(n, "semana", "semanas") + " de racha" },
    icono("llama", { tam: 13 }), plural(n, "sem", "sem") + " racha");
  return h("div", { class: "seccion compacta" }, h("div", { class: "tarjeta semana-card" },
    h("div", { class: "semana-cab" }, h("span", { class: "kicker" }, "Esta semana"), rachaEl),
    h("div", { class: "semana-fila" }, anilloEl, tira),
    h("div", { class: "semana-pie" },
      h("div", { class: "dato" }, h("b", { class: "num" }, objetivo ? hechas + " / " + objetivo : String(hechas)), " series efectivas"),
      previstas > 0 ? h("div", { class: "previstas num" }, "+" + previstas + " previstas") : null)));
}

/** Última sesión y peso en dos teselas; debajo, «Otra rutina». */
function lineas(A, est, app) {
  const s = sesionesOrdenadas(est)[0];
  const ult = est.pesajes.length ? est.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0] : null;
  const tendencia = A.peso.puntos.slice(-14).map((p) => (p.media != null ? p.media : p.kg));
  const tot = s ? totalesSesion(s) : null;
  const teselaSesion = s ? h("button", { class: "tesela", onClick: () => app.nav.ir("sesion/" + encodeURIComponent(s.id), { pestana: "historial" }),
    "aria-label": "Última sesión: " + (s.rutina || "Entrenamiento libre") + ", " + lineaSesion(s) },
    h("div", { class: "kicker" }, "Última · " + capital(fechaRelativa(s.fecha, A.hoy))),
    h("div", null, h("div", { class: "tesela-tit" }, s.rutina || "Entrenamiento libre"),
      h("div", { class: "tesela-sub num" }, [tot.series + " ser", tot.vol ? fmt(tot.vol / 1000, 1) + " t" : null, s.duracion ? minutos(s.duracion) : null].filter(Boolean).join(" · ")))) : null;
  const teselaPeso = h("div", { class: "tesela" },
    h("div", { class: "tesela-cab" }, h("span", { class: "kicker" }, "Peso"),
      h("button", { class: "btn-mas", "aria-label": "Añadir pesaje", onClick: () => abrirPesaje(app) }, icono("mas"))),
    h("div", { class: "tesela-peso" },
      h("div", null, h("div", { class: "tesela-val num" }, ult ? kgCorto(ult.kg) : "—", ult ? h("small", null, " kg") : null)),
      tendencia.length >= 3 ? sparkline(tendencia, { ancho: 46, alto: 22 }) : null));
  return h("div", { class: "seccion" },
    h("div", { class: "teselas" }, teselaSesion, teselaPeso),
    est.borrador ? null : lista([celda({ icono: "lista", colorIcono: "var(--g-naranja)", titulo: "Otra rutina", chevron: true, alPulsar: () => elegirRutina(app) })], { iconos: false }));
}

/** En Safari sin instalar: cómo añadirla a la pantalla de inicio (una vez, hasta «Entendido»). */
function avisoInstalar(def, c) {
  if (!mostrarInstalar()) return null;
  return h("div", { class: "seccion" }, avisoCompacto({ icono: "compartir", tono: "accent", titulo: "Añade la app a la pantalla de inicio", etiqueta: "Instalar la app",
    texto: "En Safari: Compartir › Añadir a pantalla de inicio.",
    acciones: [{ texto: "Entendido", alPulsar: () => { marcarVisto(); def.render(c); } }] }));
}

/** Propuesta de descarga (regla en core/descarga.js), con el primer motivo y el enlace al detalle. */
function avisoDescarga(A, app) {
  const P = propuestaDescarga(A, app.store.estado.ajustes.descarga);
  if (!P.proponer) return null;
  return h("div", { class: "seccion" }, avisoCompacto({ icono: "info", tono: "accent", titulo: "Te vendría bien una semana de descarga", etiqueta: "Propuesta de descarga",
    texto: P.motivos[0] + " Propuesta: la semana del " + fechaCorta(P.inicio, A.hoy) + ".",
    acciones: [{ texto: "Programar", alPulsar: () => programarDescarga(app, P.inicio) }, { texto: "Ahora no", alPulsar: () => posponerDescarga(app) },
      { texto: "Ver por qué", alPulsar: () => app.nav.ir("fatiga", { pestana: "progreso" }) }] }));
}

/** Copia pendiente: una tira compacta; un toque abre «guardar» o «posponer». */
function avisoCopia(app) {
  const ec = app.store.estadoCopia();
  if (!ec.tarjeta) return null;
  const texto = ec.nunca ? "Sin copia fuera de este iPhone"
    : ec.nuevas > 5 ? plural(ec.nuevas, "sesión nueva", "sesiones nuevas") + " desde tu última copia"
    : "Última copia hace " + plural(ec.dias, "día", "días");
  return h("div", { class: "seccion compacta" }, h("button", { class: "tira-aviso", "aria-label": "Copia de seguridad pendiente. " + texto, onClick: async () => {
    const r = await app.hojaAcciones({ mensaje: "Copia de seguridad", opciones: [{ texto: "Guardar copia", valor: "guardar" }, { texto: "Posponer 3 días", valor: "posponer" }] });
    if (r === "guardar") exportarCopia(app); else if (r === "posponer") app.store.posponerAvisoCopia(3);
  } }, h("span", { class: "ico" }, icono("aviso")), h("span", { class: "txt" }, h("b", null, "Copia pendiente"), h("span", null, texto)), h("span", { class: "acto" }, "Guardar")));
}

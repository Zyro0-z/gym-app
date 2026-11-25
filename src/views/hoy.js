// Hoy: «¿qué hago ahora?». Tarjeta de lo que toca (o del entrenamiento en curso), la semana,
// series y racha, la última sesión, el peso y el acceso a otra rutina.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, anillo, vacio, chip, boton, avisoCompacto } from "../ui/controles.js";
import { fechaLarga, capital, fechaRelativa, kg, fechaCorta, reloj } from "../ui/textos.js";
import { masDias, lunesDe, diaSemana } from "../core/fechas.js";
import { plural } from "../core/formato.js";
import { canon } from "../core/nombres.js";
import { lineaSesion, sesionesOrdenadas } from "./comun.js";
import { empezarEntreno, abrirEntreno, mostrarResumen } from "./entreno.js";
import { abrirPesaje } from "./pesaje.js";
import { importarCopia, exportarCopia } from "./datos.js";
import { nuevaRutina } from "./editores.js";
import { programarDescarga, posponerDescarga } from "./fatiga.js";
import { mostrarInstalar, marcarVisto } from "../ui/instalar.js";
import { propuestaDescarga } from "../core/descarga.js";
import { gimnasiosDe, gimnasioActivo } from "../core/gimnasios.js";
import { mesocicloActual, estadoMesociclo } from "../core/mesociclos.js";
import { sparkline } from "../ui/graficas.js";
import { sugerirCarga } from "../core/sugerencia.js";

export function vistaHoy(_p, app) {
  const { store } = app;
  let reloj1 = 0;
  const def = {
    titulo: "Hoy",
    sobre: () => capital(fechaLarga(store.hoy())),
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
    return h("div", { class: "seccion" }, h("div", { class: "tarjeta" },
      h("div", { class: "etiqueta" }, "Entrenamiento en curso"),
      h("div", { class: "t-title1", style: { margin: "2px 0 4px" } }, b.rutina || "Entrenamiento libre"),
      h("div", { class: "t-subhead c-2" }, plural(hechas, "serie hecha", "series hechas")),
      h("div", { style: { marginTop: "14px" } }, h("button", { class: "btn", onClick: () => abrirEntreno() }, icono("play"), h("span", null, "Continuar · "), h("span", { class: "num", dataset: { relojHoy: "1" } }, reloj((Date.now() - b.inicio) / 1000))))));
  }
  const t = A.hoyToca;
  const sig = siguienteRutina(A);
  let encabezado = "Hoy", titulo, linea = "", extra = null, accion, repetir = null, cifra = null;
  if (t && !t.descanso && t.estado === "hecho") {
    encabezado = "Hoy";
    titulo = t.esperado;
    const s = t.coincide[0] || t.logsHoy[0];
    const ses = s && est.sesiones.find((x) => x.id === s.id);
    extra = chip("Hecho" + (s && s.dur && s.dur.min ? " · " + s.dur.min + " min" : "") + " · " + plural(t.hechas, "serie", "series"), "ok", { icono: "check" });
    accion = ses ? boton("Ver resumen", () => mostrarResumen(ses), { estilo: "gris" }) : null;
  } else if (t && !t.descanso) {
    titulo = t.esperado;
    const n = t.rutina ? t.rutina.ejercicios.length : 0;
    linea = [n ? plural(n, "ejercicio", "ejercicios") : null, t.objetivo ? plural(t.objetivo, "serie", "series") : null].filter(Boolean).join(" · ");
    if (!t.rutina) linea = "La rutina «" + t.esperado + "» no existe";
    if (t.subidas.length) extra = chip("Sube carga en " + plural(t.subidas.length, "ejercicio", "ejercicios"), "ok", { icono: "flecha-arriba" });
    if (t.estado === "otra") extra = chip("Hoy ya entrenaste otra rutina", null);
    accion = boton("Empezar", () => (t.rutina ? empezarEntreno(t.esperado) : elegirRutina(app)), { icono: "play" });
    repetir = ultimaDe(est, t.esperado);
    cifra = cifraClave(A, t.rutina);
  } else if (t && t.descanso) {
    encabezado = "Hoy";
    titulo = "Descanso";
    linea = sig ? (sig.i === 1 ? "Mañana: " : capital(fechaRelativa(sig.dia, A.hoy)) + ": ") + sig.rutina : "";
    if (t.logsHoy.length) extra = chip("Hoy ya entrenaste", "ok", { icono: "check" });
    accion = boton("Entrenar igualmente", () => elegirRutina(app), { estilo: "gris" });
  } else {
    encabezado = "Hoy";
    titulo = "Sin plan";
    linea = sig ? "Próxima: " + sig.rutina + ", " + fechaRelativa(sig.dia, A.hoy) : "Asigna rutinas a los días en Ajustes › Horario.";
    accion = boton("Empezar entrenamiento", () => elegirRutina(app), { icono: "play" });
    repetir = ultimaDe(est, null);
  }
  const otra = repetir ? h("button", { class: "btn texto", onClick: () => empezarEntreno(repetir.rutina, { desde: repetir }),
    "aria-label": "Repetir la última sesión" + (repetir.rutina ? " de " + repetir.rutina : "") + ", del " + fechaCorta(repetir.fecha, A.hoy) },
    icono("repetir"), h("span", null, "Repetir última · " + fechaCorta(repetir.fecha, A.hoy))) : null;
  return h("div", { class: "seccion" }, h("div", { class: "tarjeta hoy-principal", role: "region", "aria-label": encabezado + ": " + titulo },
    h("h2", { class: "t-title1", style: { margin: "2px 0 4px" } }, titulo),
    linea ? h("div", { class: "t-subhead c-2" }, linea) : null,
    cifra ? h("div", { class: "hoy-cifra" }, h("div", { class: "etiqueta" }, "Objetivo · " + cifra.nombre),
      h("div", { class: "num" }, kg(cifra.peso), h("span", { class: "c-2" }, " × " + cifra.reps))) : null,
    extra ? h("div", { style: { marginTop: "8px" } }, extra) : null,
    gimnasiosDe(est.ajustes).length > 1 ? h("button", { class: "chip-gimnasio", "aria-label": "Gimnasio: " + gimnasioActivo(est.ajustes).nombre + ". Cambiar", onClick: async () => {
      const l = gimnasiosDe(est.ajustes), act = gimnasioActivo(est.ajustes);
      const r = await app.hojaAcciones({ mensaje: "¿Dónde entrenas?", opciones: l.map((x) => ({ texto: x.nombre + (x.id === act.id ? " · actual" : ""), valor: x.id })) });
      if (r) await app.store.guardarAjustes((a) => { a.gimnasioActivo = r; }, { analitico: false });
    } }, icono("ubicacion", { tam: 14 }), h("span", null, gimnasioActivo(est.ajustes).nombre)) : null,
    accion ? h("div", { style: { marginTop: "14px" } }, accion, otra) : null));
}

/** Cifra clave de la sesión: la carga sugerida para el primer ejercicio de la rutina que tenga una. */
function cifraClave(A, rutina) {
  if (!rutina) return null;
  try {
    for (const e of rutina.ejercicios.slice(0, 3)) {
      const p = A.progresionDe(e.k), s = p ? sugerirCarga(p, A.incrementoDe(p)) : null;
      if (s) return { nombre: e.nombre, peso: s.peso, reps: s.reps };
    }
  } catch (err) { /* sin sugerencia */ }
  return null;
}

/** Última sesión de la rutina `nombre` (o la última de todas si es null). */
function ultimaDe(est, nombre) {
  const l = sesionesOrdenadas(est).filter((s) => (nombre ? s.rutina === nombre : true) && s.ejercicios && s.ejercicios.length);
  return l[0] || null;
}

/** «Esta semana»: días, series frente al objetivo y racha, en una sola tarjeta de énfasis secundario. */
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
  const r = A.racha, n = r.viva ? r.racha : 0;
  const frac = objetivo ? hechas / objetivo : 0;
  const series = h("div", { class: "semana-anillo" },
    anillo({ frac, tam: 60, grosor: 7, ok: objetivo > 0 && hechas >= objetivo, etiqueta: objetivo ? hechas + " de " + objetivo + " series" : plural(hechas, "serie", "series") + " esta semana",
      centro: h("div", { class: "centro-anillo" }, objetivo ? Math.round(frac * 100) + " %" : String(hechas)) }),
    h("div", { class: "semana-dato" }, objetivo ? [h("span", { class: "num t-headline" }, hechas + " de " + objetivo), h("span", { class: "c-2" }, " series")] : h("span", { class: "c-2" }, "esta semana")));
  const racha = h("div", { class: "fila", style: { gap: "8px" } },
    h("span", { class: r.viva ? "c-accent" : "c-3", style: { display: "flex" }, "aria-hidden": "true" }, icono("llama", { tam: 22 })),
    h("div", { class: "semana-dato" }, h("span", { class: "num t-headline" }, String(n)), h("span", { class: "c-2" }, (n === 1 ? " semana" : " semanas") + " de racha" + (!r.viva && r.racha ? " (la anterior, " + r.racha + ")" : ""))));
  return seccion({}, h("div", { class: "tarjeta" }, tira, h("div", { class: "semana-datos" }, series, racha)));
}

function lineas(A, est, app) {
  const s = sesionesOrdenadas(est)[0];
  const ult = est.pesajes.length ? est.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0] : null;
  const celdas = [];
  if (s) celdas.push(celda({ titulo: s.rutina || "Entrenamiento libre", sub: lineaSesion(s), valor: capital(fechaRelativa(s.fecha, A.hoy)), chevron: true,
    alPulsar: () => app.nav.ir("sesion/" + encodeURIComponent(s.id), { pestana: "historial" }) }));
  const tendencia = A.peso.puntos.slice(-14).map((p) => (p.media != null ? p.media : p.kg));
  celdas.push(celda({ icono: "bascula", colorIcono: "var(--g-morado)", titulo: "Peso corporal", valor: ult ? h("span", { class: "valor-tend" }, tendencia.length >= 3 ? sparkline(tendencia, { ancho: 48, alto: 18 }) : null, kg(ult.kg)) : null,
    control: h("button", { class: "btn-redondo", "aria-label": "Añadir pesaje", onClick: (e) => { e.stopPropagation(); abrirPesaje(app); } }, icono("mas")) }));
  if (!est.borrador) celdas.push(celda({ icono: "lista", colorIcono: "var(--g-naranja)", titulo: "Otra rutina", chevron: true, alPulsar: () => elegirRutina(app) }));
  return seccion({ cab: s ? "Última sesión" : null }, lista(celdas, { iconos: false }));
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

/** Copia pendiente: una fila discreta (un toque abre «guardar» o «posponer»), no una tarjeta de peso. */
function avisoCopia(app) {
  const ec = app.store.estadoCopia();
  if (!ec.tarjeta) return null;
  const texto = ec.nunca ? "Aún no has guardado ninguna copia fuera de este iPhone."
    : ec.nuevas > 5 ? plural(ec.nuevas, "sesión nueva", "sesiones nuevas") + " desde tu última copia en Archivos."
    : "Tu última copia en Archivos es de hace " + plural(ec.dias, "día", "días") + ".";
  return seccion({}, lista([celda({ icono: "aviso", colorIcono: "var(--warn-ink)", titulo: "Guarda una copia", sub: texto, chevron: true, alPulsar: async () => {
    const r = await app.hojaAcciones({ mensaje: "Copia de seguridad", opciones: [{ texto: "Guardar copia", valor: "guardar" }, { texto: "Posponer 3 días", valor: "posponer" }] });
    if (r === "guardar") exportarCopia(app); else if (r === "posponer") app.store.posponerAvisoCopia(3);
  } })], { iconos: false }));
}

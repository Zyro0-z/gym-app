// Hoy: «¿qué hago ahora?». Tarjeta de lo que toca (o del entrenamiento en curso), la semana,
// series y racha, la última sesión, el peso y el acceso a otra rutina.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, anillo, vacio, chip, boton } from "../ui/controles.js";
import { fechaLarga, capital, fechaRelativa, kg, fechaCorta, reloj } from "../ui/textos.js";
import { masDias, lunesDe, diaSemana } from "../core/fechas.js";
import { plural } from "../core/formato.js";
import { canon } from "../core/nombres.js";
import { lineaSesion, sesionesOrdenadas } from "./comun.js";
import { empezarEntreno, abrirEntreno, mostrarResumen } from "./entreno.js";
import { abrirPesaje } from "./pesaje.js";
import { importarCopia } from "./datos.js";
import { nuevaRutina } from "./editores.js";

export function vistaHoy(_p, app) {
  const { store } = app;
  let reloj1 = 0;
  const def = {
    titulo: "Hoy",
    sobre: () => capital(fechaLarga(store.hoy())),
    bajoTitulo: () => {
      const A = store.analisis(), b = A.C.bloquesActivos(A.hoy).find((x) => x.esDeload);
      return b ? chip("Deload hasta el " + fechaCorta(b.fin, A.hoy), "accent") : null;
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
      poner(c, tarjetaHoy(A, est, app), tiraSemana(A, est), cifras(A), lineas(A, est, app));
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
        seccion({}, lista([celda({ titulo: "Entrenamiento libre", sub: "Sin rutina: añades los ejercicios sobre la marcha", chevron: true, alPulsar: () => { app.cerrarHoja(); empezarEntreno(null); } })])));
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
  let encabezado = "Hoy toca", titulo, linea = "", extra = null, accion;
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
  }
  return h("div", { class: "seccion" }, h("div", { class: "tarjeta" },
    h("div", { class: "etiqueta" }, encabezado),
    h("div", { class: "t-title1", style: { margin: "2px 0 4px" } }, titulo),
    linea ? h("div", { class: "t-subhead c-2" }, linea) : null,
    extra ? h("div", { style: { marginTop: "8px" } }, extra) : null,
    accion ? h("div", { style: { marginTop: "14px" } }, accion) : null));
}

function tiraSemana(A, est) {
  const lunes = lunesDe(A.hoy), hechos = new Set(est.sesiones.map((s) => s.fecha));
  const letras = ["L", "M", "X", "J", "V", "S", "D"];
  return h("div", { class: "seccion" }, h("div", { class: "tira-semana", role: "list", "aria-label": "Esta semana" }, letras.map((l, i) => {
    const d = masDias(lunes, i), r = A.C.horario.get(i + 1), desc = !r || canon(r) === "descanso";
    const estado = hechos.has(d) ? "hecho" : d >= A.hoy && !desc ? "previsto" : "nada";
    return h("div", { class: ["dia-sem", d === A.hoy && "hoy", estado], role: "listitem", "aria-label": l + ": " + (estado === "hecho" ? "entrenado" : estado === "previsto" ? r : "descanso") },
      h("span", { class: "letra" }, l), h("span", { class: "marca" }));
  })));
}

function cifras(A) {
  const so = A.seriesObjetivo;
  const hechas = so ? so.lista.reduce((a, g) => a + g.hechas, 0) : A.resumen.act.ser;
  const objetivo = so ? so.lista.reduce((a, g) => a + g.min, 0) : 0;
  const r = A.racha;
  return h("div", { class: "seccion" }, h("div", { class: "fila-tarjetas" },
    h("div", { class: "tarjeta" },
      h("div", { class: "fila", style: { gap: "10px" } },
        anillo({ frac: objetivo ? hechas / objetivo : 0, tam: 44, grosor: 6, ok: objetivo > 0 && hechas >= objetivo, etiqueta: hechas + " de " + objetivo + " series" }),
        h("div", { class: "cifra t-title2" }, String(hechas), objetivo ? h("span", { class: "ud" }, "/" + objetivo) : null)),
      h("div", { class: "etiqueta", style: { marginTop: "8px" } }, "Series esta semana")),
    h("div", { class: "tarjeta" },
      h("div", { class: "fila", style: { gap: "10px" } },
        h("span", { class: r.viva ? "c-accent" : "c-3", style: { display: "flex" } }, icono("llama", { tam: 28 })),
        h("div", { class: "cifra t-title2" }, String(r.viva ? r.racha : 0), h("span", { class: "ud" }, (r.viva ? r.racha : 0) === 1 ? " semana" : " semanas"))),
      h("div", { class: "etiqueta", style: { marginTop: "8px" } }, r.viva || !r.racha ? "Racha" : "Racha · la anterior, " + r.racha))));
}

function lineas(A, est, app) {
  const s = sesionesOrdenadas(est)[0];
  const ult = est.pesajes.length ? est.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0] : null;
  const celdas = [];
  if (s) celdas.push(celda({ titulo: s.rutina || "Entrenamiento libre", sub: lineaSesion(s), valor: capital(fechaRelativa(s.fecha, A.hoy)), chevron: true,
    alPulsar: () => app.nav.ir("sesion/" + encodeURIComponent(s.id), { pestana: "historial" }) }));
  celdas.push(celda({ icono: "bascula", colorIcono: "var(--g-morado)", titulo: "Peso corporal", valor: ult ? kg(ult.kg) : null,
    control: h("button", { class: "btn-redondo", "aria-label": "Añadir pesaje", onClick: (e) => { e.stopPropagation(); abrirPesaje(app); } }, icono("mas")) }));
  if (!est.borrador) celdas.push(celda({ icono: "lista", colorIcono: "var(--g-naranja)", titulo: "Otra rutina", chevron: true, alPulsar: () => elegirRutina(app) }));
  return seccion({ cab: s ? "Última sesión" : null }, lista(celdas, { iconos: false }));
}

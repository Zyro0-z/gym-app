// Hoy: «¿qué hago ahora?». Tarjeta de lo que toca, la semana, series y racha, y la última sesión.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, anillo, vacio, chip } from "../ui/controles.js";
import { fechaLarga, capital, fechaRelativa, kg, fechaCorta } from "../ui/textos.js";
import { masDias, lunesDe, diaSemana } from "../core/fechas.js";
import { plural } from "../core/formato.js";
import { canon } from "../core/nombres.js";
import { lineaSesion, sesionesOrdenadas } from "./comun.js";

export function vistaHoy(_p, app) {
  const { store } = app;
  return {
    titulo: "Hoy",
    sobre: () => capital(fechaLarga(store.hoy())),
    bajoTitulo: () => {
      const A = store.analisis(), b = A.C.bloquesActivos(A.hoy).find((x) => x.esDeload);
      return b ? chip("Deload hasta el " + fechaCorta(b.fin || b.hasta || A.hoy), "accent") : null;
    },
    render(c) {
      const est = store.estado, A = store.analisis();
      if (!est.rutinas.length && !est.sesiones.length) {
        poner(c, vacio({ icono: "lista", titulo: "Crea tu primera rutina", texto: "Una rutina es la lista de ejercicios de un día de entrenamiento.",
          acciones: [{ texto: "Importar copia", alPulsar: () => app.nav.ir("datos", { pestana: "ajustes" }) }] }));
        return;
      }
      poner(c, tarjetaHoy(A, est), tiraSemana(A, est), cifras(A), ultima(A, est, app));
    },
  };
}

function siguienteRutina(A) {
  for (let i = 1; i <= 7; i++) {
    const d = masDias(A.hoy, i), r = A.C.horario.get(diaSemana(d));
    if (r && canon(r) !== "descanso") return { rutina: r, dia: d, i };
  }
  return null;
}

function tarjetaHoy(A) {
  const t = A.hoyToca;
  const sig = siguienteRutina(A);
  let titulo, linea, extra = null, encabezado = "Hoy toca";
  if (!t) { encabezado = "Hoy"; titulo = "Sin plan"; linea = sig ? "Próxima: " + sig.rutina : "Asigna rutinas a los días en Ajustes."; }
  else if (t.descanso) { encabezado = "Hoy"; titulo = "Descanso"; linea = sig ? (sig.i === 1 ? "Mañana: " : capital(fechaRelativa(sig.dia, A.hoy)) + ": ") + sig.rutina : ""; }
  else {
    titulo = t.esperado;
    const n = t.rutina ? t.rutina.ejercicios.length : 0;
    linea = [n ? plural(n, "ejercicio", "ejercicios") : null, t.objetivo ? plural(t.objetivo, "serie", "series") : null].filter(Boolean).join(" · ");
    if (t.estado === "hecho") extra = chip("Hecho · " + plural(t.hechas, "serie", "series"), "ok", { icono: "check" });
    else if (t.subidas.length) extra = chip("Sube carga en " + plural(t.subidas.length, "ejercicio", "ejercicios"), "ok", { icono: "flecha-arriba" });
  }
  return h("div", { class: "seccion" }, h("div", { class: "tarjeta" },
    h("div", { class: "etiqueta" }, encabezado),
    h("div", { class: "t-title1", style: { margin: "2px 0 4px" } }, titulo),
    linea ? h("div", { class: "t-subhead c-2" }, linea) : null,
    extra ? h("div", { style: { marginTop: "8px" } }, extra) : null));
}

function tiraSemana(A, est) {
  const lunes = lunesDe(A.hoy), hechos = new Set(est.sesiones.map((s) => s.fecha));
  const letras = ["L", "M", "X", "J", "V", "S", "D"];
  return h("div", { class: "seccion" }, h("div", { class: "tira-semana", role: "list", "aria-label": "Esta semana" }, letras.map((l, i) => {
    const d = masDias(lunes, i), r = A.C.horario.get(i + 1), desc = !r || canon(r) === "descanso";
    const estado = hechos.has(d) ? "hecho" : d > A.hoy && !desc ? "previsto" : d === A.hoy && !desc ? "previsto" : "nada";
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
        anillo({ frac: objetivo ? hechas / objetivo : 0, tam: 44, grosor: 6, ok: objetivo && hechas >= objetivo, etiqueta: hechas + " de " + objetivo + " series" }),
        h("div", { class: "cifra t-title2" }, String(hechas), objetivo ? h("span", { class: "ud" }, "/" + objetivo) : null)),
      h("div", { class: "etiqueta", style: { marginTop: "8px" } }, "Series esta semana")),
    h("div", { class: "tarjeta" },
      h("div", { class: "fila", style: { gap: "10px" } },
        h("span", { class: r.viva ? "c-accent" : "c-3", style: { width: "28px", height: "28px" } }, icono("llama", { tam: 28 })),
        h("div", { class: "cifra t-title2" }, String(r.viva ? r.racha : 0), h("span", { class: "ud" }, r.viva && r.racha === 1 ? " semana" : " semanas"))),
      h("div", { class: "etiqueta", style: { marginTop: "8px" } }, r.viva ? "Racha" : r.racha ? "Racha · la última fue de " + r.racha : "Racha"))));
}

function ultima(A, est, app) {
  const s = sesionesOrdenadas(est)[0];
  const celdas = [];
  if (s) celdas.push(celda({ titulo: s.rutina || "Entrenamiento libre", sub: lineaSesion(s), valor: capital(fechaRelativa(s.fecha, A.hoy)), chevron: true,
    alPulsar: () => app.nav.ir("sesion/" + encodeURIComponent(s.id), { pestana: "historial" }) }));
  const ult = est.pesajes.length ? est.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0] : null;
  celdas.push(celda({ icono: "bascula", colorIcono: "var(--g-morado)", titulo: "Peso corporal", valor: ult ? kg(ult.kg) : "—" }));
  return seccion({ cab: s ? "Última sesión" : null }, lista(celdas));
}

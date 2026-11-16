// Temporizador de descanso. Se guarda la HORA de fin (no un contador): con la pantalla bloqueada
// o la app en segundo plano el JavaScript se para, y al volver todo se recalcula con Date.now().
// Si terminó mientras no mirabas: «Descanso terminado hace X s».
// También mueve los controles de la pantalla bloqueada (ui/bloqueo.js) y los avisos push
// (ui/avisos.js), los dos opcionales.
import { h, poner } from "../../ui/dom.js";
import { barrita } from "../../ui/controles.js";
import { exito, seleccion } from "../../ui/haptica.js";
import { campana } from "../../ui/sonido.js";
import { reloj } from "../../ui/textos.js";
import * as bloqueo from "../../ui/bloqueo.js";
import * as avisos from "../../ui/avisos.js";
import { guardarYa } from "./pantalla.js";
import { E, nombreDe, contarHechas } from "./estado.js";

/** Borrador del entrenamiento en curso, esté el modal abierto o minimizado. */
const enCurso = () => (E.M && E.M.modo === "entreno" ? E.M.d : E.app && E.app.store.estado.borrador);
const ajustes = () => E.app.store.estado.ajustes.entreno;
function guardar(d) { if (E.M && E.M.modo === "entreno" && E.M.d === d) guardarYa(); else E.app.store.guardarBorrador(d); }

/** «hace 45 s», «hace 2 min». */
export function haceTxt(seg) { return seg < 60 ? "hace " + seg + " s" : "hace " + Math.round(seg / 60) + " min"; }

export function empezarDescanso(seg) {
  if (!E.M || E.M.modo !== "entreno" || !(seg > 0)) return;
  E.M.d.descanso = { fin: Date.now() + seg * 1000, total: seg, avisado: false };
  anunciar("Descanso de " + reloj(seg));
  pintarDescanso();
  sincronizarAviso(E.M.d);
}

/** Cambia el descanso del entrenamiento en curso (también con el modal minimizado). */
function cambiarDescanso(f) {
  const d = enCurso(); if (!d) return;
  f(d);
  if (E.M && E.M.modo === "entreno") pintarDescanso();
  guardar(d); sincronizarAviso(d); refrescarBloqueo();
}
export const saltarDescanso = () => cambiarDescanso((d) => { d.descanso = null; });
export const moverDescanso = (s) => cambiarDescanso((d) => { if (!d.descanso) return; d.descanso.fin += s * 1000; d.descanso.total = Math.max(1, d.descanso.total + s); });
export const reiniciarDescanso = () => cambiarDescanso((d) => { const s = ajustes().descanso || 90; d.descanso = { fin: Date.now() + s * 1000, total: s, avisado: false }; });

export function finDescanso(d) {
  d.descanso.avisado = true;
  const tarde = Math.floor((Date.now() - d.descanso.fin) / 1000);
  exito();
  if (ajustes().sonido !== false && !bloqueo.pitido()) campana();
  E.app.toast(tarde >= 3 ? "Descanso terminado " + haceTxt(tarde) : "Descanso terminado", { icono: "cronometro" });
  guardar(d);
  refrescarBloqueo();
}

/** Recalcula al volver a la app (visibilitychange, pageshow): fin del descanso y reloj. */
export function alVolver() {
  const d = enCurso();
  if (d && d.descanso && !d.descanso.avisado && d.descanso.fin <= Date.now()) finDescanso(d);
  if (E.M && E.M.modo === "entreno") pintarDescanso();
  refrescarBloqueo();
}

/** Región polite del modal (solo lectores de pantalla): inicio y últimos 10 s; el final lo dice el aviso. */
function anunciar(t) { if (E.M && E.M.anuncio) E.M.anuncio.textContent = t; }

export function pintarDescanso() {
  if (!E.M || E.M.modo !== "entreno") return;
  const ds = E.M.d.descanso, el = E.M.descansoEl;
  const resto = ds ? Math.ceil((ds.fin - Date.now()) / 1000) : 0;
  if (ds && resto <= 0 && !ds.avisado) finDescanso(E.M.d);
  if (!ds || resto <= 0) { el.hidden = true; E.M.capa.classList.remove("con-descanso"); return; }
  E.M.capa.classList.add("con-descanso");
  if (resto === 10 && E.M.anunciado10 !== ds.fin) { E.M.anunciado10 = ds.fin; anunciar("Quedan 10 segundos de descanso"); }
  if (el.hidden || !el.firstChild) {
    el.hidden = false;
    poner(el,
      h("button", { class: "tiempo", "aria-label": "Cambiar descanso", onClick: elegirDescanso }, h("span", { class: "etq" }, "Descanso"), h("span", { class: "valor num" })),
      h("div", { class: "pista" }, barrita(0)),
      h("button", { class: "btn-redondo txt", "aria-label": "Quitar 15 segundos", onClick: () => { seleccion(); moverDescanso(-15); } }, "−15"),
      h("button", { class: "btn-redondo txt", "aria-label": "Añadir 15 segundos", onClick: () => { seleccion(); moverDescanso(15); } }, "+15"),
      h("button", { class: "btn-barra", onClick: saltarDescanso }, "Saltar"));
  }
  el.querySelector(".valor").textContent = reloj(resto);
  el.querySelector(".barrita > i").style.width = (Math.max(0, Math.min(1, resto / ds.total)) * 100).toFixed(1) + "%";
}

export async function elegirDescanso() {
  const e = ajustes();
  const presets = (e.presets && e.presets.length ? e.presets : [60, 90, 120, 180]).slice().sort((a, b) => a - b);
  const r = await E.app.hojaAcciones({ mensaje: "Descanso", opciones: presets.map((s) => ({ texto: reloj(s), valor: s })).concat(E.M.d.descanso ? [{ texto: "Parar el descanso", valor: 0, peligro: true }] : []) });
  if (r === null || !E.M) return;
  if (r === 0) saltarDescanso(); else { empezarDescanso(r); guardarYa(); }
}

/* ---------- Siguiente serie (para los textos de la pantalla bloqueada y del aviso) ---------- */

function siguienteSerie(d) {
  for (const e of d.ejercicios) {
    const j = e.series.findIndex((s) => !s.hecha);
    if (j >= 0) {
      const s = e.series[j], peso = s.peso || "", reps = s.reps || "";
      return { nombre: e.nombre || nombreDe(e.ejercicioId), serie: j + 1, de: e.series.length, carga: peso && reps ? peso + " kg × " + reps : reps ? reps + " reps" : "" };
    }
  }
  return null;
}
const textoSiguiente = (sig) => (sig ? sig.nombre + " · serie " + sig.serie + " de " + sig.de : "Todas las series hechas");

/* ---------- Avisos push (servidor opcional) ---------- */

let avisoT = 0;
/** Programa o cancela el aviso del servidor según el descanso (agrupando los toques seguidos). */
function sincronizarAviso(d) {
  const p = ajustes().push;
  if (!p || !p.activo || !p.url) return;
  clearTimeout(avisoT);
  avisoT = setTimeout(() => {
    const ds = d.descanso;
    if (ds && !ds.avisado && ds.fin > Date.now() + 2000) avisos.programar(p.url, ds.fin, { titulo: "Descanso terminado", cuerpo: textoSiguiente(siguienteSerie(d)) });
    else avisos.cancelar(p.url);
  }, 500);
}

/* ---------- Pantalla bloqueada (experimental) ---------- */

/** Activa los controles si están en Ajustes. Llamar desde un toque (iOS solo deja sonar así). */
export function activarBloqueo() {
  if (!ajustes().controlesBloqueo || !enCurso()) return;
  if (!bloqueo.estaActivo()) bloqueo.activar({
    siguiente() {
      const d = enCurso(); if (!d) return;
      if (d.descanso && !d.descanso.avisado && d.descanso.fin > Date.now()) return saltarDescanso();
      // Sin descanso: marca la siguiente serie, con la misma validación que el botón
      const b = E.M && E.M.modo === "entreno" && E.M.cuerpo.querySelector(".serie:not(.hecha) .check");
      if (b) b.click();
    },
    anterior: reiniciarDescanso,
    mover: moverDescanso,
  });
  refrescarBloqueo();
}

export function refrescarBloqueo() {
  if (!bloqueo.estaActivo()) return;
  const d = enCurso();
  if (!d || !ajustes().controlesBloqueo) { bloqueo.desactivar(); return; }
  const ds = d.descanso, resto = ds ? Math.ceil((ds.fin - Date.now()) / 1000) : 0;
  const sig = siguienteSerie(d);
  if (ds && resto > 0) bloqueo.actualizar({ titulo: "Descanso · " + reloj(resto), subtitulo: "Después: " + textoSiguiente(sig), descanso: ds });
  else bloqueo.actualizar({ titulo: textoSiguiente(sig), subtitulo: (sig && sig.carga ? sig.carga + " · " : "") + contarHechas(d) + " series hechas", descanso: null });
}

export const desactivarBloqueo = () => bloqueo.desactivar();

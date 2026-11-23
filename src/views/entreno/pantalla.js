// Modal a pantalla completa, barra minimizada, Wake Lock, guardado del borrador y cabecera.
import { h, poner, animar, reducirMovimiento } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { barraTeclado } from "../../ui/teclado.js";
import { atraparFoco } from "../../ui/capas.js";
import { reloj, fechaCorta, capital } from "../../ui/textos.js";
import { copiar, aTexto, vacia, leerMin, marcarMin, nombreDe } from "./estado.js";
import { pintarCuerpo } from "./ejercicios.js";
import { finDescanso, pintarDescanso, elegirDescanso, alVolver, activarBloqueo, refrescarBloqueo } from "./descanso.js";
import { terminar, cancelarEdicion, guardarEdicion } from "./revision.js";
import { E } from "./estado.js";

export function iniciarEntreno(a) {
  E.app = a;
  E.barraMin = h("button", { class: "barra-entreno", hidden: true, "aria-label": "Volver al entrenamiento", onClick: () => abrirEntreno() },
    h("span", { class: "textos" }, h("span", { class: "t1" }), h("span", { class: "t2 num" })), h("span", { class: "flecha" }, icono("chevron-arriba")));
  document.body.appendChild(E.barraMin);
  E.app.store.suscribir((t) => { if (t === "borrador" || t === "todo") pintarBarraMin(); });
  // Al volver (pantalla desbloqueada, app en primer plano o restaurada de la caché del navegador)
  // se recalcula todo con la hora real y se vuelve a pedir que la pantalla no se apague
  const volver = () => { if (E.M && E.M.modo === "entreno") pedirWake(); alVolver(); };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") guardarYa(); else volver(); });
  window.addEventListener("pageshow", volver);
  // Los controles de la pantalla bloqueada necesitan un toque para poder sonar (política de iOS)
  document.addEventListener("pointerdown", () => activarBloqueo(), { capture: true, passive: true });
  pintarBarraMin();
  // Al volver a abrir la app se respeta cómo se dejó: a pantalla completa o minimizado
  if (E.app.store.estado.borrador && !leerMin()) abrirEntreno({ sinAnimar: true });
}

export const hayEntreno = () => !!(E.app && E.app.store.estado.borrador);

export const modalAbierto = () => !!E.M;

export const minimizarSiAbierto = () => { if (E.M) cerrarModal(); };

/** Guarda ya el entrenamiento en curso (antes de recargar la app). */
export const guardarEntrenoYa = () => Promise.resolve(guardarYa());

export function pintarBarraMin() {
  if (!E.barraMin) return;
  const b = E.app.store.estado.borrador;
  const ver = !!b && !(E.M && E.M.modo === "entreno");
  E.barraMin.hidden = !ver;
  refrescarBloqueo();
  document.body.classList.toggle("con-barra-entreno", ver);
  clearInterval(E.tickMin);
  if (!ver) return;
  const pintar = () => {
    const d = E.app.store.estado.borrador; if (!d) return;
    E.barraMin.querySelector(".t1").textContent = d.rutina || "Entrenamiento";
    const resto = d.descanso ? Math.ceil((d.descanso.fin - Date.now()) / 1000) : 0;
    E.barraMin.querySelector(".t2").textContent = reloj((Date.now() - d.inicio) / 1000) + (resto > 0 ? " · Descanso " + reloj(resto) : "");
    if (d.descanso && resto <= 0 && !d.descanso.avisado) finDescanso(d);
    refrescarBloqueo();
  };
  pintar();
  E.tickMin = setInterval(pintar, 1000);
}

export function borradorDeRutina(nombre) {
  const r = nombre ? E.app.store.estado.rutinas.find((x) => x.nombre === nombre) : null;
  return {
    rutina: r ? r.nombre : null, fecha: E.app.store.hoy(), inicio: Date.now(), descanso: null,
    ejercicios: r ? r.ejercicios.map((e) => Object.assign({ ejercicioId: e.ejercicioId, nombre: nombreDe(e.ejercicioId), objetivo: e.series || 3,
      series: Array.from({ length: Math.max(1, e.series || 3) }, vacia) }, e.rpe ? { rpeObjetivo: e.rpe } : {})) : [],
  };
}

/** Borrador que repite una sesión guardada: mismos ejercicios, series, cargas y RPE, sin marcar. */
export function borradorDeSesion(s) {
  return {
    rutina: s.rutina || null, fecha: E.app.store.hoy(), inicio: Date.now(), descanso: null,
    ejercicios: s.ejercicios.map((e) => Object.assign({ ejercicioId: e.ejercicioId, nombre: e.nombre || nombreDe(e.ejercicioId), objetivo: e.series.length },
      e.tipo ? { tipo: e.tipo } : {}, e.grupoId ? { grupoId: e.grupoId } : {}, {
        series: e.series.filter((x) => x.hecha !== false).map((x) => Object.assign({ peso: aTexto(x.peso), reps: aTexto(x.reps), tipo: x.tipo || "normal", hecha: false },
          x.segundos ? { segundos: x.segundos } : {}, typeof x.rpe === "number" ? { rpe: x.rpe } : {})),
      })).map((e) => (e.series.length ? e : Object.assign(e, { series: [vacia()] }))),
  };
}

/** Empieza un entrenamiento (con la rutina `nombre` o libre). Si ya hay uno, pregunta. */
export async function empezarEntreno(nombre, { desde = null } = {}) {
  if (E.app.store.estado.borrador) {
    const r = await E.app.hojaAcciones({ mensaje: "Ya hay un entrenamiento en curso.", opciones: [
      { texto: "Continuar el actual", valor: "seguir" }, { texto: "Descartarlo y empezar otro", valor: "nuevo", peligro: true }] });
    if (r === "seguir") return abrirEntreno();
    if (r !== "nuevo") return;
  }
  await E.app.store.guardarBorrador(desde ? borradorDeSesion(desde) : borradorDeRutina(nombre));
  abrirEntreno();
}

export function abrirEntreno({ sinAnimar = false } = {}) {
  const b = E.app.store.estado.borrador;
  if (!b) return;
  if (E.M) { if (E.M.modo === "entreno") return; cerrarModal(true); }
  marcarMin(false);
  E.M = { modo: "entreno", d: copiar(b), abiertos: new WeakSet() };
  if (!E.M.d.inicio) E.M.d.inicio = Date.now();
  mostrarModal(sinAnimar);
  pintarBarraMin();
}

/** Edita una sesión guardada (en memoria; se guarda al pulsar Guardar). */
export function editarSesion(s) {
  if (E.M) cerrarModal(true);
  E.M = {
    modo: "edicion", id: s.id, original: s, abiertos: new WeakSet(),
    d: { rutina: s.rutina, fecha: s.fecha, inicioTxt: s.inicio || "", finTxt: s.fin || "", descanso: null,
      nota: s.nota || "", recuperacion: s.recuperacion || null,
      ejercicios: s.ejercicios.map((e) => ({ ejercicioId: e.ejercicioId, nombre: e.nombre || nombreDe(e.ejercicioId), tipo: e.tipo, nota: e.nota, grupoId: e.grupoId,
        series: e.series.map((x) => Object.assign({}, x, { peso: aTexto(x.peso), reps: aTexto(x.reps), hecha: x.hecha !== false })) })) },
  };
  E.M.inicial = JSON.stringify(E.M.d);
  mostrarModal(false);
}

export function mostrarModal(sinAnimar) {
  const capa = h("div", { class: "modal-completo", role: "dialog", "aria-modal": "true", "aria-label": E.M.modo === "entreno" ? "Entrenamiento" : "Editar sesión" });
  E.M.capa = capa;
  E.M.cab = h("header", { class: "modal-cab" });
  E.M.cuerpo = h("div", { class: "modal-cuerpo" });
  // role=timer: el lector no lee cada segundo; los avisos van a la región polite (descanso.js)
  E.M.descansoEl = h("div", { class: "barra-descanso", hidden: true, role: "timer", "aria-label": "Tiempo de descanso" });
  E.M.anuncio = h("div", { class: "solo-lectores", "aria-live": "polite", dataset: { anuncioDescanso: "1" } });
  capa.append(E.M.cab, E.M.cuerpo, E.M.descansoEl, E.M.anuncio);
  document.body.appendChild(capa);
  document.body.classList.add("sin-tabbar", "con-modal");
  E.M.quitarTeclado = barraTeclado(capa);
  pintarCab(); pintarCuerpo(); pintarDescanso();
  E.M.tick = setInterval(tick, 1000);
  if (E.M.modo === "entreno") { pedirWake(); activarBloqueo(); }
  // Teclado: el foco no sale del modal; Escape minimiza (entreno) o pulsa Cancelar (edición)
  E.M.soltarFoco = atraparFoco(capa, () => { const b = E.M && (E.M.cab.querySelector("[aria-label=Minimizar]") || E.M.cab.querySelector(".btn-barra")); if (b) b.click(); });
  if (!sinAnimar && !reducirMovimiento()) animar(capa, [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 380, easing: "cubic-bezier(.32,.72,0,1)", fill: "none" });
}

export function cerrarModal(inmediato) {
  if (!E.M) return;
  const m = E.M; E.M = null;
  if (m.modo === "entreno") marcarMin(!!E.app.store.estado.borrador);
  clearInterval(m.tick);
  if (m.quitarTeclado) m.quitarTeclado();
  if (m.soltarFoco) m.soltarFoco();
  if (document.activeElement && m.capa.contains(document.activeElement)) document.activeElement.blur();
  soltarWake();
  document.body.classList.remove("sin-tabbar", "con-modal");
  pintarBarraMin();
  const fin = () => m.capa.remove();
  if (inmediato || reducirMovimiento()) fin();
  else animar(m.capa, [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }], { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" }).then(fin);
}

export async function pedirWake() {
  try { if (E.app.store.estado.ajustes.entreno.pantallaEncendida && navigator.wakeLock && !E.wake) { E.wake = await navigator.wakeLock.request("screen"); E.wake.addEventListener("release", () => { E.wake = null; }); } } catch (e) { E.wake = null; }
}

export function soltarWake() { try { if (E.wake) E.wake.release(); } catch (e) {} E.wake = null; }

export function guardarPronto() { if (!E.M || E.M.modo !== "entreno") return; clearTimeout(E.guardarT); E.guardarT = setTimeout(guardarYa, 400); }

/** «· 5/20 series» junto al reloj y una línea fina con lo hecho, bajo la cabecera. */
export function pintarProgresoCab() {
  if (!E.M || E.M.modo !== "entreno") return;
  const t = E.M.cab.querySelector("[data-progreso]"), barra = E.M.cab.querySelector(".progreso-cab span");
  if (!t || !barra) return;
  const todas = E.M.d.ejercicios.flatMap((e) => e.series), hechas = todas.filter((x) => x.hecha).length;
  t.textContent = todas.length ? " · " + hechas + "/" + todas.length + " series" : "";
  barra.style.width = (todas.length ? (100 * hechas) / todas.length : 0) + "%";
}

export function guardarYa() {
  clearTimeout(E.guardarT);
  pintarProgresoCab();
  if (E.M && E.M.modo === "entreno") return E.app.store.guardarBorrador(E.M.d);
}

export function pintarCab() {
  const d = E.M.d;
  if (E.M.modo === "entreno") {
    poner(E.M.cab,
      h("div", { class: "izq" },
        h("button", { class: "btn-barra", "aria-label": "Minimizar", onClick: () => { guardarYa(); cerrarModal(); } }, icono("chevron-abajo")),
        h("button", { class: "btn-barra", "aria-label": "Descanso", onClick: elegirDescanso }, icono("cronometro"))),
      h("div", { class: "centro" }, h("div", { class: "titulo" }, d.rutina || "Entrenamiento"), h("div", { class: "sub num" }, h("span", { dataset: { reloj: "1" } }, reloj((Date.now() - d.inicio) / 1000)), h("span", { dataset: { progreso: "1" } }))),
      h("div", { class: "der" }, h("button", { class: "btn-barra fuerte", onClick: terminar }, "Terminar")),
      h("div", { class: "progreso-cab", "aria-hidden": "true" }, h("span")));
    pintarProgresoCab();
  } else {
    poner(E.M.cab,
      h("div", { class: "izq" }, h("button", { class: "btn-barra", onClick: cancelarEdicion }, "Cancelar")),
      h("div", { class: "centro" }, h("div", { class: "titulo" }, "Editar sesión"), h("div", { class: "sub" }, capital(fechaCorta(d.fecha, E.app.store.hoy())))),
      h("div", { class: "der" }, h("button", { class: "btn-barra fuerte", onClick: guardarEdicion }, "Guardar")));
  }
}

export function tick() {
  if (!E.M) return;
  const r = E.M.cab.querySelector("[data-reloj]");
  if (r && E.M.modo === "entreno") r.textContent = reloj((Date.now() - E.M.d.inicio) / 1000);
  pintarDescanso();
  refrescarBloqueo();
}

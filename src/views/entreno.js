// Entrenamiento activo (modal a pantalla completa, minimizable a una barra) y edición de una
// sesión guardada. El entrenamiento en curso se guarda en cada cambio (IndexedDB + réplica en
// localStorage) y se reabre al volver a la app. La edición de una sesión vive solo en memoria.
import { h, poner, animar, reducirMovimiento } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, deslizable, interruptor, barrita, chip } from "../ui/controles.js";
import { barraTeclado } from "../ui/teclado.js";
import { impacto, exito, seleccion } from "../ui/haptica.js";
import { campana } from "../ui/sonido.js";
import { reloj, kg, kgTotal, minutos, fechaCorta, capital } from "../ui/textos.js";
import { leerNumero, fmt, plural } from "../core/formato.js";
import { epley } from "../core/sesiones.js";
import { idSesion } from "../data/modelo.js";
import { elegirEjercicio } from "./selector.js";

const TIPOS = [["normal", "Normal", ""], ["calentamiento", "Calentamiento", "C"], ["fallo", "Al fallo", "F"], ["descendente", "Descendente", "D"]];
const letraTipo = (t) => (TIPOS.find((x) => x[0] === t) || TIPOS[0])[2];
const copiar = (x) => JSON.parse(JSON.stringify(x));
const aTexto = (n) => (n === null || n === undefined || n === "" || n === 0 ? "" : String(n).replace(".", ","));
const hhmm = (ms) => { const d = new Date(ms); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
const fechaLocal = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const vacia = () => ({ peso: "", reps: "", tipo: "normal", hecha: false });

let app = null;
let M = null;            // modal abierto: { modo: "entreno" | "edicion", d, capa, cuerpo, ... }
let barraMin = null, tickMin = 0, wake = null, guardarT = 0;

// ─────────── arranque ───────────

export function iniciarEntreno(a) {
  app = a;
  barraMin = h("button", { class: "barra-entreno", hidden: true, "aria-label": "Volver al entrenamiento", onClick: () => abrirEntreno() },
    h("span", { class: "textos" }, h("span", { class: "t1" }), h("span", { class: "t2 num" })), h("span", { class: "flecha" }, icono("chevron-arriba")));
  document.body.appendChild(barraMin);
  app.store.suscribir((t) => { if (t === "borrador" || t === "todo") pintarBarraMin(); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") guardarYa();
    else if (M && M.modo === "entreno") pedirWake();
  });
  pintarBarraMin();
  // Al volver a abrir la app se respeta cómo se dejó: a pantalla completa o minimizado
  if (app.store.estado.borrador && !leerMin()) abrirEntreno({ sinAnimar: true });
}

const CLAVE_MIN = "gym-entreno-minimizado";
function leerMin() { try { return localStorage.getItem(CLAVE_MIN) === "1"; } catch (e) { return false; } }
function marcarMin(v) { try { if (v) localStorage.setItem(CLAVE_MIN, "1"); else localStorage.removeItem(CLAVE_MIN); } catch (e) {} }

export const hayEntreno = () => !!(app && app.store.estado.borrador);
export const modalAbierto = () => !!M;
export const minimizarSiAbierto = () => { if (M) cerrarModal(); };

function pintarBarraMin() {
  if (!barraMin) return;
  const b = app.store.estado.borrador;
  const ver = !!b && !(M && M.modo === "entreno");
  barraMin.hidden = !ver;
  document.body.classList.toggle("con-barra-entreno", ver);
  clearInterval(tickMin);
  if (!ver) return;
  const pintar = () => {
    const d = app.store.estado.borrador; if (!d) return;
    barraMin.querySelector(".t1").textContent = d.rutina || "Entrenamiento";
    const resto = d.descanso ? Math.ceil((d.descanso.fin - Date.now()) / 1000) : 0;
    barraMin.querySelector(".t2").textContent = reloj((Date.now() - d.inicio) / 1000) + (resto > 0 ? " · Descanso " + reloj(resto) : "");
    if (d.descanso && resto <= 0 && !d.descanso.avisado) finDescanso(d);
  };
  pintar();
  tickMin = setInterval(pintar, 1000);
}

// ─────────── empezar, continuar, editar ───────────

function nombreDe(id, porDefecto) { const c = app.store.estado.catalogo.find((x) => x.id === id); return c ? c.nombre : porDefecto || id; }

function borradorDeRutina(nombre) {
  const r = nombre ? app.store.estado.rutinas.find((x) => x.nombre === nombre) : null;
  return {
    rutina: r ? r.nombre : null, fecha: app.store.hoy(), inicio: Date.now(), descanso: null,
    ejercicios: r ? r.ejercicios.map((e) => ({ ejercicioId: e.ejercicioId, nombre: nombreDe(e.ejercicioId), objetivo: e.series || 3,
      series: Array.from({ length: Math.max(1, e.series || 3) }, vacia) })) : [],
  };
}

/** Empieza un entrenamiento (con la rutina `nombre` o libre). Si ya hay uno, pregunta. */
export async function empezarEntreno(nombre) {
  if (app.store.estado.borrador) {
    const r = await app.hojaAcciones({ mensaje: "Ya hay un entrenamiento en curso.", opciones: [
      { texto: "Continuar el actual", valor: "seguir" }, { texto: "Descartarlo y empezar otro", valor: "nuevo", peligro: true }] });
    if (r === "seguir") return abrirEntreno();
    if (r !== "nuevo") return;
  }
  await app.store.guardarBorrador(borradorDeRutina(nombre));
  abrirEntreno();
}

export function abrirEntreno({ sinAnimar = false } = {}) {
  const b = app.store.estado.borrador;
  if (!b) return;
  if (M) { if (M.modo === "entreno") return; cerrarModal(true); }
  marcarMin(false);
  M = { modo: "entreno", d: copiar(b) };
  if (!M.d.inicio) M.d.inicio = Date.now();
  mostrarModal(sinAnimar);
  pintarBarraMin();
}

/** Edita una sesión guardada (en memoria; se guarda al pulsar Guardar). */
export function editarSesion(s) {
  if (M) cerrarModal(true);
  M = {
    modo: "edicion", id: s.id, original: s,
    d: { rutina: s.rutina, fecha: s.fecha, inicioTxt: s.inicio || "", finTxt: s.fin || "", descanso: null,
      ejercicios: s.ejercicios.map((e) => ({ ejercicioId: e.ejercicioId, nombre: e.nombre || nombreDe(e.ejercicioId), tipo: e.tipo, nota: e.nota,
        series: e.series.map((x) => Object.assign({}, x, { peso: aTexto(x.peso), reps: aTexto(x.reps), hecha: x.hecha !== false })) })) },
  };
  M.inicial = JSON.stringify(M.d);
  mostrarModal(false);
}

// ─────────── modal ───────────

function mostrarModal(sinAnimar) {
  const capa = h("div", { class: "modal-completo", role: "dialog", "aria-modal": "true", "aria-label": M.modo === "entreno" ? "Entrenamiento" : "Editar sesión" });
  M.capa = capa;
  M.cab = h("header", { class: "modal-cab" });
  M.cuerpo = h("div", { class: "modal-cuerpo" });
  M.descansoEl = h("div", { class: "barra-descanso", hidden: true });
  capa.append(M.cab, M.cuerpo, M.descansoEl);
  document.body.appendChild(capa);
  document.body.classList.add("sin-tabbar", "con-modal");
  M.quitarTeclado = barraTeclado(capa);
  pintarCab(); pintarCuerpo(); pintarDescanso();
  M.tick = setInterval(tick, 1000);
  if (M.modo === "entreno") pedirWake();
  if (!sinAnimar && !reducirMovimiento()) animar(capa, [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 380, easing: "cubic-bezier(.32,.72,0,1)", fill: "none" });
}

function cerrarModal(inmediato) {
  if (!M) return;
  const m = M; M = null;
  if (m.modo === "entreno") marcarMin(!!app.store.estado.borrador);
  clearInterval(m.tick);
  if (m.quitarTeclado) m.quitarTeclado();
  if (document.activeElement && m.capa.contains(document.activeElement)) document.activeElement.blur();
  soltarWake();
  document.body.classList.remove("sin-tabbar", "con-modal");
  pintarBarraMin();
  const fin = () => m.capa.remove();
  if (inmediato || reducirMovimiento()) fin();
  else animar(m.capa, [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }], { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" }).then(fin);
}

async function pedirWake() {
  try { if (app.store.estado.ajustes.entreno.pantallaEncendida && navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) { wake = null; }
}
function soltarWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }

// ─────────── guardar el borrador ───────────

function guardarPronto() { if (!M || M.modo !== "entreno") return; clearTimeout(guardarT); guardarT = setTimeout(guardarYa, 400); }
function guardarYa() {
  clearTimeout(guardarT);
  if (M && M.modo === "entreno") return app.store.guardarBorrador(M.d);
}

// ─────────── cabecera ───────────

function pintarCab() {
  const d = M.d;
  if (M.modo === "entreno") {
    poner(M.cab,
      h("div", { class: "izq" },
        h("button", { class: "btn-barra", "aria-label": "Minimizar", onClick: () => { guardarYa(); cerrarModal(); } }, icono("chevron-abajo")),
        h("button", { class: "btn-barra", "aria-label": "Descanso", onClick: elegirDescanso }, icono("cronometro"))),
      h("div", { class: "centro" }, h("div", { class: "titulo" }, d.rutina || "Entrenamiento"), h("div", { class: "sub num", dataset: { reloj: "1" } }, reloj((Date.now() - d.inicio) / 1000))),
      h("div", { class: "der" }, h("button", { class: "btn-barra fuerte", onClick: terminar }, "Terminar")));
  } else {
    poner(M.cab,
      h("div", { class: "izq" }, h("button", { class: "btn-barra", onClick: cancelarEdicion }, "Cancelar")),
      h("div", { class: "centro" }, h("div", { class: "titulo" }, "Editar sesión"), h("div", { class: "sub" }, capital(fechaCorta(d.fecha, app.store.hoy())))),
      h("div", { class: "der" }, h("button", { class: "btn-barra fuerte", onClick: guardarEdicion }, "Guardar")));
  }
}

function tick() {
  if (!M) return;
  const r = M.cab.querySelector("[data-reloj]");
  if (r && M.modo === "entreno") r.textContent = reloj((Date.now() - M.d.inicio) / 1000);
  pintarDescanso();
}

// ─────────── descanso ───────────

function empezarDescanso(seg) {
  if (!M || M.modo !== "entreno" || !(seg > 0)) return;
  M.d.descanso = { fin: Date.now() + seg * 1000, total: seg, avisado: false };
  pintarDescanso();
}

function finDescanso(d) {
  d.descanso.avisado = true;
  exito();
  if (app.store.estado.ajustes.entreno.sonido !== false) campana();
  app.toast("Descanso terminado", { icono: "cronometro" });
  if (M && M.modo === "entreno" && M.d === d) guardarYa();
  else app.store.guardarBorrador(d);
}

function pintarDescanso() {
  if (!M || M.modo !== "entreno") return;
  const ds = M.d.descanso, el = M.descansoEl;
  const resto = ds ? Math.ceil((ds.fin - Date.now()) / 1000) : 0;
  if (ds && resto <= 0 && !ds.avisado) finDescanso(M.d);
  if (!ds || resto <= 0) { el.hidden = true; M.capa.classList.remove("con-descanso"); return; }
  M.capa.classList.add("con-descanso");
  if (el.hidden || !el.firstChild) {
    el.hidden = false;
    const ajustar = (s) => { M.d.descanso.fin += s * 1000; M.d.descanso.total = Math.max(1, M.d.descanso.total + s); seleccion(); pintarDescanso(); guardarYa(); };
    poner(el,
      h("button", { class: "tiempo", "aria-label": "Cambiar descanso", onClick: elegirDescanso }, h("span", { class: "etq" }, "Descanso"), h("span", { class: "valor num" })),
      h("div", { class: "pista" }, barrita(0)),
      h("button", { class: "btn-redondo txt", "aria-label": "Quitar 15 segundos", onClick: () => ajustar(-15) }, "−15"),
      h("button", { class: "btn-redondo txt", "aria-label": "Añadir 15 segundos", onClick: () => ajustar(15) }, "+15"),
      h("button", { class: "btn-barra", onClick: () => { M.d.descanso = null; pintarDescanso(); guardarYa(); } }, "Saltar"));
  }
  el.querySelector(".valor").textContent = reloj(resto);
  el.querySelector(".barrita > i").style.width = (Math.max(0, Math.min(1, resto / ds.total)) * 100).toFixed(1) + "%";
}

async function elegirDescanso() {
  const e = app.store.estado.ajustes.entreno;
  const presets = (e.presets && e.presets.length ? e.presets : [60, 90, 120, 180]).slice().sort((a, b) => a - b);
  const r = await app.hojaAcciones({ mensaje: "Descanso", opciones: presets.map((s) => ({ texto: reloj(s), valor: s })).concat(M.d.descanso ? [{ texto: "Parar el descanso", valor: 0, peligro: true }] : []) });
  if (r === null || !M) return;
  if (r === 0) M.d.descanso = null; else empezarDescanso(r);
  pintarDescanso(); guardarYa();
}

// ─────────── referencias: anterior y próxima vez ───────────

function sesionAnterior(ejercicioId) {
  const fechaTope = M.modo === "edicion" ? M.d.fecha : "9999";
  let mejor = null;
  for (const s of app.store.estado.sesiones) {
    if (M.modo === "edicion" && s.id === M.id) continue;
    if (s.fecha > fechaTope || (M.modo === "edicion" && s.fecha === fechaTope && s.id > M.id)) continue;
    const e = s.ejercicios.find((x) => x.ejercicioId === ejercicioId);
    if (!e || !e.series.length) continue;
    if (!mejor || s.fecha > mejor.s.fecha || (s.fecha === mejor.s.fecha && s.id > mejor.s.id)) mejor = { s, e };
  }
  return mejor;
}

function infoEjercicio(id) {
  const c = app.store.estado.catalogo.find((x) => x.id === id);
  const partes = [];
  if (c && c.rangoReps) partes.push(c.rangoReps.min + "–" + c.rangoReps.max + " reps" + (c.unilateral ? " por lado" : ""));
  else if (c && c.unilateral) partes.push("reps por lado");
  if (M.modo === "entreno") {
    try {
      const A = app.store.analisis(), p = A.progresionDe(id);
      if (p) { const t = A.proximaVez(p); if (t) partes.push("Próxima vez: " + t); }
    } catch (e) { /* sin análisis */ }
  }
  return partes.join(" · ");
}

// ─────────── cuerpo ───────────

function pintarCuerpo() {
  const d = M.d, cont = M.cuerpo;
  const scroll = cont.scrollTop;
  const bloques = [];
  if (M.modo === "edicion") bloques.push(detallesEdicion());
  d.ejercicios.forEach((e, i) => bloques.push(bloqueEjercicio(e, i)));
  bloques.push(h("div", { class: "seccion pila", style: { gap: "10px" } },
    h("button", { class: "btn gris", onClick: anadirEjercicio }, icono("mas"), h("span", null, "Añadir ejercicio")),
    M.modo === "entreno" ? h("button", { class: "btn texto", style: { color: "var(--bad)" }, onClick: descartar }, "Descartar entrenamiento") : null));
  poner(cont, bloques);
  cont.scrollTop = scroll;
}

function detallesEdicion() {
  const d = M.d;
  const campo = (tipo, valor, alCambiar, etiqueta) => h("input", { type: tipo, class: "campo-fila", value: valor, "aria-label": etiqueta, onChange: (e) => alCambiar(e.target.value) });
  return seccion({ cab: "Detalles" }, lista([
    celda({ titulo: "Fecha", control: campo("date", d.fecha, (v) => { if (v) d.fecha = v; }, "Fecha") }),
    celda({ titulo: "Inicio", control: campo("time", d.inicioTxt, (v) => { d.inicioTxt = v; }, "Hora de inicio") }),
    celda({ titulo: "Fin", control: campo("time", d.finTxt, (v) => { d.finTxt = v; }, "Hora de fin") }),
  ]));
}

function bloqueEjercicio(e, i) {
  const ant = sesionAnterior(e.ejercicioId);
  const paso = app.store.estado.ajustes.entreno.pasoPeso || 2.5;
  const info = infoEjercicio(e.ejercicioId);
  const filas = e.series.map((s, j) => filaSerie(e, i, s, j, ant ? ant.e.series[j] : null, paso));
  return h("section", { class: "ej", dataset: { ej: String(i) } },
    h("div", { class: "ej-cab" },
      h("button", { class: "ej-nombre", onClick: () => menuEjercicio(i) }, e.nombre || nombreDe(e.ejercicioId)),
      h("button", { class: "btn-icono", "aria-label": "Opciones de " + (e.nombre || ""), onClick: () => menuEjercicio(i) }, icono("opciones"))),
    info ? h("div", { class: "ej-info" }, info) : null,
    e.nota ? h("div", { class: "ej-nota" }, e.nota) : null,
    h("div", { class: "series" },
      h("div", { class: "fila-cab", "aria-hidden": "true" }, h("span", null, "Serie"), h("span", null, "Anterior"), h("span", null, "kg"), h("span", null, "Reps"), h("span", { class: "c-check" }, icono("check", { tam: 16, grosor: 2.4 }))),
      filas),
    h("button", { class: "btn-anadir-serie", onClick: () => { const ult = e.series[e.series.length - 1]; e.series.push(Object.assign(vacia(), ult ? { peso: ult.peso, tipo: ult.tipo === "calentamiento" ? "normal" : ult.tipo } : {})); seleccion(); guardarPronto(); pintarCuerpo(); } },
      icono("mas", { tam: 18 }), h("span", null, "Añadir serie")));
}

function filaSerie(e, i, s, j, ant, paso) {
  const letra = letraTipo(s.tipo);
  const nNormal = e.series.slice(0, j + 1).filter((x) => x.tipo !== "calentamiento").length;
  const antTxt = ant ? (ant.peso > 0 ? fmt(ant.peso, Number.isInteger(ant.peso) ? 0 : 1) + " × " + ant.reps : ant.reps ? ant.reps + " reps" : "—") : "—";
  const kgIn = h("input", { class: "campo-serie num", type: "text", inputmode: "decimal", enterkeyhint: "next", autocomplete: "off", value: s.peso,
    placeholder: ant && ant.peso > 0 ? aTexto(ant.peso) : "", "aria-label": "Peso de la serie " + (j + 1), dataset: { teclado: "1", paso: String(paso) },
    onInput: (ev) => { s.peso = ev.target.value; guardarPronto(); } });
  const repsIn = h("input", { class: "campo-serie num", type: "text", inputmode: "numeric", enterkeyhint: "next", autocomplete: "off", value: s.reps,
    placeholder: ant && ant.reps ? String(ant.reps) : "", "aria-label": "Repeticiones de la serie " + (j + 1), dataset: { teclado: "1", paso: "1" },
    onInput: (ev) => { s.reps = ev.target.value; guardarPronto(); } });
  const check = h("button", { class: "check", "aria-label": "Serie hecha", "aria-pressed": String(!!s.hecha) }, icono("check", { grosor: 2.6 }));
  const fila = h("div", { class: ["serie", s.hecha && "hecha"] },
    h("button", { class: ["num-serie", letra && "tipo-" + s.tipo], "aria-label": "Tipo de la serie " + (j + 1), onClick: () => elegirTipo(s) }, letra || String(nNormal)),
    h("button", { class: "anterior num", "aria-label": "Copiar la serie anterior", onClick: () => { if (!ant) return; kgIn.value = s.peso = ant.peso > 0 ? aTexto(ant.peso) : ""; repsIn.value = s.reps = ant.reps ? String(ant.reps) : ""; seleccion(); guardarPronto(); } }, antTxt),
    kgIn, repsIn, check);
  check.addEventListener("click", () => {
    if (!s.hecha) {
      if (!s.peso && kgIn.placeholder) s.peso = kgIn.value = kgIn.placeholder;
      if (!s.reps && repsIn.placeholder) s.reps = repsIn.value = repsIn.placeholder;
      const r = leerNumero(s.reps), p = s.peso === "" ? 0 : leerNumero(s.peso);
      if (!(r > 0) || !Number.isFinite(p) || p < 0) { (r > 0 ? kgIn : repsIn).focus(); fila.classList.add("error"); setTimeout(() => fila.classList.remove("error"), 600); return; }
      s.hecha = true; impacto();
      if (M.modo === "entreno" && s.tipo !== "calentamiento") empezarDescanso(app.store.estado.ajustes.entreno.descanso || 90);
    } else s.hecha = false;
    fila.classList.toggle("hecha", s.hecha);
    check.setAttribute("aria-pressed", String(s.hecha));
    guardarYa();
  });
  return deslizable(fila, () => { e.series.splice(j, 1); guardarYa(); pintarCuerpo(); });
}

async function elegirTipo(s) {
  const r = await app.hojaAcciones({ mensaje: "Tipo de serie", opciones: TIPOS.map(([v, t]) => ({ texto: t + (s.tipo === v ? " · actual" : ""), valor: v })) });
  if (!r || !M) return;
  s.tipo = r; guardarPronto(); pintarCuerpo();
}

async function menuEjercicio(i) {
  const e = M.d.ejercicios[i];
  const op = [{ texto: "Cambiar ejercicio", valor: "cambiar" }, { texto: "Ver historia", valor: "historia" }, { texto: e.nota ? "Editar nota" : "Añadir nota", valor: "nota" }];
  if (i > 0) op.push({ texto: "Subir", valor: "subir" });
  if (i < M.d.ejercicios.length - 1) op.push({ texto: "Bajar", valor: "bajar" });
  op.push({ texto: "Quitar ejercicio", valor: "quitar", peligro: true });
  const r = await app.hojaAcciones({ mensaje: e.nombre, opciones: op });
  if (!M || !r) return;
  if (r === "cambiar") {
    const x = await elegirEjercicio(app, { titulo: "Cambiar ejercicio" });
    if (x && M) { e.ejercicioId = x.ejercicioId; e.nombre = x.nombre; }
  } else if (r === "historia") return verHistoria(e);
  else if (r === "nota") return editarNota(e);
  else if (r === "subir" || r === "bajar") { const k = r === "subir" ? i - 1 : i + 1; [M.d.ejercicios[i], M.d.ejercicios[k]] = [M.d.ejercicios[k], M.d.ejercicios[i]]; }
  else if (r === "quitar") {
    if (e.series.some((s) => s.hecha) && !(await app.confirmar("¿Quitar " + e.nombre + "?", "Tiene series hechas que se perderán.", "Quitar", true))) return;
    M.d.ejercicios.splice(i, 1);
  }
  guardarYa(); pintarCuerpo();
}

async function anadirEjercicio() {
  const x = await elegirEjercicio(app, { excluir: M.d.ejercicios.map((e) => e.ejercicioId) });
  if (!x || !M) return;
  const ant = sesionAnterior(x.ejercicioId);
  const n = ant ? Math.min(6, ant.e.series.length) : 3;
  M.d.ejercicios.push({ ejercicioId: x.ejercicioId, nombre: x.nombre, objetivo: n, series: Array.from({ length: n }, vacia) });
  guardarYa(); pintarCuerpo();
  requestAnimationFrame(() => { const u = M && M.cuerpo.querySelector(".ej:last-of-type"); if (u) u.scrollIntoView({ behavior: reducirMovimiento() ? "auto" : "smooth", block: "start" }); });
}

function verHistoria(e) {
  const ses = app.store.estado.sesiones.filter((s) => s.ejercicios.some((x) => x.ejercicioId === e.ejercicioId))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? 1 : -1)).slice(0, 8);
  app.abrirHoja({
    titulo: e.nombre, alturas: ["media", "grande"], cancelar: "Cerrar",
    render(c) {
      if (!ses.length) { poner(c, h("p", { class: "seccion-pie", style: { textAlign: "center", padding: "24px" } }, "Aún no hay sesiones con este ejercicio.")); return; }
      poner(c, seccion({}, lista(ses.map((s) => {
        const x = s.ejercicios.find((y) => y.ejercicioId === e.ejercicioId);
        return celda({ titulo: capital(fechaCorta(s.fecha, app.store.hoy())), sub: x.series.map((st) => (st.peso > 0 ? fmt(st.peso, Number.isInteger(st.peso) ? 0 : 1) + "×" : "") + st.reps).join(" · ") });
      }))));
    },
  });
}

function editarNota(e) {
  const ta = h("textarea", { class: "area-nota", rows: 4, placeholder: "Nota del ejercicio", "aria-label": "Nota" });
  ta.value = e.nota || "";
  app.abrirHoja({
    titulo: "Nota", alturas: ["media"],
    accion: { texto: "Guardar", alPulsar: () => { e.nota = ta.value.trim() || undefined; guardarYa(); pintarCuerpo(); } },
    sucio: () => ta.value.trim() !== (e.nota || ""),
    render(c) { poner(c, h("div", { class: "seccion" }, ta)); setTimeout(() => ta.focus(), 350); },
  });
}

// ─────────── terminar, descartar, guardar ───────────

async function descartar() {
  const ok = await app.confirmar("¿Descartar el entrenamiento?", "Se perderán las series de esta sesión.", "Descartar", true);
  if (!ok) return;
  await app.store.guardarBorrador(null);
  cerrarModal();
}

const contarHechas = (d) => d.ejercicios.reduce((a, e) => a + e.series.filter((s) => s.hecha).length, 0);

/** Convierte el borrador o la edición en una sesión del modelo. */
function aSesion(d, { id, fecha, inicio, fin, conSinMarcar = false }) {
  const minutosDe = (t) => { const [a, b] = t.split(":").map(Number); return a * 60 + b; };
  let duracion = null;
  if (inicio && fin) { duracion = minutosDe(fin) - minutosDe(inicio); if (duracion < 0) duracion += 1440; }
  const ejercicios = d.ejercicios.map((e) => {
    const series = e.series.filter((s) => s.hecha || (conSinMarcar && leerNumero(s.reps) > 0)).map((s) => {
      const out = Object.assign({}, s, { peso: s.peso === "" ? 0 : leerNumero(s.peso) || 0, reps: leerNumero(s.reps) || 0, tipo: s.tipo || "normal", hecha: true });
      return out;
    });
    const x = { ejercicioId: e.ejercicioId, nombre: e.nombre || nombreDe(e.ejercicioId), tipo: e.tipo || "peso", series };
    if (e.nota) x.nota = e.nota;
    return x;
  }).filter((e) => e.series.length);
  return { id, rutina: d.rutina || null, fecha, inicio: inicio || null, fin: fin || null, duracion, ejercicios };
}

async function terminar() {
  const d = M.d;
  guardarYa();
  if (!contarHechas(d)) {
    const r = await app.alerta({ titulo: "No hay series hechas", mensaje: "Marca al menos una serie para guardar el entrenamiento.",
      botones: [{ texto: "Descartar entrenamiento", valor: "d", estilo: "peligro" }, { texto: "Seguir entrenando", valor: null, estilo: "fuerte" }] });
    if (r === "d") { await app.store.guardarBorrador(null); cerrarModal(); }
    return;
  }
  const ahora = Date.now();
  const r = { fecha: d.fecha || fechaLocal(d.inicio), inicio: hhmm(d.inicio), fin: hhmm(ahora), conSinMarcar: false };
  const sinMarcar = d.ejercicios.reduce((a, e) => a + e.series.filter((s) => !s.hecha && leerNumero(s.reps) > 0).length, 0);
  const durTxt = () => { const s = aSesion(d, Object.assign({ id: "x" }, r)); return s.duracion != null ? minutos(s.duracion) : "—"; };
  let durEl = null;
  app.abrirHoja({
    titulo: "Terminar", cancelar: "Seguir", alturas: ["grande"],
    accion: { texto: "Guardar", alPulsar: async () => {
      const ses = aSesion(d, Object.assign({ id: idSesion(r.fecha, d.inicio) }, r));
      await app.store.guardarSesion(ses);
      await app.store.guardarBorrador(null);
      cerrarModal(true);
      exito();
      mostrarResumen(ses);
    } },
    render(c) {
      const campo = (tipo, k, etiqueta) => h("input", { type: tipo, class: "campo-fila", value: r[k], "aria-label": etiqueta, onChange: (e) => { if (e.target.value) r[k] = e.target.value; if (durEl) durEl.textContent = durTxt(); } });
      durEl = h("span", { class: "num" }, durTxt());
      poner(c,
        h("div", { class: "seccion" }, h("div", { class: "t-title2" }, d.rutina || "Entrenamiento"), h("div", { class: "t-subhead c-2" }, plural(contarHechas(d), "serie hecha", "series hechas"))),
        seccion({}, lista([
          celda({ titulo: "Fecha", control: campo("date", "fecha", "Fecha") }),
          celda({ titulo: "Inicio", control: campo("time", "inicio", "Hora de inicio") }),
          celda({ titulo: "Fin", control: campo("time", "fin", "Hora de fin") }),
          celda({ titulo: "Duración", valor: durEl }),
        ])),
        seccion({ cab: "Ejercicios", pie: sinMarcar ? null : "Solo se guardan las series marcadas." }, lista(d.ejercicios.map((e) => {
          const n = e.series.filter((s) => s.hecha).length;
          return celda({ titulo: e.nombre, valor: n + " de " + e.series.length });
        }))),
        sinMarcar ? seccion({ pie: "Hay " + plural(sinMarcar, "serie sin marcar", "series sin marcar") + " con repeticiones. Por defecto no se guardan." }, lista([
          celda({ titulo: "Guardar también las sin marcar", control: interruptor(false, (v) => { r.conSinMarcar = v; }, "Guardar también las series sin marcar") })])) : null);
    },
  });
}

async function cancelarEdicion() {
  if (JSON.stringify(M.d) !== M.inicial) {
    const r = await app.hojaAcciones({ opciones: [{ texto: "Descartar cambios", valor: "s", peligro: true }] });
    if (r !== "s") return;
  }
  cerrarModal();
}

async function guardarEdicion() {
  const d = M.d;
  const ses = aSesion(d, { id: M.id, fecha: d.fecha, inicio: d.inicioTxt || null, fin: d.finTxt || null, conSinMarcar: false });
  if (!d.inicioTxt || !d.finTxt) ses.duracion = M.original.duracion ?? null;
  if (M.original.origen) ses.origen = M.original.origen;
  if (!ses.ejercicios.length) {
    const ok = await app.confirmar("La sesión se queda vacía", "Sin series no se puede guardar. ¿Borrar la sesión?", "Borrar sesión", true);
    if (!ok) return;
    await app.store.borrarSesion(M.id);
    cerrarModal(); app.toast("Sesión borrada", { icono: "papelera" });
    if (app.nav.pantalla && app.nav.pantalla.nombre === "sesion") app.nav.atras();
    return;
  }
  await app.store.guardarSesion(ses);
  cerrarModal();
  app.toast("Cambios guardados");
}

// ─────────── resumen ───────────

function mejorRM(series) { let m = 0; for (const s of series) if (s.peso > 0 && s.reps > 0) m = Math.max(m, epley(s.peso, s.reps)); return m; }

export function mostrarResumen(ses) {
  const { store } = app;
  let prs = [];
  try {
    const A = store.analisis();
    prs = A.nuevosPR.filter((p) => (p.rm && p.e.rmMax && p.e.rmMax.ses && p.e.rmMax.ses.id === ses.id) || (p.peso && p.e.pesoMax && p.e.pesoMax.ses && p.e.pesoMax.ses.id === ses.id));
  } catch (e) { prs = []; }
  const anteriorDe = (id) => {
    let mejor = null;
    for (const s of store.estado.sesiones) {
      if (s.id === ses.id || s.fecha > ses.fecha || (s.fecha === ses.fecha && s.id > ses.id)) continue;
      const e = s.ejercicios.find((x) => x.ejercicioId === id);
      if (e && (!mejor || s.fecha > mejor.s.fecha || (s.fecha === mejor.s.fecha && s.id > mejor.s.id))) mejor = { s, e };
    }
    return mejor;
  };
  let series = 0, vol = 0;
  for (const e of ses.ejercicios) for (const s of e.series) { series++; if (s.peso > 0) vol += s.peso * s.reps; }
  app.abrirHoja({
    titulo: "", cancelar: null, alturas: ["grande"],
    accion: { texto: "Hecho", alPulsar: () => {} },
    render(c) {
      poner(c,
        h("div", { class: "seccion resumen-cab" },
          h("div", { class: "fila", style: { gap: "10px" } }, h("span", { class: "c-ok", style: { display: "flex" } }, icono("check", { tam: 30, grosor: 2.6 })), h("div", { class: "t-title1" }, ses.rutina || "Entrenamiento")),
          h("div", { class: "t-subhead c-2", style: { marginTop: "4px" } }, [ses.duracion ? minutos(ses.duracion) : null, plural(series, "serie", "series"), vol ? kgTotal(vol) : null].filter(Boolean).join(" · "))),
        prs.length ? h("div", { class: "seccion" }, h("div", { class: "tarjeta" },
          h("div", { class: "fila", style: { gap: "8px", marginBottom: "8px" } }, h("span", { class: "c-accent", style: { display: "flex" } }, icono("trofeo", { tam: 22 })),
            h("span", { class: "t-headline" }, prs.length === 1 ? "1 récord nuevo" : prs.length + " récords nuevos")),
          prs.map((p) => h("div", { class: "fila entre fila-pr" }, h("span", null, p.e.nombre), h("span", { class: "num c-2" }, p.rm ? "e1RM " + kg(p.rm) : kg(p.peso)))))) : null,
        seccion({ cab: "Por ejercicio" }, lista(ses.ejercicios.map((e) => {
          const mejor = e.series.reduce((m, s) => (!m || epley(s.peso, s.reps) > epley(m.peso, m.reps) ? s : m), null);
          const ant = anteriorDe(e.ejercicioId);
          const a = ant ? mejorRM(ant.e.series) : 0, b = mejorRM(e.series);
          const dir = !ant || !a || !b ? null : b > a * 1.005 ? "sube" : b < a * 0.995 ? "baja" : "igual";
          return celda({ titulo: e.nombre, sub: plural(e.series.length, "serie", "series") + (mejor && mejor.peso > 0 ? " · mejor " + fmt(mejor.peso, Number.isInteger(mejor.peso) ? 0 : 1) + " × " + mejor.reps : ""),
            valor: dir ? chip(dir === "sube" ? "Mejor" : dir === "baja" ? "Peor" : "Igual", dir === "sube" ? "ok" : dir === "baja" ? "bad" : null, { icono: dir }) : null });
        }))));
    },
  });
}

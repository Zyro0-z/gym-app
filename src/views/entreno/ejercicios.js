// Bloques de ejercicio: referencias (anterior, próxima vez), menú, añadir, historia y nota.
import { h, poner, reducirMovimiento } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda } from "../../ui/controles.js";
import { seleccion } from "../../ui/haptica.js";
import { kg, fechaCorta, capital } from "../../ui/textos.js";
import { fmt } from "../../core/formato.js";
import { elegirEjercicio } from "../selector.js";
import { vacia, nombreDe, aTexto } from "./estado.js";
import { guardarPronto, guardarYa } from "./pantalla.js";
import { filaSerie, resaltarActual } from "./serie.js";
import { descartar, notaSesion } from "./revision.js";
import { celdaRecuperacion } from "./recuperacion.js";
import { E } from "./estado.js";
import { sugerenciaDe, aplicarSugerencia, repetirUltima, posicionSuperserie, unirConSiguiente, separarDeSuperserie, limpiarGrupos, calculadoraDiscos } from "./herramientas.js";

export function sesionAnterior(ejercicioId) {
  const fechaTope = E.M.modo === "edicion" ? E.M.d.fecha : "9999";
  let mejor = null;
  for (const s of E.app.store.estado.sesiones) {
    if (E.M.modo === "edicion" && s.id === E.M.id) continue;
    if (s.fecha > fechaTope || (E.M.modo === "edicion" && s.fecha === fechaTope && s.id > E.M.id)) continue;
    const e = s.ejercicios.find((x) => x.ejercicioId === ejercicioId);
    if (!e || !e.series.length) continue;
    if (!mejor || s.fecha > mejor.s.fecha || (s.fecha === mejor.s.fecha && s.id > mejor.s.id)) mejor = { s, e };
  }
  return mejor;
}

export function infoEjercicio(id) {
  const c = E.app.store.estado.catalogo.find((x) => x.id === id);
  const partes = [];
  if (c && c.rangoReps) partes.push(c.rangoReps.min + "–" + c.rangoReps.max + " reps" + (c.unilateral ? " por lado" : ""));
  else if (c && c.unilateral) partes.push("reps por lado");
  if (E.M.modo === "entreno") {
    try {
      const A = E.app.store.analisis(), p = A.progresionDe(id);
      if (p) { const t = A.proximaVez(p); if (t) partes.push("Próxima vez: " + t); }
    } catch (e) { /* sin análisis */ }
  }
  return partes.join(" · ");
}

export function pintarCuerpo() {
  const d = E.M.d, cont = E.M.cuerpo;
  const scroll = cont.scrollTop;
  const bloques = [];
  if (E.M.modo === "edicion") bloques.push(detallesEdicion());
  bloques.push(celdaRecuperacion(d, pintarCuerpo));
  d.ejercicios.forEach((e, i) => bloques.push(bloqueEjercicio(e, i)));
  bloques.push(h("div", { class: "seccion pila", style: { gap: "10px" } },
    h("button", { class: "btn gris", onClick: anadirEjercicio }, icono("mas"), h("span", null, "Añadir ejercicio")),
    E.M.modo === "entreno" ? h("button", { class: "btn texto", style: { color: "var(--bad-ink)" }, onClick: descartar }, "Descartar entrenamiento") : null));
  poner(cont, bloques);
  cont.scrollTop = scroll;
  resaltarActual();
}

export function detallesEdicion() {
  const d = E.M.d;
  const campo = (tipo, valor, alCambiar, etiqueta) => h("input", { type: tipo, class: "campo-fila", value: valor, "aria-label": etiqueta, onChange: (e) => alCambiar(e.target.value) });
  return seccion({ cab: "Detalles" }, lista([
    celda({ titulo: "Fecha", control: campo("date", d.fecha, (v) => { if (v) d.fecha = v; }, "Fecha") }),
    celda({ titulo: "Inicio", control: campo("time", d.inicioTxt, (v) => { d.inicioTxt = v; }, "Hora de inicio") }),
    celda({ titulo: "Fin", control: campo("time", d.finTxt, (v) => { d.finTxt = v; }, "Hora de fin") }),
  ]), h("div", { class: "celda-area", style: { marginTop: "12px" } }, notaSesion(d)));
}

export function bloqueEjercicio(e, i) {
  const ant = sesionAnterior(e.ejercicioId);
  const paso = E.app.store.estado.ajustes.entreno.pasoPeso || 2.5;
  const info = infoEjercicio(e.ejercicioId);
  const filas = e.series.map((s, j) => filaSerie(e, i, s, j, ant ? ant.e.series[j] : null, paso));
  const sug = sugerenciaDe(e.ejercicioId);
  const pos = posicionSuperserie(E.M.d.ejercicios, i);
  return h("section", { class: ["ej", pos && "superserie", pos && "ss-" + pos], dataset: { ej: String(i) } },
    pos === "inicio" ? h("div", { class: "ss-etiqueta" }, "Superserie") : null,
    h("div", { class: "ej-cab" },
      h("button", { class: "ej-nombre", onClick: () => menuEjercicio(i) }, e.nombre || nombreDe(e.ejercicioId)),
      h("button", { class: "btn-icono", "aria-label": "Opciones de " + (e.nombre || ""), onClick: () => menuEjercicio(i) }, icono("opciones"))),
    info ? h("div", { class: "ej-info" }, info) : null,
    sug ? h("button", { class: "chip-sugerencia", "aria-label": "Sugerencia: " + aTexto(sug.peso) + " kilos por " + sug.reps + " repeticiones. " + sug.motivo + ". Toca para ponerla en las series vacías.",
      onClick: () => { const n = aplicarSugerencia(e, sug); seleccion(); guardarPronto(); pintarCuerpo(); if (!n) E.app.toast("Las series ya tienen peso"); } },
      h("span", { class: "t" }, "Sugerido"), h("span", { class: "num" }, aTexto(sug.peso) + " kg × " + sug.reps), h("span", { class: "m" }, sug.motivo)) : null,
    e.nota ? h("div", { class: "ej-nota" }, e.nota) : null,
    h("div", { class: "series" },
      h("div", { class: "fila-cab", "aria-hidden": "true" }, h("span", null, "Serie"), h("span", null, "Anterior"), h("span", null, "kg"), h("span", null, "Reps"), h("span", null, "RPE"), h("span", { class: "c-check" }, icono("check", { tam: 16, grosor: 2.4 }))),
      filas),
    h("div", { class: "fila-botones-serie" },
      h("button", { class: "btn-anadir-serie", onClick: () => { const ult = e.series[e.series.length - 1]; e.series.push(Object.assign(vacia(), ult ? { peso: ult.peso, tipo: ult.tipo === "calentamiento" ? "normal" : ult.tipo } : {})); seleccion(); guardarPronto(); pintarCuerpo(); } },
        icono("mas", { tam: 18 }), h("span", null, "Añadir serie")),
      h("button", { class: "btn-anadir-serie", onClick: () => {
        if (!repetirUltima(e)) { E.app.toast("Marca antes una serie como hecha"); return; }
        seleccion(); guardarPronto(); pintarCuerpo();
      } }, icono("repetir", { tam: 18 }), h("span", null, "Repetir última"))));
}

export async function menuEjercicio(i) {
  const e = E.M.d.ejercicios[i];
  const op = [{ texto: "Cambiar ejercicio", valor: "cambiar" }, { texto: "Ver historia", valor: "historia" }, { texto: e.nota ? "Editar nota" : "Añadir nota", valor: "nota" }];
  const ejs = E.M.d.ejercicios;
  if (i < ejs.length - 1 && !(e.grupoId && ejs[i + 1].grupoId === e.grupoId)) op.push({ texto: "Unir con el siguiente", valor: "unir" });
  if (posicionSuperserie(ejs, i)) op.push({ texto: "Separar de la superserie", valor: "separar" });
  if (!e.tipo || e.tipo === "peso") op.push({ texto: "Calculadora de discos", valor: "discos" });
  if (i > 0) op.push({ texto: "Subir", valor: "subir" });
  if (i < E.M.d.ejercicios.length - 1) op.push({ texto: "Bajar", valor: "bajar" });
  op.push({ texto: "Quitar ejercicio", valor: "quitar", peligro: true });
  const r = await E.app.hojaAcciones({ mensaje: e.nombre, opciones: op });
  if (!E.M || !r) return;
  if (r === "cambiar") {
    const x = await elegirEjercicio(E.app, { titulo: "Cambiar ejercicio" });
    if (x && E.M) { e.ejercicioId = x.ejercicioId; e.nombre = x.nombre; }
  } else if (r === "historia") return verHistoria(e);
  else if (r === "nota") return editarNota(e);
  else if (r === "discos") return calculadoraDiscos(e);
  else if (r === "unir") unirConSiguiente(E.M.d.ejercicios, i);
  else if (r === "separar") separarDeSuperserie(E.M.d.ejercicios, i);
  else if (r === "subir" || r === "bajar") { const k = r === "subir" ? i - 1 : i + 1; [E.M.d.ejercicios[i], E.M.d.ejercicios[k]] = [E.M.d.ejercicios[k], E.M.d.ejercicios[i]]; }
  else if (r === "quitar") {
    if (e.series.some((s) => s.hecha) && !(await E.app.confirmar("¿Quitar " + e.nombre + "?", "Tiene series hechas que se perderán.", "Quitar", true))) return;
    E.M.d.ejercicios.splice(i, 1);
  }
  limpiarGrupos(E.M.d.ejercicios);
  guardarYa(); pintarCuerpo();
}

export async function anadirEjercicio() {
  const x = await elegirEjercicio(E.app, { excluir: E.M.d.ejercicios.map((e) => e.ejercicioId) });
  if (!x || !E.M) return;
  const ant = sesionAnterior(x.ejercicioId);
  const n = ant ? Math.min(6, ant.e.series.length) : 3;
  E.M.d.ejercicios.push({ ejercicioId: x.ejercicioId, nombre: x.nombre, objetivo: n, series: Array.from({ length: n }, vacia) });
  guardarYa(); pintarCuerpo();
  requestAnimationFrame(() => { const u = E.M && E.M.cuerpo.querySelector(".ej:last-of-type"); if (u) u.scrollIntoView({ behavior: reducirMovimiento() ? "auto" : "smooth", block: "start" }); });
}

export function verHistoria(e) {
  const ses = E.app.store.estado.sesiones.filter((s) => s.ejercicios.some((x) => x.ejercicioId === e.ejercicioId))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : a.id < b.id ? 1 : -1)).slice(0, 8);
  E.app.abrirHoja({
    titulo: e.nombre, alturas: ["media", "grande"], cancelar: "Cerrar",
    render(c) {
      if (!ses.length) { poner(c, h("p", { class: "seccion-pie", style: { textAlign: "center", padding: "24px" } }, "Aún no hay sesiones con este ejercicio.")); return; }
      poner(c, seccion({}, lista(ses.map((s) => {
        const x = s.ejercicios.find((y) => y.ejercicioId === e.ejercicioId);
        return celda({ titulo: capital(fechaCorta(s.fecha, E.app.store.hoy())), sub: x.series.map((st) => (st.peso > 0 ? fmt(st.peso, Number.isInteger(st.peso) ? 0 : 1) + "×" : "") + st.reps).join(" · ") });
      }))));
    },
  });
}

export function editarNota(e) {
  const ta = h("textarea", { class: "area-nota", rows: 4, placeholder: "Nota del ejercicio", "aria-label": "Nota" });
  ta.value = e.nota || "";
  E.app.abrirHoja({
    titulo: "Nota", alturas: ["media"],
    accion: { texto: "Guardar", alPulsar: () => { e.nota = ta.value.trim() || undefined; guardarYa(); pintarCuerpo(); } },
    sucio: () => ta.value.trim() !== (e.nota || ""),
    render(c) { poner(c, h("div", { class: "seccion" }, ta)); setTimeout(() => ta.focus(), 350); },
  });
}

// Fila de una serie: tipo, anterior, peso, repeticiones, RPE y marcar hecha.
import { h } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { deslizable } from "../../ui/controles.js";
import { impacto, seleccion, record } from "../../ui/haptica.js";
import { superaRecord, ruidoE1rm } from "../../core/prescripcion.js";
import { canon } from "../../core/nombres.js";
import { leerNumero, fmt } from "../../core/formato.js";
import { cargaTotal, pesoCorporalEn } from "../../core/sesiones.js";
import { TIPOS, letraTipo, aTexto } from "./estado.js";
import { guardarPronto, guardarYa } from "./pantalla.js";
import { pintarCuerpo } from "./ejercicios.js";
import { empezarDescanso } from "./descanso.js";
import { E } from "./estado.js";
import { finDeRonda, calculadoraDiscos } from "./herramientas.js";
import { CHIPS_RPE, esRpe, rpeTxt } from "../../core/rpe.js";

let tiraAbierta = null;   // solo hay una tira de RPE desplegada a la vez
/** Descanso tras una serie de `e`: el propio del ejercicio si lo tiene; el de Ajustes en otro caso. Con «No» en Ajustes (0) no hay descanso automático. */
export function descansoDe(e) {
  const g = E.app.store.estado.ajustes.entreno.descanso ?? 90, c = E.app.store.estado.catalogo.find((x) => x.id === e.ejercicioId);
  return g > 0 && c && c.descanso > 0 ? c.descanso : g;
}
const cerrarTira = () => { if (tiraAbierta) { tiraAbierta.hidden = true; tiraAbierta = null; } };

/** Si la serie recién marcada supera un récord (de su rango de repeticiones o de e1RM), lo devuelve; cada récord se avisa una vez por sesión. */
function prEnVivo(e, s) {
  if (E.M.modo !== "entreno" || s.tipo === "calentamiento" || (e.tipo && e.tipo !== "peso")) return null;
  const { store } = E.app, cat = store.estado.catalogo.find((x) => x.id === e.ejercicioId), modo = (cat && cat.modoCarga) || "total";
  const peso = cargaTotal(modo, leerNumero(s.peso), modo === "total" ? null : pesoCorporalEn(store.estado.pesajes, E.M.d.fecha || store.hoy())), reps = leerNumero(s.reps);
  let ej = null;
  try { const A = E.app.store.analisis(); ej = A && A.ejercicios.find((x) => x.k === e.ejercicioId || x.k === canon(e.nombre || "")); } catch (_) { return null; }
  if (!ej) return null;
  const r = superaRecord(ej, peso, reps);
  if (!r) return null;
  const clave = r.tipo + "|" + ej.k + "|" + (r.rango ? r.rango.id : ""), valor = r.tipo === "e1rm" ? r.e1rm : peso;
  const vistos = E.M.prVistos || (E.M.prVistos = new Map());
  if ((vistos.get(clave) ?? 0) >= valor) return null;
  vistos.set(clave, valor);
  const ruido = ruidoE1rm(ej.hist);
  return Object.assign(r, { peso, reps, dentroDelRuido: !!ruido && r.e1rm - r.e1rmPrevio < ruido.sd });
}

export function filaSerie(e, i, s, j, ant, paso) {
  const letra = letraTipo(s.tipo);
  const nNormal = e.series.slice(0, j + 1).filter((x) => x.tipo !== "calentamiento").length;
  const antTxt = ant ? (ant.peso > 0 ? fmt(ant.peso, Number.isInteger(ant.peso) ? 0 : 1) + " × " + ant.reps : ant.reps ? ant.reps + " reps" : "—") : "—";
  const kgIn = h("input", { class: "campo-serie num", type: "text", inputmode: "decimal", enterkeyhint: "next", autocomplete: "off", value: s.peso,
    placeholder: ant && ant.peso > 0 ? aTexto(ant.peso) : "", "aria-label": "Peso de la serie " + (j + 1), dataset: { teclado: "1", paso: String(paso) },
    onInput: (ev) => { s.peso = ev.target.value; guardarPronto(); } });
  if (!e.tipo || e.tipo === "peso") { kgIn.dataset.discos = "1"; kgIn.addEventListener("discos", () => { kgIn.blur(); calculadoraDiscos(e); }); }
  const repsIn = h("input", { class: "campo-serie num", type: "text", inputmode: "numeric", enterkeyhint: "next", autocomplete: "off", value: s.reps,
    placeholder: ant && ant.reps ? String(ant.reps) : "", "aria-label": "Repeticiones de la serie " + (j + 1), dataset: { teclado: "1", paso: "1" },
    onInput: (ev) => { s.reps = ev.target.value; guardarPronto(); } });
  const nombreTipo = (TIPOS.find((x) => x[0] === s.tipo) || TIPOS[0])[1];
  const rpeBtn = h("button", { class: "rpe-serie num" });
  const pintarRpe = () => {
    const obj = esRpe(e.rpeObjetivo) ? e.rpeObjetivo : null;
    rpeBtn.textContent = esRpe(s.rpe) ? rpeTxt(s.rpe) : obj ? "@" + rpeTxt(obj) : "RPE";
    rpeBtn.classList.toggle("sin-rpe", !esRpe(s.rpe));
    rpeBtn.setAttribute("aria-label", "RPE de la serie " + (j + 1) + ": " + (esRpe(s.rpe) ? rpeTxt(s.rpe) : "sin anotar") + (obj ? ", objetivo " + rpeTxt(obj) : ""));
  };
  pintarRpe();
  const obj = esRpe(e.rpeObjetivo) ? e.rpeObjetivo : null;
  const tira = h("div", { class: "tira-rpe", hidden: true, role: "radiogroup", "aria-label": "RPE de la serie " + (j + 1) },
    CHIPS_RPE.map((v) => h("button", { class: ["chip-rpe", v === obj && "objetivo"], role: "radio", dataset: { v: String(v) },
      "aria-label": "RPE " + rpeTxt(v) + (v === obj ? ", objetivo" : ""), onClick: () => {
        if (s.rpe === v) delete s.rpe; else s.rpe = v;
        seleccion(); pintarRpe(); pintarTira(); cerrarTira(); rpeBtn.setAttribute("aria-expanded", "false"); guardarYa(); resaltarActual();
      } }, rpeTxt(v))),
    h("p", { class: "tira-pie" }, "10 es el fallo; cada punto menos, una repetición en reserva." + (obj ? " Objetivo: " + rpeTxt(obj) + "." : "")));
  const pintarTira = () => { for (const b of tira.querySelectorAll(".chip-rpe")) { const act = esRpe(s.rpe) && Number(b.dataset.v) === s.rpe; b.classList.toggle("activo", act); b.setAttribute("aria-checked", String(act)); } };
  const abrirTira = () => { if (tiraAbierta !== tira) cerrarTira(); tira.hidden = false; tiraAbierta = tira; pintarTira(); rpeBtn.setAttribute("aria-expanded", "true"); };
  rpeBtn.setAttribute("aria-expanded", "false");
  rpeBtn.addEventListener("click", () => { if (tira.hidden) abrirTira(); else cerrarTira(); rpeBtn.setAttribute("aria-expanded", String(!tira.hidden)); });
  const check = h("button", { class: "check", "aria-label": "Serie hecha", "aria-pressed": String(!!s.hecha) }, icono("check", { grosor: 2.6 }));
  const fila = h("div", { class: ["serie", s.hecha && "hecha", e.tipo === "reps" && "solo-reps"] },
    h("button", { class: ["num-serie", letra && "tipo-" + s.tipo], "aria-label": "Serie " + (j + 1) + ", tipo " + nombreTipo.toLowerCase() + ". Cambiar el tipo", onClick: () => elegirTipo(s) }, letra || String(nNormal)),
    h("button", { class: "anterior num", "aria-label": "Copiar la serie anterior", onClick: () => { if (!ant) return; kgIn.value = s.peso = ant.peso > 0 ? aTexto(ant.peso) : ""; repsIn.value = s.reps = ant.reps ? String(ant.reps) : ""; seleccion(); guardarPronto(); } }, antTxt),
    e.tipo === "reps" ? null : kgIn, repsIn, rpeBtn, check);
  check.addEventListener("click", () => {
    if (!s.hecha) {
      if (e.tipo !== "reps" && !s.peso && kgIn.placeholder) s.peso = kgIn.value = kgIn.placeholder;
      if (!s.reps && repsIn.placeholder) s.reps = repsIn.value = repsIn.placeholder;
      const r = leerNumero(s.reps), p = s.peso === "" ? 0 : leerNumero(s.peso);
      if (!(r > 0) || !Number.isFinite(p) || p < 0) { (r > 0 ? kgIn : repsIn).focus(); fila.classList.add("error"); setTimeout(() => fila.classList.remove("error"), 600); return; }
      s.hecha = true; impacto();
      const pr = prEnVivo(e, s);
      if (pr) {
        record(); fila.classList.add("pr");
        const kgT = (v) => fmt(v, Number.isInteger(v) ? 0 : 1), cat = E.app.store.estado.catalogo.find((x) => x.id === e.ejercicioId), enTotal = !!(cat && cat.modoCarga && cat.modoCarga !== "total");
        E.app.toast(pr.tipo === "e1rm" ? "Récord de e1RM: " + kgT(pr.e1rm) + " kg" + (pr.dentroDelRuido ? " (dentro de tu ruido)" : "")
          : "Récord en " + pr.rango.txt + " reps: " + kgT(pr.peso) + (enTotal ? " kg en total" : "") + " × " + pr.reps + (pr.previo ? " (antes " + kgT(pr.previo.peso) + ")" : ""), { icono: "trofeo" });
      }
      if (E.M.modo === "entreno" && s.tipo !== "calentamiento" && !esRpe(s.rpe) && E.app.store.estado.ajustes.entreno.rpeAlMarcar !== false) abrirTira();
      // En una superserie el descanso empieza al acabar la ronda (el último ejercicio del grupo)
      if (E.M.modo === "entreno" && s.tipo !== "calentamiento" && finDeRonda(E.M.d.ejercicios, i)) empezarDescanso(descansoDe(e));   // 0 = «No»: sin descanso automático
    } else { s.hecha = false; fila.classList.remove("pr"); if (tiraAbierta === tira) cerrarTira(); }
    fila.classList.toggle("hecha", s.hecha);
    check.setAttribute("aria-pressed", String(s.hecha));
    check.classList.remove("pop");
    if (s.hecha) { void check.offsetWidth; check.classList.add("pop"); }
    resaltarActual();
    guardarYa();
  });
  const borrar = () => {
    const quitada = e.series.splice(j, 1)[0];
    cerrarTira(); guardarYa(); pintarCuerpo();
    E.app.toast("Serie " + (j + 1) + " eliminada", { icono: "papelera", accion: { texto: "Deshacer", alPulsar: () => {
      if (!E.M || !E.M.d.ejercicios.includes(e)) return;
      e.series.splice(Math.min(j, e.series.length), 0, quitada); guardarYa(); pintarCuerpo();
    } } });
  };
  return [deslizable(fila, borrar), tira];
}

/** Foco: solo el check de la serie que toca lleva el color de acento; el ejercicio terminado se atenúa. */
/** «3 series · 115 × 4»: resumen del ejercicio terminado (mejor serie de trabajo por peso). */
export function resumenDe(e) {
  const hechas = e.series.filter((x) => x.hecha && x.tipo !== "calentamiento");
  if (!hechas.length) return "Terminado";
  const kgDe = (x) => leerNumero(x.peso) || 0;
  const m = hechas.reduce((a, x) => (kgDe(x) > kgDe(a) ? x : a), hechas[0]);
  return hechas.length + (hechas.length === 1 ? " serie" : " series") + " · " + (kgDe(m) > 0 ? fmt(kgDe(m), Number.isInteger(kgDe(m)) ? 0 : 1) + " × " : "") + m.reps;
}

export function resaltarActual() {
  if (!E.M || E.M.modo !== "entreno" || !E.M.cuerpo) return;
  const c = E.M.cuerpo;
  for (const x of c.querySelectorAll(".serie.actual")) x.classList.remove("actual");
  const sig = c.querySelector(".serie:not(.hecha)");
  if (sig) sig.classList.add("actual");
  for (const b of c.querySelectorAll(".ej")) {
    const completo = !!b.querySelector(".serie") && !b.querySelector(".serie:not(.hecha)");
    b.classList.toggle("completo", completo);
    const e = E.M.d.ejercicios[Number(b.dataset.ej)];
    if (completo && e) { const t = resumenDe(e), r = b.querySelector(".ej-resumen"); if (r) { r.querySelector("span").textContent = t; r.setAttribute("aria-label", "Ejercicio terminado, " + t + ". Toca para desplegar"); } }
    b.classList.toggle("plegado", completo && !!e && !E.M.abiertos.has(e) && !(tiraAbierta && b.contains(tiraAbierta)));
  }
}

export async function elegirTipo(s) {
  const r = await E.app.hojaAcciones({ mensaje: "Tipo de serie", opciones: TIPOS.map(([v, t]) => ({ texto: t + (s.tipo === v ? " · actual" : ""), valor: v })) });
  if (!r || !E.M) return;
  s.tipo = r; guardarPronto(); pintarCuerpo();
}

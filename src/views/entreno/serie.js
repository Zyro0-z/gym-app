// Fila de una serie: tipo, anterior, peso, repeticiones, RPE y marcar hecha.
import { h } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { deslizable } from "../../ui/controles.js";
import { impacto, seleccion } from "../../ui/haptica.js";
import { leerNumero, fmt } from "../../core/formato.js";
import { TIPOS, letraTipo, aTexto } from "./estado.js";
import { guardarPronto, guardarYa } from "./pantalla.js";
import { pintarCuerpo } from "./ejercicios.js";
import { empezarDescanso } from "./descanso.js";
import { E } from "./estado.js";
import { elegirRpe, finDeRonda } from "./herramientas.js";
import { esRpe, rpeTxt } from "../../core/rpe.js";

export function filaSerie(e, i, s, j, ant, paso) {
  const letra = letraTipo(s.tipo);
  const nNormal = e.series.slice(0, j + 1).filter((x) => x.tipo !== "calentamiento").length;
  const antTxt = ant ? (ant.peso > 0 ? fmt(ant.peso, Number.isInteger(ant.peso) ? 0 : 1) + " × " + ant.reps : ant.reps ? ant.reps + " reps" : "—") : "—";
  const kgIn = h("input", { class: "campo-serie num", type: "text", inputmode: "decimal", enterkeyhint: "next", autocomplete: "off", value: s.peso,
    placeholder: ant && ant.peso > 0 ? aTexto(ant.peso) : "", "aria-label": "Peso de la serie " + (j + 1), dataset: { teclado: "1", paso: String(paso) },
    onInput: (ev) => { s.peso = ev.target.value; guardarPronto(); } });
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
  rpeBtn.addEventListener("click", async () => {
    const v = await elegirRpe(esRpe(s.rpe) ? s.rpe : null, e.rpeObjetivo);
    if (v === undefined || !E.M) return;
    if (v === null) delete s.rpe; else s.rpe = v;
    pintarRpe(); guardarPronto();
  });
  const check = h("button", { class: "check", "aria-label": "Serie hecha", "aria-pressed": String(!!s.hecha) }, icono("check", { grosor: 2.6 }));
  const fila = h("div", { class: ["serie", s.hecha && "hecha"] },
    h("button", { class: ["num-serie", letra && "tipo-" + s.tipo], "aria-label": "Serie " + (j + 1) + ", tipo " + nombreTipo.toLowerCase() + ". Cambiar el tipo", onClick: () => elegirTipo(s) }, letra || String(nNormal)),
    h("button", { class: "anterior num", "aria-label": "Copiar la serie anterior", onClick: () => { if (!ant) return; kgIn.value = s.peso = ant.peso > 0 ? aTexto(ant.peso) : ""; repsIn.value = s.reps = ant.reps ? String(ant.reps) : ""; seleccion(); guardarPronto(); } }, antTxt),
    kgIn, repsIn, rpeBtn, check);
  check.addEventListener("click", () => {
    if (!s.hecha) {
      if (!s.peso && kgIn.placeholder) s.peso = kgIn.value = kgIn.placeholder;
      if (!s.reps && repsIn.placeholder) s.reps = repsIn.value = repsIn.placeholder;
      const r = leerNumero(s.reps), p = s.peso === "" ? 0 : leerNumero(s.peso);
      if (!(r > 0) || !Number.isFinite(p) || p < 0) { (r > 0 ? kgIn : repsIn).focus(); fila.classList.add("error"); setTimeout(() => fila.classList.remove("error"), 600); return; }
      s.hecha = true; impacto();
      // En una superserie el descanso empieza al acabar la ronda (el último ejercicio del grupo)
      if (E.M.modo === "entreno" && s.tipo !== "calentamiento" && finDeRonda(E.M.d.ejercicios, i)) empezarDescanso(E.app.store.estado.ajustes.entreno.descanso ?? 90);   // 0 = «No»: sin descanso automático
    } else s.hecha = false;
    fila.classList.toggle("hecha", s.hecha);
    check.setAttribute("aria-pressed", String(s.hecha));
    guardarYa();
  });
  return deslizable(fila, () => { e.series.splice(j, 1); guardarYa(); pintarCuerpo(); });
}

export async function elegirTipo(s) {
  const r = await E.app.hojaAcciones({ mensaje: "Tipo de serie", opciones: TIPOS.map(([v, t]) => ({ texto: t + (s.tipo === v ? " · actual" : ""), valor: v })) });
  if (!r || !E.M) return;
  s.tipo = r; guardarPronto(); pintarCuerpo();
}

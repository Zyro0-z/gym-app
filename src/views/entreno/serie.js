// Fila de una serie: tipo, anterior, peso, repeticiones y marcar hecha.
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
      if (E.M.modo === "entreno" && s.tipo !== "calentamiento") empezarDescanso(E.app.store.estado.ajustes.entreno.descanso || 90);
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

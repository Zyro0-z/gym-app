// Barra sobre el teclado numérico (iOS no deja añadir una a una web): se coloca encima del
// teclado con visualViewport y aparece mientras hay un campo con [data-teclado] enfocado.
// Botones − / + (paso según el campo) y Siguiente (pasa al siguiente campo).
import { h } from "./dom.js";
import { icono } from "./iconos.js";
import { seleccion } from "./haptica.js";
import { leerNumero } from "../core/formato.js";

let barra = null, campo = null, raiz = null, btnDiscos = null, btnMenos = null, btnMas = null, btnSig = null;

function colocar() {
  if (!barra) return;
  const vv = window.visualViewport;
  const abajo = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
  barra.style.transform = `translateY(${-abajo}px)`;
}

const pasoTxt = (n) => String(n).replace(".", ",");

function pasoDe(el) { return Number(el.dataset.paso) || 1; }

function ajustar(signo) {
  if (!campo) return;
  const paso = pasoDe(campo);
  const v = leerNumero(campo.value);
  const base = Number.isFinite(v) ? v : leerNumero(campo.placeholder);
  let n = (Number.isFinite(base) ? base : 0) + signo * paso;
  n = Math.max(0, Math.round(n * 100) / 100);
  campo.value = String(n).replace(".", ",");
  campo.dispatchEvent(new Event("input", { bubbles: true }));
  seleccion();
}

function siguiente() {
  if (!campo || !raiz) return;
  const todos = [...raiz.querySelectorAll("input[data-teclado]")].filter((x) => !x.disabled && x.offsetParent);
  const i = todos.indexOf(campo);
  const sig = todos[i + 1];
  if (sig) { sig.focus(); sig.select && sig.select(); } else campo.blur();
}

function hecha() {
  if (!campo) return;
  const fila = campo.closest(".serie");
  const check = fila && fila.querySelector(".check");
  if (!check || fila.classList.contains("hecha")) return siguiente();
  campo.blur();
  check.click();
}

/** Activa la barra para los campos con [data-teclado] dentro de `contenedor`. Devuelve la función para quitarla. */
export function barraTeclado(contenedor) {
  raiz = contenedor;
  if (!barra) {
    const btn = (contenido, accion, etiqueta, clase, repetir) => {
      const b = h("button", { class: clase, "aria-label": etiqueta }, contenido);
      // pointerdown con preventDefault: el campo no pierde el foco y el teclado no se cierra
      let espera = 0, ritmo = 0;
      const parar = () => { clearTimeout(espera); clearInterval(ritmo); };
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault(); accion(); parar();
        if (repetir) espera = setTimeout(() => { ritmo = setInterval(accion, 90); }, 420);
      });
      b.addEventListener("mousedown", (e) => e.preventDefault());   // Safari quita el foco en mousedown aunque se cancele pointerdown
      for (const ev of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(ev, parar);
      return b;
    };
    barra = h("div", { class: "barra-teclado", hidden: true },
      btnMenos = btn([icono("menos"), h("span", { class: "paso", "aria-hidden": "true" })], () => ajustar(-1), "Restar", "con-paso", true), btnMas = btn([icono("mas"), h("span", { class: "paso", "aria-hidden": "true" })], () => ajustar(1), "Sumar", "con-paso", true),
      btnDiscos = btn("Discos", () => { if (campo) campo.dispatchEvent(new Event("discos")); }, "Calculadora de discos", "discos"),
      h("span", { class: "hueco" }), btn("Hecha", hecha, "Marcar la serie como hecha", "hecha"), btnSig = btn("Siguiente", siguiente, "Siguiente campo", "siguiente"));
    document.body.appendChild(barra);
    if (window.visualViewport) { visualViewport.addEventListener("resize", colocar); visualViewport.addEventListener("scroll", colocar); }
  }
  const foco = (e) => { if (e.target.matches("input[data-teclado]")) { campo = e.target; barra.hidden = false; btnDiscos.hidden = !campo.dataset.discos; barra.classList.toggle("sin-hecha", !campo.closest(".serie")); document.body.classList.add("con-teclado"); colocar();
    for (const b of [btnMenos, btnMas]) b.querySelector(".paso").textContent = pasoTxt(pasoDe(campo));
    const pesoCampo = /^Peso/.test(campo.getAttribute("aria-label") || ""), repsSig = pesoCampo && campo.closest(".serie");
    btnSig.textContent = repsSig ? "Reps →" : "Siguiente"; btnSig.setAttribute("aria-label", repsSig ? "Reps, siguiente campo" : "Siguiente campo");
    const fila = campo.closest(".serie");
    if (fila) setTimeout(() => { if (campo && fila.isConnected) fila.scrollIntoView({ block: "center", behavior: "smooth" }); }, 350);   // el teclado y la barra no tapan la serie
  } };
  const fuera = (e) => { if (e.target === campo) setTimeout(() => { if (document.activeElement !== campo && !(document.activeElement && document.activeElement.matches("input[data-teclado]"))) { campo = null; barra.hidden = true; document.body.classList.remove("con-teclado"); } }, 0); };
  contenedor.addEventListener("focusin", foco);
  contenedor.addEventListener("focusout", fuera);
  return () => { contenedor.removeEventListener("focusin", foco); contenedor.removeEventListener("focusout", fuera); if (barra) barra.hidden = true; document.body.classList.remove("con-teclado"); campo = null; raiz = null; };
}

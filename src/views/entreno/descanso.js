// Temporizador de descanso.
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { barrita } from "../../ui/controles.js";
import { exito, seleccion } from "../../ui/haptica.js";
import { campana } from "../../ui/sonido.js";
import { reloj } from "../../ui/textos.js";
import { guardarYa } from "./pantalla.js";
import { E } from "./estado.js";

export function empezarDescanso(seg) {
  if (!E.M || E.M.modo !== "entreno" || !(seg > 0)) return;
  E.M.d.descanso = { fin: Date.now() + seg * 1000, total: seg, avisado: false };
  pintarDescanso();
}

export function finDescanso(d) {
  d.descanso.avisado = true;
  exito();
  if (E.app.store.estado.ajustes.entreno.sonido !== false) campana();
  E.app.toast("Descanso terminado", { icono: "cronometro" });
  if (E.M && E.M.modo === "entreno" && E.M.d === d) guardarYa();
  else E.app.store.guardarBorrador(d);
}

export function pintarDescanso() {
  if (!E.M || E.M.modo !== "entreno") return;
  const ds = E.M.d.descanso, el = E.M.descansoEl;
  const resto = ds ? Math.ceil((ds.fin - Date.now()) / 1000) : 0;
  if (ds && resto <= 0 && !ds.avisado) finDescanso(E.M.d);
  if (!ds || resto <= 0) { el.hidden = true; E.M.capa.classList.remove("con-descanso"); return; }
  E.M.capa.classList.add("con-descanso");
  if (el.hidden || !el.firstChild) {
    el.hidden = false;
    const ajustar = (s) => { E.M.d.descanso.fin += s * 1000; E.M.d.descanso.total = Math.max(1, E.M.d.descanso.total + s); seleccion(); pintarDescanso(); guardarYa(); };
    poner(el,
      h("button", { class: "tiempo", "aria-label": "Cambiar descanso", onClick: elegirDescanso }, h("span", { class: "etq" }, "Descanso"), h("span", { class: "valor num" })),
      h("div", { class: "pista" }, barrita(0)),
      h("button", { class: "btn-redondo txt", "aria-label": "Quitar 15 segundos", onClick: () => ajustar(-15) }, "−15"),
      h("button", { class: "btn-redondo txt", "aria-label": "Añadir 15 segundos", onClick: () => ajustar(15) }, "+15"),
      h("button", { class: "btn-barra", onClick: () => { E.M.d.descanso = null; pintarDescanso(); guardarYa(); } }, "Saltar"));
  }
  el.querySelector(".valor").textContent = reloj(resto);
  el.querySelector(".barrita > i").style.width = (Math.max(0, Math.min(1, resto / ds.total)) * 100).toFixed(1) + "%";
}

export async function elegirDescanso() {
  const e = E.app.store.estado.ajustes.entreno;
  const presets = (e.presets && e.presets.length ? e.presets : [60, 90, 120, 180]).slice().sort((a, b) => a - b);
  const r = await E.app.hojaAcciones({ mensaje: "Descanso", opciones: presets.map((s) => ({ texto: reloj(s), valor: s })).concat(E.M.d.descanso ? [{ texto: "Parar el descanso", valor: 0, peligro: true }] : []) });
  if (r === null || !E.M) return;
  if (r === 0) E.M.d.descanso = null; else empezarDescanso(r);
  pintarDescanso(); guardarYa();
}

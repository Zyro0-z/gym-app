// Mapa de calor mensual (rejilla L-D), con la intensidad en 5 niveles del acento.
import { h } from "./dom.js";
import { icono } from "./iconos.js";
import { numDia, deNum, diaSemana, finDeMes } from "../core/fechas.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (clave) => MESES[+clave.slice(5, 7) - 1] + " " + clave.slice(0, 4);

/**
 * mes "AAAA-MM"; nivel(iso) → 0-4; hoy ISO; deload(iso) → bool; alPulsar(iso) para días con datos;
 * alCambiarMes(delta) muestra las flechas (se ocultan en los extremos con puedeAntes/puedeDespues).
 */
export function mapaCalor({ mes, nivel, hoy, deload = () => false, alPulsar = null, alCambiarMes = null, puedeAntes = true, puedeDespues = true, etiquetaDia = null }) {
  const primero = mes + "-01", ultimo = finDeMes(primero);
  const hueco = diaSemana(primero) - 1;
  const celdas = ["L", "M", "X", "J", "V", "S", "D"].map((d) => h("div", { class: "dsem", "aria-hidden": "true" }, d));
  for (let i = 0; i < hueco; i++) celdas.push(h("div", { class: "dia fuera" }));
  for (let n = numDia(primero); n <= numDia(ultimo); n++) {
    const iso = deNum(n), nv = nivel(iso) || 0, fut = iso > hoy;
    const clase = ["dia", nv && "n" + Math.min(4, nv), iso === hoy && "hoy", deload(iso) && "deload", fut && "futuro"];
    const et = etiquetaDia ? etiquetaDia(iso, nv) : iso;
    celdas.push(nv && alPulsar
      ? h("button", { class: clase, "aria-label": et, onClick: () => alPulsar(iso) }, String(+iso.slice(8)))
      : h("div", { class: clase, "aria-label": et }, String(+iso.slice(8))));
  }
  const cab = h("div", { class: "calor-cab" },
    alCambiarMes ? h("button", { class: "btn-icono", "aria-label": "Mes anterior", disabled: !puedeAntes, style: { visibility: puedeAntes ? "visible" : "hidden" }, onClick: () => alCambiarMes(-1) }, icono("chevron-izq")) : h("span"),
    h("div", { class: "mes" }, nombreMes(mes).replace(/^./, (c) => c.toUpperCase())),
    alCambiarMes ? h("button", { class: "btn-icono", "aria-label": "Mes siguiente", disabled: !puedeDespues, style: { visibility: puedeDespues ? "visible" : "hidden" }, onClick: () => alCambiarMes(1) }, icono("chevron")) : h("span"));
  return h("div", null, cab, h("div", { class: "calor", role: "grid" }, celdas));
}

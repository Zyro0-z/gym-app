// Herramientas de la pantalla de entrenamiento: RPE por serie, sugerencia de carga, repetir la
// última serie, superseries y calculadora de discos.
import { h, poner } from "../../ui/dom.js";
import { seccion, lista, celda } from "../../ui/controles.js";
import { seleccion } from "../../ui/haptica.js";
import { leerNumero, fmt } from "../../core/formato.js";
import { CHIPS_RPE, esRpe, rpeTxt } from "../../core/rpe.js";
import { calcularDiscos, agrupar } from "../../core/discos.js";
import { sugerirCarga } from "../../core/sugerencia.js";
import { E, aTexto, vacia } from "./estado.js";

const kgTxt = (v) => fmt(v, Number.isInteger(v) ? 0 : v * 10 === Math.round(v * 10) ? 1 : 2);

/* ---------- RPE ---------- */

/** Hoja con los chips de RPE. Resuelve con el número elegido, null para quitarlo o undefined si se cancela. */
export function elegirRpe(actual, objetivo) {
  return new Promise((resolver) => {
    let hecho = false;
    const fin = (v) => { if (hecho) return; hecho = true; resolver(v); };
    E.app.abrirHoja({
      titulo: "RPE", alturas: ["media"], cancelar: "Cancelar", alCerrar: () => fin(undefined),
      render(c) {
        const chips = h("div", { class: "chips-rpe", role: "radiogroup", "aria-label": "RPE de la serie" },
          CHIPS_RPE.map((v) => h("button", { class: ["chip-rpe", v === actual && "activo", v === objetivo && "objetivo"], role: "radio", "aria-checked": String(v === actual),
            "aria-label": "RPE " + rpeTxt(v) + (v === objetivo ? ", objetivo" : ""), onClick: () => { seleccion(); fin(v); E.app.cerrarHoja(); } }, rpeTxt(v))));
        poner(c,
          h("div", { class: "seccion" }, chips,
            h("p", { class: "seccion-pie" }, "Esfuerzo percibido: 10 es el fallo; cada punto menos es una repetición más en reserva (RPE 8 = te quedaban 2)." +
              (esRpe(objetivo) ? " Objetivo de la rutina: " + rpeTxt(objetivo) + "." : ""))),
          esRpe(actual) ? seccion({}, lista([celda({ titulo: "Quitar el RPE", estilo: "destructiva", alPulsar: () => { fin(null); E.app.cerrarHoja(); } })])) : null);
      },
    });
  });
}

/* ---------- Sugerencia de carga ---------- */

/** Sugerencia para el ejercicio (solo durante el entrenamiento) o null. */
export function sugerenciaDe(id) {
  if (!E.M || E.M.modo !== "entreno") return null;
  try {
    const A = E.app.store.analisis();
    if (!A) return null;
    const p = A.progresionDe(id);
    return p ? sugerirCarga(p, A.incrementoDe(p)) : null;
  } catch (e) { return null; }
}

/** Pone la sugerencia en las series sin marcar que estén vacías (no toca lo ya escrito). */
export function aplicarSugerencia(e, sug) {
  let n = 0;
  for (const s of e.series) {
    if (s.hecha || s.tipo === "calentamiento") continue;
    if (s.peso === "" || s.peso == null) { s.peso = aTexto(sug.peso); n++; }
    if (s.reps === "" || s.reps == null) s.reps = String(sug.reps);
  }
  return n;
}

/* ---------- Repetir la última serie ---------- */

/** Copia la última serie hecha en la primera sin marcar (o en una nueva). Devuelve la serie destino. */
export function repetirUltima(e) {
  const hechas = e.series.filter((s) => s.hecha);
  const u = hechas[hechas.length - 1];
  if (!u) return null;
  let dest = e.series.find((s) => !s.hecha && s.tipo !== "calentamiento");
  if (!dest) { dest = vacia(); e.series.push(dest); }
  Object.assign(dest, { peso: u.peso, reps: u.reps, tipo: u.tipo === "calentamiento" ? "normal" : u.tipo });
  if (esRpe(u.rpe)) dest.rpe = u.rpe; else delete dest.rpe;
  return dest;
}

/* ---------- Superseries ---------- */

/** ¿Es el último ejercicio de su ronda? (el descanso solo empieza al acabar la ronda) */
export function finDeRonda(ejercicios, i) {
  const e = ejercicios[i], sig = ejercicios[i + 1];
  return !e.grupoId || !sig || sig.grupoId !== e.grupoId;
}

/** Posición de un ejercicio dentro de su superserie: null, "inicio", "medio" o "fin". */
export function posicionSuperserie(ejercicios, i) {
  const g = ejercicios[i].grupoId;
  if (!g) return null;
  const ant = i > 0 && ejercicios[i - 1].grupoId === g, sig = i < ejercicios.length - 1 && ejercicios[i + 1].grupoId === g;
  if (!ant && !sig) return null;
  return ant && sig ? "medio" : ant ? "fin" : "inicio";
}

export function unirConSiguiente(ejercicios, i) {
  const a = ejercicios[i], b = ejercicios[i + 1];
  if (!b) return;
  const g = a.grupoId || b.grupoId || "g" + Date.now().toString(36);
  const viejoB = b.grupoId;
  a.grupoId = g;
  for (const e of ejercicios) if (viejoB && e.grupoId === viejoB) e.grupoId = g;
  b.grupoId = g;
}

export function separarDeSuperserie(ejercicios, i) {
  const g = ejercicios[i].grupoId;
  delete ejercicios[i].grupoId;
  // Lo que queda detrás pasa a ser otra superserie; las que se quedan con un solo ejercicio se deshacen
  const nuevo = g + "-" + Date.now().toString(36);
  for (let j = i + 1; j < ejercicios.length && ejercicios[j].grupoId === g; j++) ejercicios[j].grupoId = nuevo;
  limpiarGrupos(ejercicios);
}

/** Quita el grupoId a los ejercicios que se han quedado solos. */
export function limpiarGrupos(ejercicios) {
  for (let i = 0; i < ejercicios.length; i++) if (ejercicios[i].grupoId && !posicionSuperserie(ejercicios, i)) delete ejercicios[i].grupoId;
}

/* ---------- Calculadora de discos ---------- */

export function calculadoraDiscos(e) {
  const aj = E.app.store.estado.ajustes.entreno;
  const ultimo = [...e.series].reverse().find((s) => leerNumero(s.peso) > 0);
  let total = ultimo ? leerNumero(ultimo.peso) : (aj.barra || 20) + 40;
  const campo = h("input", { class: "campo-fila num", type: "text", inputmode: "decimal", autocomplete: "off", value: aTexto(total), "aria-label": "Peso total en kg",
    style: { textAlign: "right", width: "96px" } });
  const res = h("div", { "aria-live": "polite" });
  const pintar = () => {
    const r = calcularDiscos(total, aj.barra ?? 20, aj.discos || []);
    if (r.error) { poner(res, h("p", { class: "seccion-pie", style: { padding: "0 var(--gutter)" } }, r.error + ".")); return; }
    const grupos = agrupar(r.porLado);
    poner(res,
      h("div", { class: "discos-vista", "aria-hidden": "true" },
        h("span", { class: "discos-barra" }), r.porLado.map((d) => h("span", { class: "disco", style: { "--alto": Math.round(28 + 52 * Math.min(1, d / 25)) + "px" } }, kgTxt(d)))),
      seccion({ cab: "Por lado", pie: r.falta > 0 ? "Con tus discos llegas a " + kgTxt(r.logrado) + " kg; faltan " + kgTxt(r.falta) + " kg." : "Barra de " + kgTxt(aj.barra ?? 20) + " kg. Se cambian en Ajustes › Entrenamiento." },
        lista(grupos.length ? grupos.map((g) => celda({ titulo: kgTxt(g.kg) + " kg", valor: "× " + g.n })) : [celda({ titulo: "Solo la barra" })])));
  };
  campo.addEventListener("input", () => { const v = leerNumero(campo.value); total = Number.isFinite(v) ? v : 0; pintar(); });
  E.app.abrirHoja({
    titulo: "Discos", alturas: ["grande"], cancelar: "Cerrar",
    render(c) { poner(c, seccion({}, lista([celda({ titulo: "Peso total", control: h("span", { class: "fila", style: { gap: "6px" } }, campo, h("span", { class: "c-2" }, "kg")) })])), res); pintar(); },
  });
}

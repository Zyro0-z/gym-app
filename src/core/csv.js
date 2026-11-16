// Exportación a CSV para hojas de cálculo en español: UTF-8 con BOM (Excel reconoce las tildes),
// separador «;» y coma decimal (configurables en ajustes.csv). Una fila por serie.
import { epley } from "./sesiones.js";
import { e1rmAjustado, esRpe } from "./rpe.js";

const BOM = "﻿";
const r1 = (x) => Math.round(x * 10) / 10;

function celda(v, { separador, decimal }) {
  if (v == null || v === "") return "";
  let t = typeof v === "number" ? (Number.isFinite(v) ? String(v).replace(".", decimal) : "") : String(v);
  if (t.includes(separador) || /["\r\n]/.test(t) || (typeof v !== "number" && t.includes(decimal) && decimal === separador)) t = '"' + t.replace(/"/g, '""') + '"';
  return t;
}
export function aCsv(cabecera, filas, opciones = {}) {
  const o = Object.assign({ separador: ";", decimal: "," }, opciones);
  const linea = (l) => l.map((v) => celda(v, o)).join(o.separador);
  return BOM + [linea(cabecera), ...filas.map(linea)].join("\r\n") + "\r\n";
}

const TIPO = { normal: "normal", calentamiento: "calentamiento", fallo: "al fallo", descendente: "descendente" };

/** Una fila por serie hecha, de la sesión más antigua a la más reciente. */
export function csvSeries(sesiones, catalogo, ajustes = {}, opciones = {}) {
  const cat = new Map((catalogo || []).map((c) => [c.id, c]));
  const grupoDe = (id) => (cat.get(id) || {}).grupo || "";
  const orden = [...sesiones].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id < b.id ? -1 : 1));
  const filas = [];
  for (const s of orden) for (const e of s.ejercicios) {
    let n = 0;
    e.series.forEach((st, j) => {
      if (st.hecha === false) return;
      const cuenta = st.tipo !== "calentamiento" && st.tipo !== "descendente";
      if (st.tipo !== "calentamiento") n++;
      const rm = cuenta && st.peso > 0 && st.reps > 0 ? r1(epley(st.peso, st.reps)) : null;
      const rmRpe = cuenta && esRpe(st.rpe) && st.peso > 0 && st.reps > 0 ? r1(e1rmAjustado(st.peso, st.reps, st.rpe)) : null;
      filas.push([s.fecha, s.inicio || "", s.rutina || "", e.nombre || e.ejercicioId, grupoDe(e.ejercicioId), j + 1, st.tipo === "calentamiento" ? "" : n,
        TIPO[st.tipo] || st.tipo || "normal", st.peso, st.reps, st.segundos ?? null, esRpe(st.rpe) ? st.rpe : null, rm, rmRpe,
        e.grupoId ? "sí" : "", j === 0 ? e.nota || "" : "", j === 0 && e === s.ejercicios[0] ? s.nota || "" : ""]);
    });
  }
  return aCsv(["fecha", "hora", "rutina", "ejercicio", "grupo", "orden", "serie", "tipo", "peso_kg", "reps", "segundos", "rpe", "e1rm_kg", "e1rm_rpe_kg", "superserie", "nota_ejercicio", "nota_sesion"],
    filas, Object.assign({}, ajustes.csv || {}, opciones));
}

export function csvPesajes(pesajes, ajustes = {}) {
  return aCsv(["fecha", "peso_kg"], [...pesajes].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((p) => [p.fecha, p.kg]), ajustes.csv || {});
}

export function csvMedidas(medidas, claves, ajustes = {}) {
  return aCsv(["fecha", ...claves.map((k) => k + "_cm")], [...medidas].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((m) => [m.fecha, ...claves.map((k) => m[k] ?? null)]), ajustes.csv || {});
}

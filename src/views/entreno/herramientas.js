// Herramientas de la pantalla de entrenamiento: RPE por serie, sugerencia de carga, repetir la
// última serie, superseries y calculadora de discos.
import { h, poner } from "../../ui/dom.js";
import { seccion, lista, celda } from "../../ui/controles.js";
import { leerNumero, fmt } from "../../core/formato.js";
import { esRpe } from "../../core/rpe.js";
import { calcularDiscos, agrupar } from "../../core/discos.js";
import { gimnasioActivo } from "../../core/gimnasios.js";
import { generarCalentamiento } from "../../core/calentamiento.js";
import { ajustarPorRpe, backoffs } from "../../core/prescripcion.js";
import { sugerirCarga } from "../../core/sugerencia.js";
import { E, aTexto, vacia } from "./estado.js";

const kgTxt = (v) => fmt(v, Number.isInteger(v) ? 0 : v * 10 === Math.round(v * 10) ? 1 : 2);

/* ---------- Sugerencia de carga ---------- */

/** ¿Cae hoy el ejercicio en una semana de descarga? `A` es el análisis. */
export const enDescarga = (A, id) => { const b = A.C.bloqueProtector(A.C.grupoDe(id), A.hoy); return !!(b && b.esDeload); };

/** ¿El ejercicio se entrena con «serie top» (una serie pesada y el resto más ligeras)? */
export function esTop(id) {
  try { const p = E.app.store.analisis().progresionDe(id); return !!(p && p.obj && p.obj.top); } catch (e) { return false; }
}

/** Sugerencia para el ejercicio (solo durante el entrenamiento) o null. En descarga no pide subir: mantiene el peso de la última vez. */
export function sugerenciaDe(id, rpeObjetivo = null) {
  if (!E.M || E.M.modo !== "entreno") return null;
  try {
    const A = E.app.store.analisis();
    if (!A) return null;
    const p = A.progresionDe(id);
    if (p && !p.sinDatos && p.obj && p.pesoMax > 0 && enDescarga(A, id)) return { peso: p.pesoMax, reps: p.obj.min, motivo: "Semana de descarga: sin subir carga", descarga: true, top: !!p.obj.top };
    const sug = p ? ajustarPorRpe(sugerirCarga(p, A.incrementoDe(p)), p, rpeObjetivo) : null;
    return sug && p.obj && p.obj.top ? Object.assign({}, sug, { top: true }) : sug;
  } catch (e) { return null; }
}

/** Pone la sugerencia en las series sin marcar que estén vacías (no toca lo ya escrito). Con serie top solo rellena la primera: el resto son back-offs y salen de «Añadir back-offs». */
export function aplicarSugerencia(e, sug) {
  let n = 0;
  for (const s of e.series) {
    if (s.hecha || s.tipo === "calentamiento") continue;
    if (s.peso === "" || s.peso == null) { s.peso = aTexto(sug.peso); n++; }
    if (s.reps === "" || s.reps == null) s.reps = String(sug.reps);
    if (sug.top) break;
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
  const aj = gimnasioActivo(E.app.store.estado.ajustes);
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
      seccion({ cab: "Por lado", pie: r.falta > 0 ? "Con tus discos llegas a " + kgTxt(r.logrado) + " kg; faltan " + kgTxt(r.falta) + " kg." : "Barra de " + kgTxt(aj.barra ?? 20) + " kg en «" + aj.nombre + "»." },
        lista(grupos.length ? grupos.map((g) => celda({ titulo: kgTxt(g.kg) + " kg", valor: "× " + g.n })) : [celda({ titulo: "Solo la barra" })])));
  };
  campo.addEventListener("input", () => { const v = leerNumero(campo.value); total = Number.isFinite(v) ? v : 0; pintar(); });
  E.app.abrirHoja({
    titulo: "Discos", alturas: ["grande"], cancelar: "Cerrar",
    render(c) { poner(c, seccion({}, lista([celda({ titulo: "Peso total", control: h("span", { class: "fila", style: { gap: "6px" } }, campo, h("span", { class: "c-2" }, "kg")) })])), res); pintar(); },
  });
}

/** Inserta las series de aproximación antes de las de trabajo. Devuelve cuántas añadió (0 si no hay peso de trabajo o ya hay calentamiento). */
export function anadirCalentamiento(e) {
  if (e.series.some((s) => s.tipo === "calentamiento")) return 0;
  const cat = E.app.store.estado.catalogo.find((x) => x.id === e.ejercicioId);
  const primera = e.series.find((s) => leerNumero(s.peso) > 0);
  const sug = sugerenciaDe(e.ejercicioId);
  const trabajo = primera ? leerNumero(primera.peso) : sug ? sug.peso : 0;
  if (!(trabajo > 0)) return 0;
  const g = gimnasioActivo(E.app.store.estado.ajustes);
  const barra = cat && String(cat.tipoMaterial || "").toLowerCase() === "barra";
  const paso = (cat && cat.incremento > 0 ? cat.incremento : 0) || E.app.store.estado.ajustes.entreno.pasoPeso || 2.5;
  const w = generarCalentamiento(trabajo, barra ? { barra: g.barra, discos: g.discos, paso } : { paso });
  e.series.unshift(...w.map((x) => ({ peso: aTexto(x.peso), reps: String(x.reps), tipo: "calentamiento", hecha: false })));
  return w.length;
}

/** Añade 2 back-offs tras la serie top: mismas repeticiones, un punto de RPE por debajo (máx. RPE 9), con el e1RM de esa serie. Devuelve los añadidos o null. */
export function anadirBackoffs(e) {
  const hechas = e.series.filter((s) => s.hecha && s.tipo !== "calentamiento" && leerNumero(s.peso) > 0 && leerNumero(s.reps) > 0);
  if (!hechas.length) return null;
  const top = hechas.reduce((m, s) => (leerNumero(s.peso) > leerNumero(m.peso) ? s : m), hechas[0]);
  const cat = E.app.store.estado.catalogo.find((x) => x.id === e.ejercicioId);
  const paso = (cat && cat.incremento > 0 ? cat.incremento : 0) || E.app.store.estado.ajustes.entreno.pasoPeso || 2.5;
  const b = backoffs({ peso: leerNumero(top.peso), reps: leerNumero(top.reps), rpe: esRpe(top.rpe) ? top.rpe : undefined }, { n: 2, paso });
  if (!b.length) return null;
  const pesoTop = leerNumero(top.peso);
  const vacias = e.series.filter((s) => !s.hecha && s.tipo !== "calentamiento" && (s.peso === "" || leerNumero(s.peso) === pesoTop));
  for (let i = 0; i < b.length; i++) {
    const dest = vacias[i] || (() => { const n = vacia(); e.series.push(n); return n; })();
    Object.assign(dest, { peso: aTexto(b[i].peso), reps: String(b[i].reps) });
  }
  return b;
}

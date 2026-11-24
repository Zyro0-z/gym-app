// Rendimiento frente a sueño, estrés y energía (lo que anotas en «¿Cómo vienes?» antes de entrenar).
//
// Índice de rendimiento de una sesión: para cada ejercicio, su mejor e1RM de la sesión frente a la
// mediana de sus 5 sesiones anteriores (hacen falta ≥ 3); el índice de la sesión es la mediana de
// esos cambios, en %, si hay al menos 2 ejercicios comparables. Las sesiones en días de descarga no
// puntúan (ahí se baja la carga a propósito) ni entran en la referencia.
//
// Se agrupa por bandas y se calcula una correlación de Spearman. SIEMPRE se enseña el número de
// sesiones (n). Una banda o correlación con pocos datos se marca «sin conclusión»: con 20 sesiones,
// la diferencia entre dormir bien o mal se parece mucho al ruido normal de un día a otro.
import { mediana, spearman, mediaConIntervalo } from "./estadistica.js";
import { enDescarga } from "./fatiga.js";

export const PREVIAS = 5, MIN_PREVIAS = 3, MIN_EJERCICIOS = 2, MIN_BANDA = 5;

export const BANDAS = {
  sueno: [{ id: "lt6", texto: "menos de 6 h", cabe: (v) => v < 6 }, { id: "6a7", texto: "6 a 7 h", cabe: (v) => v >= 6 && v < 7 },
    { id: "7a8", texto: "7 a 8 h", cabe: (v) => v >= 7 && v < 8 }, { id: "ge8", texto: "8 h o más", cabe: (v) => v >= 8 }],
  estres: [{ id: "bajo", texto: "bajo (1–2)", cabe: (v) => v <= 2 }, { id: "medio", texto: "medio (3)", cabe: (v) => v > 2 && v < 4 }, { id: "alto", texto: "alto (4–5)", cabe: (v) => v >= 4 }],
  energia: [{ id: "baja", texto: "baja (1–2)", cabe: (v) => v <= 2 }, { id: "media", texto: "media (3)", cabe: (v) => v > 2 && v < 4 }, { id: "alta", texto: "alta (4–5)", cabe: (v) => v >= 4 }],
};
export const FACTORES = [{ id: "sueno", texto: "Sueño", ud: " h" }, { id: "estres", texto: "Estrés", ud: "" }, { id: "energia", texto: "Energía", ud: "" }];

/** Índice de rendimiento de cada sesión con datos: [{ id, dia, indice, ejercicios, sueno, estres, energia }], de la más antigua a la más reciente. */
export function indicesDeSesion(A) {
  const orden = A.sesiones.slice().sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : a.id < b.id ? -1 : 1));
  const previos = new Map();
  const out = [];
  for (const s of orden) {
    if (!s.dia) continue;
    const descarga = enDescarga(A.C, s.dia);
    const cambios = [];
    const mejores = new Map();
    for (const ex of s.ejercicios) {
      let m = 0;
      for (const st of ex.sets) if (st.paraPR && st.oneRM > m) m = st.oneRM;
      if (m > 0) mejores.set(ex.k, Math.max(m, mejores.get(ex.k) || 0));
    }
    for (const [k, m] of mejores) {
      const h = previos.get(k) || [];
      if (!descarga && h.length >= MIN_PREVIAS) cambios.push((m / mediana(h.slice(-PREVIAS)) - 1) * 100);
      if (!descarga) { h.push(m); previos.set(k, h); }
    }
    const rc = (s.ref && s.ref.recuperacion) || {};
    if (!descarga && cambios.length >= MIN_EJERCICIOS)
      out.push({ id: s.id, dia: s.dia, indice: mediana(cambios), ejercicios: cambios.length,
        sueno: typeof rc.sueno === "number" ? rc.sueno : null, estres: typeof rc.estres === "number" ? rc.estres : null, energia: typeof rc.energia === "number" ? rc.energia : null });
  }
  return out;
}

/**
 * @returns {{ sesiones: number, conRecuperacion: number, factores: object[] }}
 *   factores[i]: { id, texto, ud, n, bandas: [{ id, texto, n, media, lo, hi, suficiente }], rho, t, concluyente, veredicto }
 */
export function analizarRendimiento(A) {
  const I = indicesDeSesion(A);
  const factores = FACTORES.map((f) => {
    const datos = I.filter((x) => x[f.id] != null);
    const bandas = BANDAS[f.id].map((b) => {
      const l = datos.filter((x) => b.cabe(x[f.id])).map((x) => x.indice);
      const r = mediaConIntervalo(l);
      return { id: b.id, texto: b.texto, n: r.n, media: r.media, lo: r.lo, hi: r.hi, suficiente: r.n >= MIN_BANDA };
    });
    const c = spearman(datos.map((x) => x[f.id]), datos.map((x) => x.indice));
    // Con estrés alto «peor» es rho < 0 en rendimiento; con sueño y energía, rho > 0 es «mejor». Solo se enseña el signo del dato.
    const veredicto = c.rho == null ? "sin datos" : !c.concluyente ? "sin conclusión" : c.rho > 0 ? "más " + f.texto.toLowerCase() + ", más rendimiento" : "más " + f.texto.toLowerCase() + ", menos rendimiento";
    return Object.assign({ id: f.id, texto: f.texto, ud: f.ud, bandas, veredicto }, c);
  });
  return { sesiones: I.length, conRecuperacion: I.filter((x) => x.sueno != null || x.estres != null || x.energia != null).length, factores };
}

// Tablas de estándares de fuerza: lectura y validación de un archivo importado.
// Formato: { "estandares": { "<slug>": [{ "pc": 80, "niveles": [Beginner, Novice, Intermediate, Advanced, Elite] }] } }

/** Valida el texto de un archivo de tablas y devuelve `{ slug: filas[] }` o lanza un Error legible. */
export function leerTablas(texto) {
  let o;
  try { o = JSON.parse(texto); } catch { throw new Error("El archivo no es un JSON válido."); }
  const t = o && typeof o === "object" && !Array.isArray(o) ? (o.estandares && typeof o.estandares === "object" ? o.estandares : o) : null;
  if (!t || Array.isArray(t)) throw new Error("El archivo no contiene tablas de estándares.");
  const out = {};
  for (const [slug, filas] of Object.entries(t)) {
    if (slug === "tipo" || slug === "version") continue;
    if (!Array.isArray(filas) || !filas.length) throw new Error("La tabla «" + slug + "» está vacía.");
    const ok = filas.map((f) => {
      const n = f && Array.isArray(f.niveles) ? f.niveles : null;
      if (!f || !Number.isFinite(f.pc) || f.pc <= 0 || !n || n.length !== 5 || n.some((x) => !Number.isFinite(x) || x < 0) || !(n[4] > 0) || n.some((x, i) => i && x < n[i - 1]))
        throw new Error("La tabla «" + slug + "» tiene una fila con formato incorrecto.");
      return { pc: f.pc, niveles: n.slice() };
    }).sort((a, b) => a.pc - b.pc);
    out[slug] = ok;
  }
  if (!Object.keys(out).length) throw new Error("El archivo no contiene tablas de estándares.");
  return out;
}

/** Fusiona tablas nuevas sobre las existentes (la misma clave se sustituye). */
export function fusionarTablas(actuales, nuevas) { return Object.assign({}, actuales || {}, nuevas); }

/**
 * Resuelve en bloque los avisos de liga de «Calidad de los datos» para los ejercicios `nombres`:
 * «revisar» da por bueno el factor actual (el 1 por defecto: tu ejercicio es el de la tabla); «sin» los marca sin estándar.
 * Devuelve un catálogo nuevo; no toca los demás ejercicios.
 */
export function resolverLigas(catalogo, nombres, modo) {
  const ns = new Set(nombres);
  return catalogo.map((c) => {
    if (!ns.has(c.nombre)) return c;
    if (modo === "sin") return Object.assign({}, c, { estandar: { sin: true } });
    return c.estandar && !c.estandar.sin ? Object.assign({}, c, { estandar: Object.assign({}, c.estandar, { revisado: true }) }) : c;
  });
}

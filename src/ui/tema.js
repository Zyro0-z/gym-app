// Tema y acento. La preferencia vive en los ajustes (IndexedDB) y se replica en localStorage
// para aplicarla antes del primer pintado, sin parpadeo (ver el script de index.html).
const CLAVE = "gym-apariencia";
const oscuroSistema = matchMedia("(prefers-color-scheme: dark)");
let pref = { tema: "auto", acento: "azul" }, alCambiar = null;

export function leerEspejoApariencia() {
  try { return Object.assign({ tema: "auto", acento: "azul" }, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) { return { tema: "auto", acento: "azul" }; }
}

export const temaEfectivo = () => (pref.tema === "oscuro" || (pref.tema === "auto" && oscuroSistema.matches) ? "dark" : "light");

/** Aplica { tema: "auto" | "claro" | "oscuro", acento } a la raíz y a la barra de estado. */
export function aplicarApariencia(p) {
  pref = Object.assign({}, pref, p);
  const r = document.documentElement;
  r.dataset.theme = temaEfectivo();
  r.dataset.accent = pref.acento || "azul";
  const fondo = r.dataset.theme === "dark" ? "#000000" : "#F2F2F7";
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = fondo;
  try { localStorage.setItem(CLAVE, JSON.stringify({ tema: pref.tema, acento: pref.acento })); } catch (e) {}
  if (alCambiar) alCambiar();
}

/** Avisa cuando cambia el tema efectivo (p. ej. el sistema pasa a oscuro con «Automático»). */
export function alCambiarTema(fn) { alCambiar = fn; }
oscuroSistema.addEventListener("change", () => { if (pref.tema === "auto") aplicarApariencia({}); });

/** Color de un grupo muscular según el tema (los colores del usuario o la paleta del sistema). */
const PALETA = ["--g-rosa", "--g-azul", "--g-verde", "--g-naranja", "--g-morado", "--g-indigo", "--g-amarillo", "--g-cian"];
export function colorGrupo(grupos, nombre) {
  const i = grupos.findIndex((g) => g.nombre === nombre);
  const g = grupos[i];
  if (g && g.color) return temaEfectivo() === "dark" ? g.color.oscuro || g.color.claro : g.color.claro || g.color.oscuro;
  return `var(${PALETA[(i < 0 ? 0 : i) % PALETA.length]})`;
}

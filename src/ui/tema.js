// Tema y acento. La preferencia vive en los ajustes (IndexedDB) y se replica en localStorage
// para aplicarla antes del primer pintado, sin parpadeo (ver el script de index.html).
const CLAVE = "gym-apariencia";
const oscuroSistema = matchMedia("(prefers-color-scheme: dark)");
let pref = { tema: "auto", acento: "azul" }, alCambiar = null;

export function leerEspejoApariencia() {
  try { return Object.assign({ tema: "auto", acento: "azul" }, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) { return { tema: "auto", acento: "azul" }; }
}

export const temaEfectivo = () => (pref.tema === "oscuro" || (pref.tema === "auto" && oscuroSistema.matches) ? "dark" : "light");

// ── Color: contraste y paletas generadas ──
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (c) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const razon = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mezcla = (c, o, t) => c.map((v, i) => v + (o[i] - v) * t);
function ajustar(c, fondos, min, hacia) { let t = 0, x = c; while (t < 1 && fondos.some((f) => razon(x, f) < min)) { t += 0.02; x = mezcla(c, hacia, t); } return x; }

/** Del color elegido saca el acento (relleno con texto blanco, 4,5:1) y la tinta (texto sobre el fondo, 4,5:1) de cada tema. */
export function paletaDe(h) {
  const c = rgb(h), B = [255, 255, 255], N = [0, 0, 0];
  const acento = hex(ajustar(c, [B], 4.6, N));
  return { l: [acento, hex(ajustar(c, [[244, 245, 248], B], 4.6, N))], d: [acento, hex(ajustar(c, [[35, 40, 54], N], 4.6, B))] };
}

/** Acentos que no tienen regla CSS: se calculan al aplicarlos. */
export const ACENTOS_CALC = { cian: "#00B4D8", turquesa: "#14B8A6", menta: "#3DDC97", lima: "#84CC16", oro: "#EAB308", coral: "#FF6B5B", fucsia: "#E11D9A", violeta: "#8B5CF6", marron: "#A0714F", marino: "#2F5FD0" };
export const COLOR_PERSONAL = "#3B82F6";
const acentoCalculado = (p) => (p.acento === "personal" ? p.acentoColor || COLOR_PERSONAL : ACENTOS_CALC[p.acento] || null);

/** Escalas del mapa corporal: 4 colores de menos a más. «acento» usa el acento del tema en 4 tonos. */
export const ESCALAS_MAPA = {
  termico: ["#7890B5", "#E58C3A", "#FF6A2A", "#FF3D2E"],
  fuego: ["#FFC24A", "#FF8A2A", "#E8452B", "#A81F2F"],
  hielo: ["#9AD3FF", "#4FA3FF", "#2468E0", "#1B3FA8"],
  bosque: ["#A8E6A1", "#56C46B", "#23964A", "#0E6B35"],
  oceano: ["#7FE0D6", "#2BB6C9", "#1F7FC4", "#2F46A8"],
  atardecer: ["#FFD27A", "#FF8F6B", "#E0467A", "#7A2FA8"],
  violeta: ["#D8B4FF", "#A96BFF", "#7B3FE0", "#4B1FA8"],
  acento: ["color-mix(in srgb, var(--mapa) 45%, #fff)", "color-mix(in srgb, var(--mapa) 70%, #fff)", "color-mix(in srgb, var(--mapa) 88%, #fff)", "var(--mapa)"],
};
export const NOMBRES_ESCALA = { termico: "Térmico", fuego: "Fuego", hielo: "Hielo", bosque: "Bosque", oceano: "Océano", atardecer: "Atardecer", violeta: "Violeta", acento: "Acento", personal: "Personalizado" };
export const COLOR_MAPA_A = "#FFD27A", COLOR_MAPA_B = "#E0467A";
/** Los 4 colores del mapa según la preferencia (`mapa`: nombre de escala o «personal» con mapaA→mapaB). */
export function escalaMapa(p) {
  if (p.mapa === "personal") { const a = rgb(p.mapaA || COLOR_MAPA_A), b = rgb(p.mapaB || COLOR_MAPA_B); return [0, 1, 2, 3].map((i) => hex(mezcla(a, b, i / 3))); }
  return ESCALAS_MAPA[p.mapa] || ESCALAS_MAPA.termico;
}

/** Aplica { tema: "auto" | "claro" | "oscuro", acento, acentoColor, mapa, mapaA, mapaB } a la raíz y a la barra de estado. */
export function aplicarApariencia(p) {
  pref = Object.assign({}, pref, p);
  const r = document.documentElement, oscuro = temaEfectivo() === "dark";
  r.dataset.theme = oscuro ? "dark" : "light";
  r.dataset.accent = pref.acento || "azul";
  const calc = acentoCalculado(pref), pal = calc ? paletaDe(calc) : null;
  if (pal) { const [a, t] = oscuro ? pal.d : pal.l; r.style.setProperty("--accent", a); r.style.setProperty("--accent-ink", t); }
  else { r.style.removeProperty("--accent"); r.style.removeProperty("--accent-ink"); }
  escalaMapa(pref).forEach((c, i) => r.style.setProperty("--mapa-" + (i + 1), c));
  const fondo = oscuro ? "#000000" : "#F2F2F7";
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = fondo;
  try { localStorage.setItem(CLAVE, JSON.stringify({ tema: pref.tema, acento: pref.acento, acentoColor: pref.acentoColor, mapa: pref.mapa, mapaA: pref.mapaA, mapaB: pref.mapaB, pal })); } catch (e) {}
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

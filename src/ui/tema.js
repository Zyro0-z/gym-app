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
  // La tinta se lee también sobre el relleno tenue del acento (pestaña activa, chips): se comprueba contra ese fondo
  const FL = [244, 245, 248], FD = [35, 40, 54];
  let acento = ajustar(c, [B], 4.6, N);
  // En oscuro el relleno también hace de gráfico (3:1 sobre las tarjetas) sin perder el texto blanco (4,5:1)
  for (let t = 0.02; t <= 1 && razon(acento, FD) < 3.05; t += 0.02) { const x = mezcla(ajustar(c, [B], 4.6, N), B, t); if (razon(x, B) < 4.55) break; acento = x; }
  return { l: [hex(ajustar(c, [B], 4.6, N)), hex(ajustar(c, [FL, B, mezcla(FL, c, 0.2)], 4.6, N))], d: [hex(acento), hex(ajustar(c, [FD, N, mezcla(FD, c, 0.2)], 4.6, B))] };
}

/** Acentos que no tienen regla CSS: se calculan al aplicarlos. */
export const ACENTOS_CALC = { turquesa: "#14B8A6", oro: "#EAB308", fucsia: "#E11D9A", marino: "#2F5FD0" };
export const COLOR_PERSONAL = "#3B82F6";
const acentoCalculado = (p) => (p.acento === "personal" ? p.acentoColor || COLOR_PERSONAL : ACENTOS_CALC[p.acento] || null);

/** Escalas del mapa corporal: 4 colores de menos a más. «acento» usa el acento del tema en 4 tonos. */
export const ESCALAS_MAPA = {
  termico: ["#7890B5", "#E58C3A", "#FF6A2A", "#FF3D2E"],
  hielo: ["#9AD3FF", "#4FA3FF", "#2468E0", "#1B3FA8"],
  acento: ["color-mix(in srgb, var(--mapa) 45%, #fff)", "color-mix(in srgb, var(--mapa) 70%, #fff)", "color-mix(in srgb, var(--mapa) 88%, #fff)", "var(--mapa)"],
};
export const NOMBRES_ESCALA = { termico: "Térmico", hielo: "Hielo", acento: "Acento" };
/** Los 4 colores del mapa según la preferencia (`mapa`). */
export const escalaMapa = (p) => ESCALAS_MAPA[p.mapa] || ESCALAS_MAPA.termico;

/** Aplica { tema: "auto" | "claro" | "oscuro", acento, acentoColor, mapa } a la raíz y a la barra de estado. */
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
  try { localStorage.setItem(CLAVE, JSON.stringify({ tema: pref.tema, acento: pref.acento, acentoColor: pref.acentoColor, mapa: pref.mapa, pal })); } catch (e) {}
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

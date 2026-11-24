// Tarjeta de sesión para compartir: imagen PNG de 1080×1350 dibujada con canvas (sin librerías).
// Paleta fija (no depende del tema del teléfono) para que se vea igual donde se publique.
import { fmt } from "../core/formato.js";
import { fechaLarga, capital, kgTotal, minutos } from "./textos.js";

const W = 1080, H = 1350, M = 80;
const FUENTE = '-apple-system, "SF Pro Text", system-ui, "Segoe UI", Roboto, sans-serif';
const kgTxt = (v) => fmt(v, Number.isInteger(v) ? 0 : 1);

function recortar(ctx, texto, ancho) {
  if (ctx.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(t + "…").width > ancho) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

/** Dibuja la tarjeta y devuelve un Blob PNG. `d`: salida de core/tarjeta.js datosTarjeta. */
export function dibujarTarjeta(d, { acento = "#2E8BFF" } = {}) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#15171C"); g.addColorStop(1, "#0A0B0E");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = acento; ctx.fillRect(0, 0, W, 14);
  ctx.textBaseline = "alphabetic";
  const t = (txt, x, y, { tam = 40, peso = 500, color = "#FFFFFF", alinear = "left", ancho = null } = {}) => {
    ctx.font = peso + " " + tam + "px " + FUENTE; ctx.fillStyle = color; ctx.textAlign = alinear;
    ctx.fillText(ancho ? recortar(ctx, txt, ancho) : txt, x, y);
  };
  t(capital(fechaLarga(d.fecha)), M, 130, { tam: 36, color: "#9AA0AC" });
  t(d.titulo, M, 220, { tam: 84, peso: 800, ancho: W - 2 * M });
  // cifras
  const cifras = [[String(d.series), d.series === 1 ? "serie" : "series"], [d.volumen ? kgTotal(d.volumen) : "—", "volumen"], [d.duracion ? minutos(d.duracion) : "—", "duración"]];
  cifras.forEach(([v, e], i) => {
    const x = M + i * ((W - 2 * M) / 3);
    t(v, x, 360, { tam: 64, peso: 700, color: acento, ancho: (W - 2 * M) / 3 - 16 }); t(e, x, 405, { tam: 32, color: "#9AA0AC" });
  });
  ctx.fillStyle = "#2A2D35"; ctx.fillRect(M, 450, W - 2 * M, 2);
  // ejercicios
  let y = 540;
  for (const e of d.ejercicios) {
    t(e.nombre, M, y, { tam: 42, peso: 600, ancho: W - 2 * M - 330 });
    const marca = e.peso > 0 ? kgTxt(e.peso) + " kg × " + e.reps : e.reps + " reps";
    t(marca, W - M, y, { tam: 42, peso: 600, alinear: "right", color: e.pr ? acento : "#FFFFFF" });
    t(e.series + (e.series === 1 ? " serie" : " series") + (e.pr ? " · récord" : ""), M, y + 44, { tam: 30, color: e.pr ? acento : "#9AA0AC" });
    y += 118;
  }
  if (d.mas) t("y " + d.mas + (d.mas === 1 ? " ejercicio más" : " ejercicios más"), M, y - 10, { tam: 32, color: "#9AA0AC" });
  if (d.prs) t(d.prs === 1 ? "1 récord nuevo" : d.prs + " récords nuevos", W / 2, H - 150, { tam: 44, peso: 700, color: acento, alinear: "center" });
  t("Gym", W / 2, H - 70, { tam: 30, peso: 600, color: "#5E6370", alinear: "center" });
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("No se pudo crear la imagen"))), "image/png"));
}

/** Dibuja y comparte la tarjeta (hoja Compartir del sistema o descarga). */
export async function compartirTarjeta(app, datos) {
  const acento = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2E8BFF";
  const blob = await dibujarTarjeta(datos, { acento });
  const f = new File([blob], "gym-" + datos.fecha + ".png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: datos.titulo });
    else { const u = URL.createObjectURL(f); const a = document.createElement("a"); a.href = u; a.download = f.name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
    return true;
  } catch (e) { if (e.name !== "AbortError") await app.alerta({ titulo: "No se pudo compartir", mensaje: e.message }); return false; }
}

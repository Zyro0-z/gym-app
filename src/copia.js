// Copia de seguridad: exportar y saber cuándo toca avisar. Los datos viven solo en el iPhone,
// así que es el único riesgo real de pérdida.
import { S, save, exportJSON } from "./store.js";
import { h, iso, alerta, haptic, toast } from "./ui.js";

export const DIAS_AVISO = 7, SESIONES_AVISO = 5;

export function estadoCopia() {
  const b = S.settings && S.settings.backup;
  if (!b || !b.at) return { nunca: true, avisar: S.sessions.length > 0 };
  const dias = Math.floor((Date.now() - Date.parse(b.at)) / 864e5);
  const nuevas = Math.max(0, S.sessions.length - (b.sessions || 0));
  return { nunca: false, dias, nuevas, fecha: b.at.slice(0, 10), avisar: dias > DIAS_AVISO || nuevas > SESIONES_AVISO };
}
export function textoAviso(e) {
  if (e.nunca) return "Aún no has hecho ninguna copia. Tus datos solo están en este iPhone.";
  const p = [];
  if (e.dias > DIAS_AVISO) p.push("han pasado " + e.dias + " días desde la última");
  if (e.nuevas > SESIONES_AVISO) p.push("tienes " + e.nuevas + " sesiones nuevas sin copiar");
  const t = p.join(" y ");
  return t.charAt(0).toUpperCase() + t.slice(1) + ".";
}

// Devuelve true si la copia se exportó (o se compartió).
export async function exportar() {
  const txt = exportJSON();
  const nombre = "gym-backup-" + iso() + ".json";
  const f = new File([txt], nombre, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: nombre });
    else { const u = URL.createObjectURL(f); const a = h("a", { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
  } catch (e) {
    if (e.name !== "AbortError") await alerta("No se pudo exportar", e.message);
    return false;
  }
  S.settings.backup = { at: new Date().toISOString(), sessions: S.sessions.length };
  await save("settings");
  haptic(); toast("Copia exportada");
  return true;
}

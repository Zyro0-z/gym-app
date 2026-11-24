// Sonido corto al terminar el descanso. Web Audio, sin ficheros. iOS exige desbloquear el
// contexto en un gesto del usuario: `prepararSonido()` se llama en el primer toque.
// iOS también suspende o «interrumpe» el contexto (llamada, Siri, bloqueo, otra app con audio): se
// reanuda al volver a la app y, si la campana llega con el contexto parado, se intenta reanudar y
// sonar en cuanto lo permita. Si no suena, el aviso sigue llegando por háptica y toast.
let ctx = null;

function crear() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  return new C();
}

export function prepararSonido() {
  try {
    if (ctx && ctx.state === "closed") ctx = null;
    if (!ctx) ctx = crear();
    if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
  } catch (e) { ctx = null; }
}

/** Al volver a la app: reanuda el contexto si se quedó suspendido o interrumpido (no crea uno nuevo). */
export function reanudarSonido() {
  try { if (ctx && ctx.state !== "running" && ctx.state !== "closed") ctx.resume().catch(() => {}); } catch (e) { /* sin sonido */ }
}

export const estadoSonido = () => (ctx ? ctx.state : "sin contexto");

function tocar() {
  const t = ctx.currentTime;
  for (const [f, d] of [[880, 0], [1318.5, 0.16]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.45);
    o.connect(g).connect(ctx.destination);
    o.start(t + d); o.stop(t + d + 0.5);
  }
}

/** Dos notas suaves (aviso de fin de descanso). Devuelve true si suena ya; false si no hay contexto o está parado (se reintenta al reanudar). */
export function campana() {
  if (!ctx) return false;
  try {
    if (ctx.state === "running") { tocar(); return true; }
    ctx.resume().then(() => { if (ctx && ctx.state === "running") tocar(); }).catch(() => {});
  } catch (e) { /* sin sonido */ }
  return false;
}

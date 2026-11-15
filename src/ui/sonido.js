// Sonido corto al terminar el descanso. Web Audio, sin ficheros. iOS exige desbloquear el
// contexto en un gesto del usuario: `prepararSonido()` se llama en el primer toque.
let ctx = null;

export function prepararSonido() {
  try {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ctx = new C(); }
    if (ctx.state === "suspended") ctx.resume();
  } catch (e) { ctx = null; }
}

/** Dos notas suaves (aviso de fin de descanso). */
export function campana() {
  if (!ctx) return;
  try {
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
  } catch (e) { /* sin sonido */ }
}

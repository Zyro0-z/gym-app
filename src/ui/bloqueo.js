// Controles en la pantalla bloqueada (EXPERIMENTAL, desactivado por defecto).
//
// Truco: un audio en silencio en bucle convierte el entrenamiento en «algo que suena», así que
// iOS muestra el reproductor del sistema en la pantalla bloqueada con título, barra de progreso
// del descanso y botones. Limitaciones honestas (se explican en Ajustes):
//   · ocupa el audio del sistema: pausa la música que estuviera sonando;
//   · iOS puede retirar los controles si la app pasa mucho tiempo en segundo plano;
//   · el pitido de fin de descanso suena por el mismo reproductor (Web Audio no suena bloqueado).
// Acciones: siguiente = saltar el descanso (o marcar la siguiente serie si no hay descanso),
// anterior = reiniciar el descanso, ±15 s = alargar o acortar, pausa / reproducir.

let audio = null, urlSilencio = null, urlPitido = null, acciones = null, activo = false;

/** WAV PCM de 8 bits mono a 8 kHz. `muestra(t)` da la amplitud (−1..1) en el segundo t. */
function wav(segundos, muestra) {
  const n = Math.round(8000 * segundos), b = new ArrayBuffer(44 + n), v = new DataView(b);
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, "RIFF"); v.setUint32(4, 36 + n, true); txt(8, "WAVE"); txt(12, "fmt "); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); txt(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, Math.max(0, Math.min(255, Math.round(128 + 127 * muestra(i / 8000)))));
  return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
}
const nota = (f, ini, dur) => (t) => (t >= ini && t < ini + dur ? Math.sin(2 * Math.PI * f * (t - ini)) * 0.5 * Math.min(1, (ini + dur - t) * 20) : 0);

export const disponible = () => typeof navigator !== "undefined" && "mediaSession" in navigator && typeof Audio !== "undefined";
export const estaActivo = () => activo;

/**
 * Empieza (debe llamarse dentro de un toque del usuario, por la política de audio de iOS).
 * `acc`: { siguiente, anterior, mover(segundos) }
 */
export function activar(acc) {
  if (!disponible()) return false;
  acciones = acc;
  if (!urlSilencio) urlSilencio = wav(2, () => 0);
  if (!urlPitido) { const a = nota(880, 0, 0.18), b2 = nota(1318.5, 0.2, 0.35); urlPitido = wav(0.7, (t) => a(t) + b2(t)); }
  if (!audio) {
    audio = new Audio();
    audio.setAttribute("playsinline", "");
    audio.addEventListener("ended", () => { if (activo && audio.src === urlPitido) silencio(); });
  }
  activo = true;
  silencio();
  const ms = navigator.mediaSession;
  const poner = (accion, fn) => { try { ms.setActionHandler(accion, fn); } catch (e) { /* acción no soportada */ } };
  poner("play", () => { silencio(); ms.playbackState = "playing"; });
  poner("pause", () => { audio.pause(); ms.playbackState = "paused"; });
  poner("nexttrack", () => acciones && acciones.siguiente());
  poner("previoustrack", () => acciones && acciones.anterior());
  poner("seekforward", () => acciones && acciones.mover(15));
  poner("seekbackward", () => acciones && acciones.mover(-15));
  return true;
}

function silencio() {
  if (!audio) return;
  audio.loop = true;
  if (audio.src !== urlSilencio) audio.src = urlSilencio;
  const p = audio.play(); if (p && p.catch) p.catch(() => {});
}

/** Pitido de fin de descanso por el reproductor (suena con la pantalla bloqueada). */
export function pitido() {
  if (!activo || !audio) return false;
  audio.loop = false; audio.src = urlPitido;
  const p = audio.play(); if (p && p.catch) p.catch(() => {});
  return true;
}

/** Actualiza lo que se ve: { titulo, subtitulo, descanso: { fin, total } | null }. */
export function actualizar({ titulo, subtitulo, descanso }) {
  if (!activo) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new MediaMetadata({ title: titulo, artist: subtitulo || "", album: "Gym" });
    if (descanso && ms.setPositionState) {
      const total = Math.max(1, descanso.total), pos = Math.max(0, Math.min(total, total - (descanso.fin - Date.now()) / 1000));
      ms.setPositionState({ duration: total, position: pos, playbackRate: 1 });
    } else if (ms.setPositionState) ms.setPositionState();
    ms.playbackState = audio && !audio.paused ? "playing" : "paused";
  } catch (e) { /* navegador sin soporte completo */ }
}

export function desactivar() {
  if (!activo) return;
  activo = false; acciones = null;
  try { audio.pause(); audio.removeAttribute("src"); audio.load(); } catch (e) {}
  const ms = navigator.mediaSession;
  for (const a of ["play", "pause", "nexttrack", "previoustrack", "seekforward", "seekbackward"]) { try { ms.setActionHandler(a, null); } catch (e) {} }
  try { ms.metadata = null; ms.playbackState = "none"; } catch (e) {}
}

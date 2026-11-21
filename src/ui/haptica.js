// Háptica (docs/DISENO.md §3.7). En Safari 17.4+ un <input type="checkbox" switch> da un toque
// háptico al cambiar; se pulsa uno oculto. Si no existe, navigator.vibrate; si tampoco, nada.
let activa = true, label = null;

export function configurarHaptica(on) { activa = !!on; }

function interruptor() {
  if (label) return label;
  label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
  const i = document.createElement("input");
  i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1;
  label.appendChild(i);
  document.body.appendChild(label);
  return label;
}
const soportaSwitch = () => typeof navigator !== "undefined" && /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

function toque() {
  if (!activa) return;
  try {
    if (soportaSwitch()) interruptor().click();
    else if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(8);
  } catch (e) { /* sin háptica */ }
}

/** Cambio de selección: segmentado, stepper, arrastre por una gráfica. */
export const seleccion = () => toque();
/** Impacto: marcar una serie como hecha. */
export const impacto = () => { toque(); };
/** Éxito: terminar entrenamiento, nuevo récord, fin del descanso. */
export function exito() {
  if (!activa) return;
  if (!soportaSwitch() && navigator.vibrate) { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; try { navigator.vibrate([12, 60, 18]); } catch (e) {} return; }
  toque(); setTimeout(toque, 110);
}
/** Récord: tres toques seguidos, más largo que el de éxito. */
export function record() {
  if (!activa) return;
  if (!soportaSwitch() && navigator.vibrate) { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; try { navigator.vibrate([12, 50, 12, 50, 28]); } catch (e) {} return; }
  toque(); setTimeout(toque, 90); setTimeout(toque, 180);
}

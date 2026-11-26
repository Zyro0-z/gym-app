// Deslizamiento entre pestañas: arrastrar la pantalla raíz o el dedo por la tab bar mueve de una pestaña a la
// vecina (la pantalla sigue al dedo) y tocar una pestaña la abre con la misma animación. No empieza sobre campos,
// gráficas ni zonas que ya se desplazan en horizontal, ni con una hoja o un modal abiertos.
import { animar, reducirMovimiento } from "./dom.js";
import { seleccion } from "./haptica.js";

export const CURVA_DESLIZ = "cubic-bezier(.32,.72,0,1)";

export function crearDeslizamiento({ raiz, tabbar, P, orden, ctx, asegurarRaiz, cambiarPestana, estado }) {
  const colocar = (a, b, dir, x) => { const w = raiz.clientWidth; a.el.style.transform = `translateX(${x}px)`; b.el.style.transform = `translateX(${x + dir * w}px)`; };
  function soltarCapas(a, b) {
    for (const T of [a, b]) { T.el.classList.remove("deslizando"); T.el.style.transform = ""; for (const an of T.el.getAnimations()) an.cancel(); }
  }
  /** Pasa a la pestaña `id` deslizando; `x0` es lo que ya se ha arrastrado (px, negativo hacia la izquierda). */
  async function deslizar(id, x0 = 0) {
    if (id === estado.actual) return;
    const prev = P.get(estado.actual), dir = orden.indexOf(id) > orden.indexOf(estado.actual) ? 1 : -1;
    if (reducirMovimiento()) return cambiarPestana(id);
    estado.animando = true;
    const w = raiz.clientWidth || 1, nxt = asegurarRaiz(id);
    prev.el.classList.add("deslizando"); nxt.el.classList.add("deslizando");
    colocar(prev, nxt, dir, x0);
    const dur = Math.max(160, 300 * (1 - Math.min(1, Math.abs(x0) / w)));
    try {
      await Promise.all([
        animar(prev.el, [{ transform: `translateX(${x0}px)` }, { transform: `translateX(${-dir * w}px)` }], { duration: dur, easing: CURVA_DESLIZ }),
        animar(nxt.el, [{ transform: `translateX(${x0 + dir * w}px)` }, { transform: "translateX(0px)" }], { duration: dur, easing: CURVA_DESLIZ }),
      ]);
      await cambiarPestana(id);
    } finally { soltarCapas(prev, nxt); estado.animando = false; }
  }

  /** ¿Puede empezar aquí un deslizamiento de pestaña? No sobre campos, gráficas ni zonas que ya se desplazan en horizontal. */
  function zonaLibre(el) {
    for (let x = el; x && x !== raiz; x = x.parentElement) {
      if (x.matches("input, textarea, select, [contenteditable], .grafica, [role=slider]")) return false;
      const c = getComputedStyle(x);
      if (c.touchAction === "none") return false;
      if ((c.overflowX === "auto" || c.overflowX === "scroll") && x.scrollWidth > x.clientWidth + 1) return false;
    }
    return true;
  }
  let sw = null;
  raiz.addEventListener("pointerdown", (e) => {
    if (estado.animando || !estado.actual || estado.profundidad > 0 || e.pointerType === "mouse" || (ctx.hayCapaAbierta && ctx.hayCapaAbierta()) || !zonaLibre(e.target)) return;
    sw = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t: performance.now(), dx: 0, v: 0, vecina: null, dir: 0, decidido: false };
  });
  raiz.addEventListener("pointermove", (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
    if (!sw.decidido) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      sw.decidido = true;
      try { raiz.setPointerCapture(e.pointerId); } catch (_) {}
    }
    const i = orden.indexOf(estado.actual), dir = dx < 0 ? 1 : -1, id = orden[i + dir];
    const w = raiz.clientWidth || 1, ahora = performance.now();
    if (dir !== sw.dir) {   // cambió de sentido: se prepara la otra pestaña (o ninguna en los extremos)
      if (sw.vecina) soltarCapas(P.get(estado.actual), sw.vecina);
      sw.dir = dir; sw.vecina = id ? asegurarRaiz(id) : null;
      if (sw.vecina) { P.get(estado.actual).el.classList.add("deslizando"); sw.vecina.el.classList.add("deslizando"); }
    }
    const x = sw.vecina ? dx : dx * 0.3;   // en los extremos la pantalla se resiste
    sw.v = 0.6 * sw.v + 0.4 * ((x - sw.dx) / Math.max(16, ahora - sw.t)); sw.t = ahora; sw.dx = x;
    if (sw.vecina) colocar(P.get(estado.actual), sw.vecina, dir, Math.max(-w, Math.min(w, x)));
    else P.get(estado.actual).el.style.transform = `translateX(${x}px)`;
  });
  const terminarSwipe = (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const g = sw; sw = null;
    if (!g.decidido) return;
    const prev = P.get(estado.actual), w = raiz.clientWidth || 1, vecina = g.vecina;
    const sigue = vecina && e.type !== "pointercancel" && (Math.abs(g.dx) > w * 0.3 || Math.abs(g.v) > 0.35) && Math.sign(g.v || g.dx) === Math.sign(g.dx);
    if (sigue) { seleccion(); deslizar(orden[orden.indexOf(estado.actual) + g.dir], g.dx); return; }
    estado.animando = true;
    const x = g.dx;
    Promise.all([
      animar(prev.el, [{ transform: `translateX(${x}px)` }, { transform: "translateX(0px)" }], { duration: 250, easing: CURVA_DESLIZ }),
      vecina ? animar(vecina.el, [{ transform: `translateX(${x + g.dir * w}px)` }, { transform: `translateX(${g.dir * w}px)` }], { duration: 250, easing: CURVA_DESLIZ }) : null,
    ]).then(() => { soltarCapas(prev, vecina || prev); estado.animando = false; });
  };
  raiz.addEventListener("pointerup", terminarSwipe);
  raiz.addEventListener("pointercancel", terminarSwipe);

  // arrastrar el dedo por la tab bar: la pestaña bajo el dedo se ilumina y al soltar se abre
  let tb = null, suprimir = false;
  const botonEn = (x) => { let mejor = null, d = 1e9; for (const T of P.values()) { const r = T.boton.getBoundingClientRect(), dd = x < r.left ? r.left - x : x > r.right ? x - r.right : 0; if (dd < d) { d = dd; mejor = T.boton; } } return mejor; };
  const quitarPrevio = () => { tabbar.removeAttribute("data-arrastre"); for (const T of P.values()) T.boton.classList.remove("previo"); };
  tabbar.addEventListener("pointerdown", (e) => {
    if (estado.animando || e.pointerType === "mouse" || (ctx.hayCapaAbierta && ctx.hayCapaAbierta())) return;
    tb = { id: e.pointerId, x0: e.clientX, mov: false, sobre: null };
  });
  tabbar.addEventListener("pointermove", (e) => {
    if (!tb || e.pointerId !== tb.id) return;
    if (!tb.mov) { if (Math.abs(e.clientX - tb.x0) < 10) return; tb.mov = true; try { tabbar.setPointerCapture(e.pointerId); } catch (_) {} tabbar.setAttribute("data-arrastre", "1"); }
    const b = botonEn(e.clientX);
    if (b && b !== tb.sobre) { if (tb.sobre) tb.sobre.classList.remove("previo"); tb.sobre = b; b.classList.add("previo"); seleccion(); }
  });
  const soltarTab = (e) => {
    if (!tb || e.pointerId !== tb.id) return;
    const g = tb; tb = null;
    if (!g.mov) return;
    suprimir = true; setTimeout(() => { suprimir = false; }, 50);
    quitarPrevio();
    const id = g.sobre && e.type !== "pointercancel" ? g.sobre.dataset.tab : null;
    if (id && id !== estado.actual) deslizar(id);
  };
  tabbar.addEventListener("pointerup", soltarTab);
  tabbar.addEventListener("pointercancel", soltarTab);
  tabbar.addEventListener("click", (e) => { if (suprimir) { e.stopPropagation(); e.preventDefault(); } }, true);
  return { deslizar };
}

// Deslizamiento entre pestañas, como un paginador: arrastrar la pantalla raíz o el dedo por la tab bar mueve las
// pantallas con el dedo (las vecinas entran a la vez) y al soltar se asientan en la más cercana. Tocar una pestaña
// la abre con la misma animación. En Progreso, deslizar la pantalla pasa entre sus secciones (Resumen, Ejercicios…)
// y solo al llegar al extremo pasa a la pestaña vecina. No empieza sobre campos, gráficas ni zonas que ya se
// desplazan en horizontal, ni con una hoja o un modal abiertos. Seguir el dedo no es "movimiento decorativo", así que
// no se desactiva con «Reducir movimiento»: solo se acorta el asentamiento.
import { reducirMovimiento } from "./dom.js";
import { seleccion } from "./haptica.js";

const suave = (t) => 1 - Math.pow(1 - t, 4);

export function crearDeslizamiento({ raiz, tabbar, P, orden, ctx, asegurarRaiz, cambiarPestana, estado }) {
  const n = orden.length;
  const ancho = () => raiz.clientWidth || 1;
  const T = (i) => P.get(orden[i]);
  const dur = (d) => Math.round((reducirMovimiento() ? 160 : 140 + 200 * Math.min(1, d)));

  /** Anima un valor de `a` a `b` con una curva suave; llama a `pinta(v)` en cada fotograma y resuelve al terminar. */
  function animarValor(a, b, ms, pinta) {
    return new Promise((res) => {
      if (a === b) { pinta(b); res(); return; }
      const t0 = performance.now(); let listo = false;
      const fin = () => { if (!listo) { listo = true; pinta(b); res(); } };
      const paso = (t) => { if (listo) return; const k = Math.min(1, (t - t0) / ms); pinta(a + (b - a) * suave(k)); k < 1 ? requestAnimationFrame(paso) : fin(); };
      requestAnimationFrame(paso);
      setTimeout(fin, ms + 150);
    });
  }
  const idxActual = () => orden.indexOf(estado.actual);
  const pantalla = () => { const t = P.get(estado.actual); return t && t.pila[0] ? t.pila[0].el : null; };

  /** Coloca las pestañas como un carrusel: la pestaña `i` queda a `(i - f)` anchos de pantalla. */
  function pintarF(f) {
    const w = ancho();
    for (let i = 0; i < n; i++) {
      const el = T(i).el, d = i - f;
      if (Math.abs(d) < 1) { asegurarRaiz(orden[i]); el.classList.remove("fuera"); el.classList.add("deslizando"); el.style.transform = `translate3d(${(d * w).toFixed(1)}px,0,0)`; }
      else { el.classList.remove("deslizando"); el.classList.add("fuera"); el.style.transform = ""; }
    }
  }
  function limpiar() {
    for (let i = 0; i < n; i++) { const el = T(i).el; el.classList.remove("deslizando", "fuera"); el.style.transform = ""; }
    const p = pantalla(); if (p) p.style.transform = "";
  }
  /** Asienta el carrusel en la pestaña `dest` y la hace la activa. */
  async function asentar(f, dest) {
    estado.animando = true;
    try {
      await animarValor(f, dest, dur(Math.abs(dest - f)), pintarF);
      if (dest !== idxActual()) await cambiarPestana(orden[dest]);
    } finally { limpiar(); estado.animando = false; }
  }

  /** Tocar una pestaña: solo se mueven la actual y la elegida (aunque estén lejos). */
  async function deslizar(id) {
    if (id === estado.actual || estado.animando) return;
    const a = P.get(estado.actual), b = asegurarRaiz(id), dir = orden.indexOf(id) > idxActual() ? 1 : -1, w = ancho();
    estado.animando = true;
    for (const t of P.values()) if (t !== a && t !== b) t.el.classList.add("fuera");
    a.el.classList.add("deslizando"); b.el.classList.add("deslizando");
    const pinta = (g) => { a.el.style.transform = `translate3d(${(-dir * g * w).toFixed(1)}px,0,0)`; b.el.style.transform = `translate3d(${(dir * (1 - g) * w).toFixed(1)}px,0,0)`; };
    try { pinta(0); await animarValor(0, 1, dur(1), pinta); await cambiarPestana(id); }
    finally { limpiar(); estado.animando = false; }
  }

  /** ¿Puede empezar aquí un deslizamiento? No sobre campos, gráficas ni zonas que ya se desplazan en horizontal. */
  function zonaLibre(el) {
    for (let x = el; x && x !== raiz; x = x.parentElement) {
      if (x.matches("input, textarea, select, [contenteditable], .grafica, [role=slider]")) return false;
      const c = getComputedStyle(x);
      if (c.touchAction === "none") return false;
      if ((c.overflowX === "auto" || c.overflowX === "scroll") && x.scrollWidth > x.clientWidth + 1) return false;
    }
    return true;
  }
  const secciones = () => { const t = P.get(estado.actual); const d = t && t.pila[0] && t.pila[0].def; return d && d.secciones ? d.secciones : null; };

  // ── arrastrar la pantalla ──
  let sw = null;
  raiz.addEventListener("pointerdown", (e) => {
    if (estado.animando || !estado.actual || estado.profundidad > 0 || e.pointerType === "mouse" || (ctx.hayCapaAbierta && ctx.hayCapaAbierta()) || !zonaLibre(e.target)) return;
    sw = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t: performance.now(), dx: 0, v: 0, decidido: false, i0: idxActual(), modo: null, f: idxActual() };
  });
  raiz.addEventListener("pointermove", (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const dx = e.clientX - sw.x0, dy = e.clientY - sw.y0;
    if (!sw.decidido) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      sw.decidido = true; sw.x0 = e.clientX;   // el arrastre cuenta desde aquí: la pantalla no da un salto
      try { raiz.setPointerCapture(e.pointerId); } catch (_) {}
      return;
    }
    const x = e.clientX - sw.x0, w = ancho(), ahora = performance.now(), dir = x < 0 ? 1 : -1, sec = secciones();
    sw.v = 0.6 * sw.v + 0.4 * ((x - sw.dx) / Math.max(16, ahora - sw.t)); sw.t = ahora; sw.dx = x;
    const enSeccion = sw.i0 === orden.indexOf(estado.actual) && sec && sec.indice() + dir >= 0 && sec.indice() + dir < sec.n && estado.actual === "progreso";
    const p = pantalla();
    if (enSeccion) { if (sw.modo !== "seccion") { limpiar(); sw.modo = "seccion"; } if (p) p.style.transform = `translate3d(${x}px,0,0)`; return; }
    if (sw.modo !== "pestana") { if (p) p.style.transform = ""; sw.modo = "pestana"; }
    let f = sw.i0 - x / w;
    if (f < 0) f *= 0.3; else if (f > n - 1) f = n - 1 + (f - (n - 1)) * 0.3;   // en los extremos la pantalla se resiste
    sw.f = f; pintarF(f);
  });
  const terminar = async (e) => {
    if (!sw || e.pointerId !== sw.id) return;
    const g = sw; sw = null;
    if (!g.decidido) return;
    const w = ancho(), x = g.dx, dir = x < 0 ? 1 : -1, cancel = e.type === "pointercancel";
    const lanza = !cancel && (Math.abs(x) > w * 0.3 || Math.abs(g.v) > 0.35) && (Math.abs(g.v) < 0.05 || Math.sign(g.v) === Math.sign(x));
    if (g.modo === "seccion") {
      const sec = secciones(), p = pantalla(); estado.animando = true;
      try {
        if (lanza && sec && p) {
          await animarValor(x, -dir * w, dur(0.5), (v) => { p.style.transform = `translate3d(${v.toFixed(1)}px,0,0)`; });
          sec.ir(sec.indice() + dir); if (ctx.repintar) ctx.repintar();
          seleccion();
          await new Promise((r) => requestAnimationFrame(r));
          await animarValor(dir * w, 0, dur(0.5), (v) => { p.style.transform = `translate3d(${v.toFixed(1)}px,0,0)`; });
        } else if (p) await animarValor(x, 0, dur(0.3), (v) => { p.style.transform = `translate3d(${v.toFixed(1)}px,0,0)`; });
      } finally { limpiar(); estado.animando = false; }
      return;
    }
    if (g.modo !== "pestana") { limpiar(); return; }
    const dest = lanza ? Math.max(0, Math.min(n - 1, g.i0 + dir)) : g.i0;
    if (dest !== g.i0) seleccion();
    await asentar(g.f, dest);
  };
  raiz.addEventListener("pointerup", terminar);
  raiz.addEventListener("pointercancel", terminar);

  // ── arrastrar el dedo por la tab bar: las pantallas siguen al dedo y la pestaña bajo él se ilumina ──
  let tb = null, suprimir = false;
  const botones = () => orden.map((id) => P.get(id).boton);
  const separacion = () => { const r = botones().map((b) => { const q = b.getBoundingClientRect(); return q.left + q.width / 2; }); return n > 1 ? (r[n - 1] - r[0]) / (n - 1) : 1; };
  const marcar = (i) => { botones().forEach((b, k) => b.classList.toggle("previo", k === i)); };
  const quitarPrevio = () => { tabbar.removeAttribute("data-arrastre"); botones().forEach((b) => b.classList.remove("previo")); };
  tabbar.addEventListener("pointerdown", (e) => {
    if (estado.animando || e.pointerType === "mouse" || (ctx.hayCapaAbierta && ctx.hayCapaAbierta())) return;
    tb = { id: e.pointerId, x0: e.clientX, mov: false, i0: idxActual(), f: idxActual(), sobre: -1, sep: separacion() };
  });
  tabbar.addEventListener("pointermove", (e) => {
    if (!tb || e.pointerId !== tb.id) return;
    if (!tb.mov) {
      if (Math.abs(e.clientX - tb.x0) < 10) return;
      tb.mov = true; tb.x0 = e.clientX;
      try { tabbar.setPointerCapture(e.pointerId); } catch (_) {}
      tabbar.setAttribute("data-arrastre", "1");
    }
    tb.f = Math.max(0, Math.min(n - 1, tb.i0 + (e.clientX - tb.x0) / tb.sep));
    pintarF(tb.f);
    const i = Math.round(tb.f);
    if (i !== tb.sobre) { tb.sobre = i; marcar(i); seleccion(); }
  });
  const soltarTab = (e) => {
    if (!tb || e.pointerId !== tb.id) return;
    const g = tb; tb = null;
    if (!g.mov) return;
    suprimir = true; setTimeout(() => { suprimir = false; }, 50);
    quitarPrevio();
    asentar(g.f, Math.round(g.f));
  };
  tabbar.addEventListener("pointerup", soltarTab);
  tabbar.addEventListener("pointercancel", soltarTab);
  tabbar.addEventListener("click", (e) => { if (suprimir) { e.stopPropagation(); e.preventDefault(); } }, true);

  return { deslizar };
}

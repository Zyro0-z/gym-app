// Navegación (docs/DISENO.md §3.6 y §4): una pila de pantallas por pestaña, push/pop con la
// History API (el botón y el gesto de atrás del sistema también funcionan), gesto de volver desde
// el borde izquierdo y tab bar. Cada pantalla conserva su scroll.
//
// Una vista es una función `(params, app) => def`, con def:
//   titulo         texto o función que lo devuelve
//   grande         título grande (por defecto en las raíces)
//   sobre          texto pequeño sobre el título grande (o función)
//   plana          fondo plano en lugar de agrupado
//   derecha/izquierda  () => nodos para la barra
//   render(cuerpo, pantalla)  pinta el contenido; se vuelve a llamar al cambiar los datos
//   alMostrar(), alOcultar(), destruir()  opcionales
// Si la fábrica de la vista lleva `analisis = true`, mientras no haya ningún análisis calculado se
// pinta un esqueleto (el Worker aún no ha respondido) y se repinta cuando llega.
import { h, poner, animar, reducirMovimiento } from "./dom.js";
import { icono } from "./iconos.js";
import { seleccion } from "./haptica.js";
import { esqueleto } from "./controles.js";
import { crearDeslizamiento } from "./deslizar.js";

const DUR = 350, BORDE = 24;
const CURVA = "cubic-bezier(.32,.72,0,1)";

export function crearNavegacion({ app: raiz, tabbar, pestanas, vistas, ctx }) {
  const P = new Map();          // id de pestaña → { el, pila: [pantalla], boton }
  let actual = null, animando = false, ignorarPop = 0, esperaPop = null, gesto = null;

  // ── tab bar ──
  for (const t of pestanas) {
    const boton = h("button", { role: "tab", "aria-selected": "false", "aria-label": t.titulo, dataset: { tab: t.id },
      onClick: () => tocarPestana(t.id) },
      h("span", { class: "contorno" }, icono(t.icono)), h("span", { class: "relleno" }, icono(t.icono, { relleno: true })),
      h("span", null, t.titulo), h("i", { class: "punto", hidden: true }));
    tabbar.appendChild(boton);
    const el = h("div", { class: "pestana", dataset: { tab: t.id }, role: "tabpanel" });
    raiz.appendChild(el);
    P.set(t.id, { el, pila: [], boton, raizRuta: t.raiz || t.id });
  }
  tabbar.setAttribute("role", "tablist");

  const pila = () => P.get(actual).pila;
  const top = () => pila()[pila().length - 1];

  // ── pantallas ──
  function crearPantalla(ruta, anterior, { diferir = false } = {}) {
    const [nombre, ...resto] = ruta.split("/");
    const fabrica = vistas[nombre] || vistas.noEncontrada;
    const params = resto.map((x) => decodeURIComponent(x));
    const p = { ruta, nombre, params, sucia: false, analisis: !!fabrica.analisis, esqueleto: fabrica.esqueleto || "lista" };
    p.def = fabrica(params, ctx, p);
    const d = p.def;
    const grande = d.grande !== undefined ? d.grande : !anterior;
    p.tituloEl = h("div", { class: "titulo", role: "heading", "aria-level": "1" });
    p.izq = h("div", { class: "izq" });
    p.der = h("div", { class: "der" });
    p.barra = h("header", { class: "barra-nav" }, p.izq, p.tituloEl, p.der);
    p.cuerpo = h("div", { class: "cuerpo" });
    p.grandeEl = grande ? h("div", { class: "cab-grande" }) : null;
    p.scroll = h("div", { class: "scroll" }, p.grandeEl, p.cuerpo);
    p.sombra = h("div", { class: "sombra" });
    p.el = h("section", { class: ["pantalla", grande && "titulo-grande", d.plana && "plana"], dataset: { ruta } }, p.scroll, p.barra, p.sombra);
    p.anterior = anterior;
    p.scroll.addEventListener("scroll", () => actualizarBarra(p), { passive: true });
    // Primera vez que se abre una pestaña: esqueleto ahora y contenido en la tarea siguiente, para
    // no juntar en un solo bloqueo el pintado y la primera maquetación de toda la pestaña
    if (diferir) { pintarEsqueleto(p); p.diferida = true; setTimeout(() => { p.diferida = false; if (p.sucia && p.el.isConnected) pintar(p); }, 0); }
    else pintar(p);
    return p;
  }

  function texto(v) { return typeof v === "function" ? v() : v; }

  function pintar(p) {
    const d = p.def;
    if (p.analisis && ctx.store && !ctx.store.analisis()) { pintarEsqueleto(p); return; }
    const titulo = texto(d.titulo) || "";
    p.tituloEl.textContent = titulo;
    poner(p.izq, d.izquierda ? d.izquierda() : p.anterior ? botonAtras(p.anterior) : null);
    poner(p.der, d.derecha ? d.derecha() : null);
    if (p.grandeEl) {
      const sobre = texto(d.sobre);
      poner(p.grandeEl, sobre ? h("div", { class: "sobre" }, sobre) : null, h("h1", null, titulo), d.cabDerecha ? h("div", { class: "cab-der" }, d.cabDerecha()) : null, d.bajoTitulo ? h("div", { class: "bajo" }, d.bajoTitulo()) : null);
    }
    try { d.render(p.cuerpo, p); }
    catch (e) { console.error(e); poner(p.cuerpo, h("div", { class: "vacio" }, h("h2", null, "No se pudo mostrar"), h("p", null, String(e.message || e)))); }
    p.sucia = false;
    actualizarBarra(p);
  }

  /** Esqueleto con la altura aproximada del contenido, para que no salte al llegar los datos. */
  function pintarEsqueleto(p) {
    const d = p.def;
    let titulo = "";
    try { titulo = typeof d.titulo === "string" ? d.titulo : texto(d.tituloEsqueleto) || ""; } catch (e) {}
    p.tituloEl.textContent = titulo;
    poner(p.izq, p.anterior ? botonAtras(p.anterior) : null);
    poner(p.der, null);
    if (p.grandeEl) poner(p.grandeEl, h("h1", null, titulo), d.bajoTitulo ? h("div", { class: "bajo esq-bajo" }, h("span", { class: "esq esq-linea" })) : null);
    poner(p.cuerpo, esqueleto(p.esqueleto));
    p.sucia = true;
  }

  // Volver: solo el chevrón (nunca un título truncado); el nombre completo va en aria-label
  function botonAtras(anterior) {
    let t = "";
    try { t = texto(anterior.def.tituloAtras || anterior.def.titulo) || ""; } catch (e) {}
    return h("button", { class: "btn-atras", "aria-label": t ? "Volver a " + t : "Atrás", title: t ? "Volver a " + t : "Atrás", onClick: () => atras() }, icono("atras"));
  }

  function actualizarBarra(p) {
    const y = p.scroll.scrollTop;
    const alto = p.grandeEl ? p.grandeEl.offsetHeight : 0;
    if (p.grandeEl && !alto) return;            // aún sin layout (pestaña oculta): se recalcula al mostrarla
    p.el.classList.toggle("colapsada", !!p.grandeEl && y > alto - 8);
    p.el.classList.toggle("con-fondo", y > (p.grandeEl ? alto - 4 : 0));
  }

  function mostrarSolo(lista, visibles) {
    for (const x of lista) { const v = visibles.includes(x); x.el.hidden = !v; x.el.inert = v && x !== visibles[visibles.length - 1]; }
  }

  // ── push / pop ──
  async function ir(ruta, { pestana = null } = {}) {
    if (animando) return;
    if (pestana && pestana !== actual) await cambiarPestana(pestana);
    const ant = top();
    const p = crearPantalla(ruta, ant);
    const T = P.get(actual);
    T.el.appendChild(p.el);
    T.pila.push(p);
    history.pushState({ gym: T.pila.length - 1, tab: actual }, "", "#/" + ruta);
    if (ant.def.alOcultar) ant.def.alOcultar();
    animando = true;
    mostrarSolo(T.pila, [ant, p]);
    if (reducirMovimiento()) await animar(p.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
    else await Promise.all([
      animar(p.el, [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], { duration: DUR, easing: CURVA }),
      animar(ant.el, [{ transform: "translateX(0)" }, { transform: "translateX(-30%)" }], { duration: DUR, easing: CURVA }),
      animar(ant.sombra, [{ opacity: 0 }, { opacity: 0.12 }], { duration: DUR, easing: CURVA }),
    ]);
    limpiarAnim(p); limpiarAnim(ant);
    mostrarSolo(T.pila, [p]);
    animando = false;
    if (p.def.alMostrar) p.def.alMostrar();
  }

  function limpiarAnim(p) { for (const el of [p.el, p.sombra]) for (const a of el.getAnimations()) a.cancel(); p.el.style.transform = ""; p.sombra.style.opacity = ""; }

  function atras() { if (pila().length > 1 && !animando) history.back(); }

  async function pop(desde = 0) {
    const T = P.get(actual);
    if (T.pila.length < 2) return;
    const p = T.pila[T.pila.length - 1], ant = T.pila[T.pila.length - 2];
    animando = true;
    mostrarSolo(T.pila, [ant, p]);
    if (p.def.alOcultar) p.def.alOcultar();
    const w = raiz.clientWidth || 1, f = Math.min(1, desde / w);
    if (reducirMovimiento()) await animar(p.el, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
    else {
      const dur = Math.max(160, DUR * (1 - f));
      await Promise.all([
        animar(p.el, [{ transform: `translateX(${desde}px)` }, { transform: "translateX(100%)" }], { duration: dur, easing: CURVA }),
        animar(ant.el, [{ transform: `translateX(${-30 * (1 - f)}%)` }, { transform: "translateX(0)" }], { duration: dur, easing: CURVA }),
        animar(ant.sombra, [{ opacity: 0.12 * (1 - f) }, { opacity: 0 }], { duration: dur, easing: CURVA }),
      ]);
    }
    T.pila.pop();
    if (p.def.destruir) p.def.destruir();
    p.el.remove();
    limpiarAnim(ant);
    mostrarSolo(T.pila, [ant]);
    if (ant.sucia) pintar(ant);
    animando = false;
    if (ant.def.alMostrar) ant.def.alMostrar();
  }

  window.addEventListener("popstate", (e) => {
    if (ignorarPop > 0) { ignorarPop--; if (!ignorarPop && esperaPop) { const r = esperaPop; esperaPop = null; r(); } return; }
    if (ctx.alAtrasSistema && ctx.alAtrasSistema()) return;      // p. ej. cerrar una hoja abierta
    const desde = gesto && gesto.soltado ? gesto.dx : 0;
    gesto = null;
    if (pila().length > 1) pop(desde);
  });

  /** Vuelve atrás `n` entradas del historial sin animar ni sacar pantallas (para cambiar de pestaña). */
  function retrocederSilencioso(n) {
    if (n <= 0) return Promise.resolve();
    return new Promise((r) => { ignorarPop = 1; esperaPop = r; history.go(-n); setTimeout(() => { if (esperaPop === r) { esperaPop = null; ignorarPop = 0; r(); } }, 400); });
  }

  // ── pestañas ──
  async function cambiarPestana(id) {
    if (id === actual) return;
    const prev = actual ? P.get(actual) : null;
    if (prev) {
      await retrocederSilencioso(prev.pila.length - 1);
      const t = prev.pila[prev.pila.length - 1]; if (t && t.def.alOcultar) t.def.alOcultar();
      prev.el.classList.remove("activa"); prev.boton.setAttribute("aria-selected", "false");
    }
    actual = id;
    const T = P.get(id);
    if (!T.pila.length) { const p = crearPantalla(T.raizRuta, null, { diferir: !!prev }); T.el.appendChild(p.el); T.pila.push(p); }
    T.el.classList.add("activa"); T.boton.setAttribute("aria-selected", "true");
    history.replaceState({ gym: 0, tab: id }, "", "#/" + T.pila[0].ruta);
    for (let i = 1; i < T.pila.length; i++) history.pushState({ gym: i, tab: id }, "", "#/" + T.pila[i].ruta);
    const t = T.pila[T.pila.length - 1];
    if (t.sucia && !t.diferida) pintar(t); else actualizarBarra(t);
    if (t.def.alMostrar) t.def.alMostrar();
  }

  async function tocarPestana(id) {
    if (animando) return;
    seleccion();
    if (id !== actual) return deslizar(id);
    const T = P.get(id);
    if (T.pila.length > 1) {
      // vuelve a la raíz: saca las intermedias sin animar y anima solo la última
      const n = T.pila.length - 1;
      if (n > 1) { await retrocederSilencioso(n - 1); const quitadas = T.pila.splice(1, n - 1); for (const q of quitadas) { if (q.def.destruir) q.def.destruir(); q.el.remove(); } T.pila[1].anterior = T.pila[0]; }
      history.back();
    } else T.pila[0].scroll.scrollTo({ top: 0, behavior: reducirMovimiento() ? "auto" : "smooth" });
  }

  // ── deslizamiento entre pestañas (arrastrar la pantalla o la tab bar, y animación al tocar) ──
  const orden = pestanas.map((t) => t.id);
  function asegurarRaiz(id) {
    const T = P.get(id);
    if (!T.pila.length) { const p = crearPantalla(T.raizRuta, null, { diferir: true }); T.el.appendChild(p.el); T.pila.push(p); }
    return T;
  }
  const { deslizar } = crearDeslizamiento({ raiz, tabbar, P, orden, ctx: Object.assign(ctx, { repintar: () => { const t = top(); if (t) pintar(t); } }), asegurarRaiz, cambiarPestana,
    estado: { get actual() { return actual; }, get animando() { return animando; }, set animando(v) { animando = v; }, get profundidad() { return pila().length - 1; } } });

  // ── gesto de volver desde el borde ──
  raiz.addEventListener("pointerdown", (e) => {
    if (animando || pila().length < 2 || e.clientX > BORDE || e.pointerType === "mouse" && e.button !== 0) return;
    if (ctx.hayCapaAbierta && ctx.hayCapaAbierta()) return;
    gesto = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t: performance.now(), dx: 0, v: 0, decidido: false, soltado: false };
  });
  raiz.addEventListener("pointermove", (e) => {
    if (!gesto || e.pointerId !== gesto.id || gesto.soltado) return;
    const dx = e.clientX - gesto.x0, dy = e.clientY - gesto.y0;
    if (!gesto.decidido) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesto = null; return; }
      if (dx < 8) return;
      gesto.decidido = true;
      try { raiz.setPointerCapture(e.pointerId); } catch (_) {}
      const T = pila(); mostrarSolo(T, [T[T.length - 2], T[T.length - 1]]);
    }
    const ahora = performance.now();
    const x = Math.max(0, dx);
    gesto.v = 0.6 * gesto.v + 0.4 * ((x - gesto.dx) / Math.max(16, ahora - gesto.t)); gesto.t = ahora; gesto.dx = x;
    const T = pila(), p = T[T.length - 1], ant = T[T.length - 2], w = raiz.clientWidth, f = x / w;
    p.el.style.transform = `translateX(${x}px)`;
    ant.el.style.transform = `translateX(${-30 * (1 - f)}%)`;
    ant.sombra.style.opacity = String(0.12 * (1 - f));
  });
  const soltar = (e) => {
    if (!gesto || e.pointerId !== gesto.id) return;
    if (!gesto.decidido) { gesto = null; return; }
    const T = pila(), p = T[T.length - 1], ant = T[T.length - 2], w = raiz.clientWidth;
    if (e.type !== "pointercancel" && (gesto.dx > w * 0.35 || gesto.v > 0.45)) { gesto.soltado = true; atrasDesdeGesto(); }
    else {
      const desde = gesto.dx; gesto = null; animando = true;
      Promise.all([
        animar(p.el, [{ transform: `translateX(${desde}px)` }, { transform: "translateX(0)" }], { duration: 250, easing: CURVA }),
        animar(ant.el, [{ transform: ant.el.style.transform }, { transform: "translateX(-30%)" }], { duration: 250, easing: CURVA }),
      ]).then(() => { limpiarAnim(p); limpiarAnim(ant); mostrarSolo(T, [p]); animando = false; });
    }
  };
  function atrasDesdeGesto() { history.back(); }
  raiz.addEventListener("pointerup", soltar);
  raiz.addEventListener("pointercancel", soltar);

  // ── API ──
  function refrescar() {
    for (const T of P.values()) for (const p of T.pila) {
      const visible = T.el.classList.contains("activa") && p === T.pila[T.pila.length - 1];
      if (visible) pintar(p); else p.sucia = true;
    }
  }
  function marcarPestana(id, aviso) { const T = P.get(id); if (T) T.boton.querySelector(".punto").hidden = !aviso; }

  /** Arranque: pestaña y, si el enlace apunta a una pantalla interior, la abre encima. */
  async function iniciar(hash) {
    const ruta = (hash || "").replace(/^#\/?/, "");
    const nombre = ruta.split("/")[0];
    const tab = pestanas.find((t) => (t.raiz || t.id) === ruta) || null;
    if (tab) return cambiarPestana(tab.id);
    const dueno = vistas[nombre] && vistas[nombre].pestana;
    await cambiarPestana(dueno || pestanas[0].id);
    if (nombre && vistas[nombre]) await ir(ruta);
  }

  return {
    ir, atras, refrescar, iniciar, marcarPestana, cambiarPestana, tocarPestana,
    get pestana() { return actual; },
    get pantalla() { return actual ? top() : null; },
    get profundidad() { return actual ? pila().length - 1 : 0; },
    repintarActual() { const t = top(); if (t) pintar(t); },
  };
}

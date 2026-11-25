// Parte de la auditoría que corre DENTRO de la página (tools/auditoria-a11y.mjs). `instalar` se
// inyecta como script de inicio y deja window.__a11y; el resto son envoltorios serializables.

export const ROLES_CON_NOMBRE = ["button", "link", "textbox", "searchbox", "checkbox", "switch", "radio", "slider", "spinbutton", "combobox", "menuitem", "tab", "img", "dialog", "alertdialog", "radiogroup", "timer"];

export const auditarVista = (o) => window.__a11y.vista(o);
export const auditarGrande = () => window.__a11y.grande();
export const focoActual = (capa) => window.__a11y.foco(capa);
/** Pone el punto de partida del Tab al principio de la capa abierta o del documento. */
export const focoAlPrincipio = () => window.__a11y.alPrincipio();

export function instalar() {
  // ── colores ──
  const leer = (c) => {
    if (!c || c === "transparent") return [0, 0, 0, 0];
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; }
    m = c.match(/^color\(srgb ([^)]+)\)/);
    if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; }
    return null;
  };
  const sobre = (a, b) => { const al = a[3] + b[3] * (1 - a[3]); if (!al) return [0, 0, 0, 0]; return [0, 1, 2].map((i) => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / al).concat(al); };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  /** Fondo opaco bajo el elemento (compone las capas de los antecesores). null si hay degradado o imagen. */
  function fondo(el) {
    const capas = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = leer(cs.backgroundColor);
      if (c && c[3] > 0) { capas.push(c); if (c[3] >= 1) break; }
    }
    let r = [255, 255, 255, 1];
    if (!capas.length || capas[capas.length - 1][3] < 1) { const b = leer(getComputedStyle(document.body).backgroundColor); if (b && b[3]) r = sobre(b, r); }
    for (let i = capas.length - 1; i >= 0; i--) r = sobre(capas[i], r);
    return r;
  }
  const opacidad = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const desc = (el) => {
    const t = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
    return el.tagName.toLowerCase() + (el.classList.length ? "." + [...el.classList].slice(0, 3).join(".") : "") + (t ? " «" + t + "»" : "");
  };
  // ── visibilidad ──
  const capasAbiertas = () => [...document.querySelectorAll(".alerta-capa, .hoja, .modal-completo")].filter((x) => x.getBoundingClientRect().height > 0);
  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.display === "none" || e.classList.contains("visualmente-oculto") || e.classList.contains("solo-lectores")) return false;
    }
    return opacidad(el) > 0.05;
  }
  /** ¿Se ve de verdad (en pantalla y no tapado por otra capa)? Prueba el centro y dos puntos más. */
  function encima(el) {
    const r = el.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) return false;
    const pts = [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5]];
    return pts.some(([fx, fy]) => {
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width * fx)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height * fy));
      const t = document.elementFromPoint(x, y);
      return t && (t === el || el.contains(t) || t.contains(el));
    });
  }
  const scrollActivo = () => {
    const c = capasAbiertas().pop();
    const raiz = c || document.querySelector(".pestana.activa .pantalla:not([hidden])");
    return raiz ? [...raiz.querySelectorAll(".scroll, .hoja-cuerpo, .modal-cuerpo")].filter((s) => s.scrollHeight > s.clientHeight + 4).pop() || null : null;
  };
  /** Recorre la vista desplazando el contenedor activo y llama a f() en cada tramo. */
  function porTramos(f) {
    const s = scrollActivo();
    const ini = s ? s.scrollTop : 0;
    if (s) s.scrollTop = 0;
    for (let i = 0; i < 12; i++) {
      f();
      if (!s || s.scrollTop + s.clientHeight >= s.scrollHeight - 2) break;
      s.scrollTop += s.clientHeight - 80;
    }
    if (s) s.scrollTop = ini;
  }
  const conTexto = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const INTERACTIVOS = "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=radio], [role=tab], [role=checkbox], [tabindex]:not([tabindex='-1'])";

  function zonaTactil(el) {
    const r = el.getBoundingClientRect();
    let w = r.width, hh = r.height;
    for (const ps of ["::before", "::after"]) {
      const cs = getComputedStyle(el, ps);
      if (cs.content === "none" || cs.position !== "absolute") continue;
      const px = (v) => (v.endsWith("px") ? parseFloat(v) : 0);
      w = Math.max(w, r.width - px(cs.left) - px(cs.right), parseFloat(cs.width) || 0);
      hh = Math.max(hh, r.height - px(cs.top) - px(cs.bottom), parseFloat(cs.height) || 0);
    }
    return [w, hh];
  }

  function vista({ capa = null, rol = null, toast = false, descanso = false, estructura = true } = {}) {
    const out = [], vistosTexto = new Set(), vistosGrafico = new Set(), vistosTactil = new Set();   // un set por pasada: un botón con texto también debe pasar la de objetivo táctil
    porTramos(() => {
      // Contraste de texto
      for (const el of document.querySelectorAll("body *")) {
        if (vistosTexto.has(el) || !conTexto(el) || el.closest("svg.insignia, .insignia, [disabled], [aria-disabled=true], option")) continue;
        if (!visible(el) || !encima(el)) continue;
        vistosTexto.add(el);
        const cs = getComputedStyle(el), esSvg = el instanceof SVGElement;
        const fg = leer(esSvg ? cs.fill : cs.color), bg = fondo(esSvg ? el.closest("svg").parentElement : el);
        if (!fg || !bg) continue;
        fg[3] *= opacidad(el) * (esSvg ? parseFloat(cs.fillOpacity || 1) : 1);
        const tam = parseFloat(cs.fontSize), negrita = parseInt(cs.fontWeight, 10) >= 700;
        const grande = tam >= 24 || (tam >= 18.66 && negrita), min = grande ? 3 : 4.5;
        const rr = ratio(sobre(fg, bg), bg);
        if (rr < min - 0.005) out.push({ tipo: "contraste de texto", donde: desc(el), texto: rr.toFixed(2) + ":1 (mín. " + min + ")" });
      }
      // Contraste de gráficos y controles (3:1)
      for (const el of document.querySelectorAll(".grafica .barra, .grafica .linea:not(.secundaria), .grafica .punto, .diagrama-cuerpo path[data-nivel], .leyenda-niveles i, .anillo circle + circle, .interruptor .pista, .serie .check, .dia-sem .marca, .barrita > i")) {
        if (vistosGrafico.has(el) || !visible(el) || !encima(el)) continue;
        vistosGrafico.add(el);
        const cs = getComputedStyle(el);
        const bg = fondo(el instanceof SVGElement ? el.closest("svg").parentElement : el.parentElement);
        if (!bg) continue;
        const cands = [];
        if (el instanceof SVGElement) {
          if (cs.fill && cs.fill !== "none") { const c = leer(cs.fill); if (c) { c[3] *= parseFloat(cs.fillOpacity || 1); cands.push(c); } }
          if (cs.stroke && cs.stroke !== "none" && parseFloat(cs.strokeWidth) > 0) { const c = leer(cs.stroke); if (c) { c[3] *= parseFloat(cs.strokeOpacity || 1); cands.push(c); } }
        } else {
          const c = leer(cs.backgroundColor); if (c && c[3]) cands.push(c);
          const sh = cs.boxShadow.match(/rgba?\([^)]+\)|color\([^)]+\)/); if (sh && cs.boxShadow.includes("inset")) { const c2 = leer(sh[0]); if (c2) cands.push(c2); }
          if (parseFloat(cs.borderTopWidth) > 0) { const c3 = leer(cs.borderTopColor); if (c3) cands.push(c3); }
        }
        if (!cands.length) continue;
        const o = opacidad(el);
        const mejor = Math.max(...cands.map((c) => ratio(sobre([c[0], c[1], c[2], c[3] * o], bg), bg)));
        if (mejor < 2.995) out.push({ tipo: "contraste de gráfico o control", donde: desc(el), texto: mejor.toFixed(2) + ":1 (mín. 3)" });
      }
      if (!estructura) return;
      // Objetivo táctil
      for (const el of document.querySelectorAll(INTERACTIVOS)) {
        // Un control transparente (checkbox de un interruptor) también es zona táctil si su contenedor se ve
        const transparente = getComputedStyle(el).opacity === "0" && el.parentElement && visible(el.parentElement);
        if (vistosTactil.has(el) || el.disabled || !(visible(el) || transparente) || !encima(el)) continue;
        vistosTactil.add(el);
        if (el.tagName === "A" && el.parentElement && getComputedStyle(el).display === "inline" && conTexto(el.parentElement)) continue;   // enlace dentro de un texto
        const [w, hh] = zonaTactil(el);
        if (w < 43.5 || hh < 43.5) out.push({ tipo: "objetivo táctil < 44×44", donde: desc(el), texto: Math.round(w) + "×" + Math.round(hh) });
      }
    });
    // Textos rotos
    const txt = (capasAbiertas().pop() || document.querySelector(".pestana.activa .pantalla:not([hidden])") || document.body).innerText;
    for (const m of ["NaN", "undefined", "[object", "Infinity"]) if (txt.includes(m)) out.push({ tipo: "texto roto", donde: m });
    if (!estructura) return out;
    // Roles y regiones vivas de los estados con capa
    if (capa && rol) {
      const c = document.querySelector(capa + " [role=" + rol + "], " + capa + "[role=" + rol + "]");
      if (!c) out.push({ tipo: "rol incorrecto", donde: capa, texto: "falta role=" + rol });
      else {
        if (c.getAttribute("aria-modal") !== "true") out.push({ tipo: "rol incorrecto", donde: capa, texto: "falta aria-modal=true" });
        const lbl = c.getAttribute("aria-label") || (c.getAttribute("aria-labelledby") && document.getElementById(c.getAttribute("aria-labelledby"))?.textContent);
        if (!lbl || !String(lbl).trim()) out.push({ tipo: "rol incorrecto", donde: capa, texto: "sin nombre (aria-label/labelledby)" });
      }
    }
    if (toast) {
      const t = document.querySelector(".toast");
      if (!t || t.getAttribute("role") !== "status" || t.getAttribute("aria-live") !== "polite") out.push({ tipo: "región viva", donde: ".toast", texto: "debe ser role=status y aria-live=polite" });
    }
    if (descanso) {
      const d = document.querySelector(".barra-descanso:not([hidden])");
      if (!d) out.push({ tipo: "región viva", donde: ".barra-descanso", texto: "no aparece el descanso" });
      else {
        if (d.getAttribute("role") !== "timer") out.push({ tipo: "región viva", donde: ".barra-descanso", texto: "debe ser role=timer" });
        const v = d.querySelector(".valor"), vivo = v && v.closest("[aria-live]");
        if (vivo && vivo.getAttribute("aria-live") !== "off") out.push({ tipo: "región viva", donde: ".barra-descanso .valor", texto: "la cuenta atrás no debe anunciarse cada segundo" });
        if (!document.querySelector("[data-anuncio-descanso][aria-live=polite]")) out.push({ tipo: "región viva", donde: "descanso", texto: "falta la región polite que anuncia el final y los últimos segundos" });
      }
    }
    return out;
  }

  /** Texto grande: desbordes horizontales, textos cortados y textos que se pisan. */
  function grande() {
    const out = [], vistos = new Set();
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push({ tipo: "desborde horizontal", donde: "documento", texto: document.documentElement.scrollWidth + " px", grave: true });
    porTramos(() => {
      const hojas = [];
      for (const el of document.querySelectorAll("body *")) {
        if (!conTexto(el) || !visible(el) || !encima(el) || el.closest(".insignia, svg, .tabbar")) continue;
        if (!vistos.has(el)) {
          vistos.add(el);
          const cs = getComputedStyle(el);
          // ¿El texto se sale de la caja del elemento que lo recorta? (no vale scrollWidth: los ::after
          // que amplían la zona táctil también cuentan como desborde)
          let corta = false;
          if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
            const rg = document.createRange(); rg.selectNodeContents(el);
            const t = rg.getBoundingClientRect(), c = el.getBoundingClientRect();
            const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
            const derecha = c.left + bl + el.clientWidth, abajo = c.top + bt + el.clientHeight;
            corta = (cs.overflowX !== "visible" && (t.right > derecha + 1 || t.left < c.left + bl - 1)) || (/hidden|clip/.test(cs.overflowY) && t.bottom > abajo + 1);
          }
          if (corta) out.push({ tipo: cs.textOverflow === "ellipsis" ? "texto truncado con «…»" : "texto cortado", donde: desc(el), grave: cs.textOverflow !== "ellipsis" });
          const r = el.getBoundingClientRect();
          // Dentro de una tira con scroll horizontal (escalera de ligas) salirse es lo esperado
          const enTira = (() => { for (let e = el.parentElement; e; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if ((o === "auto" || o === "scroll") && e.scrollWidth > e.clientWidth) return true; } return false; })();
          if (r.right > innerWidth + 1 && !enTira) out.push({ tipo: "desborde horizontal", donde: desc(el), texto: Math.round(r.right) + " px", grave: true });
        }
        hojas.push(el);
      }
      // Solapes entre textos que no se contienen (rectángulos de las líneas de texto)
      // Capa de cada texto: barra fija o contenido con scroll (pasar por debajo de una barra translúcida es normal)
      const capaDe = (el) => el.closest(".barra-nav, .modal-cab, .hoja-cab, .tabbar, .barra-descanso, .barra-entreno, .toast") || el.closest(".scroll, .hoja-cuerpo, .modal-cuerpo") || document.body;
      const cajas = hojas.map((el) => { const rg = document.createRange(); rg.selectNodeContents(el); return { el, capa: capaDe(el), rs: [...rg.getClientRects()].filter((r) => r.width > 1 && r.height > 1) }; });
      for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
        const a = cajas[i], b = cajas[j];
        if (a.capa !== b.capa || a.el.contains(b.el) || b.el.contains(a.el)) continue;
        // Las cajas de línea de dos renglones seguidos se tocan unos píxeles con interlineado ajustado:
        // solo cuenta si se pisan más de un 30 % del alto del texto más bajo
        const pisa = a.rs.some((x) => b.rs.some((y) => Math.min(x.right, y.right) - Math.max(x.left, y.left) > 2 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 0.3 * Math.min(x.height, y.height)));
        if (pisa) out.push({ tipo: "textos que se solapan", donde: desc(a.el) + " / " + desc(b.el), grave: true });
      }
    });
    return out;
  }

  /** Estado del foco tras un Tab. */
  function foco(capa) {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return null;
    const marca = (x) => { const c = getComputedStyle(x); return (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) || (c.boxShadow && c.boxShadow !== "none"); };
    // Un control nativo oculto (el checkbox de un interruptor) vale si su contenedor visible marca el foco
    const vis = visible(el) ? el : el.parentElement && visible(el.parentElement) ? el.parentElement : el;
    const r = vis.getBoundingClientRect();
    // Foco dentro de un control del navegador (p. ej. el botón de calendario de un input date en
    // Chromium): el anfitrión no está en :focus y el propio navegador pinta el anillo
    const nativo = !el.matches(":focus");
    const marcado = nativo || marca(el) || (vis !== el && marca(vis));
    // Lo que no va dentro de un contenedor con scroll (barras, cabeceras, pestañas) no cuenta para el orden
    const sc0 = el.closest(".scroll, .hoja-cuerpo, .modal-cuerpo");
    const fijo = !sc0, contenedor = sc0 ? desc(sc0) + "#" + [...document.querySelectorAll(".scroll, .hoja-cuerpo, .modal-cuerpo")].indexOf(sc0) : "";
    const sc = el.closest(".scroll, .hoja-cuerpo, .modal-cuerpo");
    const c = capa ? document.querySelector(capa) : capasAbiertas().pop();
    return { clave: desc(el) + "@" + Math.round(r.left) + "," + Math.round(r.top + (sc ? sc.scrollTop : 0)), donde: desc(el), visible: visible(vis) && r.width > 0,
      marcado, fijo, contenedor, y: r.top + (sc ? sc.scrollTop : 0), fuera: !!(c && !c.contains(el)) };
  }

  function alPrincipio() {
    const raiz = capasAbiertas().pop() || document.body;
    const m = document.createElement("div");
    m.tabIndex = -1; m.style.cssText = "position:absolute;top:0;left:0;width:1px;height:1px";
    raiz.prepend(m); m.focus({ preventScroll: true });
    setTimeout(() => m.remove(), 0);
  }

  window.__a11y = { vista, grande, foco, alPrincipio };
}

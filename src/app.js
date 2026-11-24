// Arranque: tema, datos (con la migración si hace falta), navegación y service worker.
import { crearStore } from "./store.js";
import { crearNavegacion } from "./ui/navegacion.js";
import { aplicarApariencia, leerEspejoApariencia, alCambiarTema } from "./ui/tema.js";
import { configurarHaptica } from "./ui/haptica.js";
import { prepararSonido } from "./ui/sonido.js";
import { abrirHoja, cerrarHojaAbierta, hayCapaAbierta, alerta, confirmar, hojaAcciones, toast } from "./ui/capas.js";
import { h } from "./ui/dom.js";
import { VISTAS, PESTANAS } from "./views/indice.js";
import { iniciarEntreno, modalAbierto, minimizarSiAbierto, empezarEntreno, guardarEntrenoYa } from "./views/entreno.js";

const store = crearStore();
const ctx = {
  store, abrirHoja, cerrarHoja: cerrarHojaAbierta, alerta, confirmar, hojaAcciones, toast,
  hayCapaAbierta: () => hayCapaAbierta() || modalAbierto(),
  // «atrás» del sistema con una capa abierta: se cierra la hoja y se minimiza el entrenamiento
  alAtrasSistema: () => { cerrarHojaAbierta(); minimizarSiAbierto(); return false; },
};

// el estado :active de iOS necesita un manejador de touchstart; y el audio se desbloquea en un gesto
document.addEventListener("touchstart", () => {}, { passive: true });
// En cada toque (no solo el primero): si iOS interrumpió el audio, el siguiente gesto lo reanuda
document.addEventListener("pointerdown", prepararSonido, { capture: true, passive: true });

async function arrancar() {
  aplicarApariencia(leerEspejoApariencia());
  let informe = null;
  try { informe = await store.cargar(); }
  catch (e) {
    console.error(e);
    document.getElementById("app").replaceChildren(h("div", { class: "vacio", style: { paddingTop: "30vh" } },
      h("h2", null, "No se pudieron abrir los datos"), h("p", null, String(e.message || e)), h("p", null, "Tus datos siguen guardados. Cierra la app del todo y vuelve a abrirla.")));
    return;
  }
  const a = store.estado.ajustes;
  aplicarApariencia({ tema: a.apariencia.tema, acento: a.apariencia.acento });
  configurarHaptica(a.apariencia.haptica !== false);

  const nav = crearNavegacion({ app: document.getElementById("app"), tabbar: document.getElementById("tabbar"), pestanas: PESTANAS, vistas: VISTAS, ctx });
  ctx.nav = nav;
  alCambiarTema(() => nav.refrescar());
  store.suscribir((tema) => {
    if (tema === "ajustes") { const ap = store.estado.ajustes.apariencia; aplicarApariencia({ tema: ap.tema, acento: ap.acento }); configurarHaptica(ap.haptica !== false); }
    if (tema === "borrador" && document.body.classList.contains("con-modal")) return;   // el autoguardado al teclear no repinta el fondo; se repinta al cerrar el entreno
    nav.refrescar();
    marcarAvisos(nav);
  });
  let ultimoDia = store.hoy();
  const alVolver = () => {
    if (document.visibilityState !== "visible") return;
    if (store.hoy() !== ultimoDia) { ultimoDia = store.hoy(); nav.refrescar(); marcarAvisos(nav); }
    store.reanudarNube();
  };
  document.addEventListener("visibilitychange", alVolver);
  window.addEventListener("pageshow", alVolver);
  window.addEventListener("online", () => store.reanudarNube());
  await nav.iniciar(location.hash);
  store.reanudarNube();
  marcarAvisos(nav);
  iniciarEntreno(ctx);
  store.pedirPersistencia();
  registrarSW();
  // Solo bajo Playwright, para las pruebas
  if (navigator.webdriver) window.__gym = { store, nav, toast, confirmar: ctx.confirmar, entreno: { empezar: empezarEntreno, descartar: async () => { minimizarSiAbierto(); await store.guardarBorrador(null); } } };
}

/** Preferencia de tema de la versión anterior, para conservarla al migrar. */

/** Punto rojo en Ajustes si hay problemas en los datos o toca hacer copia. */
function marcarAvisos(nav) {
  let aviso = false;
  try { aviso = store.estadoCopia().avisar || store.analisis().calidad.problemas > 0; } catch (e) {}
  nav.marcarPestana("ajustes", aviso);
}

/**
 * Service worker. Una versión nueva se instala en segundo plano y espera; la app muestra
 * «Actualización disponible · Recargar» y solo se activa cuando el usuario lo pide, después de
 * guardar el entrenamiento en curso. Al volver a la app se busca una versión nueva.
 */
function registrarSW() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  const habia = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (habia && !recargando) { recargando = true; location.reload(); } });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    const avisar = (sw) => { if (sw && navigator.serviceWorker.controller) avisoActualizacion(sw); };
    if (reg.waiting) avisar(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (sw) sw.addEventListener("statechange", () => { if (sw.state === "installed") avisar(sw); });
    });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
}

function avisoActualizacion(sw) {
  if (document.querySelector(".aviso-actualizacion")) return;
  const el = h("div", { class: "aviso-actualizacion", role: "status" },
    h("span", null, "Actualización disponible"),
    h("button", { onClick: async () => { el.querySelector("button").disabled = true; try { await guardarEntrenoYa(); } catch (e) {} sw.postMessage({ tipo: "activar" }); } }, "Recargar"));
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
}

arrancar();

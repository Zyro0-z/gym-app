// Ajustes › Datos: copia en Archivos (exportar), importar, copias internas, almacenamiento y los
// límites de la plataforma (sin sincronización ni guardado automático en iCloud).
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, stepper } from "../ui/controles.js";
import { exito } from "../ui/haptica.js";
import { fmt, plural } from "../core/formato.js";
import { fechaCorta, capital } from "../ui/textos.js";
import { csvSeries, csvPesajes } from "../core/csv.js";

/** Guarda un archivo: hoja Compartir (en iPhone, «Guardar en Archivos») o descarga. false si se cancela o falla. */
export async function guardarArchivo(app, texto, nombre, tipo) {
  const f = new File([texto], nombre, { type: tipo });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: nombre });
    else { const u = URL.createObjectURL(f); const a = h("a", { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
    return true;
  } catch (e) {
    if (e.name !== "AbortError") await app.alerta({ titulo: "No se pudo exportar", mensaje: e.message });
    return false;
  }
}

export async function exportarCopia(app) {
  const { store } = app;
  if (!(await guardarArchivo(app, store.textoCopia(), "gym-copia-" + store.hoy() + ".json", "application/json"))) return false;
  await store.marcarCopia();
  exito(); app.toast("Copia exportada");
  return true;
}

/** Elige un archivo, lo valida y, tras confirmar, sustituye los datos (los actuales quedan respaldados). */
export function importarCopia(app) {
  const input = h("input", { type: "file", accept: "application/json,.json", style: { display: "none" } });
  document.body.append(input);
  input.addEventListener("change", async () => {
    const f = input.files[0]; input.remove();
    if (!f) return;
    let m;
    try { m = app.store.leerCopia(await f.text()); }
    catch (e) { await app.alerta({ titulo: "No se pudo importar", mensaje: e.message }); return; }
    const n = app.store.estado.sesiones.length;
    const ok = !n || await app.confirmar("¿Reemplazar los datos?",
      "La copia tiene " + plural(m.sesiones.length, "sesión", "sesiones") + ". Sustituirá " + plural(n, "sesión", "sesiones") + " de este iPhone; los datos actuales se guardan aparte por si acaso.", "Reemplazar", true);
    if (!ok) return;
    await app.store.importar(m);
    exito(); app.toast("Copia importada");
  }, { once: true });
  input.click();
}

const MOTIVOS = { sesiones: "Automática", importar: "Antes de importar", restaurar: "Antes de restaurar", borrar: "Antes de borrar", migrar: "Antes de actualizar los datos" };
const tamano = (b) => (b >= 1048576 ? fmt(b / 1048576, 1) + " MB" : fmt(Math.max(1, Math.round(b / 1024))) + " KB");

/** Restaura una copia interna, tras confirmar; los datos actuales se guardan antes. */
async function restaurar(app, r) {
  const n = app.store.estado.sesiones.length;
  const ok = await app.confirmar("¿Restaurar esta copia?",
    "Los datos actuales (" + plural(n, "sesión", "sesiones") + ") se sustituyen por los de la copia del " + fechaCorta(r.fecha.slice(0, 10), app.store.hoy()) +
    " (" + plural(r.sesiones, "sesión", "sesiones") + "). Antes se guardan como copia interna.", "Restaurar", true);
  if (!ok) return false;
  try { await app.store.restaurarRespaldo(r.clave); }
  catch (e) { await app.alerta({ titulo: "No se pudo restaurar", mensaje: e.message }); return false; }
  exito(); app.toast("Copia restaurada");
  return true;
}

/** Borra todos los datos, tras confirmar; antes queda una copia interna. */
async function borrarTodo(app) {
  const n = app.store.estado.sesiones.length;
  const ok = await app.confirmar("¿Borrar todos los datos?",
    "Se borran " + plural(n, "sesión", "sesiones") + ", pesajes y rutinas de este iPhone. Se conservan los ajustes y el catálogo de ejercicios. Antes se guarda una copia interna que puedes restaurar.", "Borrar todo", true);
  if (!ok) return false;
  try { await app.store.borrarTodo(); }
  catch (e) { await app.alerta({ titulo: "No se pudo borrar", mensaje: e.message }); return false; }
  exito(); app.toast("Datos borrados");
  return true;
}

/** Borra el historial (sesiones y pesajes) y deja rutinas y ejercicios; antes queda una copia interna. */
async function borrarHistorial(app) {
  const n = app.store.estado.sesiones.length;
  const ok = await app.confirmar("¿Borrar el historial?",
    "Se borran " + plural(n, "sesión", "sesiones") + " y pesajes. Se conservan las rutinas, los ejercicios (con sus músculos) y los ajustes. Antes se guarda una copia interna.", "Borrar historial", true);
  if (!ok) return false;
  try { await app.store.borrarHistorial(); }
  catch (e) { await app.alerta({ titulo: "No se pudo borrar", mensaje: e.message }); return false; }
  exito(); app.toast("Historial borrado");
  return true;
}

export function vistaDatos(_p, app) {
  const { store } = app;
  let almacen = null, internas = null;
  const recargar = () => Promise.all([store.estadoAlmacen(), store.listarRespaldos()]).then(([a, r]) => { almacen = a; internas = r; app.nav.repintarActual(); });
  return {
    titulo: "Datos",
    alMostrar() { recargar(); },
    render(c) {
      const ec = store.estadoCopia(), est = store.estado, hoy = store.hoy();
      const pieCopia = ec.nunca ? "Aún no has guardado ninguna copia fuera de este iPhone."
        : "Última copia exportada: " + fechaCorta(ec.fecha, hoy) + (ec.nuevas ? " · " + plural(ec.nuevas, "sesión nueva", "sesiones nuevas") + " desde entonces" : "") + ".";
      const mb = almacen && almacen.usado != null ? tamano(almacen.usado) : "—";
      const cada = (est.ajustes.copiasInternas && est.ajustes.copiasInternas.cada) || 5;
      poner(c,
        seccion({ cab: "Copia en Archivos", pie: pieCopia }, lista([
          celda({ icono: "compartir", colorIcono: "var(--g-azul)", titulo: "Guardar copia en Archivos", estilo: "accion", alPulsar: async () => { if (await exportarCopia(app)) recargar(); },
            valor: ec.avisar ? h("span", { class: "chip bad" }, h("span", { class: "punto" }), "Pendiente") : null }),
          celda({ icono: "descargar", colorIcono: "var(--g-verde)", titulo: "Importar copia", estilo: "accion", alPulsar: () => importarCopia(app) }),
        ], { iconos: true })),
        seccion({ cab: "Copias internas", pie: "Se guardan solas en este iPhone cada " + plural(cada, "sesión nueva", "sesiones nuevas") + " y antes de importar o restaurar; se conservan las 3 últimas. No sustituyen a la copia en Archivos: si se borran los datos de la app, se borran con ellas." },
          lista([
            ...(internas === null ? [celda({ titulo: "Cargando…" })] : !internas.length ? [celda({ titulo: "Aún no hay copias internas" })]
              : internas.map((r) => celda({ titulo: (MOTIVOS[r.motivo] || "Copia") + (r.clave === "respaldo-importacion" ? " (última importación)" : ""),
                sub: (r.fecha ? capital(fechaCorta(r.fecha.slice(0, 10), hoy)) + " " + r.fecha.slice(11, 16) + " · " : "") + plural(r.sesiones, "sesión", "sesiones") + " · " + tamano(r.bytes),
                valor: "Restaurar", alPulsar: async () => { if (await restaurar(app, r)) recargar(); } }))),
            celda({ titulo: "Copia interna cada", control: stepper({ valor: cada, min: 1, max: 30, formato: (v) => plural(v, "sesión", "sesiones"), etiqueta: "sesiones entre copias internas",
              alCambiar: (v) => store.guardarAjustes((a) => { a.copiasInternas = { cada: v }; }, { analitico: false }) }) }),
          ])),
        seccion({ cab: "Hojas de cálculo" }, lista([
          celda({ titulo: "Exportar series (CSV)", estilo: "accion", alPulsar: async () => { if (await guardarArchivo(app, csvSeries(store.estado.sesiones, store.estado.catalogo, store.estado.ajustes), "gym-series-" + store.hoy() + ".csv", "text/csv")) app.toast("CSV exportado"); } }),
          celda({ titulo: "Exportar pesajes (CSV)", estilo: "accion", alPulsar: async () => { if (await guardarArchivo(app, csvPesajes(store.estado.pesajes, store.estado.ajustes), "gym-pesajes-" + store.hoy() + ".csv", "text/csv")) app.toast("CSV exportado"); } }),
        ])),
        seccion({ cab: "Almacenamiento", pie: almacen && almacen.persistente === false ? "El sistema podría borrar los datos si falta espacio. Añadir la app a la pantalla de inicio y abrirla desde ahí lo evita." : null }, lista([
          celda({ titulo: "Almacenamiento persistente", valor: !almacen ? "…" : almacen.persistente ? "Concedido" : almacen.persistente === false ? "No concedido" : "Desconocido" }),
          celda({ titulo: "Espacio usado", valor: mb }),
          celda({ titulo: "Sesiones", valor: String(est.sesiones.length) }),
          celda({ titulo: "Pesajes", valor: String(est.pesajes.length) }),
        ])),
        seccion({ cab: "Borrar", pie: "Exporta antes una copia en Archivos: la copia interna se pierde si desinstalas la app." }, lista([
          celda({ titulo: "Borrar historial (conserva rutinas y tablas)", estilo: "destructiva", alPulsar: async () => { if (await borrarHistorial(app)) recargar(); } }),
          celda({ titulo: "Borrar todos los datos", estilo: "destructiva", alPulsar: async () => { if (await borrarTodo(app)) recargar(); } }),
        ])),
        seccion({ cab: "Sincronización", pie: "Los datos viven solo en este iPhone. Para pasarlos a otro dispositivo, importa allí una copia guardada en Archivos." }),
      );
    },
  };
}
vistaDatos.pestana = "ajustes";

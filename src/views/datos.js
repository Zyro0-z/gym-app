// Ajustes › Datos: estado del almacenamiento, exportar e importar la copia de seguridad.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda } from "../ui/controles.js";
import { exito } from "../ui/haptica.js";
import { fmt, plural } from "../core/formato.js";
import { fechaCorta } from "../ui/textos.js";

/** Exporta la copia (hoja de compartir del sistema o descarga). true si se hizo. */
export async function exportarCopia(app) {
  const { store } = app;
  const txt = store.textoCopia(), nombre = "gym-copia-" + store.hoy() + ".json";
  const f = new File([txt], nombre, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: nombre });
    else { const u = URL.createObjectURL(f); const a = h("a", { href: u, download: nombre }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
  } catch (e) {
    if (e.name !== "AbortError") await app.alerta({ titulo: "No se pudo exportar", mensaje: e.message });
    return false;
  }
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

export function vistaDatos(_p, app) {
  const { store } = app;
  let almacen = null;
  return {
    titulo: "Datos",
    alMostrar() { if (!almacen) store.estadoAlmacen().then((r) => { almacen = r; app.nav.repintarActual(); }); },
    render(c) {
      const ec = store.estadoCopia(), est = store.estado;
      const pieCopia = ec.nunca ? "Aún no has hecho ninguna copia. Tus datos solo están en este iPhone."
        : "Última copia: " + fechaCorta(ec.fecha, store.hoy()) + (ec.nuevas ? " · " + plural(ec.nuevas, "sesión nueva", "sesiones nuevas") + " desde entonces" : "");
      const mb = almacen && almacen.usado != null ? fmt(almacen.usado / 1048576, 1) + " MB" : "—";
      poner(c, 
        seccion({ cab: "Copia de seguridad", pie: pieCopia }, lista([
          celda({ icono: "compartir", colorIcono: "var(--g-azul)", titulo: "Exportar copia", estilo: "accion", alPulsar: () => exportarCopia(app),
            valor: ec.avisar ? h("span", { class: "chip bad" }, h("span", { class: "punto" }), "Pendiente") : null }),
          celda({ icono: "descargar", colorIcono: "var(--g-verde)", titulo: "Importar copia", estilo: "accion", alPulsar: () => importarCopia(app) }),
        ], { iconos: true })),
        seccion({ cab: "Almacenamiento", pie: almacen && almacen.persistente === false ? "El sistema puede borrar los datos si falta espacio. Añadir la app a la pantalla de inicio lo evita." : null }, lista([
          celda({ titulo: "Estado", valor: !almacen ? "…" : almacen.persistente ? "Persistente" : almacen.persistente === false ? "Puede borrarse" : "Desconocido" }),
          celda({ titulo: "Espacio usado", valor: mb }),
          celda({ titulo: "Sesiones", valor: String(est.sesiones.length) }),
          celda({ titulo: "Pesajes", valor: String(est.pesajes.length) }),
        ])),
      );
    },
  };
}
vistaDatos.pestana = "ajustes";

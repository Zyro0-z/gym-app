// Ajustes › Avanzado: ligas, estándares y versión instalada.
import { versionInstalada } from "../../ui/version.js";
import { VERSION } from "../ajustes.js";
import { h, poner } from "../../ui/dom.js";
import { exito } from "../../ui/haptica.js";
import { leerTablas, fusionarTablas } from "../../core/estandares.js";
import { seccion, lista, celda, interruptor } from "../../ui/controles.js";
import { fmt, plural } from "../../core/formato.js";
import { fila } from "./comun.js";

/* ---------- Avanzado ---------- */

/** Elige un archivo de tablas de estándares y, tras confirmar, las fusiona con las actuales. */
function importarTablas(app) {
  const input = h("input", { type: "file", accept: "application/json,.json", style: { display: "none" } });
  document.body.append(input);
  input.addEventListener("change", async () => {
    const f = input.files[0]; input.remove();
    if (!f) return;
    let t;
    try { t = leerTablas(await f.text()); }
    catch (e) { await app.alerta({ titulo: "No se pudo importar", mensaje: e.message }); return; }
    const k = Object.keys(t), ya = k.filter((x) => (app.store.estado.ajustes.estandares || {})[x]).length;
    const ok = await app.confirmar("¿Importar tablas?", plural(k.length, "tabla", "tablas") + (ya ? "; " + plural(ya, "sustituye a una existente", "sustituyen a las existentes") + " con el mismo nombre." : "."), "Importar", false);
    if (!ok) return;
    await app.store.guardarAjustes((a) => { a.estandares = fusionarTablas(a.estandares, t); });
    exito(); app.toast("Tablas importadas");
  }, { once: true });
  input.click();
}

export function vistaAvanzado(_p, app) {
  const { store } = app;
  let version;
  return {
    titulo: "Avanzado",
    alMostrar() { if (version === undefined) versionInstalada().then((v) => { version = v; app.nav.repintarActual(); }); },
    render(c) {
      const L = store.estado.ajustes.ligas, est = store.estado.ajustes.estandares || {};
      const escala = L.escala || [];
      poner(c,
        seccion({ pie: escala.length ? "Compara tu fuerza con tablas de estándares según tu peso corporal." : "No hay escala de ligas: importa una copia que la incluya." }, lista([
          celda({ titulo: "Ligas", control: interruptor(!!L.activa && escala.length > 0, (v) => store.guardarAjustes((a) => { a.ligas.activa = v; }), "Ligas") }),
        ])),
        escala.length ? seccion({ cab: "Parámetros" }, lista([
          celda({ titulo: "Puntos por división", valor: fmt(L.puntos, 1) }),
          celda({ titulo: "Margen para bajar", valor: fmt(L.margen, 1) }),
          celda({ titulo: "Semanas de carga", valor: String(L.semCarga) }),
          celda({ titulo: "Semanas de series", valor: String(L.semSeries) }),
          celda({ titulo: "Corrección de polea", valor: "×" + fmt(L.correccionPolea, 2) }),
        ])) : null,
        escala.length ? seccion({ cab: "Escala" }, lista(escala.map((x) => celda({ titulo: x.nombre, valor: fmt(x.desde, 0) + (x.hasta == null ? "+" : "–" + fmt(x.hasta, 0)) + (x.ndiv ? " · " + x.ndiv + " div." : "") })))) : null,
        seccion({ cab: "Tablas de estándares", pie: Object.keys(est).length ? "Asigna una tabla a cada ejercicio desde su ficha." : "Sin tablas. Importa un archivo con tablas de estándares." }, lista([
          celda({ icono: "descargar", colorIcono: "var(--g-verde)", titulo: "Importar tablas", estilo: "accion", alPulsar: () => importarTablas(app) }),
        ])),
        Object.keys(est).length ? seccion({}, lista(Object.keys(est).sort().map((k) => {
          const n = store.estado.catalogo.filter((x) => x.estandar && x.estandar.slug === k).length;
          return celda({ titulo: k, sub: plural(est[k].length, "fila", "filas"), valor: n ? plural(n, "ejercicio", "ejercicios") : null });
        }))) : null,
        seccion({ cab: "Versión", pie: "La versión instalada cambia con cada publicación. Si no coincide con la publicada, cierra la app del todo y vuelve a abrirla." }, lista([
          celda({ titulo: "App", valor: VERSION }),
          celda({ titulo: "Instalada", valor: version === undefined ? "…" : version || "Sin service worker" }),
        ])));
    },
  };
}
vistaAvanzado.pestana = "ajustes";

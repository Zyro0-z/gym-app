// Ajustes › Avanzado: versión instalada.
import { versionInstalada } from "../../ui/version.js";
import { VERSION } from "../ajustes.js";
import { poner } from "../../ui/dom.js";
import { seccion, lista, celda } from "../../ui/controles.js";

export function vistaAvanzado(_p, app) {
  let version;
  return {
    titulo: "Avanzado",
    alMostrar() { if (version === undefined) versionInstalada().then((v) => { version = v; app.nav.repintarActual(); }); },
    render(c) {
      poner(c,
        seccion({ cab: "Versión", pie: "La versión instalada cambia con cada publicación. Si no coincide con la publicada, cierra la app del todo y vuelve a abrirla." }, lista([
          celda({ titulo: "App", valor: VERSION }),
          celda({ titulo: "Instalada", valor: version === undefined ? "…" : version || "Sin service worker" }),
        ])));
    },
  };
}
vistaAvanzado.pestana = "ajustes";

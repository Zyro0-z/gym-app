// Ajustes: «¿cómo lo cambio?». Lista de apartados con icono en cuadro de color.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, segmentado, interruptor } from "../ui/controles.js";
import { icono } from "../ui/iconos.js";
import { plural } from "../core/formato.js";
import { temaEfectivo } from "../ui/tema.js";

export const VERSION = "2.0";

export function vistaAjustes(_p, app) {
  const { store } = app;
  return {
    titulo: "Ajustes",
    render(c) {
      const est = store.estado, ec = store.estadoCopia();
      let problemas = 0;
      try { problemas = store.analisis().calidad.problemas; } catch (e) {}
      const avisos = (ec.avisar ? 1 : 0) + (problemas ? 1 : 0);
      poner(c, 
        seccion({}, lista([
          celda({ icono: "apariencia", colorIcono: "var(--g-azul)", titulo: "Apariencia", chevron: true, alPulsar: () => app.nav.ir("apariencia") }),
        ], { iconos: true })),
        seccion({}, lista([
          celda({ icono: "datos", colorIcono: "var(--tab-off)", titulo: "Datos", valor: avisos ? h("span", { class: "chip bad" }, h("span", { class: "punto" }), plural(avisos, "aviso", "avisos")) : null, chevron: true, alPulsar: () => app.nav.ir("datos") }),
        ], { iconos: true })),
        h("p", { class: "pie-app" }, "Versión " + VERSION + " · " + plural(est.sesiones.length, "sesión", "sesiones")),
      );
    },
  };
}

const TEMAS = [{ valor: "auto", texto: "Automático" }, { valor: "claro", texto: "Claro" }, { valor: "oscuro", texto: "Oscuro" }];
const ACENTOS = [["azul", "Azul"], ["indigo", "Índigo"], ["morado", "Morado"], ["rosa", "Rosa"], ["rojo", "Rojo"], ["naranja", "Naranja"], ["verde", "Verde"], ["grafito", "Grafito"]];
const COLOR_ACENTO = {
  light: { azul: "#007AFF", indigo: "#5856D6", morado: "#AF52DE", rosa: "#FF2D55", rojo: "#FF3B30", naranja: "#FF9500", verde: "#34C759", grafito: "#8E8E93" },
  dark: { azul: "#0A84FF", indigo: "#5E5CE6", morado: "#BF5AF2", rosa: "#FF375F", rojo: "#FF453A", naranja: "#FF9F0A", verde: "#30D158", grafito: "#98989D" },
};

export function vistaApariencia(_p, app) {
  const { store } = app;
  const guardar = (f) => store.guardarAjustes((a) => f(a.apariencia), { analitico: false });
  return {
    titulo: "Apariencia",
    render(c) {
      const ap = store.estado.ajustes.apariencia;
      poner(c, 
        seccion({ cab: "Tema" }, lista([h("div", { class: "celda" }, h("div", { style: { flex: "1", padding: "8px 0" } },
          segmentado(TEMAS, ap.tema || "auto", (v) => guardar((x) => { x.tema = v; }), { etiqueta: "Tema" })))])),
        seccion({ cab: "Color de acento" }, lista([h("div", { class: "acentos", role: "radiogroup", "aria-label": "Color de acento" }, ACENTOS.map(([k, n]) =>
          h("button", { class: "circulo-acento", role: "radio", "aria-checked": String((ap.acento || "azul") === k), "aria-label": n,
            style: { background: COLOR_ACENTO[temaEfectivo()][k], color: COLOR_ACENTO[temaEfectivo()][k] }, onClick: () => guardar((x) => { x.acento = k; }) },
            (ap.acento || "azul") === k ? icono("check") : null)))])),
        seccion({ pie: "Un toque suave al marcar series, cambiar valores y terminar el descanso." }, lista([
          celda({ titulo: "Háptica", control: interruptor(ap.haptica !== false, (v) => guardar((x) => { x.haptica = v; }), "Háptica") }),
        ])),
      );
    },
  };
}
vistaApariencia.pestana = "ajustes";

// Ajustes: «¿cómo lo cambio?». Lista de apartados con icono en cuadro de color.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, segmentado, interruptor } from "../ui/controles.js";
import { icono } from "../ui/iconos.js";
import { plural } from "../core/formato.js";
import { temaEfectivo } from "../ui/tema.js";

export const VERSION = "3.0";

export function vistaAjustes(_p, app) {
  const { store } = app;
  return {
    titulo: "Ajustes",
    render(c) {
      const est = store.estado, ec = store.estadoCopia();
      let problemas = 0;
      try { problemas = store.analisis().calidad.problemas; } catch (e) {}
      poner(c, 
        seccion({}, lista([
          celda({ icono: "lista", colorIcono: "var(--tab-off)", titulo: "Rutinas", valor: est.rutinas.length ? String(est.rutinas.length) : null, chevron: true, alPulsar: () => app.nav.ir("rutinas") }),
          celda({ icono: "calendario", colorIcono: "var(--tab-off)", titulo: "Horario", chevron: true, alPulsar: () => app.nav.ir("horario") }),
          celda({ icono: "pesa", colorIcono: "var(--tab-off)", titulo: "Ejercicios", valor: est.catalogo.length ? String(est.catalogo.length) : null, chevron: true, alPulsar: () => app.nav.ir("ejercicios") }),
          celda({ icono: "cronometro", colorIcono: "var(--tab-off)", titulo: "Entrenamiento", chevron: true, alPulsar: () => app.nav.ir("entrenamiento") }),
        ], { iconos: true })),
        seccion({}, lista([
          celda({ icono: "diana", colorIcono: "var(--tab-off)", titulo: "Objetivos", chevron: true, alPulsar: () => app.nav.ir("objetivos") }),
          celda({ icono: "bascula", colorIcono: "var(--tab-off)", titulo: "Peso corporal", chevron: true, alPulsar: () => app.nav.ir("cuerpo") }),
          celda({ icono: "capas", colorIcono: "var(--tab-off)", titulo: "Bloques", chevron: true, alPulsar: () => app.nav.ir("bloques") }),
          celda({ icono: "calendario", colorIcono: "var(--tab-off)", titulo: "Mesociclos", valor: (est.ajustes.mesociclos || []).length ? String(est.ajustes.mesociclos.length) : null, chevron: true, alPulsar: () => app.nav.ir("mesociclos") }),
          celda({ icono: "cuerpo", colorIcono: "var(--tab-off)", titulo: "Grupos musculares", chevron: true, alPulsar: () => app.nav.ir("grupos") }),
        ], { iconos: true })),
        seccion({}, lista([
          celda({ icono: "apariencia", colorIcono: "var(--tab-off)", titulo: "Apariencia", chevron: true, alPulsar: () => app.nav.ir("apariencia") }),
        ], { iconos: true })),
        seccion({}, lista([
          celda({ icono: "datos", colorIcono: "var(--tab-off)", titulo: "Datos", valor: ec.avisar ? h("span", { class: "chip bad" }, h("span", { class: "punto" }), "Copia pendiente") : null, chevron: true, alPulsar: () => app.nav.ir("datos") }),
          celda({ icono: "escudo", colorIcono: "var(--tab-off)", titulo: "Calidad de los datos", valor: problemas ? h("span", { class: "chip bad" }, h("span", { class: "punto" }), plural(problemas, "aviso", "avisos")) : null, chevron: true, alPulsar: () => app.nav.ir("calidad") }),
          celda({ icono: "ajustar", colorIcono: "var(--tab-off)", titulo: "Avanzado", chevron: true, alPulsar: () => app.nav.ir("avanzado") }),
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

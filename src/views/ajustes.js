// Ajustes: «¿cómo lo cambio?». Lista de apartados con icono en cuadro de color.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, segmentado, interruptor } from "../ui/controles.js";
import { icono } from "../ui/iconos.js";
import { plural, fmt } from "../core/formato.js";
import { canon } from "../core/nombres.js";
import { temaEfectivo, paletaDe, ACENTOS_CALC, COLOR_PERSONAL, ESCALAS_MAPA, NOMBRES_ESCALA } from "../ui/tema.js";

export const VERSION = "3.0";

export function vistaAjustes(_p, app) {
  const { store } = app;
  return {
    titulo: "Ajustes", sobre: "Configuración",
    cabDerecha: () => h("span", { class: "pie-mini" }, "v" + VERSION + " PWA"),
    render(c) {
      const est = store.estado, ec = store.estadoCopia();
      let problemas = 0;
      try { problemas = store.analisis().calidad.problemas; } catch (e) {}
      const ap = est.ajustes.apariencia || {}, TNOM = { auto: "Automático", claro: "Claro", oscuro: "Oscuro" }, ANOM = Object.fromEntries(ACENTOS);
      let diasEnt = 0;
      try { const H = store.analisis().C.horario; diasEnt = [1, 2, 3, 4, 5, 6, 7].filter((d) => { const r = H.get(d); return r && canon(r) !== "descanso"; }).length; } catch (e) {}
      const pes = est.pesajes.length ? est.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0] : null;
      const descanso = est.ajustes.entreno && est.ajustes.entreno.descanso;
      const grupo = (titulo, ...celdas) => seccion({ cab: titulo }, lista(celdas, { iconos: true }));
      const banner = ec.avisar ? h("div", { class: "seccion compacta" }, h("button", { class: "tira-aviso roja", "aria-label": "Copia de seguridad pendiente", onClick: () => app.nav.ir("datos") },
        h("span", { class: "ico" }, icono("datos")), h("span", { class: "txt" }, h("b", null, "Copia local pendiente"), h("span", null, plural(est.sesiones.length, "sesión", "sesiones") + (problemas ? " · " + plural(problemas, "aviso", "avisos") + " de calidad" : ""))), h("span", { class: "acto" }, "Guardar"))) : null;
      poner(c, banner,
        grupo("Entrenamiento",
          celda({ icono: "lista", colorIcono: "var(--g-naranja)", titulo: "Rutinas", valor: est.rutinas.length ? String(est.rutinas.length) : null, chevron: true, alPulsar: () => app.nav.ir("rutinas") }),
          celda({ icono: "calendario", colorIcono: "var(--g-azul)", titulo: "Horario semanal", valor: diasEnt ? plural(diasEnt, "día", "días") : null, chevron: true, alPulsar: () => app.nav.ir("horario") }),
          celda({ icono: "pesa", colorIcono: "var(--g-morado)", titulo: "Ejercicios", valor: est.catalogo.length ? String(est.catalogo.length) : null, chevron: true, alPulsar: () => app.nav.ir("ejercicios") }),
          celda({ icono: "cronometro", colorIcono: "var(--g-verde)", titulo: "Entrenamiento", valor: descanso > 0 ? descanso + " s" : null, chevron: true, alPulsar: () => app.nav.ir("entrenamiento") })),
        grupo("Planificación y biometría",
          celda({ icono: "diana", colorIcono: "var(--g-verde)", titulo: "Objetivos", chevron: true, alPulsar: () => app.nav.ir("objetivos") }),
          celda({ icono: "bascula", colorIcono: "var(--g-rosa)", titulo: "Peso corporal", valor: pes ? fmt(pes.kg, 1) + " kg" : null, chevron: true, alPulsar: () => app.nav.ir("cuerpo") }),
          celda({ icono: "capas", colorIcono: "var(--g-indigo)", titulo: "Bloques", chevron: true, alPulsar: () => app.nav.ir("bloques") }),
          celda({ icono: "cuerpo", colorIcono: "var(--g-naranja)", titulo: "Grupos musculares", chevron: true, alPulsar: () => app.nav.ir("grupos") })),
        grupo("Sistema y datos",
          celda({ icono: "apariencia", colorIcono: "var(--g-azul)", titulo: "Apariencia", valor: (TNOM[ap.tema || "auto"] || "Automático") + " · " + (ANOM[ap.acento || "azul"] || "Azul"), chevron: true, alPulsar: () => app.nav.ir("apariencia") }),
          celda({ icono: "datos", colorIcono: "var(--g-rojo, var(--bad))", titulo: "Datos", valor: ec.avisar ? h("span", { class: "chip bad" }, h("span", { class: "punto" }), "Copia pendiente") : null, chevron: true, alPulsar: () => app.nav.ir("datos") }),
          celda({ icono: "escudo", colorIcono: "var(--g-naranja)", titulo: "Calidad de los datos", valor: problemas ? h("span", { class: "chip warn" }, h("span", { class: "punto" }), plural(problemas, "aviso", "avisos")) : null, chevron: true, alPulsar: () => app.nav.ir("calidad") }),
          celda({ icono: "ajustar", colorIcono: "var(--tab-off)", titulo: "Avanzado", chevron: true, alPulsar: () => app.nav.ir("avanzado") })),
        h("p", { class: "pie-app" }, "Versión " + VERSION + " · " + plural(est.sesiones.length, "sesión", "sesiones")),
      );
    },
  };
}

const TEMAS = [{ valor: "auto", texto: "Automático" }, { valor: "claro", texto: "Claro" }, { valor: "oscuro", texto: "Oscuro" }];
const ACENTOS = [["azul", "Azul"], ["indigo", "Índigo"], ["marino", "Marino"], ["turquesa", "Turquesa"], ["verde", "Verde"], ["oro", "Oro"],
  ["naranja", "Naranja"], ["rojo", "Rojo"], ["rosa", "Rosa"], ["fucsia", "Fucsia"], ["morado", "Morado"], ["grafito", "Grafito"]];
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
        seccion({ cab: "Color de acento" }, lista([h("div", { class: "acentos", role: "radiogroup", "aria-label": "Color de acento" },
          ACENTOS.map(([k, n]) => {
            const col = ACENTOS_CALC[k] ? paletaDe(ACENTOS_CALC[k]).l[0] : COLOR_ACENTO[temaEfectivo()][k];
            return h("button", { class: "circulo-acento", role: "radio", "aria-checked": String((ap.acento || "azul") === k), "aria-label": n,
              style: { background: col, color: col }, onClick: () => guardar((x) => { x.acento = k; }) }, (ap.acento || "azul") === k ? icono("check") : null);
          }),
          selectorColor("Color personalizado", ap.acentoColor || COLOR_PERSONAL, ap.acento === "personal", (v) => guardar((x) => { x.acento = "personal"; x.acentoColor = v; }), "circulo-acento personal"))])),
        seccion({ cab: "Mapa corporal" }, lista([
          h("div", { class: "escalas", role: "radiogroup", "aria-label": "Colores del mapa corporal" },
            Object.keys(ESCALAS_MAPA).map((k) => {
              const on = (ap.mapa || "termico") === k;
              return h("button", { class: "escala", role: "radio", "aria-checked": String(on), "aria-label": NOMBRES_ESCALA[k], onClick: () => guardar((x) => { x.mapa = k; }) },
                h("span", { class: "escala-barra", style: { background: "linear-gradient(90deg," + ESCALAS_MAPA[k].join(",") + ")" } }), on ? h("span", { class: "escala-ok" }, icono("check")) : null);
            }))])),
        seccion({ pie: "Un toque suave al marcar series, cambiar valores y terminar el descanso." }, lista([
          celda({ titulo: "Háptica", control: interruptor(ap.haptica !== false, (v) => guardar((x) => { x.haptica = v; }), "Háptica") }),
        ])),
      );
    },
  };
}
vistaApariencia.pestana = "ajustes";

/** Círculo que abre el selector de color del sistema; guarda al soltar (evento `change`, no en cada arrastre). */
function selectorColor(nombre, valor, activo, alElegir, clase) {
  const inp = h("input", { type: "color", value: valor, "aria-label": nombre, onChange: (e) => alElegir(e.target.value) });
  return h("label", { class: clase + (activo ? " activo" : ""), style: { background: valor, "--elegido": valor }, "aria-checked": activo ? "true" : null }, inp, activo ? icono("check") : null);
}

// Guía del sistema de diseño (#/guia, oculta): todos los componentes, en claro y en oscuro.
import { h, poner } from "../ui/dom.js";
import { icono, NOMBRES_ICONOS } from "../ui/iconos.js";
import { seccion, lista, celda, segmentado, stepper, interruptor, chip, vacio, boton, anillo, barrita } from "../ui/controles.js";
import { graficaBarras, graficaLinea, sparkline } from "../ui/graficas.js";
import { mapaCalor } from "../ui/calor.js";
import { diagramaCuerpo } from "../ui/cuerpo.js";
import { insignia, nombresLigas } from "../ui/insignias.js";
import { aplicarApariencia, temaEfectivo } from "../ui/tema.js";
import { kg, fechaCorta } from "../ui/textos.js";
import { masDias, numDia, deNum } from "../core/fechas.js";

export function vistaGuia(_p, app) {
  let reps = 8, interr = true, seg = "1M";
  const restaurar = () => { const ap = app.store.estado.ajustes.apariencia; aplicarApariencia({ tema: ap.tema, acento: ap.acento }); };
  return {
    titulo: "Guía",
    grande: true,
    alOcultar: restaurar,
    render(c) {
      const hoy = app.store.hoy();
      const tema = temaEfectivo() === "dark" ? "oscuro" : "claro";
      const colores = ["--bg", "--bg-grouped", "--cell", "--cell-2", "--fill", "--label", "--label-2", "--label-3", "--separator", "--accent", "--ok", "--warn", "--bad"];
      const textos = [["t-large", "Large Title 34"], ["t-title1", "Title 1 · 28"], ["t-title2", "Title 2 · 22"], ["t-title3", "Title 3 · 20"], ["t-headline", "Headline · 17"],
        ["t-body", "Body · 17"], ["t-callout", "Callout · 16"], ["t-subhead", "Subhead · 15"], ["t-footnote", "Footnote · 13"], ["t-caption1", "Caption 1 · 12"], ["t-caption2", "Caption 2 · 11"]];
      const puntos = Array.from({ length: 24 }, (_, i) => ({ x: numDia(masDias(hoy, -i * 4)), y: 80 + Math.sin(i / 3) * 4 + i * 0.4 })).reverse()
        .map((p) => ({ ...p, detalle: fechaCorta(deNum(p.x)) }));
      poner(c, 
        seccion({ cab: "Tema de esta página" }, segmentado([{ valor: "claro", texto: "Claro" }, { valor: "oscuro", texto: "Oscuro" }], tema,
          (v) => { document.documentElement.dataset.theme = v === "oscuro" ? "dark" : "light"; app.nav.repintarActual(); }, { etiqueta: "Tema" })),
        seccion({ cab: "Colores" }, h("div", { class: "muestra" }, colores.map((v) => h("div", { style: { background: `var(${v})`, color: v === "--label" || v === "--accent" || v === "--ok" || v === "--warn" || v === "--bad" ? "var(--bg)" : "var(--label)", boxShadow: "inset 0 0 0 .5px var(--separator)" } }, v.slice(2))))),
        seccion({ cab: "Tipografía" }, h("div", { class: "tarjeta pila" }, textos.map(([k, t]) => h("div", { class: k }, t)))),
        seccion({ cab: "Iconos · trazo 1,75" }, h("div", { class: "tarjeta rejilla-iconos" }, NOMBRES_ICONOS.map((n) => h("div", { title: n }, icono(n), h("span", null, n))))),
        seccion({ cab: "Botones" }, h("div", { class: "pila", style: { gap: "10px" } },
          boton("Empezar", () => {}, { icono: "play" }), boton("Otra rutina", () => {}, { estilo: "gris" }), boton("Borrar sesión", () => {}, { estilo: "peligro" }),
          h("div", { class: "fila" }, boton("Añadir", () => {}, { peq: true, icono: "mas" }), boton("Ver todo", () => {}, { peq: true, estilo: "gris" }), boton("Enlace", () => {}, { estilo: "texto", peq: true })))),
        seccion({ cab: "Lista", pie: "Pie de grupo de una línea." }, lista([
          celda({ icono: "lista", colorIcono: "var(--g-naranja)", titulo: "Rutinas", valor: "5", chevron: true, alPulsar: () => {} }),
          celda({ icono: "pesa", colorIcono: "var(--g-azul)", titulo: "Ejercicios", sub: "33 en el catálogo", chevron: true, alPulsar: () => {} }),
          celda({ icono: "vibrar", colorIcono: "var(--g-rosa)", titulo: "Háptica", control: interruptor(interr, (v) => { interr = v; }, "Háptica") }),
          celda({ icono: "repetir", colorIcono: "var(--g-verde)", titulo: "Repeticiones", control: stepper({ valor: reps, min: 1, max: 30, alCambiar: (v) => { reps = v; }, etiqueta: "repeticiones" }) }),
          celda({ icono: "check", colorIcono: "var(--g-indigo)", titulo: "Seleccionada", check: true, alPulsar: () => {} }),
          celda({ icono: "papelera", colorIcono: "var(--bad)", titulo: "Desliza a la izquierda", sub: "Deslizar para borrar", alBorrar: () => app.toast("Borrado (ejemplo)") }),
        ], { iconos: true })),
        seccion({ cab: "Segmentado y chips" }, h("div", { class: "pila", style: { gap: "14px" } },
          segmentado(["1M", "3M", "6M", "Todo"].map((v) => ({ valor: v, texto: v })), seg, (v) => { seg = v; }, { etiqueta: "Periodo" }),
          h("div", { class: "fila", style: { flexWrap: "wrap", gap: "14px" } }, chip("Progresa", "ok", { icono: "sube" }), chip("Estancado", "warn", { icono: "igual" }), chip("Retrocede", "bad", { icono: "baja" }), chip("Deload", "accent"), chip("Sin datos")))),
        seccion({ cab: "Anillo, barra y sparkline" }, h("div", { class: "tarjeta fila entre" },
          anillo({ frac: 0.62, tam: 64, grosor: 8, centro: h("span", { class: "t-footnote num" }, "62 %") }),
          anillo({ frac: 1, tam: 44, grosor: 6, ok: true }),
          h("div", { style: { flex: 1 } }, barrita(0.7), h("div", { style: { height: "10px" } }), barrita(0.35, "var(--warn)")),
          sparkline([3, 5, 4, 6, 7, 6, 8, 9]))),
        seccion({ cab: "Gráfica de barras" }, h("div", { class: "tarjeta" },
          h("div", { class: "resumen-grafica" }, h("div", { class: "etiqueta" }, "Media"), h("div", { class: "cifra" }, "24.800", h("span", { class: "ud" }, " kg"))),
          graficaBarras({ datos: [18, 22, 25, 21, 27, 24, 29, 31].map((v, i) => ({ etiqueta: fechaCorta(masDias(hoy, (i - 7) * 7)).replace(/ \w+$/, ""), valor: v * 1000, activa: i === 7 })), formato: (v) => kg(v) }))),
        seccion({ cab: "Barras apiladas y banda objetivo" }, h("div", { class: "tarjeta" },
          graficaBarras({ datos: [10, 14, 12, 16, 9, 15].map((v, i) => ({ etiqueta: "S" + (i + 1), partes: [{ valor: v * 0.5, color: "var(--g-rosa)" }, { valor: v * 0.3, color: "var(--g-azul)" }, { valor: v * 0.2, color: "var(--g-verde)" }] })), banda: [12, 16], alto: 160 }))),
        seccion({ cab: "Línea con área" }, h("div", { class: "tarjeta" },
          h("div", { class: "resumen-grafica" }, h("div", { class: "etiqueta" }, "e1RM"), h("div", { class: "cifra c-accent" }, "95,2", h("span", { class: "ud" }, " kg"))),
          graficaLinea({ puntos, ejeX: (n) => fechaCorta(deNum(n)), formato: (v) => kg(v), secundaria: puntos.map((p, i, a) => ({ x: p.x, y: a.slice(Math.max(0, i - 3), i + 1).reduce((s, q) => s + q.y, 0) / Math.min(i + 1, 4) })) }))),
        seccion({ cab: "Mapa de calor" }, h("div", { class: "tarjeta" }, mapaCalor({ mes: hoy.slice(0, 7), hoy, nivel: (iso) => (+iso.slice(8) * 7) % 5, deload: (iso) => +iso.slice(8) <= 3, alCambiarMes: () => {} }))),
        seccion({ cab: "Diagrama corporal" }, h("div", { class: "tarjeta" }, diagramaCuerpo([
          { tokens: ["chest-*"], color: "var(--g-rosa)", intensidad: 1 }, { tokens: ["lats-*", "traps-*"], color: "var(--g-azul)", intensidad: 0.5 },
          { tokens: ["quads-*", "hamstrings-*", "calves-*", "gluteus-*"], color: "var(--g-verde)", intensidad: 0.8 }, { tokens: ["biceps-*"], color: "var(--g-morado)", intensidad: 0.3 }]))),
        seccion({ cab: "Insignias de liga · 96, 32 y 20" }, h("div", { class: "tarjeta" },
          h("div", { class: "fila", style: { justifyContent: "center", gap: "20px" } }, insignia({ insignia: 9, div: "II" }, 96), insignia({ insignia: 9, div: "II" }, 32), insignia({ insignia: 9, div: "II" }, 20)),
          h("div", { class: "escalera" }, nombresLigas().map((n, i) => h("div", null, insignia({ insignia: i + 1, div: "" }, 32), h("span", null, n)))))),
        seccion({ cab: "Estado vacío" }, h("div", { class: "tarjeta" }, vacio({ icono: "bascula", titulo: "Apunta tu peso", texto: "Con dos pesajes verás la tendencia.", acciones: [{ texto: "Añadir pesaje", alPulsar: () => {} }] }))),
        seccion({ cab: "Capas" }, lista([
          celda({ titulo: "Hoja media", estilo: "accion", alPulsar: () => hojaEjemplo(app, ["media", "grande"]) }),
          celda({ titulo: "Hoja grande", estilo: "accion", alPulsar: () => hojaEjemplo(app, ["grande"]) }),
          celda({ titulo: "Alerta", estilo: "accion", alPulsar: () => app.confirmar("¿Borrar la sesión?", "Esta acción no se puede deshacer.", "Borrar", true) }),
          celda({ titulo: "Hoja de acciones", estilo: "accion", alPulsar: () => app.hojaAcciones({ mensaje: "Press plano máquina", opciones: [{ texto: "Cambiar ejercicio", valor: 1 }, { texto: "Ver historia", valor: 2 }, { texto: "Quitar", valor: 3, peligro: true }] }) }),
          celda({ titulo: "Toast", estilo: "accion", alPulsar: () => app.toast("Copia exportada") }),
          celda({ titulo: "Pantalla nueva (push)", chevron: true, alPulsar: () => app.nav.ir("guia") }),
        ])),
      );
    },
  };
}
vistaGuia.pestana = "ajustes";

function hojaEjemplo(app, alturas) {
  let peso = 80.5, cambiado = false;
  app.abrirHoja({
    titulo: "Añadir pesaje", alturas,
    accion: { texto: "Guardar", alPulsar: () => { app.toast("Guardado (ejemplo)"); } },
    sucio: () => cambiado,
    render(c) {
      poner(c, seccion({ pie: "Arrastra el tirador para cambiar de altura o cerrar." }, lista([
        celda({ titulo: "Peso", control: stepper({ valor: peso, min: 30, max: 250, paso: 0.1, formato: (v) => kg(v), alCambiar: (v) => { peso = v; cambiado = true; }, etiqueta: "peso" }) }),
        celda({ titulo: "Fecha", valor: fechaCorta(app.store.hoy()) }),
      ])), seccion({}, lista(Array.from({ length: 14 }, (_, i) => celda({ titulo: "Fila " + (i + 1), valor: kg(80 - i * 0.2) })))));
    },
  });
}

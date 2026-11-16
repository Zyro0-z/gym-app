// Ajustes › Entrenamiento: descanso, pasos de peso, sonido y pantalla.
import { versionInstalada } from "../../ui/version.js";
import { VERSION } from "../ajustes.js";
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda, vacio, interruptor, segmentado, stepper, reordenable, pedirTexto, chip } from "../../ui/controles.js";
import { colorGrupo, temaEfectivo } from "../../ui/tema.js";
import { fmt, plural } from "../../core/formato.js";
import { canon, sinTildes } from "../../core/nombres.js";
import { fechaCorta, capital, kg } from "../../ui/textos.js";
import { elegirEjercicio, nuevoEjercicio } from "../selector.js";
import { abrirPesaje } from "../pesaje.js";
import { minSeg, kgTxt } from "./comun.js";

/* ---------- Entrenamiento ---------- */

export function vistaEntrenamiento(_p, app) {
  const { store } = app;
  const g = (f) => store.guardarAjustes((a) => f(a.entreno), { analitico: false });
  return {
    titulo: "Entrenamiento",
    render(c) {
      const e = store.estado.ajustes.entreno;
      const presets = (e.presets || []).slice().sort((a, b) => a - b);
      poner(c,
        seccion({ cab: "Descanso", pie: "Se pone en marcha al marcar una serie. Los atajos aparecen al tocar el cronómetro." }, lista([
          celda({ titulo: "Por defecto", control: stepper({ valor: e.descanso, min: 0, max: 600, paso: 15, formato: (v) => (v ? minSeg(v) : "No"), etiqueta: "descanso", alCambiar: (v) => g((x) => { x.descanso = v; }) }) }),
          ...presets.map((p) => celda({ titulo: "Atajo", valor: minSeg(p), alBorrar: presets.length > 1 ? () => g((x) => { x.presets = presets.filter((y) => y !== p); }) : null })),
          presets.length < 6 ? celda({ titulo: "Añadir atajo", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: async () => {
            const v = await app.hojaAcciones({ mensaje: "Nuevo atajo", opciones: [45, 75, 150, 240, 300].filter((x) => !presets.includes(x)).map((x) => ({ texto: minSeg(x), valor: x })) });
            if (v) g((x) => { x.presets = [...presets, v]; });
          } }) : null,
        ].filter(Boolean))),
        seccion({ cab: "Al apuntar", pie: "Cuánto cambian los botones − y + del peso en el teclado." }, lista([
          celda({ titulo: "Paso del peso", control: stepper({ valor: e.pasoPeso, min: 0.25, max: 10, paso: 0.25, formato: kgTxt, etiqueta: "paso del peso", alCambiar: (v) => g((x) => { x.pasoPeso = v; }) }) }),
          celda({ titulo: "Sonido al acabar el descanso", control: interruptor(e.sonido !== false, (v) => g((x) => { x.sonido = v; }), "Sonido") }),
          celda({ titulo: "Mantener la pantalla encendida", control: interruptor(e.pantallaEncendida !== false, (v) => g((x) => { x.pantallaEncendida = v; }), "Pantalla encendida") }),
        ])));
    },
  };
}
vistaEntrenamiento.pestana = "ajustes";

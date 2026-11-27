// Ajustes › Entrenamiento: descanso, pasos de peso, sonido y pantalla.
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { pedirTexto, seccion, lista, celda, interruptor, stepper } from "../../ui/controles.js";
import { minSeg, kgTxt } from "./comun.js";
import { leerNumero } from "../../core/formato.js";
import { gimnasioActivo } from "../../core/gimnasios.js";

/* ---------- Entrenamiento ---------- */

export function vistaEntrenamiento(_p, app) {
  const { store } = app;
  const g = (f) => store.guardarAjustes((a) => f(a.entreno), { analitico: false });
  return {
    titulo: "Entrenamiento",
    render(c) {
      const e = store.estado.ajustes.entreno;
      const presets = (e.presets || []).slice().sort((a, b) => a - b);
      const { barra, discos } = gimnasioActivo(store.estado.ajustes);
      poner(c,
        seccion({ cab: "Descanso", pie: "Se pone en marcha al marcar una serie. Los atajos aparecen al tocar el cronómetro." }, lista([
          celda({ titulo: "Por defecto", control: stepper({ valor: e.descanso, min: 0, max: 600, paso: 15, formato: (v) => (v ? minSeg(v) : "No"), etiqueta: "descanso", alCambiar: (v) => g((x) => { x.descanso = v; }) }) }),
          ...presets.map((p) => celda({ titulo: "Atajo", valor: minSeg(p), alBorrar: () => g((x) => { x.presets = presets.filter((y) => y !== p); }) })),
          presets.length < 6 ? celda({ titulo: "Añadir atajo", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: async () => {
            const v = await app.hojaAcciones({ mensaje: "Nuevo atajo", opciones: [45, 75, 150, 240, 300].filter((x) => !presets.includes(x)).map((x) => ({ texto: minSeg(x), valor: x })) });
            if (v) g((x) => { x.presets = [...presets, v]; });
          } }) : null,
        ].filter(Boolean))),
        seccion({ cab: "Al apuntar", pie: "Cuánto cambian los botones − y + del peso en el teclado." }, lista([
          celda({ titulo: "Paso del peso", control: stepper({ valor: e.pasoPeso, min: 0.25, max: 10, paso: 0.25, formato: kgTxt, etiqueta: "paso del peso", alCambiar: (v) => g((x) => { x.pasoPeso = v; }) }) }),
          celda({ titulo: "Sonido al acabar el descanso", control: interruptor(e.sonido !== false, (v) => g((x) => { x.sonido = v; }), "Sonido") }),
        ])),
        seccion({ cab: "Pantalla", pie: "Con la pantalla encendida el iPhone no se bloquea mientras entrenas (se pide de nuevo al volver a la app)." }, lista([
          celda({ titulo: "Mantener la pantalla encendida", control: interruptor(e.pantallaEncendida !== false, (v) => g((x) => { x.pantallaEncendida = v; }), "Pantalla encendida") }),
        ])),
        seccion({ cab: "Calculadora de discos", pie: "Menú de cada ejercicio, o «Discos» sobre el teclado." }, lista([
          celda({ titulo: "Barra", control: stepper({ valor: barra, min: 0, max: 40, paso: 0.5, formato: kgTxt, etiqueta: "peso de la barra", alCambiar: (v) => g((x) => { x.barra = v; }) }) }),
          celda({ titulo: "Discos", valor: discos.map((d) => String(d).replace(".", ",")).join(" · ") || "Ninguno", chevron: true, alPulsar: async () => {
            const t = await pedirTexto(app, { titulo: "Discos (kg)", valor: discos.map((d) => String(d).replace(".", ",")).join("; "), placeholder: "25; 20; 15; 10; 5; 2,5; 1,25" });
            if (t == null) return;
            const l = [...new Set(t.split(/[;\s]+/).map(leerNumero).filter((v) => Number.isFinite(v) && v > 0 && v <= 50))].sort((a, b) => b - a);
            if (!l.length) { await app.alerta({ titulo: "Sin discos", mensaje: "Escribe los tamaños separados por punto y coma, por ejemplo 20; 10; 2,5." }); return; }
            g((x) => { x.discos = l; });
          } }),
        ])));
    },
  };
}
vistaEntrenamiento.pestana = "ajustes";

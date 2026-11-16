// Ajustes › Peso corporal: sexo, fases (volumen, definición, mantener) y pesajes.
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
import { fila } from "./comun.js";

const FASES = [{ valor: "bulk", texto: "Volumen" }, { valor: "cut", texto: "Definición" }, { valor: "mantener", texto: "Mantener" }];
const faseTxt = (t) => (FASES.find((f) => f.valor === t) || { texto: t }).texto;

export function vistaCuerpo(_p, app) {
  const { store } = app;
  function editarFase(i) {
    const fases = store.estado.ajustes.cuerpo.fases || [];
    const f = i == null ? { tipo: "bulk", desde: store.hoy() } : Object.assign({}, fases[i]);
    app.abrirHoja({
      titulo: i == null ? "Nueva fase" : "Fase", alturas: ["media"],
      accion: { texto: "Guardar", alPulsar: () => store.guardarAjustes((a) => {
        const fs = (a.cuerpo.fases || []).slice();
        if (i == null) fs.push(f); else fs[i] = f;
        fs.sort((x, y) => (x.desde < y.desde ? -1 : 1));
        a.cuerpo.fases = fs;
      }) },
      render(c) {
        poner(c, seccion({ pie: "La fase dura hasta que empieza la siguiente. Define qué ritmo de peso es bueno." }, lista([
          fila(segmentado(FASES, f.tipo, (v) => { f.tipo = v; }, { etiqueta: "Fase" })),
          celda({ titulo: "Desde", control: h("input", { type: "date", class: "campo-fila", value: f.desde, "aria-label": "Desde", onChange: (e) => { if (e.target.value) f.desde = e.target.value; } }) }),
        ])), i != null ? seccion({}, lista([celda({ titulo: "Borrar fase", estilo: "peligro", alPulsar: async () => {
          await store.guardarAjustes((a) => { a.cuerpo.fases.splice(i, 1); }); app.cerrarHoja(); } })])) : null);
      },
    });
  }
  return {
    titulo: "Peso corporal",
    render(c) {
      const cu = store.estado.ajustes.cuerpo, fases = cu.fases || [], hoy = store.hoy();
      const actual = fases.filter((f) => !f.desde || f.desde <= hoy).pop();
      poner(c,
        seccion({ cab: "Sexo", pie: "Solo se usa para comparar tu fuerza con las tablas de estándares de las ligas." }, lista([fila(segmentado([{ valor: "h", texto: "Hombre" }, { valor: "m", texto: "Mujer" }], cu.sexo || "",
          (v) => store.guardarAjustes((a) => { a.cuerpo.sexo = v; }), { etiqueta: "Sexo" }))])),
        seccion({ cab: "Fases", pie: "En volumen se espera que el peso suba despacio; en definición, que baje; en mantener, que se quede estable." },
          lista([...fases.map((f, i) => celda({ titulo: faseTxt(f.tipo), sub: "Desde el " + fechaCorta(f.desde, hoy), valor: f === actual ? chip("Actual", "accent") : null, chevron: true, alPulsar: () => editarFase(i) })).reverse(), celda({ titulo: "Añadir fase", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: () => editarFase(null) })])),
        seccion({}, lista([celda({ titulo: "Añadir pesaje", chevron: true, alPulsar: () => abrirPesaje(app) })])));
    },
  };
}
vistaCuerpo.pestana = "ajustes";

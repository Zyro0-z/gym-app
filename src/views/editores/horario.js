// Ajustes › Horario semanal: qué rutina toca cada día.
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
import { DIAS } from "./comun.js";

/* ---------- Horario ---------- */

export function vistaHorario(_p, app) {
  const { store } = app;
  async function elegir(i) {
    const rs = store.estado.rutinas;
    const v = await app.hojaAcciones({ mensaje: DIAS[i - 1], opciones: [...rs.map((r) => ({ texto: r.nombre, valor: r.nombre })), { texto: "Descanso", valor: "Descanso" }, { texto: "Sin asignar", valor: "-" }] });
    if (v === null) return;
    await store.guardarAjustes((a) => { a.horario[i] = v === "-" ? null : v; });
  }
  return {
    titulo: "Horario",
    render(c) {
      const hor = store.estado.ajustes.horario;
      poner(c, seccion({ pie: "Hoy te propone la rutina del día. Los días de descanso no cuentan en contra de la racha." }, lista(DIAS.map((d, i) => {
        const v = hor[i + 1];
        return celda({ titulo: d, valor: v ? v : "Sin asignar", chevron: true, alPulsar: () => elegir(i + 1) });
      }))));
    },
  };
}
vistaHorario.pestana = "ajustes";

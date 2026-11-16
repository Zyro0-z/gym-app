// Ajustes › Horario semanal: qué rutina toca cada día.
import { poner } from "../../ui/dom.js";
import { seccion, lista, celda } from "../../ui/controles.js";
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

// Ajustes › Objetivos: series semanales por grupo e incrementos por material.
import { poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda, stepper } from "../../ui/controles.js";
import { colorGrupo } from "../../ui/tema.js";
import { canon } from "../../core/nombres.js";
import { capital } from "../../ui/textos.js";
import { kgTxt } from "./comun.js";

/* ---------- Objetivos ---------- */

export function vistaObjetivos(_p, app) {
  const { store } = app;
  function editarSeries(grupo) {
    const lista0 = store.estado.ajustes.objetivos.seriesSemana || [];
    const o = lista0.find((x) => canon(x.grupo) === canon(grupo));
    const r = o ? { min: o.min, max: o.max } : { min: 10, max: 20 };
    app.abrirHoja({
      titulo: grupo, alturas: ["media"],
      accion: { texto: "Guardar", alPulsar: () => store.guardarAjustes((a) => {
        a.objetivos.seriesSemana = (a.objetivos.seriesSemana || []).filter((x) => canon(x.grupo) !== canon(grupo));
        a.objetivos.seriesSemana.push({ grupo, min: r.min, max: r.max });
      }) },
      render(c) {
        let smin, smax;
        smin = stepper({ valor: r.min, min: 0, max: 60, etiqueta: "mínimo", alCambiar: (v) => { r.min = v; if (r.max < v) { r.max = v; smax.fijar(v); } } });
        smax = stepper({ valor: r.max, min: 1, max: 60, etiqueta: "máximo", alCambiar: (v) => { r.max = v; if (r.min > v) { r.min = v; smin.fijar(v); } } });
        poner(c, seccion({ pie: "Series efectivas por semana (sin calentamiento)." }, lista([celda({ titulo: "Mínimo", control: smin }), celda({ titulo: "Máximo", control: smax })])),
          o ? seccion({}, lista([celda({ titulo: "Quitar objetivo", estilo: "peligro", alPulsar: async () => {
            await store.guardarAjustes((a) => { a.objetivos.seriesSemana = a.objetivos.seriesSemana.filter((x) => canon(x.grupo) !== canon(grupo)); }); app.cerrarHoja(); } })])) : null);
      },
    });
  }
  return {
    titulo: "Objetivos",
    render(c) {
      const A = store.estado.ajustes, obj = A.objetivos.seriesSemana || [];
      poner(c,
        seccion({ cab: "Series por semana", pie: "Hoy y Progreso comparan tus series de cada grupo con este rango." }, lista(A.grupos.map((g) => {
          const o = obj.find((x) => canon(x.grupo) === canon(g.nombre));
          return celda({ punto: colorGrupo(A.grupos, g.nombre), titulo: g.nombre, valor: o ? o.min + "–" + o.max : "Sin objetivo", chevron: true, alPulsar: () => editarSeries(g.nombre) });
        }))),
        seccion({ cab: "Incremento por material", pie: "Cuánto subir el peso cuando toca, según el material del ejercicio." }, lista(A.objetivos.incrementos.map((t, i) => celda({
          titulo: capital(t.tipo), control: stepper({ valor: t.kg, min: 0.25, max: 10, paso: 0.25, formato: kgTxt, etiqueta: t.tipo, alCambiar: (v) => store.guardarAjustes((a) => { a.objetivos.incrementos[i].kg = v; }) }) })))),
        seccion({}, lista([celda({ icono: "bascula", colorIcono: "var(--g-morado)", titulo: "Peso corporal", sub: "Sexo y fases (volumen, definición)", chevron: true, alPulsar: () => app.nav.ir("cuerpo") })], { iconos: true })));
    },
  };
}
vistaObjetivos.pestana = "ajustes";

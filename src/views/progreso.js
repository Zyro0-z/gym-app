// Progreso: «¿voy bien?». Resumen de la semana y volumen de las últimas 8 semanas.
import { h, poner } from "../ui/dom.js";
import { seccion, vacio, chip } from "../ui/controles.js";
import { graficaBarras } from "../ui/graficas.js";
import { fmt, plural, conSigno } from "../core/formato.js";
import { kgTotal, minutos } from "../ui/textos.js";

export function vistaProgreso(_p, app) {
  const { store } = app;
  return {
    titulo: "Progreso",
    render(c) {
      const A = store.analisis();
      if (!A.sesiones.length) { poner(c, vacio({ icono: "progreso", titulo: "Aún no hay datos", texto: "Cuando registres entrenamientos verás aquí tu progreso." })); return; }
      const r = A.resumen;
      const delta = r.deltaPct === null ? null : chip(conSigno(r.deltaPct, 0) + " % vs anterior", r.deltaPct >= 0 ? "ok" : "warn", { icono: r.deltaPct >= 0 ? "sube" : "baja" });
      const semanas = A.semanas.slice(-8);
      const media = semanas.reduce((a, s) => a + s.vol, 0) / (semanas.length || 1);
      poner(c, 
        seccion({ cab: "Esta semana" }, h("div", { class: "tarjeta" },
          h("div", { class: "fila entre" }, h("div", { class: "cifra t-title1 c-accent" }, String(r.act.ser), h("span", { class: "ud" }, " series")), delta),
          h("div", { class: "t-subhead c-2", style: { marginTop: "4px" } }, [plural(r.act.n, "sesión", "sesiones"), kgTotal(r.act.vol), r.mediaDur ? "media " + minutos(r.mediaDur) : null].filter(Boolean).join(" · ")))),
        seccion({ cab: "Volumen · últimas 8 semanas" }, h("div", { class: "tarjeta" },
          h("div", { class: "resumen-grafica" }, h("div", { class: "etiqueta" }, "Media"), h("div", { class: "cifra" }, fmt(Math.round(media)), h("span", { class: "ud" }, " kg"))),
          graficaBarras({ datos: semanas.map((s, i) => ({ etiqueta: s.etiqueta, valor: s.vol, activa: i === semanas.length - 1 })), formato: (v) => kgTotal(v),
            detalle: (d) => "semana del " + d.etiqueta, etiqueta: "Volumen semanal de las últimas 8 semanas" }))),
      );
    },
  };
}

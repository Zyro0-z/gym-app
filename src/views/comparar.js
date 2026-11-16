// Progreso › Comparar periodos: dos periodos del mismo largo, sin porcentajes engañosos.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, segmentado, chip, vacio } from "../ui/controles.js";
import { plural } from "../core/formato.js";
import { ddmm } from "../core/fechas.js";
import { compararPeriodos, PERIODOS, pct } from "../core/comparar.js";
import { kg, kgTotal, minutos } from "../ui/textos.js";

const pctChip = (a, b) => {
  const p = pct(a, b);
  if (p == null) return h("span", { class: "c-2" }, b ? "—" : "Sin datos antes");
  const r = Math.round(p);
  return chip((r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r) + " %", r > 0 ? "ok" : r < 0 ? "bad" : null);
};
const fila = (titulo, a, b, fa) => celda({ titulo, sub: (a == null ? "—" : fa(a)) + " frente a " + (b == null ? "—" : fa(b)), valor: pctChip(a, b) });

export function vistaComparar(_p, app) {
  const { store } = app;
  let id = "4s";
  return {
    titulo: "Comparar periodos",
    render(c) {
      const A = store.analisis();
      const R = compararPeriodos(A, id);
      const a = R.actual, b = R.anterior;
      const rango = (x) => ddmm(x.desde) + "–" + ddmm(x.hasta);
      const nota = R.enCurso ? "Mes en curso: se compara con los mismos " + R.dias + " primeros días del mes anterior." : null;
      const seg = h("div", { class: "seccion" }, segmentado(PERIODOS.map((p) => ({ valor: p.id, texto: p.texto })), id, (v) => { id = v; this.render(c); }, { etiqueta: "Periodo" }));
      // Sin sesiones en el periodo actual, los «−100 %» no dicen nada: se explica y se muestra lo anterior
      if (!a.sesiones) {
        poner(c, seg, vacio({ icono: "historial", titulo: "Sin sesiones del " + rango(a), texto: b.sesiones ? "En el periodo anterior (" + rango(b) + ") hubo " + plural(b.sesiones, "sesión", "sesiones") + ". Cuando entrenes en este, verás la comparación." : "Tampoco hay sesiones en el periodo anterior." }));
        return;
      }
      poner(c,
        seg,
        seccion({ cab: rango(a) + " frente a " + rango(b), pie: nota }, lista([
          fila("Sesiones", a.sesiones, b.sesiones, String),
          fila("Series", a.series, b.series, String),
          fila("Volumen", a.volumen, b.volumen, kgTotal),
          fila("Duración media", a.duracion, b.duracion, (v) => minutos(Math.round(v))),
        ])),
        R.grupos.length ? seccion({ cab: "Series por grupo" }, lista(R.grupos.map((g) => fila(g.grupo, g.actual, g.anterior, String)))) : null,
        seccion({ cab: "Mejor e1RM", pie: R.ejercicios.length ? "Solo los ejercicios hechos en los dos periodos." : null },
          R.ejercicios.length ? lista(R.ejercicios.map((e) => fila(e.nombre, e.actual, e.anterior, (v) => kg(v))))
            : h("p", { class: "etiqueta", style: { padding: "0 var(--gutter)" } }, "Ningún ejercicio se repite en los dos periodos.")));
    },
  };
}

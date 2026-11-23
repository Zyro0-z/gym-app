// Progreso › Por gimnasio: el mismo ejercicio en dos o más gimnasios, con la mediana del mejor e1RM de cada sesión.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio } from "../ui/controles.js";
import { fmt, plural } from "../core/formato.js";
import { nombreGimnasio } from "../core/gimnasios.js";
import { MIN_SESIONES } from "../core/porgimnasio.js";

const kg = (v) => fmt(v, Number.isInteger(v) ? 0 : 1) + " kg";
const pct = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v), 1) + " %";

export function vistaPorGimnasio(_p, app) {
  const { store } = app;
  return {
    titulo: "Por gimnasio", tituloAtras: "Gimnasios",
    render(c) {
      const A = store.analisis(), aj = store.estado.ajustes;
      const nombre = (id) => nombreGimnasio(aj, id) || id;
      const L = A.porGimnasio || [];
      if (!L.length) { poner(c, vacio({ icono: "pesa", titulo: "Aún no hay nada que comparar", texto: "Necesitas el mismo ejercicio hecho en dos gimnasios. El gimnasio de cada sesión se elige al empezar a entrenar." })); return; }
      poner(c,
        h("p", { class: "t-subhead c-2", style: { padding: "0 var(--gutter) 8px" } }, "Mediana del mejor e1RM de cada sesión. La diferencia es respecto al gimnasio con más sesiones."),
        L.map((x) => seccion({ cab: x.nombre, pie: x.pocos ? "Con menos de " + MIN_SESIONES + " sesiones en algún gimnasio, la diferencia puede ser progreso o un mal día, no el gimnasio." : null },
          lista(x.filas.map((f) => celda({
            titulo: nombre(f.id) + (f.id === x.referencia ? " · referencia" : ""),
            sub: plural(f.sesiones, "sesión", "sesiones") + " · mejor " + kg(f.mejor),
            valor: h("span", { class: "num" }, kg(f.mediana) + (f.difPct != null ? " (" + pct(f.difPct) + ")" : "")),
            "aria-label": nombre(f.id) + ": mediana " + kg(f.mediana) + ", mejor " + kg(f.mejor) + ", " + plural(f.sesiones, "sesión", "sesiones") + (f.difPct != null ? ", " + pct(f.difPct) + " frente a la referencia" : ""),
          }))))),
        seccion({ pie: "Las máquinas y poleas no marcan lo mismo en todos los sitios y una barra puede pesar distinto: una diferencia constante suele ser del material, no tuya." }, null));
    },
  };
}
vistaPorGimnasio.pestana = "progreso";

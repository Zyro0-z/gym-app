// Ajustes › Calidad de los datos: avisos sobre lo registrado.
import { poner } from "../../ui/dom.js";
import { seccion, lista, celda, vacio } from "../../ui/controles.js";
import { fmt, plural } from "../../core/formato.js";
import { canon } from "../../core/nombres.js";
import { fechaCorta, capital } from "../../ui/textos.js";
import { renombrarEjercicio } from "./comun.js";

/* ---------- Calidad de los datos ---------- */

export function vistaCalidad(_p, app) {
  const { store } = app;
  const irEj = (k) => app.nav.ir("ejercicioCat/" + encodeURIComponent(k), { pestana: "ajustes" });
  const irSes = (id) => app.nav.ir("sesion/" + encodeURIComponent(id), { pestana: "historial" });
  async function variante(v) {
    const op = await app.hojaAcciones({ mensaje: "«" + v.nombre + "» se parece a otro ejercicio", opciones: [
      ...v.cands.slice(0, 3).map((x) => ({ texto: "Es «" + x.nombre + "»: unir", valor: x.nombre })), { texto: "Es otro ejercicio: elegir grupo", valor: "-" }] });
    if (op === "-") irEj(v.k);
    else if (op) { const r = await renombrarEjercicio(app, v.k, op); if (r) app.toast("Unidos"); }
  }
  return {
    titulo: "Calidad de los datos", tituloAtras: "Calidad",
    render(c) {
      const A = store.analisis(), q = A.calidad, hoy = A.hoy, out = [];
      const ses = (s) => celda({ titulo: (s.rutina || "Entrenamiento libre"), sub: capital(fechaCorta(s.dia, hoy)), chevron: true, alPulsar: () => irSes(s.id) });
      if (q.variantes.length) out.push(seccion({ cab: "Posibles nombres repetidos", pie: "Ejercicios sin grupo con un nombre muy parecido a otro. Si son el mismo, únelos." },
        lista(q.variantes.map((v) => celda({ titulo: v.nombre, sub: "¿" + v.cands.map((x) => x.nombre).join(", ") + "?", chevron: true, alPulsar: () => variante(v) })))));
      if (q.sinCat.length) out.push(seccion({ cab: "Ejercicios sin grupo", pie: "Sus series no cuentan para ningún grupo muscular." }, lista(q.sinCat.map((n) => celda({ titulo: n, chevron: true, alPulsar: () => irEj(canon(n)) })))));
      if (q.sinMapeoCfg.length) out.push(seccion({ cab: "Configurados sin grupo" }, lista(q.sinMapeoCfg.map((x) => celda({ titulo: x.nombre, sub: "Tiene " + x.de.join(" y ") + " pero no grupo", chevron: true, alPulsar: () => irEj(x.k) })))));
      const avisoCel = q.avisos.filter((a) => a.codigo === "umbralSinRutina").map((a) => celda({ titulo: "Aviso de duración sin rutina", sub: "«" + a.rutina + "» no tiene sesiones", chevron: true, alPulsar: () => app.nav.ir("rutinas", { pestana: "ajustes" }) }));
      if (avisoCel.length) out.push(seccion({ cab: "Avisos" }, lista(avisoCel)));
      if (q.malasDur.length) out.push(seccion({ cab: "Duraciones dudosas", pie: "No cuentan para la duración media. Corrige el inicio y el fin desde Editar." }, lista(q.malasDur.map(ses))));
      if (q.sumaLados.length) out.push(seccion({ cab: "Repeticiones por lado", pie: "Ejercicios por lado con muchas repeticiones: ¿se apuntaron los dos lados juntos?" },
        lista(q.sumaLados.map((x) => celda({ titulo: x.ex.nombre + " · " + (x.st.peso ? fmt(x.st.peso, 1) + "×" : "") + x.st.reps, sub: capital(fechaCorta(x.s.dia, hoy)), chevron: true, alPulsar: () => irSes(x.s.id) })))));
      if (q.plantillasPerdidas.length) out.push(seccion({ cab: "Rutinas que ya no existen", pie: "Sesiones con una rutina borrada o renombrada. Se conservan y cuentan igual." },
        lista(q.plantillasPerdidas.map((p) => celda({ titulo: p.nombre, valor: plural(p.n, "sesión", "sesiones") })))));
      if (!out.length) { poner(c, vacio({ icono: "check", titulo: "Todo en orden", texto: "No hay nada que revisar en tus datos." })); return; }
      poner(c, out);
    },
  };
}
vistaCalidad.pestana = "ajustes";

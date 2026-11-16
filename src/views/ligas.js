// Ligas: la general (insignia grande, progreso y escalera), por grupo y por ejercicio, y los
// cambios de la semana. Secundaria: se llega desde Progreso › Resumen y desde cada detalle.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, vacio, barrita } from "../ui/controles.js";
import { graficaLinea } from "../ui/graficas.js";
import { insignia, nombresLigas } from "../ui/insignias.js";
import { colorGrupo } from "../ui/tema.js";
import { fmt } from "../core/formato.js";
import { deNum } from "../core/fechas.js";
import { fechaCorta, capital, mesAnio } from "../ui/textos.js";
import { abrirPesaje } from "./pesaje.js";

/**
 * Liga que se muestra: la de hoy o, si hoy no hay (sin series recientes), la última conocida.
 * Devuelve { p, viejo } o null.
 */
export function ligaVigente(x) {
  if (!x) return null;
  if (x.hoy && x.hoy.nivel) return { p: x.hoy, viejo: false };
  const p = (x.linea || []).filter((q) => q.nivel).pop();
  return p ? { p, viejo: true } : null;
}

const notaVieja = (v, L) => (v && v.viejo ? h("div", { class: "t-footnote c-2", style: { marginTop: "6px" } },
  "Sin series recientes en el rango: es tu liga de la semana del " + fechaCorta(deNum(v.p.nd)) + ".") : null);

function cabecera(L, p, texto, v) {
  const n = p.nivel, pr = L.progreso(p);
  return h("div", { class: ["tarjeta liga-cab", v && v.viejo && "liga-vieja"] },
    insignia(n, 96),
    h("div", { class: "t-title2", style: { marginTop: "8px" } }, n.txt),
    h("div", { style: { width: "100%", maxWidth: "260px", margin: "10px auto 6px" } }, barrita(pr.frac)),
    h("div", { class: "t-footnote c-2" }, pr.siguiente ? capital(texto) : "Has llegado a la liga más alta"),
    notaVieja(v, L));
}

function sinLigas(app, A) {
  const c = A.calidad && A.calidad.ligas;
  const sinPeso = c && c.sinPeso;
  return vacio({ icono: "trofeo", titulo: sinPeso ? "Las ligas necesitan tu peso" : "Aún no hay liga",
    texto: sinPeso ? "Tu nivel se calcula con tu peso corporal." : "Hacen falta series en el rango de repeticiones de ejercicios con estándar.",
    acciones: sinPeso ? [{ texto: "Añadir pesaje", alPulsar: () => abrirPesaje(app) }] : [] });
}

export function vistaLigas(_p, app) {
  const { store } = app;
  return {
    titulo: "Ligas", grande: true,
    render(c) {
      const A = store.analisis(), L = A.liga, grupos = store.estado.ajustes.grupos;
      const vg = L && L.ok ? ligaVigente(L.general) : null;
      if (!vg) { poner(c, sinLigas(app, A)); return; }
      const g = vg.p;
      const actual = g.nivel.insignia;
      const conV = (xs) => xs.map((x) => ({ x, v: ligaVigente(x) })).filter((y) => y.v).sort((a, b) => b.v.p.sc - a.v.p.sc);
      const gruposL = conV([...L.grupos.values()]), ejs = conV([...L.ejercicios.values()]);
      const valor = (v) => h("span", { class: ["valor-tend", v.viejo && "c-2"] }, insignia(v.p.nivel, 20), v.p.nivel.txt);
      poner(c,
        h("div", { class: "seccion" }, cabecera(L, g, L.faltaGrupoTxt(g), vg)),
        seccion({ cab: "Escalera" }, h("div", { class: "tarjeta" }, h("div", { class: "escalera" }, nombresLigas().map((n, i) =>
          h("div", { class: i + 1 === actual ? "actual" : i + 1 > actual ? "lejos" : null, "aria-current": i + 1 === actual ? "true" : null }, insignia({ insignia: i + 1, div: "" }, 32), h("span", null, n)))))),
        gruposL.length ? seccion({ cab: "Por grupo" }, lista(gruposL.map(({ x, v }) => celda({ punto: colorGrupo(grupos, x.grupo), titulo: x.grupo,
          valor: valor(v), chevron: true, alPulsar: () => app.nav.ir("liga/grupo/" + encodeURIComponent(x.k)) })))) : null,
        ejs.length ? seccion({ cab: "Por ejercicio" }, lista(ejs.map(({ x, v }) => celda({ titulo: x.nombre,
          valor: valor(v), chevron: true, alPulsar: () => app.nav.ir("liga/ejercicio/" + encodeURIComponent(x.k)) })))) : null,
        L.cambios.length ? seccion({ cab: "Cambios esta semana" }, lista(L.cambios.map((x) => celda({
          izquierda: h("span", { class: x.sube ? "c-ok" : "c-bad", style: { display: "flex" } }, icono(x.sube ? "flecha-arriba" : "flecha-abajo", { tam: 18, grosor: 2.2 })),
          titulo: x.nombre, valor: x.nivel.txt })))) : null);
      const esc = c.querySelector(".escalera"), act = esc && esc.querySelector(".actual");
      if (act) requestAnimationFrame(() => { esc.scrollLeft = act.offsetLeft - esc.offsetLeft - (esc.clientWidth - act.offsetWidth) / 2; });
    },
  };
}
vistaLigas.pestana = "progreso";

/** Liga de un grupo (`grupo/k`) o de un ejercicio (`ejercicio/k`): insignia, lo que falta e historia. */
export function vistaLiga([tipo, k], app) {
  const { store } = app;
  const datos = () => { const L = store.analisis().liga; return !L || !L.ok ? null : tipo === "grupo" ? L.grupos.get(k) : L.ejercicios.get(k); };
  return {
    titulo: () => { const x = datos(); return x ? "Liga · " + (x.grupo && tipo === "grupo" ? x.grupo : x.nombre) : "Liga"; },
    tituloAtras: "Liga",
    render(c) {
      const A = store.analisis(), L = A.liga, x = datos(), v = ligaVigente(x);
      if (!v) { poner(c, vacio({ icono: "trofeo", titulo: "Sin liga", texto: x && x.motivo ? capital(x.motivo) : "No hay datos suficientes." })); return; }
      const texto = tipo === "grupo" || v.viejo ? L.faltaGrupoTxt(v.p) : L.faltaTxt(x);
      const linea = x.linea.filter((p) => p.sc != null);
      const meses = [];
      for (let i = 5; i >= 0; i--) { const d = new Date(Date.UTC(+A.hoy.slice(0, 4), +A.hoy.slice(5, 7) - 1 - i, 1)); meses.push(d.toISOString().slice(0, 7)); }
      const mensual = L.mensual(x.linea, meses);
      poner(c,
        h("div", { class: "seccion" }, cabecera(L, v.p, texto, v)),
        linea.length > 1 ? seccion({ cab: "Puntuación semanal" }, h("div", { class: "tarjeta" }, graficaLinea({ puntos: linea.map((p) => ({ x: p.nd, y: p.sc, detalle: (p.nivel ? p.nivel.txt + " · " : "") + fechaCorta(deNum(p.nd)) })),
          formato: (v) => fmt(v, 1), ejeX: (n) => fechaCorta(deNum(n)), etiqueta: "Puntuación de liga por semana" }))) : null,
        seccion({ cab: "Últimos meses" }, lista(meses.map((m, i) => celda({ titulo: capital(mesAnio(m)), valor: mensual[i] ? h("span", { class: "valor-tend" }, insignia(mensual[i].nivel, 20), mensual[i].nivel.txt) : "—" })).reverse())));
    },
  };
}
vistaLiga.pestana = "progreso";

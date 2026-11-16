// Ajustes › Grupos musculares: nombres, colores y regiones del diagrama.
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

/* ---------- Grupos musculares ---------- */

const COLORES = [["azul", "#007AFF", "#0A84FF"], ["indigo", "#5856D6", "#5E5CE6"], ["morado", "#AF52DE", "#BF5AF2"], ["rosa", "#FF2D55", "#FF375F"],
  ["rojo", "#FF3B30", "#FF453A"], ["naranja", "#FF9500", "#FF9F0A"], ["amarillo", "#FFCC00", "#FFD60A"], ["verde", "#34C759", "#30D158"], ["menta", "#00C7BE", "#63E6E2"], ["cian", "#32ADE6", "#64D2FF"], ["marron", "#A2845E", "#AC8E68"]];

export function vistaGrupos(_p, app) {
  const { store } = app;
  async function anadir() {
    const n = await pedirTexto(app, { titulo: "Nuevo grupo", placeholder: "Por ejemplo, Glúteo", accion: "Añadir" });
    if (!n) return;
    if (store.estado.ajustes.grupos.some((g) => canon(g.nombre) === canon(n))) { await app.alerta({ titulo: "Ya existe", mensaje: "Ya hay un grupo «" + n + "»." }); return; }
    await store.guardarAjustes((a) => { a.grupos.push({ nombre: n, color: null, regiones: [] }); });
  }
  async function editar(g) {
    const v = await app.hojaAcciones({ mensaje: g.nombre, opciones: [{ texto: "Cambiar color", valor: "color" }, { texto: "Cambiar nombre", valor: "nombre" }, { texto: "Borrar grupo", valor: "borrar", peligro: true }] });
    if (v === "color") elegirColor(g);
    if (v === "nombre") {
      const n = await pedirTexto(app, { titulo: "Nombre del grupo", valor: g.nombre });
      if (!n || n === g.nombre) return;
      if (store.estado.ajustes.grupos.some((x) => x !== g && canon(x.nombre) === canon(n))) { await app.alerta({ titulo: "Ya existe", mensaje: "Ya hay un grupo «" + n + "»." }); return; }
      const k = canon(g.nombre), cambia = (x) => (x && canon(x) === k ? n : x);
      await store.guardarCatalogo(store.estado.catalogo.map((x) => (x.grupo && canon(x.grupo) === k ? Object.assign({}, x, { grupo: n }) : x)));
      await store.guardarAjustes((a) => {
        for (const x of a.grupos) if (canon(x.nombre) === k) x.nombre = n;
        for (const o of a.objetivos.seriesSemana || []) o.grupo = cambia(o.grupo);
        for (const b of a.bloques || []) b.grupos = (b.grupos || []).map(cambia);
      });
    }
    if (v === "borrar") {
      const k = canon(g.nombre), n = store.estado.catalogo.filter((x) => x.grupo && canon(x.grupo) === k).length;
      if (n) { await app.alerta({ titulo: "No se puede borrar", mensaje: plural(n, "ejercicio usa", "ejercicios usan") + " este grupo. Cámbialos de grupo antes." }); return; }
      if (!(await app.confirmar("¿Borrar «" + g.nombre + "»?", "", "Borrar", true))) return;
      await store.guardarAjustes((a) => { a.grupos = a.grupos.filter((x) => canon(x.nombre) !== k); a.objetivos.seriesSemana = (a.objetivos.seriesSemana || []).filter((o) => canon(o.grupo) !== k); });
    }
  }
  function elegirColor(g) {
    const oscuro = temaEfectivo() === "dark";
    app.abrirHoja({
      titulo: "Color de " + g.nombre, alturas: ["media"], cancelar: null, accion: { texto: "Listo", alPulsar: () => {} },
      render(c) {
        const actual = g.color ? (oscuro ? g.color.oscuro : g.color.claro) : null;
        poner(c, seccion({ pie: "Automático usa un color de la paleta según el orden del grupo." }, lista([h("div", { class: "acentos", role: "radiogroup", "aria-label": "Color" },
          COLORES.map(([n, cl, os]) => h("button", { class: "circulo-acento", role: "radio", "aria-checked": String(actual === (oscuro ? os : cl)), "aria-label": n, style: { background: oscuro ? os : cl, color: oscuro ? os : cl },
            onClick: async () => { await store.guardarAjustes((a) => { a.grupos.find((x) => x.nombre === g.nombre).color = { claro: cl, oscuro: os }; }, { analitico: false }); g = store.estado.ajustes.grupos.find((x) => x.nombre === g.nombre); this.render(c); } },
            actual === (oscuro ? os : cl) ? icono("check") : null))),
          celda({ titulo: "Automático", check: !g.color, alPulsar: async () => { await store.guardarAjustes((a) => { a.grupos.find((x) => x.nombre === g.nombre).color = null; }, { analitico: false }); g = store.estado.ajustes.grupos.find((x) => x.nombre === g.nombre); this.render(c); } })])));
      },
    });
  }
  return {
    titulo: "Grupos musculares", tituloAtras: "Grupos",
    derecha: () => [h("button", { class: "btn-barra", "aria-label": "Nuevo grupo", onClick: anadir }, icono("mas"))],
    render(c) {
      const gs = store.estado.ajustes.grupos, cat = store.estado.catalogo;
      poner(c, seccion({ pie: "El color identifica al grupo en gráficas y en el mapa del cuerpo." }, lista(gs.map((g) => {
        const n = cat.filter((x) => x.grupo && canon(x.grupo) === canon(g.nombre)).length;
        return celda({ punto: colorGrupo(gs, g.nombre), titulo: g.nombre, valor: n ? String(n) : null, chevron: true, alPulsar: () => editar(g) });
      }))));
    },
  };
}
vistaGrupos.pestana = "ajustes";

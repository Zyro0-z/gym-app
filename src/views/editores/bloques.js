// Ajustes › Bloques: deloads y bloques de foco, con sus fechas y grupos.
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

/* ---------- Bloques ---------- */

export function vistaBloques(_p, app) {
  const { store } = app;
  return {
    titulo: "Bloques",
    derecha: () => [h("button", { class: "btn-barra", "aria-label": "Nuevo bloque", onClick: () => app.nav.ir("bloque/+") }, icono("mas"))],
    render(c) {
      const bs = (store.estado.ajustes.bloques || []).slice().sort((a, b) => (a.inicio < b.inicio ? 1 : -1)), hoy = store.hoy();
      if (!bs.length) { poner(c, vacio({ icono: "calendario", titulo: "Sin bloques", texto: "Un bloque marca un periodo especial, como una semana de descarga. Mientras dura, los grupos protegidos no cuentan como estancados.",
        acciones: [{ texto: "Nuevo bloque", alPulsar: () => app.nav.ir("bloque/+") }] })); return; }
      poner(c, seccion({}, lista(bs.map((b) => celda({ titulo: capital(b.tipo), sub: fechaCorta(b.inicio, hoy) + " – " + fechaCorta(b.fin, hoy) + (b.grupos && b.grupos.length ? " · " + b.grupos.join(", ") : " · todos los grupos"),
        valor: b.inicio <= hoy && b.fin >= hoy ? chip("Activo", "accent") : null, chevron: true, alPulsar: () => app.nav.ir("bloque/" + encodeURIComponent(b.id)) })))));
    },
  };
}
vistaBloques.pestana = "ajustes";

export function vistaBloque([id], app) {
  const { store } = app;
  const nuevo = id === "+";
  const original = nuevo ? null : (store.estado.ajustes.bloques || []).find((b) => b.id === id);
  const b = original ? JSON.parse(JSON.stringify(original)) : { id: "b" + Date.now().toString(36), inicio: store.hoy(), fin: store.hoy(), tipo: "deload", grupos: [] };
  async function guardar() {
    if (b.fin < b.inicio) { await app.alerta({ titulo: "Fechas al revés", mensaje: "El fin no puede ser anterior al inicio." }); return; }
    await store.guardarAjustes((a) => { a.bloques = (a.bloques || []).filter((x) => x.id !== b.id).concat([b]); });
    app.toast(nuevo ? "Bloque creado" : "Bloque guardado");
    app.nav.atras();
  }
  return {
    titulo: nuevo ? "Nuevo bloque" : "Bloque", tituloAtras: "Bloque",
    derecha: () => [h("button", { class: "btn-barra fuerte", onClick: guardar }, "Guardar")],
    render(c) {
      const grupos = store.estado.ajustes.grupos, deload = canon(b.tipo) === "deload";
      poner(c,
        seccion({ pie: deload ? "En una descarga bajas a propósito: los grupos marcados (o todos, si no marcas ninguno) no cuentan como estancados ni retroceden." : "En un bloque de especialización, los grupos que no marques quedan protegidos mientras te centras en los marcados." }, lista([
          fila(segmentado([{ valor: "deload", texto: "Descarga" }, { valor: "otro", texto: "Especialización" }], deload ? "deload" : "otro", (v) => { b.tipo = v === "deload" ? "deload" : (deload ? "especialización" : b.tipo); this.render(c); }, { etiqueta: "Tipo" })),
          celda({ titulo: "Inicio", control: h("input", { type: "date", class: "campo-fila", value: b.inicio, "aria-label": "Inicio", onChange: (e) => { if (e.target.value) b.inicio = e.target.value; } }) }),
          celda({ titulo: "Fin", control: h("input", { type: "date", class: "campo-fila", value: b.fin, "aria-label": "Fin", onChange: (e) => { if (e.target.value) b.fin = e.target.value; } }) }),
        ])),
        seccion({ cab: "Grupos" }, lista(grupos.map((g) => celda({ punto: colorGrupo(grupos, g.nombre), titulo: g.nombre, check: (b.grupos || []).some((x) => canon(x) === canon(g.nombre)),
          alPulsar: () => { const k = canon(g.nombre); b.grupos = b.grupos.some((x) => canon(x) === k) ? b.grupos.filter((x) => canon(x) !== k) : [...b.grupos, g.nombre]; this.render(c); } })))),
        original ? seccion({}, lista([celda({ titulo: "Borrar bloque", estilo: "peligro", alPulsar: async () => {
          if (!(await app.confirmar("¿Borrar el bloque?", "", "Borrar", true))) return;
          await store.guardarAjustes((a) => { a.bloques = a.bloques.filter((x) => x.id !== id); }); app.nav.atras(); } })])) : null);
    },
  };
}
vistaBloque.pestana = "ajustes";

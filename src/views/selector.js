// Hoja para elegir un ejercicio del catálogo (con buscador) o crear uno nuevo.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda } from "../ui/controles.js";
import { canon, sinTildes } from "../core/nombres.js";
import { colorGrupo } from "../ui/tema.js";

export const nuevoEjercicio = (nombre, grupo) => ({ id: canon(nombre), nombre: nombre.trim(), grupo: grupo || null, unilateral: false, tipoAncla: "peso",
  tipoMaterial: null, incremento: null, rangoReps: null, top: false, estandar: null });

/** Devuelve { ejercicioId, nombre } o null si se cierra sin elegir. */
export function elegirEjercicio(app, { titulo = "Añadir ejercicio", excluir = [] } = {}) {
  const { store } = app;
  return new Promise((res) => {
    let q = "", elegido = null;
    const buscador = h("input", { type: "search", class: "buscador", placeholder: "Buscar o crear", autocomplete: "off", autocorrect: "off", spellcheck: false, "aria-label": "Buscar ejercicio" });
    const resultados = h("div");
    const pintar = () => {
      const cat = store.estado.catalogo;
      const grupos = store.estado.ajustes.grupos;
      const t = sinTildes(q);
      const vis = cat.filter((c) => !excluir.includes(c.id) && (!t || sinTildes(c.nombre).includes(t)));
      const porGrupo = new Map();
      for (const c of vis) { const g = c.grupo || "Sin grupo"; if (!porGrupo.has(g)) porGrupo.set(g, []); porGrupo.get(g).push(c); }
      const orden = [...grupos.map((g) => g.nombre), "Sin grupo"].filter((g) => porGrupo.has(g)).concat([...porGrupo.keys()].filter((g) => !grupos.some((x) => x.nombre === g) && g !== "Sin grupo"));
      const exacto = cat.some((c) => canon(c.nombre) === canon(q));
      poner(resultados,
        q.trim() && !exacto ? seccion({}, lista([celda({ titulo: "Crear «" + q.trim() + "»", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: () => crear(q.trim()) })])) : null,
        orden.map((g) => seccion({ cab: g }, lista(porGrupo.get(g).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((c) =>
          celda({ titulo: c.nombre, punto: c.grupo ? colorGrupo(grupos, c.grupo) : "var(--fill)", alPulsar: () => { elegido = { ejercicioId: c.id, nombre: c.nombre }; hoja.cerrar(); } }))))),
        !vis.length && !q.trim() ? h("p", { class: "seccion-pie", style: { textAlign: "center" } }, "El catálogo está vacío. Escribe un nombre para crear un ejercicio.") : null);
    };
    async function crear(nombre) {
      const grupos = store.estado.ajustes.grupos.map((g) => g.nombre);
      const g = await app.hojaAcciones({ mensaje: "Grupo muscular de «" + nombre + "»", opciones: grupos.map((x) => ({ texto: x, valor: x })).concat([{ texto: "Sin grupo", valor: "" }]) });
      if (g === null) return;
      const nuevo = nuevoEjercicio(nombre, g || null);
      if (!store.estado.catalogo.some((c) => c.id === nuevo.id)) await store.guardarCatalogo([...store.estado.catalogo, nuevo]);
      elegido = { ejercicioId: nuevo.id, nombre: nuevo.nombre };
      hoja.cerrar();
    }
    buscador.addEventListener("input", () => { q = buscador.value; pintar(); });
    const hoja = app.abrirHoja({
      titulo, alturas: ["grande"],
      render(c) { poner(c, h("div", { class: "seccion junta" }, buscador), resultados); pintar(); },
      alCerrar: () => res(elegido),
    });
  });
}

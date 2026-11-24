// Hoja para añadir o editar un pesaje (peso corporal).
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio } from "../ui/controles.js";
import { kg, fechaCorta, capital } from "../ui/textos.js";
import { leerNumero } from "../core/formato.js";
import { exito } from "../ui/haptica.js";

/** existente: { fecha, kg } para editarlo; si no, uno nuevo con la fecha de hoy y el último peso. */
export function abrirPesaje(app, existente = null) {
  const { store } = app;
  const lst = store.estado.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const ultimo = lst[lst.length - 1];
  const r = { fecha: existente ? existente.fecha : store.hoy(), kg: existente ? existente.kg : ultimo ? ultimo.kg : "" };
  const kgIn = h("input", { class: "campo-grande num", type: "text", inputmode: "decimal", autocomplete: "off", value: r.kg === "" ? "" : String(r.kg).replace(".", ","), "aria-label": "Peso en kg",
    onInput: (e) => { r.kg = e.target.value; hoja.repintarAccion && hoja.repintarAccion(); } });
  const valido = () => { const v = leerNumero(r.kg); return v >= 20 && v <= 400; };
  const hoja = app.abrirHoja({
    titulo: existente ? "Editar pesaje" : "Añadir pesaje", alturas: ["media", "grande"],
    accion: { texto: "Guardar", alPulsar: async () => {
      if (!valido()) { await app.alerta({ titulo: "Peso no válido", mensaje: "Escribe el peso en kg, por ejemplo 80,5." }); return false; }
      const kg = Math.round(leerNumero(r.kg) * 10) / 10;
      let nuevos = store.estado.pesajes.filter((p) => !(existente && p.fecha === existente.fecha && p.kg === existente.kg));
      const mismo = nuevos.find((p) => p.fecha === r.fecha);
      if (mismo && !(existente && existente.fecha === r.fecha)) {
        const ok = await app.confirmar("Ya hay un pesaje ese día", "Se sustituirá el de " + String(mismo.kg).replace(".", ",") + " kg.", "Sustituir");
        if (!ok) return false;
      }
      nuevos = nuevos.filter((p) => p.fecha !== r.fecha).concat([{ fecha: r.fecha, kg }]).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
      await store.guardarPesajes(nuevos);
      exito(); app.toast("Pesaje guardado");
    } },
    sucio: () => existente ? (r.fecha !== existente.fecha || leerNumero(r.kg) !== existente.kg) : String(r.kg) !== String(ultimo ? ultimo.kg : ""),
    render(c) {
      poner(c,
        h("div", { class: "seccion pesaje" }, kgIn, h("span", { class: "ud" }, "kg")),
        seccion({}, lista([celda({ titulo: "Fecha", control: h("input", { type: "date", class: "campo-fila", value: r.fecha, max: store.hoy(), "aria-label": "Fecha", onChange: (e) => { if (e.target.value) r.fecha = e.target.value; } }) })])));
      setTimeout(() => { kgIn.focus(); kgIn.select(); }, 380);
    },
  });
  return hoja;
}

/** Progreso › Cuerpo › Todos los pesajes: la lista completa, para editar o borrar. */
export function vistaPesajes(_p, app) {
  const { store } = app;
  return {
    titulo: "Pesajes",
    derecha: () => [h("button", { class: "btn-barra", onClick: () => abrirPesaje(app) }, "Añadir")],
    render(c) {
      const pes = store.estado.pesajes.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : -1)), hoy = store.hoy();
      if (!pes.length) { poner(c, vacio({ icono: "bascula", titulo: "Sin pesajes", texto: "Apunta tu peso para ver la tendencia.", acciones: [{ texto: "Añadir pesaje", alPulsar: () => abrirPesaje(app) }] })); return; }
      poner(c, seccion({ pie: "Toca uno para editarlo; desliza para borrarlo." }, lista(pes.map((p) => celda({ titulo: capital(fechaCorta(p.fecha, hoy)), valor: kg(p.kg), chevron: true,
        alPulsar: () => abrirPesaje(app, p),
        alBorrar: async () => { await store.guardarPesajes(store.estado.pesajes.filter((x) => !(x.fecha === p.fecha && x.kg === p.kg))); app.toast("Pesaje borrado", { icono: "papelera" }); } })))));
    },
  };
}
vistaPesajes.pestana = "progreso";

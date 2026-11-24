// Piezas compartidas por los editores de Ajustes.
import { h } from "../../ui/dom.js";
import { fmt, plural } from "../../core/formato.js";
import { canon } from "../../core/nombres.js";
import { nuevoEjercicio } from "../selector.js";
import { duplicadosBase, fusionarAjustes } from "../../core/musculos.js";

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const fila = (...hijos) => h("div", { class: "celda" }, h("div", { style: { flex: "1", padding: "8px 0" } }, ...hijos));
export const minSeg = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
export const compacto = (el) => { el.classList.add("compacto"); return el; };
export const kgTxt = (v) => fmt(v, Number.isInteger(v) ? 0 : v * 10 === Math.round(v * 10) ? 1 : 2) + " kg";

/* ---------- Cambios que tocan sesiones guardadas ---------- */

/** Aplica `fn` a cada sesión (copia) y guarda solo las que cambian. Devuelve cuántas cambiaron. */
export async function actualizarSesiones(store, fn) {
  let n = 0;
  for (const s of store.estado.sesiones) {
    const copia = JSON.parse(JSON.stringify(s));
    if (fn(copia)) { await store.guardarSesion(copia); n++; }
  }
  return n;
}
export const usosEjercicio = (store, id) => store.estado.sesiones.filter((s) => s.ejercicios.some((e) => e.ejercicioId === id || canon(e.nombre) === id)).length;

/**
 * Cambia el nombre de un ejercicio en el catálogo, las rutinas y todas las sesiones. Si el nombre
 * nuevo ya existe, une los dos (se quedan los ajustes del que ya existía).
 */
export async function renombrarEjercicio(app, id, nuevoNombre) {
  const { store } = app;
  const cat = store.estado.catalogo, viejo = cat.find((c) => c.id === id), nid = canon(nuevoNombre);
  if (!nid) return false;
  const destino = cat.find((c) => c.id === nid && c.id !== id);
  const n = usosEjercicio(store, id);
  if (destino || nid !== id) {
    const ok = await app.confirmar(destino ? "¿Unir con «" + destino.nombre + "»?" : "¿Cambiar el nombre?",
      (destino ? "Las sesiones de los dos ejercicios pasan a contar como uno solo." : "") + (n ? " Se actualiza en " + plural(n, "sesión", "sesiones") + "." : ""),
      destino ? "Unir" : "Cambiar");
    if (!ok) return false;
  }
  const nombre = destino ? destino.nombre : nuevoNombre.trim();
  const nuevoCat = cat.filter((c) => c.id !== id && c.id !== nid);
  nuevoCat.push(destino ? destino : Object.assign({}, viejo || nuevoEjercicio(nombre, null), { id: nid, nombre }));
  await store.unirEjercicios(new Map([[id, { id: nid, nombre }]]), nuevoCat);
  return nid;
}

/** Une cada ejercicio duplicado del catálogo base con su equivalente: el historial, las rutinas y el entreno en curso pasan al que se conserva. Devuelve cuántos se unieron. */
export async function unirDuplicados(app) {
  const { store } = app, grupos = duplicadosBase(store.estado.catalogo), destinoDe = new Map();
  let cat = store.estado.catalogo.slice(), n = 0;
  for (const g of grupos) {
    let dest = g.conservar;
    for (const d of g.unir) { dest = fusionarAjustes(dest, d); destinoDe.set(d.id, g.conservar); n++; }
    cat = cat.filter((c) => !g.unir.some((d) => d.id === c.id)).map((c) => (c.id === g.conservar.id ? dest : c));
  }
  if (!n) return 0;
  await store.unirEjercicios(new Map([...destinoDe].map(([k, d]) => [k, { id: d.id, nombre: d.nombre }])), cat);
  return n;
}

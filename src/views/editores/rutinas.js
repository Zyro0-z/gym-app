// Ajustes › Rutinas: lista, alta y editor de una rutina.
import { CHIPS_RPE, esRpe, rpeTxt } from "../../core/rpe.js";
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda, vacio, interruptor, stepper, reordenable, pedirTexto } from "../../ui/controles.js";
import { colorGrupo } from "../../ui/tema.js";
import { plural } from "../../core/formato.js";
import { canon } from "../../core/nombres.js";
import { elegirEjercicio } from "../selector.js";
import { DIAS, fila, compacto, actualizarSesiones } from "./comun.js";

/* ---------- Rutinas ---------- */

/** Hoja para crear una rutina; al guardarla abre su editor. */
export async function nuevaRutina(app) {
  const { store } = app;
  const nombre = await pedirTexto(app, { titulo: "Nueva rutina", placeholder: "Por ejemplo, Torso A", accion: "Crear" });
  if (!nombre) return;
  if (store.estado.rutinas.some((r) => canon(r.nombre) === canon(nombre))) { await app.alerta({ titulo: "Ya existe", mensaje: "Hay otra rutina con el nombre «" + nombre + "»." }); return; }
  let id = canon(nombre) || "rutina";
  while (store.estado.rutinas.some((r) => r.id === id)) id += "-";
  await store.guardarRutinas([...store.estado.rutinas, { id, nombre, ejercicios: [] }]);
  const pantalla = app.nav.pantalla;
  if (app.nav.pestana !== "ajustes" || !pantalla || !/^rutinas$/.test(pantalla.ruta || "")) await app.nav.ir("rutinas", { pestana: "ajustes" });
  await app.nav.ir("rutina/" + encodeURIComponent(id));
}

export function vistaRutinas(_p, app) {
  const { store } = app;
  return {
    titulo: "Rutinas", tituloAtras: "Rutinas",
    derecha: () => [h("button", { class: "btn-barra", "aria-label": "Nueva rutina", onClick: () => nuevaRutina(app) }, icono("mas"))],
    render(c) {
      const rs = store.estado.rutinas, hor = store.estado.ajustes.horario;
      if (!rs.length) { poner(c, vacio({ icono: "lista", titulo: "Sin rutinas", texto: "Una rutina es la lista de ejercicios de un día de entrenamiento.", acciones: [{ texto: "Crear rutina", alPulsar: () => nuevaRutina(app) }] })); return; }
      const dias = (r) => DIAS.filter((_, i) => hor[i + 1] && canon(hor[i + 1]) === canon(r.nombre)).map((d) => d.slice(0, 3).toLowerCase());
      poner(c, seccion({ pie: "Asigna cada rutina a sus días en Horario." }, lista(rs.map((r) => celda({
        titulo: r.nombre, sub: [plural(r.ejercicios.length, "ejercicio", "ejercicios"), plural(r.ejercicios.reduce((a, e) => a + (Number(e.series) || 0), 0), "serie", "series"), dias(r).join(", ")].filter(Boolean).join(" · "),
        chevron: true, alPulsar: () => app.nav.ir("rutina/" + encodeURIComponent(r.id)) })))));
    },
  };
}
vistaRutinas.pestana = "ajustes";

export function vistaRutina([id], app) {
  const { store } = app;
  const rutina = () => store.estado.rutinas.find((r) => r.id === id);
  const guardar = (f) => store.guardarRutinas(store.estado.rutinas.map((r) => { if (r.id !== id) return r; const x = JSON.parse(JSON.stringify(r)); f(x); return x; }));
  async function renombrar() {
    const r = rutina(), nombre = await pedirTexto(app, { titulo: "Nombre de la rutina", valor: r.nombre });
    if (!nombre || nombre === r.nombre) return;
    if (store.estado.rutinas.some((x) => x.id !== id && canon(x.nombre) === canon(nombre))) { await app.alerta({ titulo: "Ya existe", mensaje: "Hay otra rutina con ese nombre." }); return; }
    const viejo = r.nombre, n = store.estado.sesiones.filter((s) => s.rutina && canon(s.rutina) === canon(viejo)).length;
    if (n && !(await app.confirmar("¿Cambiar el nombre?", "Se actualiza también en " + plural(n, "sesión", "sesiones") + " y en el horario.", "Cambiar"))) return;
    await guardar((x) => { x.nombre = nombre; });
    await store.guardarAjustes((a) => {
      for (let i = 1; i <= 7; i++) if (a.horario[i] && canon(a.horario[i]) === canon(viejo)) a.horario[i] = nombre;
      for (const u of a.umbrales || []) if (canon(u.rutina) === canon(viejo)) u.rutina = nombre;
    });
    await actualizarSesiones(store, (s) => { if (s.rutina && canon(s.rutina) === canon(viejo)) { s.rutina = nombre; return true; } return false; });
  }
  async function borrar() {
    const r = rutina();
    if (!(await app.confirmar("¿Borrar «" + r.nombre + "»?", "Las sesiones que ya hiciste se conservan.", "Borrar", true))) return;
    await store.guardarAjustes((a) => { for (let i = 1; i <= 7; i++) if (a.horario[i] && canon(a.horario[i]) === canon(r.nombre)) a.horario[i] = null; });
    await store.guardarRutinas(store.estado.rutinas.filter((x) => x.id !== id));
    app.toast("Rutina borrada");
    app.nav.atras();
  }
  async function anadir() {
    const r = rutina(), e = await elegirEjercicio(app, { excluir: r.ejercicios.map((x) => x.ejercicioId) });
    if (e) await guardar((x) => { x.ejercicios.push({ ejercicioId: e.ejercicioId, series: 3 }); });
  }
  return {
    titulo: () => (rutina() ? rutina().nombre : "Rutina"), tituloAtras: "Rutina",
    render(c) {
      const r = rutina();
      if (!r) { poner(c, vacio({ icono: "lista", titulo: "Rutina no encontrada", texto: "Puede que se haya borrado." })); return; }
      const cat = store.estado.catalogo, grupos = store.estado.ajustes.grupos;
      const umb = (store.estado.ajustes.umbrales || []).find((u) => canon(u.rutina) === canon(r.nombre));
      const filas = r.ejercicios.map((e, i) => {
        const ce = cat.find((x) => x.id === e.ejercicioId);
        return celda({ punto: ce && ce.grupo ? colorGrupo(grupos, ce.grupo) : "var(--fill)", titulo: ce ? ce.nombre : e.ejercicioId,
          sub: ce && ce.rangoReps ? ce.rangoReps.min + "–" + ce.rangoReps.max + " reps" : null,
          control: h("span", { class: "fila", style: { gap: "4px" } },
            compacto(stepper({ valor: Number(e.series) || 3, min: 1, max: 12, formato: (v) => String(v), etiqueta: "series", alCambiar: (v) => guardar((x) => { x.ejercicios[i].series = v; }) })),
            h("span", { class: "asa", "aria-label": "Reordenar " + (ce ? ce.nombre : "") }, icono("arrastrar"))),
          alBorrar: () => guardar((x) => { x.ejercicios.splice(i, 1); }), textoBorrar: "Quitar" });
      });
      const listaEj = lista(filas);
      reordenable(listaEj, (desde, hasta) => guardar((x) => { const [m] = x.ejercicios.splice(desde, 1); x.ejercicios.splice(hasta, 0, m); }));
      const total = r.ejercicios.reduce((a, e) => a + (Number(e.series) || 0), 0);
      poner(c,
        seccion({}, lista([celda({ titulo: "Nombre", valor: r.nombre, chevron: true, alPulsar: renombrar })])),
        seccion({ cab: r.ejercicios.length ? plural(r.ejercicios.length, "ejercicio", "ejercicios") + " · " + plural(total, "serie", "series") : "Ejercicios",
          pie: r.ejercicios.length ? "Arrastra el asa para cambiar el orden; desliza a la izquierda para quitar." : null },
          r.ejercicios.length ? listaEj : null,
          lista([celda({ titulo: "Añadir ejercicio", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: anadir })])),
        r.ejercicios.length ? seccion({ cab: "RPE objetivo", pie: "Se muestra en cada serie mientras entrenas, como referencia del esfuerzo que buscas." },
          lista(r.ejercicios.map((e, i) => {
            const ce = cat.find((x) => x.id === e.ejercicioId);
            return celda({ titulo: ce ? ce.nombre : e.ejercicioId, valor: esRpe(e.rpe) ? rpeTxt(e.rpe) : "Sin objetivo", chevron: true, alPulsar: async () => {
              const v = await app.hojaAcciones({ mensaje: "RPE objetivo · " + (ce ? ce.nombre : ""), opciones: [{ texto: "Sin objetivo", valor: "no" }]
                .concat(CHIPS_RPE.map((x) => ({ texto: rpeTxt(x) + (x === e.rpe ? " · actual" : ""), valor: String(x) }))) });
              if (!v) return;
              await guardar((x) => { if (v === "no") delete x.ejercicios[i].rpe; else x.ejercicios[i].rpe = Number(v); });
            } });
          }))) : null,
        seccion({ cab: "Avisos de duración", pie: "Marca como dudosa una sesión de esta rutina que pase de esta duración o tenga un descanso entre series demasiado largo." }, lista([
          celda({ titulo: "Avisar", control: interruptor(!!umb, (v) => store.guardarAjustes((a) => {
            a.umbrales = (a.umbrales || []).filter((u) => canon(u.rutina) !== canon(r.nombre));
            if (v) a.umbrales.push({ rutina: r.nombre, maxDur: 120, maxSerie: 15 });
          }), "Avisos de duración") }),
          ...(umb ? [
            celda({ titulo: "Duración máxima", control: stepper({ valor: umb.maxDur || 120, min: 20, max: 300, paso: 5, formato: (v) => v + " min", etiqueta: "duración máxima",
              alCambiar: (v) => store.guardarAjustes((a) => { a.umbrales.find((u) => canon(u.rutina) === canon(r.nombre)).maxDur = v; }) }) }),
            celda({ titulo: "Entre series", control: stepper({ valor: umb.maxSerie || 15, min: 2, max: 60, formato: (v) => v + " min", etiqueta: "pausa máxima",
              alCambiar: (v) => store.guardarAjustes((a) => { a.umbrales.find((u) => canon(u.rutina) === canon(r.nombre)).maxSerie = v; }) }) }),
          ] : []),
        ])),
        seccion({}, lista([celda({ titulo: "Borrar rutina", estilo: "peligro", alPulsar: borrar })])));
    },
  };
}
vistaRutina.pestana = "ajustes";

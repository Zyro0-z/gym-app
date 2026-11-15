// Editores de Ajustes: rutinas, horario, catálogo de ejercicios, grupos, objetivos, peso corporal,
// bloques, entrenamiento, calidad de los datos y avanzado. Los cambios se guardan al momento,
// como en Ajustes de iOS; solo las altas y los nombres usan una hoja con «Guardar».
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, vacio, interruptor, segmentado, stepper, reordenable, pedirTexto, chip } from "../ui/controles.js";
import { colorGrupo, temaEfectivo } from "../ui/tema.js";
import { fmt, plural } from "../core/formato.js";
import { canon, sinTildes } from "../core/nombres.js";
import { fechaCorta, capital, kg } from "../ui/textos.js";
import { elegirEjercicio, nuevoEjercicio } from "./selector.js";
import { abrirPesaje } from "./pesaje.js";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const fila = (...hijos) => h("div", { class: "celda" }, h("div", { style: { flex: "1", padding: "8px 0" } }, ...hijos));
const minSeg = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const compacto = (el) => { el.classList.add("compacto"); return el; };
const kgTxt = (v) => fmt(v, Number.isInteger(v) ? 0 : v * 10 === Math.round(v * 10) ? 1 : 2) + " kg";

/* ---------- Cambios que tocan sesiones guardadas ---------- */

/** Aplica `fn` a cada sesión (copia) y guarda solo las que cambian. Devuelve cuántas cambiaron. */
async function actualizarSesiones(store, fn) {
  let n = 0;
  for (const s of store.estado.sesiones) {
    const copia = JSON.parse(JSON.stringify(s));
    if (fn(copia)) { await store.guardarSesion(copia); n++; }
  }
  return n;
}
const usosEjercicio = (store, id) => store.estado.sesiones.filter((s) => s.ejercicios.some((e) => e.ejercicioId === id || canon(e.nombre) === id)).length;

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
  await actualizarSesiones(store, (s) => {
    let c = false;
    for (const e of s.ejercicios) if (e.ejercicioId === id || canon(e.nombre) === id) { e.ejercicioId = nid; e.nombre = nombre; c = true; }
    return c;
  });
  const nuevoCat = cat.filter((c) => c.id !== id && c.id !== nid);
  nuevoCat.push(destino ? destino : Object.assign({}, viejo || nuevoEjercicio(nombre, null), { id: nid, nombre }));
  await store.guardarCatalogo(nuevoCat);
  await store.guardarRutinas(store.estado.rutinas.map((r) => {
    const vistos = new Set();
    return Object.assign({}, r, { ejercicios: r.ejercicios.map((e) => (e.ejercicioId === id ? Object.assign({}, e, { ejercicioId: nid }) : e))
      .filter((e) => (vistos.has(e.ejercicioId) ? false : vistos.add(e.ejercicioId))) });
  }));
  const b = store.estado.borrador;
  if (b && b.ejercicios.some((e) => e.ejercicioId === id)) {
    for (const e of b.ejercicios) if (e.ejercicioId === id) { e.ejercicioId = nid; e.nombre = nombre; }
    await store.guardarBorrador(b);
  }
  return nid;
}

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

/* ---------- Horario ---------- */

export function vistaHorario(_p, app) {
  const { store } = app;
  async function elegir(i) {
    const rs = store.estado.rutinas;
    const v = await app.hojaAcciones({ mensaje: DIAS[i - 1], opciones: [...rs.map((r) => ({ texto: r.nombre, valor: r.nombre })), { texto: "Descanso", valor: "Descanso" }, { texto: "Sin asignar", valor: "-" }] });
    if (v === null) return;
    await store.guardarAjustes((a) => { a.horario[i] = v === "-" ? null : v; });
  }
  return {
    titulo: "Horario",
    render(c) {
      const hor = store.estado.ajustes.horario;
      poner(c, seccion({ pie: "Hoy te propone la rutina del día. Los días de descanso no cuentan en contra de la racha." }, lista(DIAS.map((d, i) => {
        const v = hor[i + 1];
        return celda({ titulo: d, valor: v ? v : "Sin asignar", chevron: true, alPulsar: () => elegir(i + 1) });
      }))));
    },
  };
}
vistaHorario.pestana = "ajustes";

/* ---------- Catálogo de ejercicios ---------- */

export function vistaEjercicios(_p, app) {
  const { store } = app;
  let q = "";
  const buscador = h("input", { type: "search", class: "buscador", placeholder: "Buscar", autocomplete: "off", "aria-label": "Buscar ejercicio" });
  const resultados = h("div");
  async function crear() {
    const e = await elegirEjercicio(app, { titulo: "Nuevo ejercicio" });
    if (e) app.nav.ir("ejercicioCat/" + encodeURIComponent(e.ejercicioId));
  }
  const pintar = () => {
    const cat = store.estado.catalogo, grupos = store.estado.ajustes.grupos, t = sinTildes(q);
    const vis = cat.filter((x) => !t || sinTildes(x.nombre).includes(t));
    const por = new Map();
    for (const x of vis) { const g = x.grupo || "Sin grupo"; if (!por.has(g)) por.set(g, []); por.get(g).push(x); }
    const orden = [...grupos.map((g) => g.nombre).filter((g) => por.has(g)), ...[...por.keys()].filter((g) => g !== "Sin grupo" && !grupos.some((x) => x.nombre === g)), ...(por.has("Sin grupo") ? ["Sin grupo"] : [])];
    poner(resultados, vis.length ? orden.map((g) => seccion({ cab: g }, lista(por.get(g).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")).map((x) => celda({
      punto: x.grupo ? colorGrupo(grupos, x.grupo) : "var(--fill)", titulo: x.nombre,
      sub: [x.rangoReps ? x.rangoReps.min + "–" + x.rangoReps.max + " reps" : null, x.unilateral ? "por lado" : null, x.tipoMaterial].filter(Boolean).join(" · ") || null,
      chevron: true, alPulsar: () => app.nav.ir("ejercicioCat/" + encodeURIComponent(x.id)) })))))
      : vacio({ icono: "pesa", titulo: q ? "Sin resultados" : "Catálogo vacío", texto: q ? "No hay ejercicios con «" + q + "»." : "Los ejercicios que añadas a rutinas o entrenamientos aparecen aquí.",
        acciones: q ? [] : [{ texto: "Nuevo ejercicio", alPulsar: crear }] }));
  };
  buscador.addEventListener("input", () => { q = buscador.value.trim(); pintar(); });
  return {
    titulo: "Ejercicios",
    derecha: () => [h("button", { class: "btn-barra", "aria-label": "Nuevo ejercicio", onClick: crear }, icono("mas"))],
    render(c) { poner(c, h("div", { class: "seccion" }, buscador), resultados); pintar(); },
  };
}
vistaEjercicios.pestana = "ajustes";

const INCREMENTOS = [1, 1.25, 2, 2.5, 5];

export function vistaEjercicioCat([id], app) {
  const { store } = app;
  const ej = () => store.estado.catalogo.find((x) => x.id === id);
  const guardar = async (f) => {
    const cat = store.estado.catalogo.slice();
    let i = cat.findIndex((x) => x.id === id);
    if (i < 0) { const n = store.estado.sesiones.flatMap((s) => s.ejercicios).find((e) => e.ejercicioId === id || canon(e.nombre) === id); cat.push(nuevoEjercicio(n ? n.nombre : id, null)); i = cat.length - 1; }
    const x = JSON.parse(JSON.stringify(cat[i])); f(x); cat[i] = x;
    await store.guardarCatalogo(cat);
  };
  const opciones = async (mensaje, ops) => app.hojaAcciones({ mensaje, opciones: ops });
  async function renombrar() {
    const e = ej(), nombre = await pedirTexto(app, { titulo: "Nombre del ejercicio", valor: e.nombre });
    if (!nombre || nombre === e.nombre) return;
    if (canon(nombre) === id) { await guardar((x) => { x.nombre = nombre; }); return; }
    const nid = await renombrarEjercicio(app, id, nombre);
    if (nid) app.nav.atras().then(() => app.nav.ir("ejercicioCat/" + encodeURIComponent(nid)));
  }
  async function borrar() {
    const e = ej();
    if (!(await app.confirmar("¿Borrar «" + e.nombre + "»?", "Se quita del catálogo y de las rutinas.", "Borrar", true))) return;
    await store.guardarRutinas(store.estado.rutinas.map((r) => Object.assign({}, r, { ejercicios: r.ejercicios.filter((x) => x.ejercicioId !== id) })));
    await store.guardarCatalogo(store.estado.catalogo.filter((x) => x.id !== id));
    app.toast("Ejercicio borrado");
    app.nav.atras();
  }
  return {
    titulo: () => (ej() ? ej().nombre : "Ejercicio"), tituloAtras: "Ejercicio",
    render(c) {
      let e = ej();
      if (!e) {
        if (!usosEjercicio(store, id)) { poner(c, vacio({ icono: "pesa", titulo: "Ejercicio no encontrado", texto: "Puede que se haya borrado." })); return; }
        const n = store.estado.sesiones.flatMap((s) => s.ejercicios).find((x) => x.ejercicioId === id || canon(x.nombre) === id);
        e = nuevoEjercicio(n.nombre, null);
      }
      const A = store.estado.ajustes, grupos = A.grupos, usos = usosEjercicio(store, id);
      const enRutinas = store.estado.rutinas.filter((r) => r.ejercicios.some((x) => x.ejercicioId === id)).map((r) => r.nombre);
      const tipos = (A.objetivos.incrementos || []);
      const incMat = e.tipoMaterial ? tipos.find((t) => canon(t.tipo) === canon(e.tipoMaterial)) : null;
      const tablas = Object.keys(A.estandares || {});
      const est = e.estandar;
      poner(c,
        seccion({}, lista([
          celda({ titulo: "Nombre", valor: e.nombre, chevron: true, alPulsar: renombrar }),
          celda({ titulo: "Grupo", izquierda: null, valor: h("span", { class: "valor-tend" }, e.grupo ? h("span", { class: "celda-punto", style: { background: colorGrupo(grupos, e.grupo), margin: 0 } }) : null, e.grupo || "Sin grupo"), chevron: true,
            alPulsar: async () => { const v = await opciones("Grupo muscular", [...grupos.map((g) => ({ texto: g.nombre, valor: g.nombre })), { texto: "Sin grupo", valor: "-" }]); if (v !== null) guardar((x) => { x.grupo = v === "-" ? null : v; }); } }),
          celda({ titulo: "Por lado", sub: "Mancuerna o máquina a una mano: el volumen cuenta los dos lados", control: interruptor(!!e.unilateral, (v) => guardar((x) => { x.unilateral = v; }), "Por lado") }),
          celda({ titulo: "Medida", valor: e.tipoAncla === "duracion" ? "Tiempo" : e.tipoAncla === "reps" ? "Solo repeticiones" : "Peso y repeticiones", chevron: true,
            alPulsar: async () => { const v = await opciones("Qué se apunta en cada serie", [{ texto: "Peso y repeticiones", valor: "peso" }, { texto: "Solo repeticiones", valor: "reps" }, { texto: "Tiempo", valor: "duracion" }]); if (v) guardar((x) => { x.tipoAncla = v; }); } }),
        ])),
        seccion({ cab: "Progresión", pie: "Con rango, la app te dice cuándo subir el peso: cuando todas las series llegan al máximo. «Solo la primera serie» aplica el rango a la serie más pesada." }, lista([
          celda({ titulo: "Rango de repeticiones", control: interruptor(!!e.rangoReps, (v) => guardar((x) => { x.rangoReps = v ? { min: 8, max: 12 } : null; if (!v) x.top = false; }), "Rango de repeticiones") }),
          ...(e.rangoReps ? [
            celda({ titulo: "Mínimo", control: stepper({ valor: e.rangoReps.min, min: 1, max: e.rangoReps.max, etiqueta: "mínimo", alCambiar: (v) => guardar((x) => { x.rangoReps.min = v; }) }) }),
            celda({ titulo: "Máximo", control: stepper({ valor: e.rangoReps.max, min: e.rangoReps.min, max: 50, etiqueta: "máximo", alCambiar: (v) => guardar((x) => { x.rangoReps.max = v; }) }) }),
            celda({ titulo: "Solo la primera serie", control: interruptor(!!e.top, (v) => guardar((x) => { x.top = v; }), "Solo la primera serie") }),
          ] : []),
          celda({ titulo: "Material", valor: e.tipoMaterial ? capital(e.tipoMaterial) : "Ninguno", chevron: true,
            alPulsar: async () => { const v = await opciones("Material", [...tipos.map((t) => ({ texto: capital(t.tipo) + " · +" + kgTxt(t.kg), valor: t.tipo })), { texto: "Ninguno", valor: "-" }]); if (v !== null) guardar((x) => { x.tipoMaterial = v === "-" ? null : v; }); } }),
          celda({ titulo: "Incremento", valor: e.incremento ? "+" + kgTxt(e.incremento) : incMat ? "Del material (+" + kgTxt(incMat.kg) + ")" : "Automático", chevron: true,
            alPulsar: async () => { const v = await opciones("Cuánto subir el peso", [{ texto: incMat ? "Del material (+" + kgTxt(incMat.kg) + ")" : "Automático", valor: 0 }, ...INCREMENTOS.map((k) => ({ texto: "+" + kgTxt(k), valor: k }))]); if (v !== null) guardar((x) => { x.incremento = v || null; }); } }),
        ])),
        seccion({ cab: "Ligas", pie: "La tabla de estándares con la que se compara tu e1RM. El factor ajusta ejercicios parecidos (por ejemplo, 0,8 para una variante más fácil)." }, lista([
          celda({ titulo: "Referencia", valor: !est ? "Sin asignar" : est.sin ? "Ninguna" : est.slug, chevron: tablas.length > 0,
            alPulsar: tablas.length ? async () => {
              const v = await opciones("Tabla de estándares", [...tablas.map((t) => ({ texto: t, valor: t })), { texto: "Ninguna (no cuenta para las ligas)", valor: "-" }, { texto: "Sin asignar", valor: "0" }]);
              if (v === null) return;
              guardar((x) => { x.estandar = v === "0" ? null : v === "-" ? { sin: true } : Object.assign({ factor: 1, revisado: true }, x.estandar && !x.estandar.sin ? x.estandar : {}, { slug: v }); });
            } : null }),
          ...(est && !est.sin ? [
            celda({ titulo: "Factor", control: stepper({ valor: est.factor ?? 1, min: 0.1, max: 3, paso: 0.05, formato: (v) => fmt(v, 2), etiqueta: "factor", alCambiar: (v) => guardar((x) => { x.estandar.factor = v; x.estandar.revisado = true; }) }) }),
            celda({ titulo: "Polea", sub: "Aplica la corrección de polea de Avanzado", control: interruptor(!!est.polea, (v) => guardar((x) => { x.estandar.polea = v; }), "Polea") }),
          ] : []),
        ])),
        seccion({ pie: usos ? "Aparece en " + plural(usos, "sesión", "sesiones") + (enRutinas.length ? " y en " + enRutinas.join(", ") : "") + ". Para borrarlo, primero cámbiale el nombre a otro ejercicio y se unirán." : enRutinas.length ? "Está en " + enRutinas.join(", ") + "." : null },
          usos ? null : lista([celda({ titulo: "Borrar ejercicio", estilo: "peligro", alPulsar: borrar })])));
    },
  };
}
vistaEjercicioCat.pestana = "ajustes";

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

/* ---------- Objetivos ---------- */

export function vistaObjetivos(_p, app) {
  const { store } = app;
  function editarSeries(grupo) {
    const lista0 = store.estado.ajustes.objetivos.seriesSemana || [];
    const o = lista0.find((x) => canon(x.grupo) === canon(grupo));
    const r = o ? { min: o.min, max: o.max } : { min: 10, max: 20 };
    app.abrirHoja({
      titulo: grupo, alturas: ["media"],
      accion: { texto: "Guardar", alPulsar: () => store.guardarAjustes((a) => {
        a.objetivos.seriesSemana = (a.objetivos.seriesSemana || []).filter((x) => canon(x.grupo) !== canon(grupo));
        a.objetivos.seriesSemana.push({ grupo, min: r.min, max: r.max });
      }) },
      render(c) {
        let smin, smax;
        smin = stepper({ valor: r.min, min: 0, max: 60, etiqueta: "mínimo", alCambiar: (v) => { r.min = v; if (r.max < v) { r.max = v; smax.fijar(v); } } });
        smax = stepper({ valor: r.max, min: 1, max: 60, etiqueta: "máximo", alCambiar: (v) => { r.max = v; if (r.min > v) { r.min = v; smin.fijar(v); } } });
        poner(c, seccion({ pie: "Series efectivas por semana (sin calentamiento)." }, lista([celda({ titulo: "Mínimo", control: smin }), celda({ titulo: "Máximo", control: smax })])),
          o ? seccion({}, lista([celda({ titulo: "Quitar objetivo", estilo: "peligro", alPulsar: async () => {
            await store.guardarAjustes((a) => { a.objetivos.seriesSemana = a.objetivos.seriesSemana.filter((x) => canon(x.grupo) !== canon(grupo)); }); app.cerrarHoja(); } })])) : null);
      },
    });
  }
  return {
    titulo: "Objetivos",
    render(c) {
      const A = store.estado.ajustes, obj = A.objetivos.seriesSemana || [];
      poner(c,
        seccion({ cab: "Series por semana", pie: "Hoy y Progreso comparan tus series de cada grupo con este rango." }, lista(A.grupos.map((g) => {
          const o = obj.find((x) => canon(x.grupo) === canon(g.nombre));
          return celda({ punto: colorGrupo(A.grupos, g.nombre), titulo: g.nombre, valor: o ? o.min + "–" + o.max : "Sin objetivo", chevron: true, alPulsar: () => editarSeries(g.nombre) });
        }))),
        seccion({ cab: "Incremento por material", pie: "Cuánto subir el peso cuando toca, según el material del ejercicio." }, lista(A.objetivos.incrementos.map((t, i) => celda({
          titulo: capital(t.tipo), control: stepper({ valor: t.kg, min: 0.25, max: 10, paso: 0.25, formato: kgTxt, etiqueta: t.tipo, alCambiar: (v) => store.guardarAjustes((a) => { a.objetivos.incrementos[i].kg = v; }) }) })))),
        seccion({}, lista([celda({ icono: "bascula", colorIcono: "var(--g-morado)", titulo: "Peso corporal", sub: "Sexo y fases (volumen, definición)", chevron: true, alPulsar: () => app.nav.ir("cuerpo") })], { iconos: true })));
    },
  };
}
vistaObjetivos.pestana = "ajustes";

const FASES = [{ valor: "bulk", texto: "Volumen" }, { valor: "cut", texto: "Definición" }, { valor: "mantener", texto: "Mantener" }];
const faseTxt = (t) => (FASES.find((f) => f.valor === t) || { texto: t }).texto;

export function vistaCuerpo(_p, app) {
  const { store } = app;
  function editarFase(i) {
    const fases = store.estado.ajustes.cuerpo.fases || [];
    const f = i == null ? { tipo: "bulk", desde: store.hoy() } : Object.assign({}, fases[i]);
    app.abrirHoja({
      titulo: i == null ? "Nueva fase" : "Fase", alturas: ["media"],
      accion: { texto: "Guardar", alPulsar: () => store.guardarAjustes((a) => {
        const fs = (a.cuerpo.fases || []).slice();
        if (i == null) fs.push(f); else fs[i] = f;
        fs.sort((x, y) => (x.desde < y.desde ? -1 : 1));
        a.cuerpo.fases = fs;
      }) },
      render(c) {
        poner(c, seccion({ pie: "La fase dura hasta que empieza la siguiente. Define qué ritmo de peso es bueno." }, lista([
          fila(segmentado(FASES, f.tipo, (v) => { f.tipo = v; }, { etiqueta: "Fase" })),
          celda({ titulo: "Desde", control: h("input", { type: "date", class: "campo-fila", value: f.desde, "aria-label": "Desde", onChange: (e) => { if (e.target.value) f.desde = e.target.value; } }) }),
        ])), i != null ? seccion({}, lista([celda({ titulo: "Borrar fase", estilo: "peligro", alPulsar: async () => {
          await store.guardarAjustes((a) => { a.cuerpo.fases.splice(i, 1); }); app.cerrarHoja(); } })])) : null);
      },
    });
  }
  return {
    titulo: "Peso corporal",
    render(c) {
      const cu = store.estado.ajustes.cuerpo, fases = cu.fases || [], hoy = store.hoy();
      const actual = fases.filter((f) => !f.desde || f.desde <= hoy).pop();
      poner(c,
        seccion({ cab: "Sexo", pie: "Solo se usa para comparar tu fuerza con las tablas de estándares de las ligas." }, lista([fila(segmentado([{ valor: "h", texto: "Hombre" }, { valor: "m", texto: "Mujer" }], cu.sexo || "",
          (v) => store.guardarAjustes((a) => { a.cuerpo.sexo = v; }), { etiqueta: "Sexo" }))])),
        seccion({ cab: "Fases", pie: "En volumen se espera que el peso suba despacio; en definición, que baje; en mantener, que se quede estable." },
          lista([...fases.map((f, i) => celda({ titulo: faseTxt(f.tipo), sub: "Desde el " + fechaCorta(f.desde, hoy), valor: f === actual ? chip("Actual", "accent") : null, chevron: true, alPulsar: () => editarFase(i) })).reverse(), celda({ titulo: "Añadir fase", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: () => editarFase(null) })])),
        seccion({}, lista([celda({ titulo: "Añadir pesaje", chevron: true, alPulsar: () => abrirPesaje(app) })])));
    },
  };
}
vistaCuerpo.pestana = "ajustes";

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

/* ---------- Entrenamiento ---------- */

export function vistaEntrenamiento(_p, app) {
  const { store } = app;
  const g = (f) => store.guardarAjustes((a) => f(a.entreno), { analitico: false });
  return {
    titulo: "Entrenamiento",
    render(c) {
      const e = store.estado.ajustes.entreno;
      const presets = (e.presets || []).slice().sort((a, b) => a - b);
      poner(c,
        seccion({ cab: "Descanso", pie: "Se pone en marcha al marcar una serie. Los atajos aparecen al tocar el cronómetro." }, lista([
          celda({ titulo: "Por defecto", control: stepper({ valor: e.descanso, min: 0, max: 600, paso: 15, formato: (v) => (v ? minSeg(v) : "No"), etiqueta: "descanso", alCambiar: (v) => g((x) => { x.descanso = v; }) }) }),
          ...presets.map((p) => celda({ titulo: "Atajo", valor: minSeg(p), alBorrar: presets.length > 1 ? () => g((x) => { x.presets = presets.filter((y) => y !== p); }) : null })),
          presets.length < 6 ? celda({ titulo: "Añadir atajo", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: async () => {
            const v = await app.hojaAcciones({ mensaje: "Nuevo atajo", opciones: [45, 75, 150, 240, 300].filter((x) => !presets.includes(x)).map((x) => ({ texto: minSeg(x), valor: x })) });
            if (v) g((x) => { x.presets = [...presets, v]; });
          } }) : null,
        ].filter(Boolean))),
        seccion({ cab: "Al apuntar", pie: "Cuánto cambian los botones − y + del peso en el teclado." }, lista([
          celda({ titulo: "Paso del peso", control: stepper({ valor: e.pasoPeso, min: 0.25, max: 10, paso: 0.25, formato: kgTxt, etiqueta: "paso del peso", alCambiar: (v) => g((x) => { x.pasoPeso = v; }) }) }),
          celda({ titulo: "Sonido al acabar el descanso", control: interruptor(e.sonido !== false, (v) => g((x) => { x.sonido = v; }), "Sonido") }),
          celda({ titulo: "Mantener la pantalla encendida", control: interruptor(e.pantallaEncendida !== false, (v) => g((x) => { x.pantallaEncendida = v; }), "Pantalla encendida") }),
        ])));
    },
  };
}
vistaEntrenamiento.pestana = "ajustes";

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
      const avisoCel = [];
      for (const a of q.avisos) {
        if (a.codigo === "sinSexo") avisoCel.push(celda({ titulo: "Falta el sexo", sub: "Sin él no se calculan las ligas", chevron: true, alPulsar: () => app.nav.ir("cuerpo", { pestana: "ajustes" }) }));
        if (a.codigo === "umbralSinRutina") avisoCel.push(celda({ titulo: "Aviso de duración sin rutina", sub: "«" + a.rutina + "» no tiene sesiones", chevron: true, alPulsar: () => app.nav.ir("rutinas", { pestana: "ajustes" }) }));
        if (a.codigo === "antesDelPeso") avisoCel.push(celda({ titulo: plural(a.n, "sesión anterior", "sesiones anteriores") + " al primer pesaje", sub: "No tienen liga: el primer pesaje es del " + fechaCorta(a.fecha, hoy) }));
      }
      const L = q.ligas;
      if (L.sinPeso && store.estado.sesiones.length) avisoCel.push(celda({ titulo: "Sin pesajes", sub: "Las ligas usan tu peso corporal", chevron: true, alPulsar: () => abrirPesaje(app) }));
      if (L.pesoViejo) avisoCel.push(celda({ titulo: "Último pesaje hace " + L.diasPeso + " días", sub: kg(L.ultimoPeso.kg) + " · pésate para que las ligas sigan al día", chevron: true, alPulsar: () => abrirPesaje(app) }));
      if (avisoCel.length) out.push(seccion({ cab: "Peso y ligas" }, lista(avisoCel)));
      if (L.sinEstandar.length) out.push(seccion({ cab: "Sin referencia de liga", pie: "Tienen rango de repeticiones pero no tabla de estándares." }, lista(L.sinEstandar.map((n) => celda({ titulo: n, chevron: true, alPulsar: () => irEj(canon(n)) })))));
      if (L.sinFactor.length) out.push(seccion({ cab: "Factor de liga sin revisar" }, lista(L.sinFactor.map((n) => celda({ titulo: n, chevron: true, alPulsar: () => irEj(canon(n)) })))));
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

/* ---------- Avanzado ---------- */

export function vistaAvanzado(_p, app) {
  const { store } = app;
  return {
    titulo: "Avanzado",
    render(c) {
      const L = store.estado.ajustes.ligas, est = store.estado.ajustes.estandares || {};
      const escala = L.escala || [];
      poner(c,
        seccion({ pie: escala.length ? "Compara tu fuerza con tablas de estándares según tu peso corporal." : "No hay escala de ligas: importa una copia que la incluya." }, lista([
          celda({ titulo: "Ligas", control: interruptor(!!L.activa && escala.length > 0, (v) => store.guardarAjustes((a) => { a.ligas.activa = v; }), "Ligas") }),
        ])),
        escala.length ? seccion({ cab: "Parámetros" }, lista([
          celda({ titulo: "Puntos por división", valor: fmt(L.puntos, 1) }),
          celda({ titulo: "Margen para bajar", valor: fmt(L.margen, 1) }),
          celda({ titulo: "Semanas de carga", valor: String(L.semCarga) }),
          celda({ titulo: "Semanas de series", valor: String(L.semSeries) }),
          celda({ titulo: "Corrección de polea", valor: "×" + fmt(L.correccionPolea, 2) }),
        ])) : null,
        escala.length ? seccion({ cab: "Escala" }, lista(escala.map((x) => celda({ titulo: x.nombre, valor: fmt(x.desde, 0) + (x.hasta == null ? "+" : "–" + fmt(x.hasta, 0)) + (x.ndiv ? " · " + x.ndiv + " div." : "") })))) : null,
        Object.keys(est).length ? seccion({ cab: "Tablas de estándares", pie: "Solo lectura. Asigna una tabla a cada ejercicio desde su ficha." }, lista(Object.keys(est).sort().map((k) => {
          const n = store.estado.catalogo.filter((x) => x.estandar && x.estandar.slug === k).length;
          return celda({ titulo: k, sub: plural(est[k].length, "fila", "filas"), valor: n ? plural(n, "ejercicio", "ejercicios") : null });
        }))) : null);
    },
  };
}
vistaAvanzado.pestana = "ajustes";

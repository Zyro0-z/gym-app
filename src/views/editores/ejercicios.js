// Ajustes › Catálogo de ejercicios: lista y ficha de cada ejercicio.
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { seccion, lista, celda, vacio, interruptor, stepper, pedirTexto } from "../../ui/controles.js";
import { colorGrupo } from "../../ui/tema.js";
import { fmt, plural } from "../../core/formato.js";
import { canon, sinTildes } from "../../core/nombres.js";
import { capital, reloj } from "../../ui/textos.js";
import { elegirEjercicio, nuevoEjercicio } from "../selector.js";
import { kgTxt, usosEjercicio, renombrarEjercicio, unirDuplicados } from "./comun.js";
import { MUSCULOS, nombreMusculo, baseQueFalta, estandarDe, duplicadosBase } from "../../core/musculos.js";
import { seccionAsignarMusculos } from "../musculos.js";

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
    render(c) {
      const faltan = baseQueFalta(store.estado.catalogo).length;
      poner(c, h("div", { class: "seccion" }, buscador), resultados,
        faltan ? seccion({ pie: "Añade ejercicios habituales con su grupo, material y músculos (principales y secundarios) ya rellenados. No toca los que ya tienes." },
          lista([celda({ titulo: "Añadir ejercicios comunes", sub: faltan + " disponibles", estilo: "accion", alPulsar: async () => {
            const nuevos = baseQueFalta(store.estado.catalogo);
            const tablas = store.estado.ajustes.estandares;
            await store.guardarCatalogo([...store.estado.catalogo, ...nuevos.map((x) => Object.assign(JSON.parse(JSON.stringify(x)), { estandar: estandarDe(x.nombre, tablas) }))]);
            app.toast(plural(nuevos.length, "ejercicio añadido", "ejercicios añadidos")); this.render(c); pintar();
          } })])) : null,
        duplicadosBase(store.estado.catalogo).length ? seccion({ pie: "Une los ejercicios repetidos («Press Banca (Barra)» y «Press banca») en el que lleva el nombre del catálogo base. El historial y las rutinas pasan al que se conserva." },
          lista([celda({ titulo: "Unir ejercicios duplicados", sub: duplicadosBase(store.estado.catalogo).reduce((a, g) => a + g.unir.length, 0) + " se unen", estilo: "accion", alPulsar: async () => {
            const n = duplicadosBase(store.estado.catalogo).reduce((a, g) => a + g.unir.length, 0);
            if (!(await app.confirmar("¿Unir " + n + " ejercicios duplicados?", "Se conserva el nombre del catálogo base y todo el historial.", "Unir"))) return;
            await unirDuplicados(app); app.toast(plural(n, "ejercicio unido", "ejercicios unidos")); this.render(c); pintar();
          } })])) : null,
        seccionAsignarMusculos(app, () => { this.render(c); }));
      pintar();
    },
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
    if (i < 0) { const n = store.estado.sesiones.flatMap((s) => s.ejercicios).find((e) => e.ejercicioId === id || canon(e.nombre) === id); cat.push(nuevoEjercicio(n ? n.nombre : id, null, store.estado.ajustes.estandares)); i = cat.length - 1; }
    const x = JSON.parse(JSON.stringify(cat[i])); f(x); cat[i] = x;
    await store.guardarCatalogo(cat);
  };
  const DESCANSOS = [30, 45, 60, 90, 120, 150, 180, 240, 300];
  const opciones = async (mensaje, ops) => app.hojaAcciones({ mensaje, opciones: ops });
  async function renombrar() {
    const e = ej(), nombre = await pedirTexto(app, { titulo: "Nombre del ejercicio", valor: e.nombre });
    if (!nombre || nombre === e.nombre) return;
    if (canon(nombre) === id) { await guardar((x) => { x.nombre = nombre; }); return; }
    const nid = await renombrarEjercicio(app, id, nombre);
    if (nid) app.nav.atras().then(() => app.nav.ir("ejercicioCat/" + encodeURIComponent(nid)));
  }
  async function borrar() {
    const e = ej(), usos = usosEjercicio(store, id);
    if (!(await app.confirmar("¿Borrar «" + e.nombre + "»?", usos ? "Se quita del catálogo, de las rutinas y de " + plural(usos, "sesión", "sesiones") + " del historial (las que se queden sin ejercicios se borran). No se puede deshacer." : "Se quita del catálogo y de las rutinas.", usos ? "Borrar con su historial" : "Borrar", true))) return;
    await store.borrarEjercicio(id);
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
          celda({ titulo: "Descanso", sub: "Sustituye al de Ajustes", valor: e.descanso ? reloj(e.descanso) : "Como en Ajustes", chevron: true,
            alPulsar: async () => { const v = await opciones("Descanso tras cada serie", [...DESCANSOS.map((s) => ({ texto: reloj(s), valor: s })), { texto: "Como en Ajustes", valor: "-" }]); if (v !== null) guardar((x) => { if (v === "-") delete x.descanso; else x.descanso = v; }); } }),
        ])),
        seccion({ cab: "Carga y músculos", pie: "Lastre: lo que apuntas se suma a tu peso corporal (dominadas, fondos). Asistido: se resta (máquina de ayuda). Se usa el último pesaje anterior a la sesión. Los músculos alimentan el volumen por músculo y el mapa corporal." }, lista([
          ...(e.tipoAncla === "peso" || !e.tipoAncla ? [celda({ titulo: "Carga", valor: e.modoCarga === "lastre" ? "Peso corporal + lastre" : e.modoCarga === "asistido" ? "Peso corporal − ayuda" : "Peso apuntado", chevron: true,
            alPulsar: async () => { const v = await opciones("Qué significa el peso que apuntas", [{ texto: "Peso apuntado (barra, mancuernas, máquina)", valor: "total" }, { texto: "Peso corporal + lastre", valor: "lastre" }, { texto: "Peso corporal − ayuda", valor: "asistido" }]); if (v) guardar((x) => { if (v === "total") delete x.modoCarga; else x.modoCarga = v; }); } })] : []),
          celda({ titulo: "Músculos", valor: musculosTxt(e), chevron: true, alPulsar: () => editarMusculos(app, e, guardar, () => this.render(c)) }),
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
        seccion({ pie: usos ? "Aparece en " + plural(usos, "sesión", "sesiones") + (enRutinas.length ? " y en " + enRutinas.join(", ") : "") + ". Para unirlo con otro, cámbiale el nombre al de ese ejercicio." : enRutinas.length ? "Está en " + enRutinas.join(", ") + "." : null },
          lista([celda({ titulo: usos ? "Borrar ejercicio y su historial" : "Borrar ejercicio", estilo: "peligro", alPulsar: borrar })])));
    },
  };
}
vistaEjercicioCat.pestana = "ajustes";

const musculosTxt = (e) => {
  const m = e.musculos;
  if (!m || (!m.p.length && !m.s.length)) return "Sin asignar";
  return m.p.map(nombreMusculo).slice(0, 2).join(", ") + (m.p.length > 2 ? " +" + (m.p.length - 2) : "") + (m.s.length ? " · " + m.s.length + " secund." : "");
};

/** Un toque cambia cada músculo: ninguno → principal → secundario → ninguno. */
function editarMusculos(app, e, guardar, alCerrar) {
  const est = new Map();
  for (const id of (e.musculos && e.musculos.p) || []) est.set(id, "p");
  for (const id of (e.musculos && e.musculos.s) || []) est.set(id, "s");
  const ROT = { undefined: "p", p: "s", s: undefined };
  app.abrirHoja({
    titulo: "Músculos", alturas: ["grande"], cancelar: "Cancelar",
    accion: { texto: "Guardar", alPulsar: async () => {
      const p = MUSCULOS.filter((m) => est.get(m.id) === "p").map((m) => m.id), s = MUSCULOS.filter((m) => est.get(m.id) === "s").map((m) => m.id);
      await guardar((x) => { if (p.length || s.length) x.musculos = { p, s }; else delete x.musculos; });
      alCerrar();
    } },
    render(c) {
      const pintar = () => poner(c, seccion({ pie: "Principal: cuenta como una serie completa. Secundario: cuenta una fracción." }, lista(MUSCULOS.map((m) => celda({ titulo: m.nombre, sub: m.grupo,
        valor: est.get(m.id) === "p" ? "Principal" : est.get(m.id) === "s" ? "Secundario" : "—",
        alPulsar: () => { const n = ROT[est.get(m.id)]; if (n) est.set(m.id, n); else est.delete(m.id); pintar(); } })))));
      pintar();
    },
  });
}

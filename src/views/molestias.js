// Progreso › Molestias: registro de molestias articulares (dónde, cuánto, con qué ejercicio) y su evolución.
// Solo recoge y resume lo que anotas; no diagnostica. Si duele de verdad o dura, es cosa de un fisioterapeuta.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio, chip } from "../ui/controles.js";
import { sparkline } from "../ui/graficas.js";
import { seleccion, exito } from "../ui/haptica.js";
import { ARTICULACIONES, LADOS, NIVELES, nombreArticulacion, nuevoId, validarMolestia, resumenMolestias, porEjercicio, ordenar } from "../core/molestias.js";
import { plural } from "../core/formato.js";
import { fechaCorta, capital } from "../ui/textos.js";

const ladoTxt = (l) => (LADOS.find((x) => x.id === l) || {}).texto || "";
const nombreEj = (cat, id) => { const c = cat.find((x) => x.id === id); return c ? c.nombre : id; };

/** Hoja para anotar (o editar) una molestia. `previo`: valores iniciales (articulación, ejercicioId…). */
export function anotarMolestia(app, previo = {}, original = null) {
  const { store } = app;
  const hoy = store.hoy();
  const m = Object.assign({ id: nuevoId(hoy), fecha: hoy, articulacion: "", lado: null, nivel: 2, ejercicioId: null, nota: "" }, previo, original || {});
  const select = (opciones, valor, etiqueta, alCambiar) => h("select", { class: "campo-fila", "aria-label": etiqueta, onChange: (e) => alCambiar(e.target.value) },
    opciones.map(([v, t]) => h("option", { value: v, selected: v === (valor == null ? "" : valor) }, t)));
  const niveles = h("div", { class: "nivel-molestia", role: "radiogroup", "aria-label": "Nivel de molestia" });
  const pintarNiveles = () => {
    poner(niveles, NIVELES.map((n) => h("button", { role: "radio", "aria-checked": String(m.nivel === n.n), "aria-label": n.n + ", " + n.texto, dataset: n.n >= 4 ? { alto: "1" } : {},
      onClick: () => { m.nivel = n.n; seleccion(); pintarNiveles(); pintarTexto(); } }, String(n.n))));
  };
  const texto = h("div", { class: "etiqueta", style: { marginTop: "6px" }, "aria-live": "polite" });
  const pintarTexto = () => { texto.textContent = (NIVELES.find((n) => n.n === m.nivel) || {}).texto || ""; };
  const nota = h("textarea", { class: "campo-texto", rows: 2, placeholder: "Qué notas, cuándo aparece…", "aria-label": "Nota", style: { padding: "10px 12px" }, onInput: (e) => { m.nota = e.target.value; } }, m.nota);
  const fecha = h("input", { type: "date", class: "campo-fila", value: m.fecha, max: hoy, "aria-label": "Fecha", onChange: (e) => { if (e.target.value) m.fecha = e.target.value; } });
  const inicial = JSON.stringify(m);
  app.abrirHoja({
    titulo: original ? "Molestia" : "Anotar molestia", alturas: ["grande"],
    sucio: () => JSON.stringify(m) !== inicial,
    accion: { texto: "Guardar", alPulsar: async () => {
      const x = { id: m.id, fecha: m.fecha, articulacion: m.articulacion, nivel: m.nivel };
      if (m.lado) x.lado = m.lado; if (m.ejercicioId) x.ejercicioId = m.ejercicioId; if (m.nota.trim()) x.nota = m.nota.trim();
      const p = validarMolestia(x, hoy);
      if (p.length) { await app.alerta({ titulo: "Revisa la molestia", mensaje: p.join(" ") }); return false; }
      const otras = (store.estado.molestias || []).filter((y) => y.id !== x.id);
      await store.guardarMolestias(otras.concat([x]));
      exito(); app.toast("Molestia anotada");
    } },
    render(c) {
      pintarNiveles(); pintarTexto();
      const cat = store.estado.catalogo.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      poner(c,
        seccion({}, lista([
          celda({ titulo: "Articulación", control: select([["", "Elige…"], ...ARTICULACIONES.map((a) => [a.id, a.texto])], m.articulacion, "Articulación", (v) => { m.articulacion = v; }) }),
          celda({ titulo: "Lado", control: select([["", "—"], ...LADOS.map((l) => [l.id, l.texto])], m.lado, "Lado", (v) => { m.lado = v || null; }) }),
          celda({ titulo: "Ejercicio", control: select([["", "Ninguno"], ...cat.map((x) => [x.id, x.nombre])], m.ejercicioId, "Ejercicio", (v) => { m.ejercicioId = v || null; }) }),
          celda({ titulo: "Fecha", control: fecha }),
        ])),
        seccion({ cab: "Cuánto molesta", pie: "1 se nota apenas · 3 molesta al cargar · 5 no puedes cargarla." }, h("div", { class: "tarjeta" }, niveles, texto)),
        seccion({ cab: "Nota" }, h("div", { class: "tarjeta" }, nota)));
    },
  });
}

export function vistaMolestias(_p, app) {
  const { store } = app;
  return {
    titulo: "Molestias",
    derecha: () => [h("button", { class: "btn-barra", onClick: () => anotarMolestia(app) }, "Anotar")],
    render(c) {
      const l = store.estado.molestias || [], hoy = store.hoy(), cat = store.estado.catalogo;
      if (!l.length) {
        poner(c, vacio({ icono: "info", titulo: "Sin molestias anotadas", texto: "Apunta una molestia cuando aparezca (también desde el menú de un ejercicio en el entrenamiento) y verás aquí si se repite, con qué ejercicio y cómo evoluciona.",
          acciones: [{ texto: "Anotar molestia", alPulsar: () => anotarMolestia(app) }] }));
        return;
      }
      const R = resumenMolestias(l, hoy), E = porEjercicio(l, hoy);
      poner(c,
        R.length ? seccion({ cab: "Últimos 30 días", pie: "El gráfico es el nivel medio por semana en 8 semanas. «Persistente»: 3 o más anotaciones de nivel 3 o más en 14 días; con eso conviene bajar la carga de lo que la provoca y, si sigue, consultarlo con un fisioterapeuta." },
          lista(R.map((r) => celda({ titulo: r.texto, sub: plural(r.n30, "anotación", "anotaciones") + " · máx. " + r.max30 + " · última " + fechaCorta(r.ultima, hoy),
            valor: h("span", { class: "valor-tend" }, sparkline(r.semanas.map((v) => (v == null ? 0 : v)), { ancho: 56, alto: 20 }), r.persistente ? chip("Persistente", "warn") : null),
            alPulsar: () => anotarMolestia(app, { articulacion: r.id }) })))) : null,
        E.length ? seccion({ cab: "Ejercicios asociados · 60 días", pie: "Cuántas veces anotaste una molestia con ese ejercicio. Asociar no es culpar: puede ser la técnica, la carga o el día." },
          lista(E.slice(0, 6).map((e) => celda({ titulo: nombreEj(cat, e.ejercicioId), sub: "máx. " + e.max, valor: String(e.n),
            alPulsar: cat.some((x) => x.id === e.ejercicioId) ? () => app.nav.ir("ejercicio/" + encodeURIComponent(e.ejercicioId)) : undefined, chevron: cat.some((x) => x.id === e.ejercicioId) }))) ) : null,
        seccion({ cab: "Historial" }, lista(ordenar(l).slice(0, 60).map((m) => celda({
          titulo: nombreArticulacion(m.articulacion) + (m.lado ? " · " + ladoTxt(m.lado).toLowerCase() : ""),
          sub: [capital(fechaCorta(m.fecha, hoy)), m.ejercicioId ? nombreEj(cat, m.ejercicioId) : null, m.nota || null].filter(Boolean).join(" · "),
          valor: chip("Nivel " + m.nivel, m.nivel >= 4 ? "bad" : m.nivel === 3 ? "warn" : null), alPulsar: () => anotarMolestia(app, {}, m),
          alBorrar: async () => { await store.guardarMolestias((store.estado.molestias || []).filter((x) => x.id !== m.id)); app.toast("Molestia borrada"); } })))));
    },
  };
}

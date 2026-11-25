// Progreso › Cuerpo › Medidas corporales: cintura, pecho, brazo, muslo, cadera y cuello (cm).
// Una entrada por fecha; todas las medidas son opcionales. Van en la copia y se exportan a CSV.
import { h, poner } from "../ui/dom.js";
import { icono } from "../ui/iconos.js";
import { seccion, lista, celda, vacio, segmentado } from "../ui/controles.js";
import { graficaLinea } from "../ui/graficas.js";
import { fmt, leerNumero } from "../core/formato.js";
import { numDia, deNum } from "../core/fechas.js";
import { MEDIDAS, CLAVES_MEDIDAS, validarMedida, ponerMedida, serieMedida, ultimaMedida } from "../core/medidas.js";
import { csvMedidas } from "../core/csv.js";
import { fechaCorta, capital } from "../ui/textos.js";
import { guardarArchivo } from "./datos.js";

const cm = (v) => fmt(v, Number.isInteger(v) ? 0 : 1) + " cm";
const conSigno = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v), Number.isInteger(v) ? 0 : 1) + " cm";

/** Hoja para añadir o editar las medidas de una fecha. */
export function editarMedidas(app, original = null) {
  const { store } = app;
  const hoy = store.hoy();
  const fecha = h("input", { type: "date", class: "campo-fila", value: original ? original.fecha : hoy, max: hoy, "aria-label": "Fecha" });
  const campos = {};
  for (const m of MEDIDAS) campos[m.k] = h("input", { class: "campo-fila num", type: "text", inputmode: "decimal", autocomplete: "off", placeholder: "—",
    value: original && original[m.k] != null ? String(original[m.k]).replace(".", ",") : "", "aria-label": m.texto + " en centímetros", style: { textAlign: "right", width: "84px" } });
  const leer = () => {
    const x = { fecha: fecha.value };
    for (const k of CLAVES_MEDIDAS) { const t = campos[k].value.trim(); if (t) { const v = leerNumero(t); x[k] = Number.isFinite(v) ? v : NaN; } }
    return x;
  };
  app.abrirHoja({
    titulo: original ? "Medidas" : "Nuevas medidas", alturas: ["grande"],
    sucio: () => JSON.stringify(leer()) !== JSON.stringify(original || { fecha: hoy }),
    accion: { texto: "Guardar", alPulsar: async () => {
      const x = leer();
      const p = validarMedida(x, hoy);
      if (p.length) { await app.alerta({ titulo: "Revisa las medidas", mensaje: p.join(" ") }); return false; }
      const otras = (store.estado.medidas || []).filter((m) => !original || m.fecha !== original.fecha);
      if (otras.some((m) => m.fecha === x.fecha) && !(await app.confirmar("Ya hay medidas de ese día", "Se sustituyen por estas.", "Sustituir"))) return false;
      await store.guardarMedidas(ponerMedida(otras, x));
      app.toast("Medidas guardadas");
    } },
    render(c) {
      poner(c,
        seccion({}, lista([celda({ titulo: "Fecha", control: fecha })])),
        seccion({ cab: "Centímetros", pie: "Mide siempre a la misma hora y con la cinta en el mismo sitio." },
          lista(MEDIDAS.map((m) => celda({ titulo: m.texto, control: h("span", { class: "fila", style: { gap: "6px" } }, campos[m.k], h("span", { class: "c-2" }, "cm")) })))));
    },
  });
}

let sel = null;   // medida elegida en el selector (se recuerda entre Cuerpo y Medidas)

/** Tarjeta con el selector de medida y su gráfica; null si aún no hay medidas. `repintar` se llama al cambiar de medida. */
export function tarjetaMedidas(app, repintar) {
  const l = app.store.estado.medidas || [], hoy = app.store.hoy();
  if (!l.length) return null;
  const conDatos = MEDIDAS.filter((m) => serieMedida(l, m.k).length);
  if (!sel || !conDatos.some((m) => m.k === sel)) sel = conDatos[0].k;
  const pts = serieMedida(l, sel);
  const nombre = MEDIDAS.find((m) => m.k === sel).texto;
  const grafica = pts.length >= 2
    ? graficaLinea({ puntos: pts.map((p) => ({ x: numDia(p.fecha), y: p.valor, detalle: capital(fechaCorta(p.fecha, hoy)) })), formato: cm, ejeX: (n) => fechaCorta(deNum(n)), area: false, etiqueta: nombre + " a lo largo del tiempo" })
    : h("p", { class: "etiqueta", style: { padding: "24px 0", textAlign: "center" } }, "Con dos mediciones verás la evolución.");
  const elegir = async () => { const v = await app.hojaAcciones({ mensaje: "Medida", opciones: conDatos.map((m) => ({ texto: m.texto + (m.k === sel ? " · actual" : ""), valor: m.k })) }); if (v) { sel = v; repintar(); } };
  const selector = conDatos.length < 2 ? h("div", { class: "t-headline" }, nombre)
    : conDatos.length <= 3 ? segmentado(conDatos.map((m) => ({ valor: m.k, texto: m.texto })), sel, (v) => { sel = v; repintar(); }, { etiqueta: "Medida" })
    : h("button", { class: "btn gris peq tap", onClick: elegir, "aria-label": "Medida: " + nombre + ". Cambiar" }, h("span", null, nombre), icono("chevron-abajo", { tam: 16 }));
  return h("div", { class: "tarjeta" }, h("div", { style: { marginBottom: "8px", display: "flex" } }, selector), grafica);
}

export function vistaMedidas(_p, app) {
  const { store } = app;
  return {
    titulo: "Medidas",
    derecha: () => [h("button", { class: "btn-barra", onClick: () => editarMedidas(app) }, "Añadir")],
    render(c) {
      const l = store.estado.medidas || [], hoy = store.hoy();
      if (!l.length) {
        poner(c, vacio({ icono: "bascula", titulo: "Sin medidas", texto: "Apunta cintura, brazo y las demás de vez en cuando para ver cómo cambian.", acciones: [{ texto: "Añadir medidas", alPulsar: () => editarMedidas(app) }] }));
        return;
      }
      const conDatos = MEDIDAS.filter((m) => serieMedida(l, m.k).length);
      const tarjeta = tarjetaMedidas(app, () => this.render(c));
      poner(c,
        seccion({}, tarjeta),
        seccion({ cab: "Últimas" }, lista(conDatos.map((m) => {
          const u = ultimaMedida(l, m.k);
          return celda({ titulo: m.texto, sub: u.cambio != null ? conSigno(u.cambio) + " desde el " + fechaCorta(u.desde, hoy) : capital(fechaCorta(u.fecha, hoy)),
            valor: h("span", { class: "num" }, cm(u.valor)) });
        }))),
        seccion({ cab: "Mediciones", accion: { texto: "Exportar CSV", alPulsar: async () => { if (await guardarArchivo(app, csvMedidas(l, CLAVES_MEDIDAS, store.estado.ajustes), "gym-medidas-" + hoy + ".csv", "text/csv")) app.toast("CSV exportado"); } } },
          lista([...l].reverse().map((m) => celda({ titulo: capital(fechaCorta(m.fecha, hoy)), sub: MEDIDAS.filter((x) => m[x.k] != null).map((x) => x.texto + " " + cm(m[x.k])).join(" · "), chevron: true,
            alPulsar: () => editarMedidas(app, m),
            alBorrar: async () => { await store.guardarMedidas(l.filter((x) => x.fecha !== m.fecha)); app.toast("Medidas borradas", { icono: "papelera" }); } })))));
    },
  };
}

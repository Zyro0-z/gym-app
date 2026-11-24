// Ajustes › Mesociclos: bloques de N semanas (con descarga opcional al final) y su resumen con datos.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, vacio, chip, stepper, interruptor } from "../ui/controles.js";
import { graficaBarras } from "../ui/graficas.js";
import { exito } from "../ui/haptica.js";
import { lunesDe, masDias, ddmm } from "../core/fechas.js";
import { validarMesociclo, estadoMesociclo, finDeMeso, mesocicloActual, ponerMesociclo, quitarMesociclo, resumenMesociclo, SEMANAS_MIN_MESO, SEMANAS_MAX_MESO } from "../core/mesociclos.js";
import { plural, fmt } from "../core/formato.js";
import { fechaCorta, kgTotal } from "../ui/textos.js";

const lista0 = (store) => store.estado.ajustes.mesociclos || [];
const rpeTxt = (v) => (v == null ? "—" : fmt(v, 1));
const pct = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v), 1) + " %");

/** Texto corto del estado: «Semana 3 de 6», «Empieza el 24 nov», «Terminado». */
export function textoEstado(m, hoy) {
  const e = estadoMesociclo(m, hoy);
  return e.estado === "en curso" ? "Semana " + e.semana + " de " + m.semanas + (e.esDescarga ? " · descarga" : "") : e.estado === "futuro" ? "Empieza el " + fechaCorta(m.inicio, hoy) : "Terminado";
}

/** Hoja para crear o editar un mesociclo. */
function editarMesociclo(app, original = null) {
  const { store } = app;
  const hoy = store.hoy();
  const m = Object.assign({ id: "m" + Date.now().toString(36), nombre: "", inicio: lunesDe(hoy) === hoy ? hoy : masDias(lunesDe(hoy), 7), semanas: 6, descarga: true }, original || {});
  const nombre = h("input", { class: "campo-fila", type: "text", value: m.nombre, placeholder: "Acumulación, fuerza…", "aria-label": "Nombre", autocomplete: "off", style: { textAlign: "right" }, onInput: (e) => { m.nombre = e.target.value; } });
  const fecha = h("input", { type: "date", class: "campo-fila", value: m.inicio, "aria-label": "Primer lunes", onChange: (e) => { if (e.target.value) m.inicio = e.target.value; } });
  const inicial = JSON.stringify(m);
  app.abrirHoja({
    titulo: original ? "Mesociclo" : "Nuevo mesociclo", alturas: ["media", "grande"],
    sucio: () => JSON.stringify(m) !== inicial,
    accion: { texto: "Guardar", alPulsar: async () => {
      const p = validarMesociclo(m, lista0(store));
      if (p.length) { await app.alerta({ titulo: "Revisa el mesociclo", mensaje: p.join(" ") }); return false; }
      await store.guardarAjustes((a) => { ponerMesociclo(a, { id: m.id, nombre: m.nombre.trim(), inicio: m.inicio, semanas: m.semanas, descarga: !!m.descarga }); });
      exito(); app.toast("Mesociclo guardado");
    } },
    render(c) {
      poner(c, seccion({ pie: "Empieza en lunes. Si lleva descarga, la última semana se programa como semana de descarga (también la verás en Bloques)." }, lista([
        celda({ titulo: "Nombre", control: nombre }),
        celda({ titulo: "Primer lunes", control: fecha }),
        celda({ titulo: "Semanas", control: stepper({ valor: m.semanas, min: SEMANAS_MIN_MESO, max: SEMANAS_MAX_MESO, formato: (v) => String(v), etiqueta: "semanas", alCambiar: (v) => { m.semanas = v; } }) }),
        celda({ titulo: "Termina con descarga", control: interruptor(m.descarga, (v) => { m.descarga = v; }, "Termina con descarga") }),
      ])));
    },
  });
}

export function vistaMesociclos(_p, app) {
  const { store } = app;
  return {
    titulo: "Mesociclos",
    derecha: () => [h("button", { class: "btn-barra", onClick: () => editarMesociclo(app) }, "Nuevo")],
    render(c) {
      const l = lista0(store), hoy = store.hoy();
      if (!l.length) { poner(c, vacio({ icono: "capas", titulo: "Sin mesociclos", texto: "Un mesociclo agrupa unas semanas de entrenamiento (por ejemplo 5 de carga y 1 de descarga) para comparar cómo te fue en cada una.",
        acciones: [{ texto: "Crear mesociclo", alPulsar: () => editarMesociclo(app) }] })); return; }
      const act = mesocicloActual(l, hoy);
      poner(c, seccion({ cab: act ? "En curso" : "Mesociclos", pie: "Toca uno para ver sus semanas." }, lista(l.slice().reverse().map((m) => celda({
        titulo: m.nombre, sub: fechaCorta(m.inicio, hoy) + " → " + fechaCorta(finDeMeso(m), hoy) + " · " + plural(m.semanas, "semana", "semanas") + (m.descarga ? " · con descarga" : ""),
        valor: chip(textoEstado(m, hoy), act && act.id === m.id ? "accent" : null), chevron: true, alPulsar: () => app.nav.ir("mesociclo/" + encodeURIComponent(m.id)) })))));
    },
  };
}

export function vistaMesociclo([id], app) {
  const { store } = app;
  const buscar = () => lista0(store).find((x) => x.id === id);
  return {
    titulo: () => (buscar() ? buscar().nombre : "Mesociclo"),
    derecha: () => [h("button", { class: "btn-barra", onClick: () => { const m = buscar(); if (m) editarMesociclo(app, m); } }, "Editar")],
    render(c) {
      const m = buscar(), hoy = store.hoy();
      if (!m) { poner(c, vacio({ icono: "capas", titulo: "Mesociclo no encontrado", texto: "Puede que se haya borrado." })); return; }
      const A = store.analisis(), est = estadoMesociclo(m, hoy), R = resumenMesociclo(A, m);
      const semanas = R.filas.map((f, i) => ({ etiqueta: ddmm(f.lunes), valor: f.series, activa: f.lunes === lunesDe(hoy), vol: f.volumen, i }));
      poner(c,
        seccion({}, h("div", { class: "tarjeta" },
          h("div", { class: "fila entre" }, h("div", { class: "etiqueta" }, textoEstado(m, hoy)), est.estado === "en curso" ? chip("Quedan " + plural(est.restan, "día", "días"), null) : null),
          h("div", { class: "cifra t-title1 c-accent" }, plural(R.series, "serie", "series")),
          h("div", { class: "t-subhead c-2" }, [plural(R.sesiones, "sesión", "sesiones"), kgTotal(R.volumen), "RPE medio " + rpeTxt(R.rpe)].join(" · ")),
          R.e1rm.ejercicios ? h("div", { class: "t-subhead", style: { marginTop: "6px" } }, "e1RM de la primera a la última semana con datos: ", h("b", { class: "num" }, pct(R.e1rm.pct)), h("span", { class: "c-2" }, " (mediana de " + plural(R.e1rm.ejercicios, "ejercicio", "ejercicios") + ")")) : null,
          R.filas.length > 1 ? h("div", { style: { marginTop: "12px" } }, graficaBarras({ datos: semanas, formato: (v) => plural(v, "serie", "series"), detalle: (d) => "semana del " + d.etiqueta + " · " + kgTotal(d.vol), etiqueta: "Series por semana del mesociclo", alto: 150 })) : null)),
        seccion({ cab: "Semanas", pie: "RPE y e1RM salen de lo que anotas; «—» es que no hay dato." }, lista(R.filas.map((f, i) => celda({
          titulo: "Semana " + (i + 1) + (m.descarga && i === m.semanas - 1 ? " · descarga" : "") + " · " + ddmm(f.lunes), sub: f.sesiones ? [plural(f.series, "serie", "series"), "RPE " + rpeTxt(f.rpe), kgTotal(f.volumen)].join(" · ") : "Sin sesiones",
          valor: f.e1rmPct == null ? h("span", { class: "c-2" }, "—") : chip(pct(f.e1rmPct), f.e1rmPct >= 0.5 ? "ok" : f.e1rmPct <= -0.5 ? "bad" : null) })))),
        seccion({}, lista([celda({ titulo: "Borrar mesociclo", estilo: "destructiva", alPulsar: async () => {
          if (!(await app.confirmar("¿Borrar «" + m.nombre + "»?", "Se borra el mesociclo y su semana de descarga programada. Tus sesiones no se tocan.", "Borrar", true))) return;
          await store.guardarAjustes((a) => { quitarMesociclo(a, m.id); });
          app.toast("Mesociclo borrado"); app.nav.atras();
        } })])));
    },
  };
}

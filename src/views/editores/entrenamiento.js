// Ajustes › Entrenamiento: descanso, pasos de peso, sonido y pantalla.
import { h, poner } from "../../ui/dom.js";
import { icono } from "../../ui/iconos.js";
import { pedirTexto, seccion, lista, celda, interruptor, stepper } from "../../ui/controles.js";
import { minSeg, kgTxt } from "./comun.js";
import { leerNumero } from "../../core/formato.js";
import { gimnasiosDe, gimnasioActivo, idGimnasio } from "../../core/gimnasios.js";
import * as avisos from "../../ui/avisos.js";
import { disponible as hayMediaSession } from "../../ui/bloqueo.js";

/* ---------- Entrenamiento ---------- */

let avanzado = false;      // bloque «Avanzado» desplegado
let estadoPush = null;     // último resultado de activar o probar los avisos (se muestra al pie)

export function vistaEntrenamiento(_p, app) {
  const { store } = app;
  const g = (f) => store.guardarAjustes((a) => f(a.entreno), { analitico: false });
  // Los gimnasios se materializan en los ajustes la primera vez que se tocan
  const gg = (f) => store.guardarAjustes((a) => { if (!Array.isArray(a.gimnasios) || !a.gimnasios.length) a.gimnasios = JSON.parse(JSON.stringify(gimnasiosDe(a))); f(a); }, { analitico: false });
  return {
    titulo: "Entrenamiento",
    render(c) {
      const e = store.estado.ajustes.entreno, push = e.push || { activo: false, url: "" };
      const presets = (e.presets || []).slice().sort((a, b) => a - b);
      const gim = gimnasioActivo(store.estado.ajustes);
      poner(c,
        seccion({ cab: "Descanso", pie: "Se pone en marcha al marcar una serie. Los atajos aparecen al tocar el cronómetro." }, lista([
          celda({ titulo: "Por defecto", control: stepper({ valor: e.descanso, min: 0, max: 600, paso: 15, formato: (v) => (v ? minSeg(v) : "No"), etiqueta: "descanso", alCambiar: (v) => g((x) => { x.descanso = v; }) }) }),
          ...presets.map((p) => celda({ titulo: "Atajo", valor: minSeg(p), alBorrar: () => g((x) => { x.presets = presets.filter((y) => y !== p); }) })),
          presets.length < 6 ? celda({ titulo: "Añadir atajo", estilo: "accion", izquierda: h("span", { class: "c-accent", style: { display: "flex" } }, icono("mas", { tam: 22 })), alPulsar: async () => {
            const v = await app.hojaAcciones({ mensaje: "Nuevo atajo", opciones: [45, 75, 150, 240, 300].filter((x) => !presets.includes(x)).map((x) => ({ texto: minSeg(x), valor: x })) });
            if (v) g((x) => { x.presets = [...presets, v]; });
          } }) : null,
        ].filter(Boolean))),
        seccion({ cab: "Al apuntar", pie: "Cuánto cambian los botones − y + del peso en el teclado." }, lista([
          celda({ titulo: "Paso del peso", control: stepper({ valor: e.pasoPeso, min: 0.25, max: 10, paso: 0.25, formato: kgTxt, etiqueta: "paso del peso", alCambiar: (v) => g((x) => { x.pasoPeso = v; }) }) }),
          celda({ titulo: "Sonido al acabar el descanso", control: interruptor(e.sonido !== false, (v) => g((x) => { x.sonido = v; }), "Sonido") }),
        ])),
        seccion({ cab: "Pantalla", pie: "Con la pantalla encendida el iPhone no se bloquea mientras entrenas (se pide de nuevo al volver a la app)." }, lista([
          celda({ titulo: "Mantener la pantalla encendida", control: interruptor(e.pantallaEncendida !== false, (v) => g((x) => { x.pantallaEncendida = v; }), "Pantalla encendida") }),
        ])),
        seccion({ cab: "Gimnasio", pie: "Cada gimnasio tiene su barra y sus discos para la calculadora (menú de cada ejercicio, o «Discos» sobre el teclado). Cada sesión guarda dónde se hizo." }, lista([
          celda({ titulo: "Gimnasio", valor: gim.nombre, chevron: true, alPulsar: async () => {
            const lista_ = gimnasiosDe(store.estado.ajustes);
            const r = await app.hojaAcciones({ mensaje: "Gimnasio", opciones: [...lista_.map((x) => ({ texto: x.nombre + (x.id === gim.id ? " · actual" : ""), valor: "ir:" + x.id })),
              { texto: "Nuevo gimnasio", valor: "nuevo" }, { texto: "Renombrar «" + gim.nombre + "»", valor: "renombrar" }, ...(lista_.length > 1 ? [{ texto: "Eliminar «" + gim.nombre + "»", valor: "borrar", peligro: true }] : [])] });
            if (!r) return;
            if (r.startsWith("ir:")) { await gg((a) => { a.gimnasioActivo = r.slice(3); }); this.render(c); return; }
            if (r === "nuevo" || r === "renombrar") {
              const t = await pedirTexto(app, { titulo: r === "nuevo" ? "Nuevo gimnasio" : "Nombre del gimnasio", valor: r === "nuevo" ? "" : gim.nombre, placeholder: "Nombre" });
              const nombre = t && t.trim();
              if (!nombre) return;
              await gg((a) => {
                if (r === "nuevo") { const id = idGimnasio(nombre, a.gimnasios); a.gimnasios.push({ id, nombre, barra: gim.barra, discos: gim.discos.slice() }); a.gimnasioActivo = id; }
                else a.gimnasios.find((x) => x.id === gim.id).nombre = nombre;
              });
            } else if (r === "borrar") {
              if (!(await app.confirmar("¿Eliminar «" + gim.nombre + "»?", "Las sesiones ya guardadas conservan su gimnasio, pero dejará de aparecer su nombre.", "Eliminar", true))) return;
              await gg((a) => { a.gimnasios = a.gimnasios.filter((x) => x.id !== gim.id); a.gimnasioActivo = a.gimnasios[0].id; });
            }
            this.render(c);
          } }),
          celda({ titulo: "Barra", control: stepper({ valor: gim.barra, min: 0, max: 40, paso: 0.5, formato: kgTxt, etiqueta: "peso de la barra", alCambiar: (v) => gg((a) => { a.gimnasios.find((x) => x.id === gim.id).barra = v; }) }) }),
          celda({ titulo: "Discos", valor: gim.discos.map((d) => String(d).replace(".", ",")).join(" · ") || "Ninguno", chevron: true, alPulsar: async () => {
            const t = await pedirTexto(app, { titulo: "Discos (kg)", valor: gim.discos.map((d) => String(d).replace(".", ",")).join("; "), placeholder: "25; 20; 15; 10; 5; 2,5; 1,25" });
            if (t == null) return;
            const l = [...new Set(t.split(/[;\s]+/).map(leerNumero).filter((v) => Number.isFinite(v) && v > 0 && v <= 50))].sort((a, b) => b - a);
            if (!l.length) { await app.alerta({ titulo: "Sin discos", mensaje: "Escribe los tamaños separados por punto y coma, por ejemplo 20; 10; 2,5." }); return; }
            gg((a) => { a.gimnasios.find((x) => x.id === gim.id).discos = l; });
          } }),
        ])),
        seccion({ cab: "Avanzado", pie: avanzado ? null : "Controles en la pantalla bloqueada, aviso al terminar el descanso." }, lista([
          celda({ titulo: avanzado ? "Ocultar opciones avanzadas" : "Opciones avanzadas", estilo: "accion", chevron: true, alPulsar: () => { avanzado = !avanzado; this.render(c); } }),
        ])),
        ...(avanzado ? [
          seccion({ cab: "Pantalla bloqueada", pie: "Controles en la pantalla bloqueada es experimental: usa el reproductor del sistema con un audio en silencio, así que pausa la música que estés escuchando, " +
            "y iOS puede quitarlos si la app pasa mucho rato en segundo plano. Siguiente salta el descanso o marca la serie; anterior lo reinicia; avanzar y retroceder suman o restan 15 s." +
            (hayMediaSession() ? "" : " Este navegador no los admite.") }, lista([
          celda({ titulo: "Controles en la pantalla bloqueada", sub: "Experimental", control: interruptor(!!e.controlesBloqueo, (v) => g((x) => { x.controlesBloqueo = v; }), "Controles en la pantalla bloqueada") }),
          ])),
          seccion({ cab: "Aviso al terminar el descanso", pie: estadoPush || ("Opcional: necesita un servidor propio (servidor/README.md) y, en iPhone, la app instalada en la pantalla de inicio (iOS 16.4 o posterior). " +
            "Sin él, al volver a la app verás «Descanso terminado hace …».") }, lista([
            celda({ titulo: "Servidor", valor: push.url ? push.url.replace(/^https?:\/\//, "") : "Sin configurar", chevron: true, alPulsar: async () => {
              const t = await pedirTexto(app, { titulo: "Servidor de avisos", valor: push.url || "", placeholder: "https://gym-avisos.….workers.dev" });
              if (t == null) return;
              const url = t.trim().replace(/\/+$/, "");
              if (url && !avisos.urlValida(url)) { await app.alerta({ titulo: "Dirección no válida", mensaje: "Tiene que empezar por https://." }); return; }
              estadoPush = null;
              g((x) => { x.push = { activo: !!url && !!(x.push && x.push.activo), url }; });
            } }),
            push.url ? celda({ titulo: "Avisar al terminar el descanso", control: interruptor(!!push.activo, async (v) => {
              if (v) {
                try { await avisos.suscripcion(push.url); estadoPush = "Avisos activados en este dispositivo."; }
                catch (err) { estadoPush = err.message; g((x) => { x.push = Object.assign({}, x.push, { activo: false }); }); return; }
              } else { await avisos.cancelar(push.url); await avisos.baja(); estadoPush = null; }
              g((x) => { x.push = Object.assign({}, x.push, { activo: v }); });
            }, "Avisar al terminar el descanso") }) : null,
            push.url && push.activo ? celda({ titulo: "Enviar aviso de prueba", estilo: "accion", alPulsar: async () => {
              try { await avisos.probar(push.url); estadoPush = "Enviado. Si no llega en unos segundos, revisa el permiso de notificaciones de la app."; }
              catch (err) { estadoPush = "No se pudo enviar: " + err.message; }
              this.render(c);
            } }) : null,
          ].filter(Boolean))),
        ] : []));
    },
  };
}
vistaEntrenamiento.pestana = "ajustes";

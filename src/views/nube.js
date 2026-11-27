// Ajustes › Datos › Copia en la nube: copia cifrada de extremo a extremo en un servidor propio (opcional).
// La app cifra aquí, con una clave que no sale de este iPhone; el servidor solo guarda un sobre ilegible.
import { h, poner } from "../ui/dom.js";
import { seccion, lista, celda, interruptor, boton } from "../ui/controles.js";
import { exito } from "../ui/haptica.js";
import { generarClave, problemaDeClave, normalizarClave } from "../core/cifrado.js";
import { normalizarUrl } from "../data/nube.js";
import { plural } from "../core/formato.js";
import { fechaCorta, capital } from "../ui/textos.js";

const tamano = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");

export function vistaNube(_p, app) {
  const { store } = app;
  let clave = null, info, verClave = false;      // clave: texto guardado; info: undefined (sin pedir), null (no hay copia) o { bytes, at }
  const cargar = async () => { clave = await store.claveNube(); try { info = clave && store.estado.ajustes.nube.url ? await store.infoNube() : undefined; } catch (e) { info = undefined; } app.nav.repintarActual(); };
  const guardarNube = (f) => store.guardarAjustes((a) => f(a.nube), { analitico: false });

  async function poner_url() {
    const url = h("input", { class: "campo-texto", type: "url", inputmode: "url", autocomplete: "off", autocapitalize: "off", spellcheck: false, placeholder: "https://gym-avisos.tu-cuenta.workers.dev", "aria-label": "Dirección del servidor", value: store.estado.ajustes.nube.url || "" });
    app.abrirHoja({ titulo: "Servidor", alturas: ["media"], accion: { texto: "Guardar", alPulsar: async () => {
      const u = url.value.trim() ? normalizarUrl(url.value) : "";
      if (u === null) { await app.alerta({ titulo: "Dirección no válida", mensaje: "Tiene que empezar por https:// (la del servidor que ya desplegaste sirve)." }); return false; }
      await guardarNube((n) => { n.url = u; }); cargar();
    } }, render: (c) => poner(c, seccion({ pie: "Es la dirección de tu servidor de copias: tiene que estar desplegado con el espacio KV «COPIAS» (servidor/README.md)." }, h("div", { class: "tarjeta" }, url))) });
  }

  async function poner_clave() {
    const nueva = h("input", { class: "campo-texto", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: false, placeholder: "Una frase larga o la clave generada", "aria-label": "Clave" });
    app.abrirHoja({ titulo: "Clave", alturas: ["media", "grande"], accion: { texto: "Guardar", alPulsar: async () => {
      const t = nueva.value.trim(), p = problemaDeClave(t);
      if (p) { await app.alerta({ titulo: "Clave débil", mensaje: p }); return false; }
      await store.guardarClaveNube(normalizarClave(t)); cargar();
    } }, render: (c) => poner(c,
      seccion({ pie: "Para recuperar la copia en otro dispositivo necesitas esta misma clave. Si la pierdes, nadie puede recuperar la copia, ni yo ni el servidor." }, h("div", { class: "tarjeta" }, nueva)),
      seccion({}, lista([celda({ titulo: "Generar una clave segura", sub: "160 bits al azar: inviable de adivinar", estilo: "accion", alPulsar: () => { nueva.value = generarClave(); nueva.select(); } })]))) });
  }

  return {
    titulo: "Copia en la nube",
    alMostrar() { cargar(); },
    render(c) {
      const n = store.estado.ajustes.nube, st = store.nubeEstado, hoy = store.hoy();
      const listo = !!(n.url && clave);
      poner(c,
        seccion({ pie: "Todo se cifra con AES-256 en este iPhone antes de salir. El servidor guarda un bloque ilegible y no conoce la clave. Es opcional: la copia en Archivos sigue siendo la principal." }, lista([
          celda({ titulo: "Servidor", sub: n.url || "Sin configurar", chevron: true, alPulsar: poner_url }),
          celda({ titulo: "Clave", sub: clave ? "Guardada en este iPhone" : "Sin configurar", chevron: true, alPulsar: poner_clave }),
        ])),
        clave ? seccion({ cab: "Tu clave", pie: "Anótala en un sitio seguro (un gestor de contraseñas). Se guarda aparte de los datos y no va dentro de las copias." },
          h("div", { class: "tarjeta" }, h("code", { class: "clave-nube", "aria-label": verClave ? "Clave" : "Clave oculta" }, verClave ? clave : clave.replace(/[^-\s]/g, "•")),
            h("div", { class: "fila", style: { marginTop: "10px", gap: "8px" } }, boton(verClave ? "Ocultar" : "Mostrar", () => { verClave = !verClave; app.nav.repintarActual(); }, { estilo: "gris", peq: true }), boton("Copiar", async () => { try { await navigator.clipboard.writeText(clave); app.toast("Clave copiada"); } catch (e) { app.toast("No se pudo copiar"); } }, { estilo: "gris", peq: true })))) : null,
        seccion({ cab: "Copia", pie: st.error ? "Último intento fallido: " + st.error : (n.ultima ? "Última subida desde este iPhone: " + capital(fechaCorta(n.ultima.at.slice(0, 10), hoy)) + " " + n.ultima.at.slice(11, 16) + ", " + plural(n.ultima.sesiones, "sesión", "sesiones") + "." : "Aún no has subido ninguna.") }, lista([
          celda({ titulo: st.subiendo ? "Subiendo…" : "Subir ahora", sub: info ? "Copia en el servidor: " + tamano(info.bytes) + ", " + fechaCorta(new Date(info.at).toISOString().slice(0, 10), hoy) : null, estilo: "accion", deshabilitada: !listo || st.subiendo,
            alPulsar: async () => {
              if (!listo || st.subiendo) return;
              try {
                try { await store.subirNube(); }
                catch (e) {
                  if (!e.conflicto || !(await app.confirmar("¿Sobrescribir la copia del servidor?", "El servidor tiene una copia más reciente que la de este iPhone. Si sigues, se pierde.", "Sobrescribir", true))) throw e;
                  await store.subirNube({ forzar: true });
                }
                exito(); app.toast("Copia subida"); cargar();
              } catch (e) { if (!e.conflicto) await app.alerta({ titulo: "No se pudo subir", mensaje: e.message }); app.nav.repintarActual(); }
            } }),
          celda({ titulo: "Subir sola tras cada sesión", control: interruptor(n.activa && n.auto, (v) => guardarNube((x) => { x.activa = v; x.auto = v; }).then(() => (v && listo ? store.subirNube().catch((e) => { if (e.conflicto) app.toast("Hay una copia más reciente en el servidor: restáurala antes", { icono: null }); }) : null)), "Subir sola tras cada sesión") }),
          celda({ titulo: "Restaurar desde la nube", estilo: "accion", deshabilitada: !listo, alPulsar: async () => {
            if (!listo) return;
            let m;
            const t0 = Date.now();
            let inf = null;
            try { inf = await store.infoNube().catch(() => null); m = await store.bajarNube(); } catch (e) { await app.alerta({ titulo: "No se pudo restaurar", mensaje: e.message }); return; }
            const hay = store.estado.sesiones.length;
            if (hay && !(await app.confirmar("¿Reemplazar los datos?", "La copia de la nube tiene " + plural(m.sesiones.length, "sesión", "sesiones") + "; sustituirá " + plural(hay, "sesión", "sesiones") + " de este iPhone. Los datos actuales se guardan aparte.", "Reemplazar", true))) return;
            await store.importar(m); await store.marcarNubeAlDia(inf || { at: t0, bytes: 0 }, m.sesiones.length); exito(); app.toast("Copia restaurada");
          } }),
        ])),
        seccion({ cab: "Borrar", pie: "Borra la copia del servidor. Tus datos en este iPhone no se tocan." }, lista([
          celda({ titulo: "Borrar la copia del servidor", estilo: "destructiva", deshabilitada: !listo, alPulsar: async () => {
            if (!listo || !(await app.confirmar("¿Borrar la copia de la nube?", "Se elimina del servidor. Podrás subir otra cuando quieras.", "Borrar", true))) return;
            try { await store.borrarNube(); app.toast("Copia borrada"); cargar(); } catch (e) { await app.alerta({ titulo: "No se pudo borrar", mensaje: e.message }); }
          } }),
        ])));
    },
  };
}
vistaNube.pestana = "ajustes";

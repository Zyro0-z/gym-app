// Store: el estado de la app (lo que hay en IndexedDB) más el análisis, calculado bajo demanda y
// guardado hasta el siguiente cambio. Las vistas se suscriben y se repintan al cambiar algo.
// Cada escritura va primero a IndexedDB y solo después cambia el estado en memoria.
import * as repos from "./data/repos.js";
import { crearCopia, leerCopia, estadoCopia } from "./data/modelo.js";
import { analizar } from "./core/analisis.js";
import { hoyISO } from "./core/fechas.js";

const copiar = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

export function crearStore({ reloj = () => new Date() } = {}) {
  let estado = null, version = 0;
  let cache = null, cacheV = -1, cacheHoy = null;
  const subs = new Set();

  const avisar = (tema) => { for (const fn of [...subs]) { try { fn(tema); } catch (e) { console.error(e); } } };
  const cambio = (tema, analitico = true) => { if (analitico) version++; avisar(tema); };

  const store = {
    get estado() { return estado; },
    hoy: () => hoyISO(reloj()),
    suscribir(fn) { subs.add(fn); return () => subs.delete(fn); },

    async cargar(opciones) { estado = await repos.cargar(opciones); version++; return estado.informe; },

    /** Análisis completo (≈ 100 ms con 80 sesiones); se recalcula solo si cambian los datos o el día. */
    analisis() {
      const hoy = store.hoy();
      if (!cache || cacheV !== version || cacheHoy !== hoy) {
        cache = analizar({ sesiones: estado.sesiones, catalogo: estado.catalogo, rutinas: estado.rutinas, pesajes: estado.pesajes, ajustes: estado.ajustes }, hoy);
        cacheV = version; cacheHoy = hoy;
      }
      return cache;
    },

    async guardarAjustes(mutar, { analitico = true } = {}) {
      const a = copiar(estado.ajustes); mutar(a);
      await repos.guardarAjustes(a);
      estado.ajustes = a; cambio("ajustes", analitico);
    },
    async guardarSesion(s) {
      await repos.guardarSesion(s);
      const i = estado.sesiones.findIndex((x) => x.id === s.id);
      if (i >= 0) estado.sesiones[i] = copiar(s); else estado.sesiones.push(copiar(s));
      cambio("sesiones");
    },
    async borrarSesion(id) {
      await repos.borrarSesion(id);
      estado.sesiones = estado.sesiones.filter((x) => x.id !== id);
      cambio("sesiones");
    },
    async guardarPesajes(p) { await repos.guardarPesajes(p); estado.pesajes = copiar(p); cambio("pesajes"); },
    async guardarRutinas(r) { await repos.guardarRutinas(r); estado.rutinas = copiar(r); cambio("rutinas"); },
    async guardarCatalogo(c) { await repos.guardarCatalogo(c); estado.catalogo = copiar(c); cambio("catalogo"); },
    /** El borrador del entrenamiento en curso no afecta al análisis. */
    async guardarBorrador(b) { await repos.guardarBorrador(b); estado.borrador = b ? copiar(b) : null; avisar("borrador"); },

    // ── copias ──
    textoCopia() { return JSON.stringify(crearCopia(estado, reloj().toISOString()), null, 1); },
    async marcarCopia() { await store.guardarAjustes((a) => { a.copia = { at: reloj().toISOString(), sesiones: estado.sesiones.length }; }, { analitico: false }); },
    estadoCopia() { return estadoCopia(estado.ajustes.copia, estado.sesiones.length, reloj().getTime()); },
    /** Lee una copia (lanza Error con el motivo) sin aplicarla. */
    leerCopia(texto) { return leerCopia(texto, { ahora: reloj().toISOString() }); },
    /** Sustituye todo por la copia `m`; los datos actuales quedan en «respaldo-importacion». */
    async importar(m) {
      await repos.reemplazarTodo(m, estado);
      estado = Object.assign({}, estado, { sesiones: copiar(m.sesiones), catalogo: copiar(m.catalogo), rutinas: copiar(m.rutinas), pesajes: copiar(m.pesajes), ajustes: copiar(m.ajustes) });
      cambio("todo");
    },
    estadoAlmacen: () => repos.estadoAlmacen(),
    pedirPersistencia: () => repos.pedirPersistencia(),
  };
  return store;
}

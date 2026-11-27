// Store: el estado de la app (lo que hay en IndexedDB) más el análisis. Las vistas se suscriben y
// se repintan al cambiar algo. Cada escritura va primero a IndexedDB y solo después cambia el
// estado en memoria.
//
// El análisis se calcula en un Web Worker (src/worker/analisis.js) para no bloquear la interfaz:
//  · analisis() devuelve al momento el último resultado disponible (o null si aún no hay ninguno)
//    y, si los datos o el día cambiaron, pide uno nuevo; al llegar se avisa con el tema "analisis".
//  · Solo hay una petición en curso; las que llegan mientras tanto se funden en una (las
//    obsoletas no se calculan). Una respuesta que no es la esperada se descarta.
//  · Sin Worker, o si falla, se calcula en el hilo principal sin error visible.
import * as repos from "./data/repos.js";
import { crearCopia, leerCopia, estadoCopia } from "./data/modelo.js";
import { modeloSinEjercicio, borradorSin, modeloConEjerciciosUnidos } from "./core/borrado.js";
import { analizar } from "./core/analisis.js";
import { rehidratar } from "./core/rehidratar.js";
import { hoyISO } from "./core/fechas.js";
import { crearNube, subirSinPisar } from "./data/nube.js";

const copiar = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

export function crearStore({ reloj = () => new Date(), usarWorker = true } = {}) {
  let estado = null, version = 0;
  let cache = null, cacheV = -1, cacheHoy = null;
  let worker = null, enCurso = null, otraVez = false, sigId = 0;
  const esperas = [];
  const subs = new Set();
  const nube = crearNube();
  let tNube = 0, nubePend = false;

  const avisar = (tema) => { for (const fn of [...subs]) { try { fn(tema); } catch (e) { console.error(e); } } };
  const cambio = (tema, analitico = true) => { if (analitico) version++; avisar(tema); };
  const alDia = () => !!cache && cacheV === version && cacheHoy === store.hoy();
  // Foto del modelo: las listas se copian (las sesiones se modifican en su sitio al guardar)
  const modelo = () => ({ sesiones: estado.sesiones.slice(), catalogo: estado.catalogo, rutinas: estado.rutinas, pesajes: estado.pesajes, ajustes: estado.ajustes });

  function crearWorker() {
    if (worker || !usarWorker || typeof Worker === "undefined") return worker;
    try {
      worker = new Worker(new URL("./worker/analisis.js", import.meta.url), { type: "module" });
      worker.onmessage = (e) => recibir(e.data);
      worker.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); romperWorker(); };
      worker.onmessageerror = () => romperWorker();
    } catch (e) { worker = null; usarWorker = false; }
    return worker;
  }
  function romperWorker() {
    try { if (worker) worker.terminate(); } catch (e) {}
    worker = null; usarWorker = false;
    const p = enCurso; enCurso = null;
    if (p) calcular();
  }
  function poner(A, v, hoy) {
    cache = A; cacheV = v; cacheHoy = hoy;
    document.documentElement.classList.toggle("calculando", !alDia());
    if (alDia()) for (const ok of esperas.splice(0)) ok(cache);
    avisar("analisis");
  }
  function recibir(d) {
    if (!enCurso || !d || d.id !== enCurso.id) return;      // respuesta obsoleta
    const p = enCurso; enCurso = null;
    if (d.error) { console.warn("Análisis en el Worker:", d.error); romperWorker(); calcular(); return; }
    poner(rehidratar(d.A, p.modelo), p.v, p.hoy);
    if (otraVez || !alDia()) { otraVez = false; calcular(); }
  }
  /** Pide el análisis de la versión actual si no lo hay ya (o en camino). */
  function calcular() {
    if (!estado || alDia()) return;
    const hoy = store.hoy(), v = version;
    if (enCurso) { if (enCurso.v !== v || enCurso.hoy !== hoy) otraVez = true; return; }
    document.documentElement.classList.add("calculando");
    const m = modelo();
    if (crearWorker()) {
      enCurso = { id: ++sigId, v, hoy, modelo: m };
      try { worker.postMessage({ id: enCurso.id, modelo: m, hoy }); return; }
      catch (e) { enCurso = null; romperWorker(); }
    }
    poner(analizar(m, hoy), v, hoy);
  }

  /** Copia cifrada automática: 5 s después del último cambio en las sesiones (si está activada y configurada). */
  function programarNube() {
    clearTimeout(tNube);
    const n = estado && estado.ajustes.nube;
    if (!n || !n.activa || !n.auto || !n.url) return;
    nubePend = true;
    tNube = setTimeout(() => store.subirNube().catch((e) => console.warn("Copia en la nube:", e.message)), 5000);
  }

  const store = {
    get estado() { return estado; },
    /** Sube la copia si quedó pendiente: iOS congela el temporizador de 5 s al bloquear el teléfono. Se llama al arrancar, al volver a la app y al recuperar la red. */
    reanudarNube() {
      const n = estado && estado.ajustes.nube;
      if (!n || !n.activa || !n.auto || !n.url || store.nubeEstado.subiendo) return;
      if (!nubePend && !(n.ultima && n.ultima.sesiones !== estado.sesiones.length)) return;
      clearTimeout(tNube);
      store.subirNube().catch((e) => console.warn("Copia en la nube:", e.message));
    },
    /** Último resultado de la copia en la nube: { subiendo, error } (solo en memoria). */
    nubeEstado: { subiendo: false, error: null },
    hoy: () => hoyISO(reloj()),
    suscribir(fn) { subs.add(fn); return () => subs.delete(fn); },

    async cargar(opciones) { estado = await repos.cargar(opciones); version++; calcular(); return estado.informe; },

    /** Último análisis disponible (puede ser del cambio anterior mientras se calcula el nuevo) o null. */
    analisis() { calcular(); return cache; },
    /** ¿El análisis disponible corresponde a los datos y al día actuales? */
    analisisAlDia: alDia,
    /** Promesa con el análisis de los datos actuales (espera al Worker si hace falta). */
    analisisFresco() { calcular(); return alDia() ? Promise.resolve(cache) : new Promise((ok) => esperas.push(ok)); },
    /** "worker" o "hilo principal" (sin Worker o tras un fallo). */
    get modoAnalisis() { return usarWorker && typeof Worker !== "undefined" ? "worker" : "hilo principal"; },
    /** Solo para las pruebas: análisis síncrono en este hilo. */
    analisisSincrono() { return analizar(modelo(), store.hoy()); },

    async guardarAjustes(mutar, { analitico = true } = {}) {
      const a = copiar(estado.ajustes); mutar(a);
      await repos.guardarAjustes(a);
      estado.ajustes = a; cambio("ajustes", analitico);
    },
    async guardarSesion(s) {
      await repos.guardarSesion(s);
      const i = estado.sesiones.findIndex((x) => x.id === s.id);
      if (i >= 0) estado.sesiones[i] = copiar(s); else estado.sesiones.push(copiar(s));
      cambio("sesiones"); programarNube();
      // Copia interna cada N sesiones nuevas (si falla, la sesión ya está guardada)
      if (i < 0) try {
        const n = await repos.contarSesionNueva(), cada = (estado.ajustes.copiasInternas && estado.ajustes.copiasInternas.cada) || 5;
        if (n >= cada) await repos.respaldoAuto(estado, "sesiones");
      } catch (e) { console.warn("Copia interna:", e); }
    },
    async borrarSesion(id) {
      await repos.borrarSesion(id);
      estado.sesiones = estado.sesiones.filter((x) => x.id !== id);
      cambio("sesiones"); programarNube();
    },
    async guardarPesajes(p) { await repos.guardarPesajes(p); estado.pesajes = copiar(p); cambio("pesajes"); },
    async guardarMedidas(m) { await repos.guardarMedidas(m); estado.medidas = copiar(m); cambio("medidas", false); },
    async guardarMolestias(m) { await repos.guardarMolestias(m); estado.molestias = copiar(m); cambio("molestias", false); },
    async guardarRutinas(r) { await repos.guardarRutinas(r); estado.rutinas = copiar(r); cambio("rutinas"); },
    async guardarCatalogo(c) { await repos.guardarCatalogo(c); estado.catalogo = copiar(c); cambio("catalogo"); },
    /** El borrador del entrenamiento en curso no afecta al análisis. */
    async guardarBorrador(b) { await repos.guardarBorrador(b); estado.borrador = b ? copiar(b) : null; avisar("borrador"); },

    // ── copias ──
    textoCopia() { return JSON.stringify(crearCopia(estado, reloj().toISOString()), null, 1); },
    async marcarCopia() { await store.guardarAjustes((a) => { a.copia = { at: reloj().toISOString(), sesiones: estado.sesiones.length }; a.avisoCopia = { pospuestoHasta: null }; }, { analitico: false }); },
    estadoCopia() { const a = estado.ajustes; return estadoCopia(a.copia, estado.sesiones.length, reloj().getTime(), a.avisoCopia && a.avisoCopia.pospuestoHasta); },
    async posponerAvisoCopia(dias = 3) { await store.guardarAjustes((a) => { a.avisoCopia = { pospuestoHasta: new Date(reloj().getTime() + dias * 864e5).toISOString() }; }, { analitico: false }); },
    /** Lee una copia (lanza Error con el motivo) sin aplicarla. */
    leerCopia(texto) { return leerCopia(texto, { ahora: reloj().toISOString() }); },
    /** Sustituye todo por la copia `m`; los datos actuales quedan en «respaldo-importacion» y en las copias internas. */
    async importar(m, motivo = "importar", borrador = null) {
      await repos.reemplazarTodo(m, estado, motivo);
      await store.guardarBorrador(borrador);
      estado = Object.assign({}, estado, { sesiones: copiar(m.sesiones), catalogo: copiar(m.catalogo), rutinas: copiar(m.rutinas), pesajes: copiar(m.pesajes), medidas: copiar(m.medidas || []), molestias: copiar(m.molestias || []), ajustes: copiar(m.ajustes) });
      cambio("todo");
    },
    /** Deja la app sin sesiones, pesajes, medidas, rutinas ni borrador. Conserva ajustes y catálogo; antes guarda una copia interna. */
    async borrarTodo() {
      await store.importar({ sesiones: [], catalogo: estado.catalogo, rutinas: [], pesajes: [], medidas: [], molestias: [], ajustes: estado.ajustes }, "borrar");
    },
    /** Borra un ejercicio de sesiones, rutinas, catálogo y entreno en curso en una sola operación; antes guarda una copia interna. */
    /** Renombra o une ejercicios (Map: id viejo → { id, nombre }) en una sola operación; antes guarda una copia interna. */
    async unirEjercicios(mapa, catalogo) {
      const r = modeloConEjerciciosUnidos(estado, mapa, catalogo);
      await store.importar(r.modelo, "unir", r.borrador);
    },
    async borrarEjercicio(id) {
      await store.importar(modeloSinEjercicio(estado, id), "borrar", borradorSin(estado.borrador, id));
    },
    /** Quita sesiones, pesajes, medidas, molestias y borrador. Conserva rutinas, catálogo y ajustes; antes guarda una copia interna. */
    async borrarHistorial() {
      await store.importar({ sesiones: [], catalogo: estado.catalogo, rutinas: estado.rutinas, pesajes: [], medidas: [], molestias: [], ajustes: estado.ajustes }, "borrar");
    },
    listarRespaldos: () => repos.listarRespaldos(),
    /** Restaura una copia interna: se valida igual que un archivo y los datos actuales se guardan antes. */
    async restaurarRespaldo(clave) {
      const r = await repos.leerRespaldo(clave);
      if (!r) throw new Error("La copia ya no existe.");
      await store.importar(store.leerCopia(JSON.stringify(r)), "restaurar");
    },
    // ── copia cifrada en la nube (la clave vive aparte de los datos y no se exporta) ──
    async claveNube() { const n = await repos.leerNube(); return n && n.frase ? n.frase : null; },
    guardarClaveNube: (frase) => repos.guardarNube(frase ? { frase } : null),
    /**
     * Cifra y sube la copia actual. Lanza Error con el motivo si no se puede.
     * Si el servidor tiene una copia más reciente que la última que subió o restauró este dispositivo, no la pisa:
     * lanza un Error con `conflicto = true` (con `{ forzar: true }` la sobrescribe).
     */
    async subirNube({ forzar = false } = {}) {
      const n = estado.ajustes.nube, frase = await store.claveNube();
      if (!n.url || !frase) throw new Error("Falta la dirección del servidor o la clave.");
      store.nubeEstado = { subiendo: true, error: null }; avisar("nube");
      try {
        const r = await subirSinPisar(nube, n, frase, store.textoCopia(), { forzar });
        await store.guardarAjustes((a) => { a.nube.ultima = { at: new Date(r.at).toISOString(), bytes: r.bytes, sesiones: estado.sesiones.length }; }, { analitico: false });
        nubePend = false;
        store.nubeEstado = { subiendo: false, error: null }; avisar("nube");
        return r;
      } catch (e) { store.nubeEstado = { subiendo: false, error: e.message }; avisar("nube"); throw e; }
    },
    /** Anota que este dispositivo está al día con la copia del servidor (tras restaurarla). */
    marcarNubeAlDia: (info, sesiones) => store.guardarAjustes((a) => { a.nube.ultima = { at: new Date(info.at).toISOString(), bytes: info.bytes, sesiones }; }, { analitico: false }),
    /** Baja y descifra la copia de la nube: devuelve el modelo ya validado (no lo aplica). */
    async bajarNube() {
      const n = estado.ajustes.nube, frase = await store.claveNube();
      if (!n.url || !frase) throw new Error("Falta la dirección del servidor o la clave.");
      return store.leerCopia(await nube.bajar(n.url, frase));
    },
    infoNube: async () => { const n = estado.ajustes.nube, frase = await store.claveNube(); return n.url && frase ? nube.info(n.url, frase) : null; },
    async borrarNube() { const n = estado.ajustes.nube, frase = await store.claveNube(); if (n.url && frase) await nube.borrar(n.url, frase); },
    estadoAlmacen: () => repos.estadoAlmacen(),
    pedirPersistencia: () => repos.pedirPersistencia(),
  };
  return store;
}

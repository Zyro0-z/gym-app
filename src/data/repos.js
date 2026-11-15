// Repositorios: cargar y guardar el modelo. Toda escritura de varias partes es atómica.
import { abrir, tx, leerKV, todasSesiones, escribirKV, ponerSesion, quitarSesion, plano } from "./db.js";
import { ESQUEMA, CLAVES_ANTIGUAS, planMigracion, rescatarSesiones, completarAjustes, convertirBorrador } from "./modelo.js";
import { guardarEspejo, leerEspejo } from "./espejo.js";

/**
 * Abre la base, migra si hace falta (sin perder nada) y devuelve el estado completo.
 * `tema`: preferencia de tema antigua (localStorage), para conservarla al migrar.
 */
export async function cargar({ tema = null } = {}) {
  await abrir();
  const schema = (await leerKV("schema")) || 1;
  const viejo = {};
  for (const k of CLAVES_ANTIGUAS) { const v = await leerKV(k); if (v !== undefined && v !== null) viejo[k] = v; }
  const hayViejo = Object.keys(viejo).length > 0;
  let informe = null;
  if (schema < ESQUEMA && hayViejo) informe = await migrar(Object.assign({ schema }, viejo), tema);
  else if (schema < ESQUEMA) await escribirKV("schema", ESQUEMA);
  else if (viejo.sessions && viejo.sessions.length) informe = await rescatar(viejo);

  const [sesiones, catalogo, rutinas, pesajes, ajustes, borrador] = await Promise.all([
    todasSesiones(), leerKV("catalogo"), leerKV("rutinas"), leerKV("pesajes"), leerKV("ajustes"), leerKV("borrador")]);
  let b = borrador || null;
  const esp = leerEspejo();
  // El borrador replicado en localStorage gana si es más reciente (iOS pudo perder la última escritura)
  if (esp && esp.borrador && (!b || (esp.borrador.cambio || 0) > (b.cambio || 0))) b = esp.borrador;
  return { sesiones, catalogo: catalogo || [], rutinas: rutinas || [], pesajes: pesajes || [], ajustes: completarAjustes(ajustes), borrador: b, informe };
}

/** Migración de los datos antiguos en UNA transacción: o se escribe todo o nada. */
async function migrar(viejo, tema) {
  const p = planMigracion(viejo, { tema });
  await tx(["kv", "sesiones"], "readwrite", (s) => {
    s.kv.put(plano(p.legacy), "legacy");
    s.kv.put(plano(p.legacy), "backup-esquema-v" + (viejo.schema || 1));
    for (const ses of p.sesiones) s.sesiones.put(plano(ses));
    s.kv.put(plano(p.catalogo), "catalogo");
    s.kv.put(plano(p.rutinas), "rutinas");
    s.kv.put(plano(p.pesajes), "pesajes");
    s.kv.put(plano(p.ajustes), "ajustes");
    s.kv.put(plano(p.borrador), "borrador");
    for (const k of CLAVES_ANTIGUAS) s.kv.delete(k);
    s.kv.put(ESQUEMA, "schema");
  });
  return { tipo: "migracion", sesiones: p.sesiones.length, errores: p.ajustes.migracion.errores.length };
}

/** Datos escritos por una versión antigua DESPUÉS de migrar: se añaden las sesiones que falten. */
async function rescatar(viejo) {
  const existentes = await todasSesiones();
  const nuevas = rescatarSesiones(viejo.sessions, existentes);
  const borradorViejo = convertirBorrador(viejo.draft);
  await tx(["kv", "sesiones"], "readwrite", (s) => {
    s.kv.put(plano({ fecha: new Date().toISOString(), datos: viejo }), "rescate-" + Date.now());
    for (const ses of nuevas) s.sesiones.put(plano(ses));
    if (borradorViejo) s.kv.put(plano(borradorViejo), "borrador");
    for (const k of CLAVES_ANTIGUAS) s.kv.delete(k);
  });
  return { tipo: "rescate", sesiones: nuevas.length };
}

export const guardarSesion = (s) => ponerSesion(plano(s));
export const borrarSesion = (id) => quitarSesion(id);
export const guardarCatalogo = (c) => escribirKV("catalogo", plano(c));
export const guardarRutinas = (r) => escribirKV("rutinas", plano(r));
export const guardarPesajes = (p) => escribirKV("pesajes", plano(p));
export const guardarAjustes = (a) => escribirKV("ajustes", plano(a));
export async function guardarBorrador(b) {
  const v = b ? Object.assign(plano(b), { cambio: Date.now() }) : null;
  guardarEspejo({ borrador: v });
  await escribirKV("borrador", v);
}

/** Reemplaza todos los datos por los de una copia, guardando antes los actuales en «respaldo-importacion». */
export async function reemplazarTodo(m, actual) {
  await tx(["kv", "sesiones"], "readwrite", (s) => {
    s.kv.put(plano({ fecha: new Date().toISOString(), sesiones: actual.sesiones, catalogo: actual.catalogo, rutinas: actual.rutinas,
      pesajes: actual.pesajes, ajustes: actual.ajustes }), "respaldo-importacion");
    s.sesiones.clear();
    for (const ses of m.sesiones) s.sesiones.put(plano(ses));
    s.kv.put(plano(m.catalogo), "catalogo");
    s.kv.put(plano(m.rutinas), "rutinas");
    s.kv.put(plano(m.pesajes), "pesajes");
    s.kv.put(plano(m.ajustes), "ajustes");
    s.kv.put(ESQUEMA, "schema");
  });
}

/** Estado del almacenamiento: persistente o no, y espacio usado. */
export async function estadoAlmacen() {
  const r = { persistente: null, usado: null, cuota: null };
  try { if (navigator.storage && navigator.storage.persisted) r.persistente = await navigator.storage.persisted(); } catch (e) {}
  try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); r.usado = e.usage; r.cuota = e.quota; } } catch (e) {}
  return r;
}
export async function pedirPersistencia() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {}
  return false;
}

// Repositorios: cargar y guardar el modelo. Toda escritura de varias partes es atómica.
import { abrir, tx, leerKV, todasSesiones, escribirKV, ponerSesion, quitarSesion, plano } from "./db.js";
import { ESQUEMA, CLAVES_RESPALDO, completarAjustes, instantanea } from "./modelo.js";
import { guardarEspejo, leerEspejo } from "./espejo.js";

/**
 * Abre la base, migra del esquema 3 al 4 si hace falta (sin perder nada) y devuelve el estado completo.
 * Los datos del formato anterior a la 2.0 (claves «sessions», «templates»…) ya no se convierten: se dejan sin tocar.
 */
export async function cargar() {
  await abrir();
  const schema = (await leerKV("schema")) || 1;
  let informe = null;
  if (schema === 3) informe = await migrar3a4();
  else if (schema < ESQUEMA) await escribirKV("schema", ESQUEMA);

  const [sesiones, catalogo, rutinas, pesajes, medidas, ajustes, borrador] = await Promise.all([
    todasSesiones(), leerKV("catalogo"), leerKV("rutinas"), leerKV("pesajes"), leerKV("medidas"), leerKV("ajustes"), leerKV("borrador")]);
  let b = borrador || null;
  const esp = leerEspejo();
  // El borrador replicado en localStorage gana si es más reciente (iOS pudo perder la última escritura)
  if (esp && esp.borrador && (!b || (esp.borrador.cambio || 0) > (b.cambio || 0))) b = esp.borrador;
  return { sesiones, catalogo: catalogo || [], rutinas: rutinas || [], pesajes: pesajes || [], medidas: medidas || [], ajustes: completarAjustes(ajustes), borrador: b, informe };
}

/**
 * Esquema 3 → 4 en UNA transacción que lee y escribe: copia íntegra en «backup-esquema-v3» (si
 * no existía ya) y en la rotación de copias internas, ajustes completados, medidas vacías y
 * schema = 4. Las sesiones no se reescriben: los campos nuevos son opcionales. Si algo falla no
 * se escribe nada y la próxima apertura lo vuelve a intentar.
 */
export async function migrar3a4(ahora = new Date().toISOString()) {
  let n = 0, error = null;
  await tx(["kv", "sesiones"], "readwrite", (s, t) => {
    const datos = {}, claves = ["catalogo", "rutinas", "pesajes", "ajustes", "medidas", "schema", "backup-esquema-v3"];
    let pend = claves.length + 1;
    const listo = () => {
      if (--pend) return;
      try { escribir(); } catch (e) { error = e; t.abort(); }     // nada a medias: se deshace todo
    };
    const escribir = () => {
      if (datos.schema !== 3) return;                    // otra pestaña ya migró: nada que hacer
      n = datos.sesiones.length;
      const estado = { sesiones: datos.sesiones, catalogo: datos.catalogo || [], rutinas: datos.rutinas || [], pesajes: datos.pesajes || [], ajustes: datos.ajustes || null };
      if (datos["backup-esquema-v3"] === undefined) s.kv.put(plano({ fecha: ahora, esquema: 3, datos: estado }), "backup-esquema-v3");
      const inst = instantanea(estado, "migrar", ahora); inst.esquema = 3;
      rotarRespaldos(s.kv, inst);
      s.kv.put(plano(completarAjustes(datos.ajustes)), "ajustes");
      if (!Array.isArray(datos.medidas)) s.kv.put([], "medidas");
      s.kv.put(ESQUEMA, "schema");
    };
    for (const k of claves) { const q = s.kv.get(k); q.onsuccess = () => { datos[k] = q.result; listo(); }; }
    const q = s.sesiones.getAll(); q.onsuccess = () => { datos.sesiones = q.result; listo(); };
  }).catch((e) => { throw error || e; });
  return { tipo: "esquema4", sesiones: n };
}

export const guardarSesion = (s) => ponerSesion(plano(s));
export const borrarSesion = (id) => quitarSesion(id);
export const guardarCatalogo = (c) => escribirKV("catalogo", plano(c));
export const guardarRutinas = (r) => escribirKV("rutinas", plano(r));
export const guardarPesajes = (p) => escribirKV("pesajes", plano(p));
export const guardarAjustes = (a) => escribirKV("ajustes", plano(a));
export const guardarMedidas = (m) => escribirKV("medidas", plano(m));
export async function guardarBorrador(b) {
  const v = b ? Object.assign(plano(b), { cambio: Date.now() }) : null;
  guardarEspejo({ borrador: v });
  await escribirKV("borrador", v);
}

/**
 * Copias internas: rota respaldo-auto-1 → 2 → 3 y escribe la nueva en la 1, dentro de la
 * transacción `s` que se le pase (así la copia y el cambio que la motiva van juntos).
 */
export function rotarRespaldos(kv, inst) {
  // Las peticiones se encadenan en callbacks (sin await) para que la transacción siga viva:
  // la 2 pasa a la 3, la 1 a la 2 y la nueva entra en la 1
  const sig = (i) => {
    if (i < 0) { kv.put(plano(inst), CLAVES_RESPALDO[0]); return; }
    const q = kv.get(CLAVES_RESPALDO[i]);
    q.onsuccess = () => { if (q.result !== undefined) kv.put(q.result, CLAVES_RESPALDO[i + 1]); sig(i - 1); };
  };
  sig(CLAVES_RESPALDO.length - 2);
}

/** Copia interna ahora (tras N sesiones nuevas, antes de importar, restaurar o migrar). */
export const respaldoAuto = (estado, motivo) => tx("kv", "readwrite", (s) => { rotarRespaldos(s.kv, instantanea(estado, motivo)); s.kv.put(0, "respaldo-contador"); });

/** Cuenta una sesión nueva; devuelve cuántas van desde la última copia interna. */
export async function contarSesionNueva() {
  const n = ((await leerKV("respaldo-contador")) || 0) + 1;
  await escribirKV("respaldo-contador", n);
  return n;
}

/** Copias internas disponibles (sin los datos), de la más reciente a la más antigua. */
export async function listarRespaldos() {
  const out = [];
  for (const k of [...CLAVES_RESPALDO, "respaldo-importacion"]) {
    const r = await leerKV(k);
    if (!r) continue;
    const datos = r.datos || r;      // respaldo-importacion de la versión 2 guarda los datos sueltos
    out.push({ clave: k, fecha: r.fecha || null, motivo: r.motivo || (k === "respaldo-importacion" ? "importar" : null),
      sesiones: Array.isArray(datos.sesiones) ? datos.sesiones.length : 0, bytes: r.bytes || JSON.stringify(datos).length });
  }
  return out;
}

/** Datos de una copia interna, con la forma de una copia exportada (para validarla antes de usarla). */
export async function leerRespaldo(clave) {
  const r = await leerKV(clave);
  if (!r) return null;
  const d = r.datos || r;
  const esq = r.esquema || 3;
  const out = { app: "gym", version: esq >= 4 ? 3 : 2, esquema: esq, exportado: r.fecha, sesiones: d.sesiones, catalogo: d.catalogo, rutinas: d.rutinas, pesajes: d.pesajes, ajustes: d.ajustes };
  if (d.medidas) out.medidas = d.medidas;
  return out;
}

/**
 * Reemplaza todos los datos por los de una copia. Antes, en la misma transacción, guarda los
 * actuales en «respaldo-importacion» y en la rotación de copias internas.
 */
export async function reemplazarTodo(m, actual, motivo = "importar") {
  await tx(["kv", "sesiones"], "readwrite", (s) => {
    s.kv.put(plano({ fecha: new Date().toISOString(), sesiones: actual.sesiones, catalogo: actual.catalogo, rutinas: actual.rutinas,
      pesajes: actual.pesajes, medidas: actual.medidas || [], ajustes: actual.ajustes }), "respaldo-importacion");
    rotarRespaldos(s.kv, instantanea(actual, motivo));
    s.sesiones.clear();
    for (const ses of m.sesiones) s.sesiones.put(plano(ses));
    s.kv.put(plano(m.catalogo), "catalogo");
    s.kv.put(plano(m.rutinas), "rutinas");
    s.kv.put(plano(m.pesajes), "pesajes");
    s.kv.put(plano(m.ajustes), "ajustes");
    s.kv.put(plano(m.medidas || []), "medidas");
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

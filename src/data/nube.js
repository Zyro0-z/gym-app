// Copia cifrada opcional en un Worker propio (servidor/src/copias.js). Sube el texto de la copia
// ya cifrado en este dispositivo (core/cifrado.js): el servidor nunca ve datos ni la clave.
import { cifrar, descifrar, identidad } from "../core/cifrado.js";

/** URL base válida (https, o http en localhost para pruebas) sin barra final; null si no lo es. */
export function normalizarUrl(u) {
  const t = String(u == null ? "" : u).trim().replace(/\/+$/, "");
  try {
    const x = new URL(t);
    const local = x.hostname === "localhost" || x.hostname === "127.0.0.1";
    if (x.protocol === "https:" || (x.protocol === "http:" && local)) return x.origin + (x.pathname === "/" ? "" : x.pathname);
  } catch (e) { /* no es una URL */ }
  return null;
}

const MOTIVOS = { 401: "El servidor no acepta el acceso.", 403: "La clave no coincide con la de la copia que ya hay en el servidor.", 404: "No hay ninguna copia con esta clave en el servidor.",
  413: "La copia es demasiado grande para el servidor.", 429: "El servidor pide esperar un poco." };

/** Cliente con `fetch` e iteraciones inyectables (para probarlo sin red). */
export function crearNube({ fetchFn = (...a) => globalThis.fetch(...a), it } = {}) {
  const opts = it ? { it } : {};
  // La derivación de id y token (PBKDF2) es lenta: se hace una vez por clave y se recuerda mientras la app está abierta.
  const memoria = new Map();
  const identidadDe = (frase) => {
    if (!memoria.has(frase)) memoria.set(frase, identidad(frase, it).catch((e) => { memoria.delete(frase); throw e; }));
    return memoria.get(frase);
  };
  async function llamar(url, frase, metodo, cuerpo) {
    const base = normalizarUrl(url);
    if (!base) throw new Error("La dirección del servidor no es válida (tiene que empezar por https://).");
    const { id, token } = await identidadDe(frase);
    let r;
    try { r = await fetchFn(base + "/v1/copia/" + id + (metodo === "INFO" ? "/info" : ""), { method: metodo === "INFO" ? "GET" : metodo, headers: Object.assign({ Authorization: "Bearer " + token }, cuerpo ? { "Content-Type": "application/json" } : {}), body: cuerpo }); }
    catch (e) { throw new Error("No se pudo conectar con el servidor. Comprueba la conexión y la dirección."); }
    return r;
  }
  const fallo = async (r) => { let m = ""; try { m = (await r.json()).error || ""; } catch (e) { /* sin cuerpo */ } return new Error((MOTIVOS[r.status] || "El servidor respondió " + r.status + ".") + (m && !MOTIVOS[r.status] ? " " + m : "")); };
  return {
    /** Cifra y sube. Devuelve { at, bytes }. */
    async subir(url, frase, texto) {
      const r = await llamar(url, frase, "PUT", JSON.stringify(await cifrar(texto, frase, opts)));
      if (!r.ok) throw await fallo(r);
      return r.json();
    },
    /** Baja y descifra: devuelve el texto de la copia. */
    async bajar(url, frase) {
      const r = await llamar(url, frase, "GET");
      if (!r.ok) throw await fallo(r);
      return descifrar(await r.json(), frase);
    },
    /** { bytes, at } de la copia guardada, o null si no hay. */
    async info(url, frase) {
      const r = await llamar(url, frase, "INFO");
      if (r.status === 404) return null;
      if (!r.ok) throw await fallo(r);
      return r.json();
    },
    async borrar(url, frase) {
      const r = await llamar(url, frase, "DELETE");
      if (!r.ok) throw await fallo(r);
    },
  };
}

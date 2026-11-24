// Copia de seguridad CIFRADA de la app. El servidor solo ve un sobre opaco (el navegador cifra con
// AES-GCM antes de enviarlo; la clave no sale del dispositivo) y el hash del token de acceso.
//
//   PUT    /v1/copia/:id        cuerpo = sobre JSON; cabecera Authorization: Bearer <token>
//   GET    /v1/copia/:id        → el sobre
//   GET    /v1/copia/:id/info   → { bytes, at }
//   DELETE /v1/copia/:id
//
// `id` y `token` los deriva el navegador de la clave de la persona (PBKDF2). La primera escritura
// fija el hash del token; el resto de operaciones exigen el mismo token. KV: binding COPIAS.
export const MAX_BYTES = 8 * 1024 * 1024;
const ID = /^[0-9a-f]{32}$/, TOKEN = /^[0-9a-f]{64}$/;
const te = new TextEncoder();

async function sha256Hex(texto) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(texto)));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const iguales = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };

/** Valida la forma del sobre sin mirar su contenido (no se puede: está cifrado). */
export function sobreValido(o) {
  return !!o && typeof o === "object" && o.v === 1 && typeof o.sal === "string" && typeof o.iv === "string" && typeof o.ct === "string" && o.ct.length > 0 && Number.isInteger(o.it) && o.it >= 100000;
}

/** Devuelve la respuesta o null si la ruta no es de copias. `json(obj, estado, cabeceras)` viene del Worker. */
export async function manejarCopia(req, env, ruta, c, json) {
  const m = ruta.match(/^\/v1\/copia\/([^/]+)(\/info)?$/);
  if (!m) return null;
  if (!env.COPIAS) return json({ error: "falta el espacio KV «COPIAS» (ver servidor/README.md)" }, 500, c);
  const id = m[1], info = !!m[2];
  if (!ID.test(id)) return json({ error: "identificador no válido" }, 400, c);
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!TOKEN.test(token)) return json({ error: "falta el token" }, 401, c);
  const hash = await sha256Hex(token);
  const clave = "c:" + id;
  const previo = await env.COPIAS.getWithMetadata(clave, "text");
  const existe = previo && previo.value != null;
  if (existe && !iguales((previo.metadata && previo.metadata.h) || "", hash)) return json({ error: "token incorrecto" }, 403, c);

  if (req.method === "PUT" && !info) {
    if ((+req.headers.get("Content-Length") || 0) > MAX_BYTES) return json({ error: "la copia es demasiado grande" }, 413, c);
    const texto = await req.text();
    if (texto.length > MAX_BYTES) return json({ error: "la copia es demasiado grande" }, 413, c);
    let sobre; try { sobre = JSON.parse(texto); } catch { return json({ error: "cuerpo no válido" }, 400, c); }
    if (!sobreValido(sobre)) return json({ error: "el sobre cifrado no tiene el formato esperado" }, 400, c);
    const at = Date.now();
    await env.COPIAS.put(clave, texto, { metadata: { h: hash, at, bytes: texto.length } });
    return json({ ok: true, at, bytes: texto.length }, 200, c);
  }
  if (req.method === "GET") {
    if (!existe) return json({ error: "no hay copia" }, 404, c);
    if (info) return json({ bytes: previo.metadata.bytes, at: previo.metadata.at }, 200, c);
    return new Response(previo.value, { status: 200, headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, c) });
  }
  if (req.method === "DELETE" && !info) {
    if (existe) await env.COPIAS.delete(clave);
    return json({ ok: true }, 200, c);
  }
  return json({ error: "método no permitido" }, 405, c);
}

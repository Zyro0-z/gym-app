// Servidor OPCIONAL de copias de seguridad cifradas (Cloudflare Workers + KV). La app funciona sin él.
// Solo acepta peticiones de la app publicada (CORS). El servidor guarda un sobre opaco: el navegador
// lo cifra antes de enviarlo y la clave no sale del dispositivo.
//
//   PUT/GET/DELETE /v1/copia/:id   copia de seguridad cifrada de extremo a extremo (copias.js)
import { manejarCopia } from "./copias.js";

function cors(env, req) {
  const o = req.headers.get("Origin");
  return o && o === env.ORIGEN ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "GET, PUT, DELETE", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "86400", "Vary": "Origin" } : null;
}
const json = (o, estado, cab) => new Response(JSON.stringify(o), { status: estado, headers: Object.assign({ "Content-Type": "application/json" }, cab) });

export default {
  async fetch(req, env) {
    const c = cors(env, req);
    if (!c) return json({ error: "origen no permitido" }, 403, {});
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: c });
    const copia = await manejarCopia(req, env, new URL(req.url).pathname, c, json);
    return copia || json({ error: "no encontrado" }, 404, c);
  },
};

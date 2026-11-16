// Servidor OPCIONAL de avisos de fin de descanso por Web Push (Cloudflare Workers + Durable Objects).
// La app funciona sin él. Solo acepta peticiones de la app publicada (CORS) y solo envía a
// servicios de push conocidos. No guarda datos de entrenamiento: solo la suscripción del
// dispositivo y la hora del aviso, que se borran al enviarlo o cancelarlo.
//
//   GET  /v1/clave       → { clave }                       clave pública VAPID
//   POST /v1/programar   { id, suscripcion, en, titulo?, cuerpo? }   un aviso por dispositivo (id)
//   POST /v1/cancelar    { id }
//   POST /v1/probar      { suscripcion }                   aviso inmediato de prueba
import { enviar } from "./push.js";

const SERVICIOS = [/^https:\/\/web\.push\.apple\.com\//, /^https:\/\/fcm\.googleapis\.com\//, /^https:\/\/updates\.push\.services\.mozilla\.com\//,
  /^https:\/\/[a-z0-9.-]+\.notify\.windows\.com\//];
const MAX_ADELANTO = 60 * 60 * 1000;              // un aviso, como mucho, dentro de una hora
const texto = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;

export function validarSuscripcion(s) {
  return !!s && typeof s === "object" && texto(s.endpoint, 1000) && SERVICIOS.some((r) => r.test(s.endpoint)) &&
    !!s.keys && texto(s.keys.p256dh, 200) && texto(s.keys.auth, 100);
}
const claves = (env) => ({ publica: env.VAPID_PUBLICA, privada: env.VAPID_PRIVADA, sujeto: env.VAPID_SUJETO });

function cors(env, req) {
  const o = req.headers.get("Origin");
  return o && o === env.ORIGEN ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400", Vary: "Origin" } : null;
}
const json = (o, estado, cab) => new Response(JSON.stringify(o), { status: estado, headers: Object.assign({ "Content-Type": "application/json" }, cab) });

export default {
  async fetch(req, env) {
    const c = cors(env, req);
    if (!c) return json({ error: "origen no permitido" }, 403, {});
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: c });
    const ruta = new URL(req.url).pathname;
    if (!env.VAPID_PUBLICA || !env.VAPID_PRIVADA || !env.VAPID_SUJETO) return json({ error: "faltan las claves VAPID (wrangler secret put)" }, 500, c);
    if (req.method === "GET" && ruta === "/v1/clave") return json({ clave: env.VAPID_PUBLICA }, 200, c);
    if (req.method !== "POST") return json({ error: "no encontrado" }, 404, c);
    let d;
    try { if ((req.headers.get("Content-Length") | 0) > 4096) throw 0; d = await req.json(); } catch { return json({ error: "cuerpo no válido" }, 400, c); }
    if (ruta === "/v1/probar") {
      if (!validarSuscripcion(d.suscripcion)) return json({ error: "suscripción no válida" }, 400, c);
      const estado = await enviar(d.suscripcion, { titulo: "Aviso de prueba", cuerpo: "Los avisos de fin de descanso funcionan.", etiqueta: "prueba" }, claves(env));
      return json({ estado }, estado >= 200 && estado < 300 ? 200 : 502, c);
    }
    if (!texto(d.id, 64) || !/^[A-Za-z0-9_-]+$/.test(d.id)) return json({ error: "id no válido" }, 400, c);
    const stub = env.AVISOS.get(env.AVISOS.idFromName(d.id));
    if (ruta === "/v1/cancelar") { await stub.fetch("https://do/cancelar", { method: "POST" }); return json({ ok: true }, 200, c); }
    if (ruta === "/v1/programar") {
      const ahora = Date.now();
      if (!validarSuscripcion(d.suscripcion)) return json({ error: "suscripción no válida" }, 400, c);
      if (!(typeof d.en === "number" && d.en > ahora - 5000 && d.en < ahora + MAX_ADELANTO)) return json({ error: "hora no válida" }, 400, c);
      const aviso = { suscripcion: d.suscripcion, en: d.en, titulo: texto(d.titulo, 80) ? d.titulo : "Descanso terminado", cuerpo: texto(d.cuerpo, 160) ? d.cuerpo : "Vuelve a la serie." };
      await stub.fetch("https://do/programar", { method: "POST", body: JSON.stringify(aviso) });
      return json({ ok: true }, 200, c);
    }
    return json({ error: "no encontrado" }, 404, c);
  },
};

/** Un objeto por dispositivo: guarda el aviso pendiente y lo envía con una alarma. */
export class Avisos {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(req) {
    const ruta = new URL(req.url).pathname;
    if (ruta === "/programar") {
      const aviso = await req.json();
      await this.state.storage.put("aviso", aviso);
      await this.state.storage.setAlarm(aviso.en);
    } else if (ruta === "/cancelar") {
      await this.state.storage.deleteAlarm();
      await this.state.storage.delete("aviso");
    }
    return new Response("ok");
  }
  async alarm() {
    const a = await this.state.storage.get("aviso");
    await this.state.storage.delete("aviso");
    if (a) await enviar(a.suscripcion, { titulo: a.titulo, cuerpo: a.cuerpo, etiqueta: "descanso" }, claves(this.env));
  }
}

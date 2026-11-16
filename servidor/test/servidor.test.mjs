// Servidor de avisos con un Durable Object y un servicio de push simulados.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cifrar, vapid, b64u } from "../src/push.js";
import worker, { Avisos, validarSuscripcion } from "../src/index.js";

const te = new TextEncoder(), td = new TextDecoder();
const hmac = async (k, d) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), d));
const unir = (...p) => { const o = new Uint8Array(p.reduce((a, x) => a + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };

/** Un «navegador»: par ECDH y secreto de autenticación, y cómo descifra (lado receptor de RFC 8291). */
async function dispositivo() {
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey)), auth = crypto.getRandomValues(new Uint8Array(16));
  const suscripcion = { endpoint: "https://web.push.apple.com/QH_prueba", keys: { p256dh: b64u.deBytes(pub), auth: b64u.deBytes(auth) } };
  async function descifrar(cuerpo) {
    const salt = cuerpo.slice(0, 16), idlen = cuerpo[20], asPub = cuerpo.slice(21, 21 + idlen), datos = cuerpo.slice(21 + idlen);
    assert.equal(new DataView(cuerpo.buffer, cuerpo.byteOffset + 16, 4).getUint32(0), 4096);
    const as = await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const secreto = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: as }, par.privateKey, 256));
    const ikm = await hmac(await hmac(auth, secreto), unir(te.encode("WebPush: info\0"), pub, asPub, new Uint8Array([1])));
    const prk = await hmac(salt, ikm);
    const cek = (await hmac(prk, unir(te.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
    const nonce = (await hmac(prk, unir(te.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
    const claro = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]), datos));
    assert.equal(claro[claro.length - 1], 2, "delimitador de último registro");
    return td.decode(claro.slice(0, -1));
  }
  return { suscripcion, descifrar };
}
async function clavesVapid() {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return { par, publica: b64u.deBytes(new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey))), privada: (await crypto.subtle.exportKey("jwk", par.privateKey)).d, sujeto: "mailto:avisos@example.org" };
}

test("cifrado aes128gcm (RFC 8291): el dispositivo lo descifra", async () => {
  const d = await dispositivo();
  const cuerpo = await cifrar(d.suscripcion, '{"titulo":"Descanso terminado"}');
  assert.equal(await d.descifrar(cuerpo), '{"titulo":"Descanso terminado"}');
});

test("VAPID (RFC 8292): JWT ES256 válido con audiencia y caducidad", async () => {
  const v = await clavesVapid(), ahora = Date.UTC(2026, 10, 16);
  const cab = await vapid("https://web.push.apple.com/QH_x", v, ahora);
  const [, t, k] = cab.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, v.publica);
  const [h, c, f] = t.split(".");
  const claims = JSON.parse(td.decode(b64u.aBytes(c)));
  assert.equal(claims.aud, "https://web.push.apple.com"); assert.equal(claims.sub, v.sujeto); assert.equal(claims.exp, ahora / 1000 + 43200);
  assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, v.par.publicKey, b64u.aBytes(f), te.encode(h + "." + c)));
});

test("solo se aceptan suscripciones de servicios de push conocidos", () => {
  const k = { p256dh: "x", auth: "y" };
  assert.ok(validarSuscripcion({ endpoint: "https://web.push.apple.com/abc", keys: k }));
  assert.ok(validarSuscripcion({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: k }));
  for (const e of ["http://web.push.apple.com/abc", "https://evil.example/abc", "https://web.push.apple.com.evil.example/abc"]) assert.equal(validarSuscripcion({ endpoint: e, keys: k }), false);
  assert.equal(validarSuscripcion({ endpoint: "https://web.push.apple.com/abc" }), false);
});

/* ---------- rutas, con un Durable Object en memoria ---------- */
function entorno(v) {
  const objetos = new Map();
  const env = { ORIGEN: "https://zyro0-z.github.io", VAPID_PUBLICA: v.publica, VAPID_PRIVADA: v.privada, VAPID_SUJETO: v.sujeto };
  env.AVISOS = {
    idFromName: (n) => n,
    get(id) {
      if (!objetos.has(id)) {
        const datos = new Map(); let alarma = null;
        const storage = { put: async (k, x) => { datos.set(k, structuredClone(x)); }, get: async (k) => datos.get(k), delete: async (k) => datos.delete(k),
          setAlarm: async (t) => { alarma = t; }, deleteAlarm: async () => { alarma = null; }, get alarma() { return alarma; }, datos };
        const obj = new Avisos({ storage }, env);
        objetos.set(id, { obj, storage, stub: { fetch: (u, i) => obj.fetch(new Request(u, i)) } });
      }
      return objetos.get(id).stub;
    },
  };
  return { env, objetos };
}
const pedir = (ruta, cuerpo, origen = "https://zyro0-z.github.io") => new Request("https://avisos.example" + ruta,
  { method: cuerpo ? "POST" : "GET", headers: Object.assign({ "Content-Type": "application/json" }, origen ? { Origin: origen } : {}), body: cuerpo ? JSON.stringify(cuerpo) : undefined });

test("CORS: solo el origen de la app; preflight correcto", async () => {
  const { env } = entorno(await clavesVapid());
  assert.equal((await worker.fetch(pedir("/v1/clave", null, "https://otra.example"), env)).status, 403);
  assert.equal((await worker.fetch(pedir("/v1/clave", null, null), env)).status, 403);
  const pre = await worker.fetch(new Request("https://avisos.example/v1/programar", { method: "OPTIONS", headers: { Origin: "https://zyro0-z.github.io" } }), env);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get("Access-Control-Allow-Origin"), "https://zyro0-z.github.io");
  const r = await worker.fetch(pedir("/v1/clave"), env);
  assert.equal(r.status, 200); assert.equal((await r.json()).clave, env.VAPID_PUBLICA);
});

test("programar → la alarma envía el aviso cifrado; cancelar lo quita", async () => {
  const v = await clavesVapid(), d = await dispositivo(), { env, objetos } = entorno(v);
  const enviados = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, init) => { enviados.push({ url, init }); return new Response(null, { status: 201 }); };
  try {
    const en = Date.now() + 90000;
    let r = await worker.fetch(pedir("/v1/programar", { id: "dispositivo_1", suscripcion: d.suscripcion, en, titulo: "Descanso terminado", cuerpo: "Press banca · serie 3" }), env);
    assert.equal(r.status, 200);
    const o = objetos.get("dispositivo_1");
    assert.equal(o.storage.alarma, en);
    await o.obj.alarm();
    assert.equal(enviados.length, 1);
    assert.equal(enviados[0].url, d.suscripcion.endpoint);
    assert.equal(enviados[0].init.headers["Content-Encoding"], "aes128gcm");
    assert.match(enviados[0].init.headers.Authorization, /^vapid t=.+, k=/);
    assert.deepEqual(JSON.parse(await d.descifrar(enviados[0].init.body)), { titulo: "Descanso terminado", cuerpo: "Press banca · serie 3", etiqueta: "descanso" });
    assert.equal(o.storage.datos.size, 0, "se borra al enviarlo");
    // cancelar
    await worker.fetch(pedir("/v1/programar", { id: "dispositivo_1", suscripcion: d.suscripcion, en }), env);
    r = await worker.fetch(pedir("/v1/cancelar", { id: "dispositivo_1" }), env);
    assert.equal(r.status, 200); assert.equal(o.storage.alarma, null); assert.equal(o.storage.datos.size, 0);
    await o.obj.alarm();
    assert.equal(enviados.length, 1, "cancelado: no se envía");
    // prueba inmediata
    r = await worker.fetch(pedir("/v1/probar", { suscripcion: d.suscripcion }), env);
    assert.equal(r.status, 200); assert.equal(enviados.length, 2);
    assert.equal(JSON.parse(await d.descifrar(enviados[1].init.body)).etiqueta, "prueba");
  } finally { globalThis.fetch = fetchOriginal; }
});

test("rechaza datos no válidos", async () => {
  const d = await dispositivo(), { env } = entorno(await clavesVapid());
  const mal = async (c) => (await worker.fetch(pedir("/v1/programar", c), env)).status;
  assert.equal(await mal({ id: "a b", suscripcion: d.suscripcion, en: Date.now() + 1000 }), 400);
  assert.equal(await mal({ id: "a", suscripcion: d.suscripcion, en: Date.now() + 2 * 3600e3 }), 400);
  assert.equal(await mal({ id: "a", suscripcion: Object.assign({}, d.suscripcion, { endpoint: "https://evil.example/x" }), en: Date.now() + 1000 }), 400);
  assert.equal((await worker.fetch(new Request("https://avisos.example/v1/programar", { method: "POST", headers: { Origin: "https://zyro0-z.github.io" }, body: "{" }), env)).status, 400);
  const sinClaves = Object.assign({}, env, { VAPID_PRIVADA: "" });
  assert.equal((await worker.fetch(pedir("/v1/clave"), sinClaves)).status, 500);
});

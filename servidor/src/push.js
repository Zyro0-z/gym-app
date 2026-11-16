// Web Push sin dependencias: cifrado del mensaje (RFC 8291, aes128gcm) y cabecera VAPID (RFC 8292),
// con WebCrypto. Funciona igual en Cloudflare Workers y en node ≥ 20 (las pruebas).

const te = new TextEncoder();
export const b64u = {
  aBytes(s) { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); return Uint8Array.from(b, (c) => c.charCodeAt(0)); },
  deBytes(u) { let s = ""; for (const x of new Uint8Array(u)) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
};
const unir = (...p) => { const n = p.reduce((a, x) => a + x.length, 0), o = new Uint8Array(n); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
async function hmac(clave, datos) {
  const k = await crypto.subtle.importKey("raw", clave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, datos));
}

/**
 * Cifra `texto` para una suscripción { keys: { p256dh, auth } }.
 * Devuelve el cuerpo listo para enviar con Content-Encoding: aes128gcm.
 * `efimera` y `sal` solo se pasan en las pruebas (para reproducir un vector).
 */
export async function cifrar(suscripcion, texto, { efimera = null, sal = null } = {}) {
  const uaPub = b64u.aBytes(suscripcion.keys.p256dh), auth = b64u.aBytes(suscripcion.keys.auth);
  if (uaPub.length !== 65 || auth.length !== 16) throw new Error("claves de suscripción no válidas");
  const par = efimera || (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]));
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const ua = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secreto = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: ua }, par.privateKey, 256));
  const prkClave = await hmac(auth, secreto);
  const ikm = await hmac(prkClave, unir(te.encode("WebPush: info\0"), uaPub, asPub, new Uint8Array([1])));
  const salt = sal || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, unir(te.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, unir(te.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const claro = unir(te.encode(texto), new Uint8Array([2]));        // 0x02: último registro, sin relleno
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, claro));
  const rs = new Uint8Array([0, 0, 16, 0]);                          // tamaño de registro 4096
  return unir(salt, rs, new Uint8Array([asPub.length]), asPub, cifrado);
}

/** Cabecera Authorization «vapid t=…, k=…» para el servicio de push del endpoint. */
export async function vapid(endpoint, { publica, privada, sujeto }, ahora = Date.now()) {
  const pub = b64u.aBytes(publica);
  const jwk = { kty: "EC", crv: "P-256", x: b64u.deBytes(pub.slice(1, 33)), y: b64u.deBytes(pub.slice(33, 65)), d: privada, ext: true };
  const clave = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const parte = (o) => b64u.deBytes(te.encode(JSON.stringify(o)));
  const sin = parte({ typ: "JWT", alg: "ES256" }) + "." + parte({ aud: new URL(endpoint).origin, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: sujeto });
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, clave, te.encode(sin));
  return "vapid t=" + sin + "." + b64u.deBytes(firma) + ", k=" + publica;
}

/** Envía un aviso. Devuelve el estado HTTP del servicio de push (201 = aceptado; 404/410 = suscripción caducada). */
export async function enviar(suscripcion, datos, claves, { fetch: f = fetch } = {}) {
  const cuerpo = await cifrar(suscripcion, JSON.stringify(datos));
  const r = await f(suscripcion.endpoint, { method: "POST", body: cuerpo, headers: {
    Authorization: await vapid(suscripcion.endpoint, claves), "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream", TTL: "120", Urgency: "high" } });
  return r.status;
}

// Genera un par de claves VAPID. Uso: node tools/claves.mjs
// Copia cada valor con «npx wrangler secret put VAPID_PUBLICA» y «VAPID_PRIVADA».
import { b64u } from "../src/push.js";
const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
const pub = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
const jwk = await crypto.subtle.exportKey("jwk", par.privateKey);
console.log("VAPID_PUBLICA=" + b64u.deBytes(pub));
console.log("VAPID_PRIVADA=" + jwk.d);

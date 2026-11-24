// Cifrado de extremo a extremo de la copia en la nube (Web Crypto, sin librerías).
//
//  · De la clave de la persona salen DOS cosas independientes con PBKDF2-SHA256:
//      - identidad: { id, token } con una sal fija de la app. El servidor solo guarda el hash del token.
//      - clave AES-256-GCM con una sal aleatoria por copia (va dentro del sobre).
//  · El texto se comprime (gzip, si el navegador puede) y se cifra con AES-GCM (IV aleatorio de 96 bits).
//  · El sobre es JSON: { v, kdf, it, sal, iv, gz, ct } (todo en base64). Quien tenga el sobre pero no la
//    clave no puede leerlo; si alguien lo altera, el descifrado falla (GCM autentica).
//  · Seguridad real = la fuerza de la clave. Una clave generada por la app (160 bits) es inviable de
//    adivinar; una frase corta se puede probar sin conexión contra el sobre.
const te = new TextEncoder(), td = new TextDecoder();
export const ITERACIONES = 600000;
export const VERSION_SOBRE = 1;
const aad = (gz) => te.encode("gym-nube-v1|gz=" + (gz ? 1 : 0));   // el indicador de compresión también queda autenticado
const SAL_ID = te.encode("gym-nube-id-v1");
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // 32 símbolos sin 0/O ni 1/I: 5 bits cada uno

const aB64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const deB64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Clave aleatoria de 160 bits: 8 grupos de 4 caracteres (ABCD-EFGH-…). */
export function generarClave() {
  const r = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (let i = 0; i < 32; i++) s += ALFABETO[r[i] & 31];
  return s.match(/.{4}/g).join("-");
}

/** Texto normalizado de una clave: las generadas por la app se aceptan en minúsculas y sin guiones. */
export function normalizarClave(frase) {
  const t = String(frase == null ? "" : frase).normalize("NFKC").trim();
  const plano = t.replace(/[-\s]/g, "").toUpperCase();
  return plano.length === 32 && [...plano].every((c) => ALFABETO.includes(c)) ? plano.match(/.{4}/g).join("-") : t;
}

/** null si la clave es aceptable; si no, el motivo. */
export function problemaDeClave(frase) {
  const t = normalizarClave(frase);
  if (/^[A-Z2-9]{4}(-[A-Z2-9]{4}){7}$/.test(t)) return null;
  return t.length >= 12 ? null : "Usa una clave de 12 caracteres o más, o genera una segura.";
}

async function derivar(frase, sal, it, bits) {
  const base = await crypto.subtle.importKey("raw", te.encode(normalizarClave(frase)), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: it }, base, bits));
}
const sha = async (...partes) => { const n = partes.reduce((a, p) => a + p.length, 0), u = new Uint8Array(n); let i = 0; for (const p of partes) { u.set(p, i); i += p.length; } return new Uint8Array(await crypto.subtle.digest("SHA-256", u)); };

/** { id (32 hex), token (64 hex) } que identifican la copia en el servidor. */
export async function identidad(frase, it = ITERACIONES) {
  const b = await derivar(frase, SAL_ID, it, 256);
  return { id: hex(await sha(new Uint8Array([1]), b)).slice(0, 32), token: hex(await sha(new Uint8Array([2]), b)) };
}

const puedeComprimir = () => typeof CompressionStream === "function" && typeof Response === "function";
async function pasar(u8, Flujo, formato) {
  const flujo = new Blob([u8]).stream().pipeThrough(new Flujo(formato));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

/** Cifra un texto con la clave. Devuelve el sobre (objeto). */
export async function cifrar(texto, frase, { it = ITERACIONES } = {}) {
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const clave = await crypto.subtle.importKey("raw", await derivar(frase, sal, it, 256), "AES-GCM", false, ["encrypt"]);
  let datos = te.encode(texto), gz = false;
  if (puedeComprimir()) { try { datos = await pasar(datos, CompressionStream, "gzip"); gz = true; } catch (e) { datos = te.encode(texto); } }
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(gz) }, clave, datos));
  return { v: VERSION_SOBRE, kdf: "PBKDF2-SHA256", it, sal: aB64(sal), iv: aB64(iv), gz, ct: aB64(ct) };
}

/** Descifra un sobre. Lanza Error con un motivo legible si la clave no es la buena o el sobre está alterado. */
export async function descifrar(sobre, frase) {
  if (!sobre || sobre.v !== VERSION_SOBRE || typeof sobre.ct !== "string") throw new Error("La copia en la nube es de un formato que esta versión no entiende.");
  let claro;
  try {
    const clave = await crypto.subtle.importKey("raw", await derivar(frase, deB64(sobre.sal), sobre.it, 256), "AES-GCM", false, ["decrypt"]);
    claro = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(sobre.iv), additionalData: aad(!!sobre.gz) }, clave, deB64(sobre.ct)));
  } catch (e) { throw new Error("La clave no es la de esta copia, o la copia está alterada."); }
  if (sobre.gz) {
    if (typeof DecompressionStream !== "function") throw new Error("Este navegador no puede descomprimir la copia.");
    claro = await pasar(claro, DecompressionStream, "gzip");
  }
  return td.decode(claro);
}

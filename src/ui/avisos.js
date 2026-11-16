// Cliente de los avisos de fin de descanso por Web Push (servidor opcional, ver servidor/README.md).
// Sin servidor configurado no hace nada. En iPhone solo funciona con la app instalada (iOS 16.4+).

const CLAVE_ID = "gym-push-id";
const base = (url) => String(url || "").trim().replace(/\/+$/, "");

/** Id de este dispositivo para el servidor (un aviso pendiente por dispositivo). */
export function idDispositivo() {
  try {
    let id = localStorage.getItem(CLAVE_ID);
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => x.toString(16).padStart(2, "0")).join(""); localStorage.setItem(CLAVE_ID, id); }
    return id;
  } catch (e) { return "sin-almacen"; }
}

export const soportado = () => typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof PushManager !== "undefined" && typeof Notification !== "undefined";

/** URL válida para el servidor (https, o http solo en local para pruebas). */
export function urlValida(url) {
  try { const u = new URL(base(url)); return u.protocol === "https:" || u.hostname === "127.0.0.1" || u.hostname === "localhost"; } catch (e) { return false; }
}

const aBytes = (s) => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

async function pedir(url, ruta, cuerpo) {
  const r = await fetch(base(url) + ruta, cuerpo ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) } : {});
  if (!r.ok) throw new Error("El servidor respondió " + r.status);
  return r.json();
}

/** Suscripción de este dispositivo (la crea si hace falta, pidiendo permiso). Lanza Error legible. */
export async function suscripcion(url) {
  if (!soportado()) throw new Error("Este navegador no admite avisos. En iPhone, instala la app en la pantalla de inicio (iOS 16.4 o posterior).");
  if (!urlValida(url)) throw new Error("La dirección del servidor no es válida (tiene que empezar por https://).");
  const reg = await navigator.serviceWorker.ready;
  let s = await reg.pushManager.getSubscription();
  if (s) return s.toJSON();
  const permiso = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permiso !== "granted") throw new Error("Sin permiso para las notificaciones. Se concede en Ajustes del iPhone › Notificaciones.");
  const { clave } = await pedir(url, "/v1/clave");
  s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clave) });
  return s.toJSON();
}

/** Programa el aviso para `fin` (ms). Silencioso: si falla, el descanso sigue funcionando sin aviso. */
export async function programar(url, fin, { titulo, cuerpo } = {}) {
  try {
    if (!urlValida(url) || !soportado() || Notification.permission !== "granted") return false;
    await pedir(url, "/v1/programar", { id: idDispositivo(), suscripcion: await suscripcion(url), en: Math.round(fin), titulo, cuerpo });
    return true;
  } catch (e) { return false; }
}

export async function cancelar(url) {
  try { if (urlValida(url)) await pedir(url, "/v1/cancelar", { id: idDispositivo() }); return true; } catch (e) { return false; }
}

/** Aviso de prueba inmediato. Lanza Error con un motivo legible. */
export async function probar(url) {
  const r = await pedir(url, "/v1/probar", { suscripcion: await suscripcion(url) });
  if (r.estado === 404 || r.estado === 410) throw new Error("El servicio de avisos dice que la suscripción ha caducado. Desactiva y vuelve a activar los avisos.");
  return r;
}

/** Quita la suscripción de este dispositivo. */
export async function baja() {
  try { const reg = await navigator.serviceWorker.ready; const s = await reg.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) {}
}

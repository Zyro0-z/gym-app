// Réplica pequeña en localStorage de lo crítico (el entrenamiento a medias). iOS puede
// cerrar la app justo después de una escritura en IndexedDB; esta copia síncrona la cubre.
const CLAVE = "gym-espejo";
export function guardarEspejo(parcial) {
  try {
    const actual = leerEspejo() || {};
    localStorage.setItem(CLAVE, JSON.stringify(Object.assign(actual, parcial)));
  } catch (e) { /* sin localStorage: queda IndexedDB */ }
}
export function leerEspejo() {
  try { const t = localStorage.getItem(CLAVE); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}

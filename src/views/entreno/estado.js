// Estado compartido del entrenamiento (E.app, E.M, …) y utilidades pequeñas.


/** Estado compartido por los módulos del entrenamiento. M: modal abierto { modo: "entreno" | "edicion", d, capa, cuerpo, … }. */
export const E = { app: null, M: null, barraMin: null, tickMin: 0, wake: null, guardarT: 0 };

export const TIPOS = [["normal", "Normal", ""], ["calentamiento", "Calentamiento", "C"], ["fallo", "Al fallo", "F"], ["descendente", "Descendente", "D"]];

export const letraTipo = (t) => (TIPOS.find((x) => x[0] === t) || TIPOS[0])[2];

export const copiar = (x) => JSON.parse(JSON.stringify(x));

export const aTexto = (n) => (n === null || n === undefined || n === "" || n === 0 ? "" : String(n).replace(".", ","));

export const hhmm = (ms) => { const d = new Date(ms); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };

export const fechaLocal = (ms) => { const d = new Date(ms); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

export const vacia = () => ({ peso: "", reps: "", tipo: "normal", hecha: false });

export const CLAVE_MIN = "gym-entreno-minimizado";

export function leerMin() { try { return localStorage.getItem(CLAVE_MIN) === "1"; } catch (e) { return false; } }

export function marcarMin(v) { try { if (v) localStorage.setItem(CLAVE_MIN, "1"); else localStorage.removeItem(CLAVE_MIN); } catch (e) {} }

/** `{ tipo: "reps" }` si el catálogo dice que el ejercicio solo apunta repeticiones; `{}` en otro caso (peso y repeticiones). */
export function tipoDeCatalogo(ejercicioId) {
  const c = E.app.store.estado.catalogo.find((x) => x.id === ejercicioId);
  return c && c.tipoAncla === "reps" ? { tipo: "reps" } : {};
}

export function nombreDe(id, porDefecto) { const c = E.app.store.estado.catalogo.find((x) => x.id === id); return c ? c.nombre : porDefecto || id; }

export const contarHechas = (d) => d.ejercicios.reduce((a, e) => a + e.series.filter((s) => s.hecha).length, 0);

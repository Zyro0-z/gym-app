// Entrenamiento activo (modal a pantalla completa, minimizable a una barra) y edición de una
// sesión guardada. El entrenamiento en curso se guarda en cada cambio (IndexedDB + réplica en
// localStorage) y se reabre al volver a la app. La edición de una sesión vive solo en memoria.
// Partido por responsabilidad en views/entreno/ (ver docs/ARQUITECTURA.md). Este fichero mantiene la API.
export { iniciarEntreno, hayEntreno, modalAbierto, minimizarSiAbierto, guardarEntrenoYa, empezarEntreno, abrirEntreno, editarSesion } from "./entreno/pantalla.js";
export { mostrarResumen } from "./entreno/resumen.js";

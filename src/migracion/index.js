// Lectura del formato ANTIGUO (versión 1): sesiones en `fm`, plantillas y ajustes como textos de
// líneas «clave:: valor». Se usa una sola vez, al migrar los datos (y al importar una copia antigua),
// para obtener el modelo estructurado. Reproduce exactamente las reglas de lectura de la versión 1.
// Puro: no toca DOM ni almacenamiento. src/core no puede importar nada de aquí (lo comprueba un test).
//   claves.js       claves y constantes del formato antiguo
//   lineas.js       lector de líneas «clave:: valor» y de sus valores
//   config*.js      lectura de los textos de ajustes
//   conversion.js   plantillas, sesiones y modelo completo (desdeLegacy)
export { aKg, ARCHIVOS, SIN_CATEGORIZAR, GRUPOS_ESPERADOS, DIAS } from "./claves.js";
export { leerLineas, comoTexto } from "./lineas.js";
export { leerConfig } from "./config.js";
export { leerPlantillas, convertirSesiones, resolverNombre, desdeLegacy } from "./conversion.js";

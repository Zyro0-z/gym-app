// Lectura de TODOS los textos de ajustes de la versión 1 (ver config-entreno.js y config-resto.js).
import { leerLineas } from "./lineas.js";
import { leerConfigEntreno } from "./config-entreno.js";
import { leerConfigResto } from "./config-resto.js";

export function leerConfig(configs) {
  const errores = [], avisos = [];
  const pagina = (ruta) => {
    const k = Object.keys(configs || {}).find((x) => x === ruta || x === ruta + ".md" || x.replace(/\.md$/, "") === ruta);
    return k ? leerLineas(configs[k]) : null;
  };
  const a = leerConfigEntreno({ pagina, errores, avisos });
  const b = leerConfigResto(Object.assign({ pagina, errores, avisos }, a));
  const { GRUPOS, UMBRALES, BLOQUES, PESO, UNILATERALES, OBJETIVOS } = a;
  const { VOLUMEN_OBJ, COLORES, LIGAS_CFG, ESTANDARES, HORARIO, REGIONES } = b;
  return { GRUPOS, UMBRALES, BLOQUES, PESO, UNILATERALES, OBJETIVOS, VOLUMEN_OBJ, COLORES, LIGAS_CFG, ESTANDARES, HORARIO, REGIONES, errores, avisos };
}

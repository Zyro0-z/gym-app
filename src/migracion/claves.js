// Claves y constantes del formato ANTIGUO (versión 1). Las claves `Gym/Config/*.md` parecen rutas,
// pero son solo nombres de clave con los que la versión 1 guardaba cada texto de ajustes en
// IndexedDB y en sus copias: se conservan tal cual para poder migrar.
export { SIN_CATEGORIZAR, GRUPOS_ESPERADOS } from "../core/constantes.js";

const LB_A_KG = 0.45359237;
export const aKg = (w, unidad) => (String(unidad || "kg").toLowerCase().indexOf("lb") === 0 ? w * LB_A_KG : w);

export const ARCHIVOS = {
  grupos: "Gym/Config/grupos-musculares.md",
  regiones: "Gym/Config/regiones-svg.md",
  horario: "Gym/Config/horario-semanal.md",
  peso: "Gym/Config/peso-corporal.md",
  unilaterales: "Gym/Config/unilaterales.md",
  objetivos: "Gym/Config/objetivos.md",
  volumen: "Gym/Config/volumen-objetivo.md",
  colores: "Gym/Config/colores-grupos.md",
  ligas: "Gym/Config/ligas.md",
  estandares: "Gym/Config/estandares.md",
};
export const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const META = { file: 1, tipo: 1, type: 1, tags: 1, tag: 1, aliases: 1, alias: 1,
  cssclass: 1, cssclasses: 1, position: 1, mapa: 1, titulo: 1, descripcion: 1, nota: 1, notas: 1 };

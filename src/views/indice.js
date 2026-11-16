// Registro de pestañas y vistas (rutas «nombre/parámetros»).
import { poner } from "../ui/dom.js";
import { vacio } from "../ui/controles.js";
import { vistaHoy } from "./hoy.js";
import { vistaProgreso } from "./progreso.js";
import { vistaHistorial, vistaSesion } from "./historial.js";
import { vistaAjustes, vistaApariencia } from "./ajustes.js";
import { vistaDatos } from "./datos.js";
import { vistaGuia } from "./guia.js";
import { vistaEjercicio, vistaGrupo } from "./ejercicio.js";
import { vistaLigas, vistaLiga } from "./ligas.js";
import { vistaRutinas, vistaRutina, vistaHorario, vistaEjercicios, vistaEjercicioCat, vistaGrupos, vistaObjetivos, vistaCuerpo,
  vistaBloques, vistaBloque, vistaEntrenamiento, vistaCalidad, vistaAvanzado } from "./editores.js";

// Vistas que necesitan el análisis: sin él (el Worker aún calcula) se ve un esqueleto
for (const v of [vistaHoy, vistaProgreso, vistaHistorial, vistaSesion, vistaEjercicio, vistaGrupo, vistaLigas, vistaLiga, vistaCalidad]) v.analisis = true;
vistaHoy.esqueleto = vistaProgreso.esqueleto = "tarjetas";

export const PESTANAS = [
  { id: "hoy", titulo: "Hoy", icono: "hoy" },
  { id: "progreso", titulo: "Progreso", icono: "progreso" },
  { id: "historial", titulo: "Historial", icono: "historial" },
  { id: "ajustes", titulo: "Ajustes", icono: "ajustes" },
];

function vistaNoEncontrada() {
  return { titulo: "", render(c) { poner(c, vacio({ icono: "aviso", titulo: "Pantalla no encontrada", texto: "El enlace no lleva a ninguna pantalla de la app." })); } };
}

export const VISTAS = {
  hoy: vistaHoy, progreso: vistaProgreso, historial: vistaHistorial, ajustes: vistaAjustes,
  sesion: vistaSesion, apariencia: vistaApariencia, datos: vistaDatos, guia: vistaGuia,
  ejercicio: vistaEjercicio, grupo: vistaGrupo, ligas: vistaLigas, liga: vistaLiga,
  rutinas: vistaRutinas, rutina: vistaRutina, horario: vistaHorario, ejercicios: vistaEjercicios, ejercicioCat: vistaEjercicioCat,
  grupos: vistaGrupos, objetivos: vistaObjetivos, cuerpo: vistaCuerpo, bloques: vistaBloques, bloque: vistaBloque,
  entrenamiento: vistaEntrenamiento, calidad: vistaCalidad, avanzado: vistaAvanzado,
  noEncontrada: vistaNoEncontrada,
};

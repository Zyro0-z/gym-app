// Registro de pestañas y vistas (rutas «nombre/parámetros»).
import { poner } from "../ui/dom.js";
import { vacio } from "../ui/controles.js";
import { vistaHoy } from "./hoy.js";
import { vistaProgreso } from "./progreso.js";
import { vistaHistorial, vistaSesion } from "./historial.js";
import { vistaAjustes, vistaApariencia } from "./ajustes.js";
import { vistaDatos } from "./datos.js";
import { vistaGuia } from "./guia.js";

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
  noEncontrada: vistaNoEncontrada,
};

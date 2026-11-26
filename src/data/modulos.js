// Módulos que se pueden ocultar desde Ajustes › Módulos. Ocultar solo quita la entrada de la interfaz: los datos se conservan.
export const MODULOS = [
  { grupo: "Hoy", id: "hoy.semana", texto: "Esta semana" },
  { grupo: "Hoy", id: "hoy.ultima", texto: "Última sesión" },
  { grupo: "Hoy", id: "hoy.peso", texto: "Peso" },
  { grupo: "Hoy", id: "hoy.descarga", texto: "Propuesta de descarga" },
  { grupo: "Progreso", id: "progreso.ejercicios", texto: "Sección Ejercicios" },
  { grupo: "Progreso", id: "progreso.musculos", texto: "Sección Músculos" },
  { grupo: "Progreso", id: "progreso.cuerpo", texto: "Sección Cuerpo" },
  { grupo: "Progreso", id: "cuerpo.medidas", texto: "Medidas corporales" },
  { grupo: "Más análisis", id: "ligas", texto: "Ligas" },
  { grupo: "Más análisis", id: "musculos", texto: "Series por músculo" },
  { grupo: "Más análisis", id: "fatiga", texto: "Fatiga y descarga" },
  { grupo: "Más análisis", id: "rendimiento", texto: "Rendimiento y recuperación" },
  { grupo: "Más análisis", id: "molestias", texto: "Molestias articulares" },
  { grupo: "Más análisis", id: "mesociclos", texto: "Mesociclos" },
  { grupo: "Más análisis", id: "gimnasio", texto: "Por gimnasio" },
  { grupo: "Más análisis", id: "comparar", texto: "Comparar periodos" },
  { grupo: "Ficha de ejercicio", id: "ficha.mapa", texto: "Músculos trabajados" },
  { grupo: "Ficha de ejercicio", id: "ficha.proxima", texto: "Próxima sesión" },
];

/** ¿Está activo el módulo `id`? Por defecto todos lo están. */
export const activo = (ajustes, id) => !((ajustes && ajustes.ocultos) || []).includes(id);

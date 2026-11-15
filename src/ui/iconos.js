// Juego de iconos propio (docs/DISENO.md §3.5): rejilla de 24, trazo de 1,75, extremos y uniones
// redondeados y currentColor. Dibujados a mano para esta app; no proceden de ninguna librería.
import { s } from "./dom.js";

// Engranaje generado: 8 dientes trapezoidales unidos por arcos.
function engranaje(R = 9.6, r = 7.2, dientes = 8) {
  const p = [], g = (a) => (a * Math.PI) / 180, f = (n) => Math.round(n * 100) / 100;
  for (let i = 0; i < dientes; i++) {
    const a = (i * 360) / dientes - 90;
    const pts = [[a - 13, r], [a - 7.5, R], [a + 7.5, R], [a + 13, r]].map(([ang, rad]) => [f(12 + rad * Math.cos(g(ang))), f(12 + rad * Math.sin(g(ang)))]);
    if (i === 0) p.push(`M${pts[0][0]} ${pts[0][1]}`);
    else p.push(`A${r} ${r} 0 0 1 ${pts[0][0]} ${pts[0][1]}`);
    p.push(`L${pts[1][0]} ${pts[1][1]}L${pts[2][0]} ${pts[2][1]}L${pts[3][0]} ${pts[3][1]}`);
  }
  const a0 = (-90 - 13) * Math.PI / 180;
  p.push(`A${r} ${r} 0 0 1 ${f(12 + r * Math.cos(a0))} ${f(12 + r * Math.sin(a0))}Z`);
  return p.join("");
}
const GEAR = engranaje();

// Cada icono: contenido SVG (trazo). Los que llevan `·r` tienen variante rellena para la tab bar.
const T = {
  hoy: '<circle cx="12" cy="12" r="8.75"/><circle cx="12" cy="12" r="4.25"/>',
  "hoy·r": '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm0 5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"/>',
  progreso: '<rect x="3.75" y="12.5" width="4.5" height="8" rx="1.25"/><rect x="9.75" y="3.5" width="4.5" height="17" rx="1.25"/><rect x="15.75" y="8" width="4.5" height="12.5" rx="1.25"/>',
  "progreso·r": '<g fill="currentColor" stroke="none"><rect x="3" y="11.75" width="5.5" height="9.5" rx="1.5"/><rect x="9.25" y="2.75" width="5.5" height="18.5" rx="1.5"/><rect x="15.5" y="7.25" width="5.5" height="14" rx="1.5"/></g>',
  historial: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M7.5 14h1M11.5 14h1M15.5 14h1M7.5 17h1M11.5 17h1"/>',
  "historial·r": '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M6.5 4.25h11A3.75 3.75 0 0 1 21.25 8v1.25H2.75V8A3.75 3.75 0 0 1 6.5 4.25zM2.75 10.75h18.5v6.75a3.75 3.75 0 0 1-3.75 3.75h-11a3.75 3.75 0 0 1-3.75-3.75zM7 13.25h2v1.75H7zm4 0h2v1.75h-2zm4 0h2v1.75h-2zM7 16.25h2V18H7zm4 0h2V18h-2z"/><path d="M8 2.75v3.5M16 2.75v3.5"/>',
  ajustes: `<path d="${GEAR}"/><circle cx="12" cy="12" r="3"/>`,
  "ajustes·r": `<path fill="currentColor" stroke="currentColor" stroke-width="1" fill-rule="evenodd" d="${GEAR}M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 0 0 0-6.5z"/>`,

  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cerrar: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  "chevron-izq": '<path d="M15 5.5L8.5 12l6.5 6.5"/>',
  "chevron-abajo": '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
  "chevron-arriba": '<path d="M5.5 14.5L12 8l6.5 6.5"/>',
  atras: '<path d="M14.5 4.5L7 12l7.5 7.5"/>',
  buscar: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>',
  cronometro: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.75h4M18.25 6.25l1.5-1.5"/>',
  pesa: '<rect x="5" y="6.5" width="3" height="11" rx="1"/><rect x="16" y="6.5" width="3" height="11" rx="1"/><path d="M8 12h8M2.75 9.5v5M21.25 9.5v5"/>',
  bascula: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M7.75 10a5 5 0 0 1 8.5 0"/><path d="M12 10.5l1.5-2.25"/>',
  trofeo: '<path d="M7.5 3.75h9V9a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.5H5.25a2.25 2.25 0 0 0 2.4 4.5M16.5 5.5h2.25a2.25 2.25 0 0 1-2.4 4.5"/><path d="M12 13.5v3.5M8.5 20.25h7M9.75 17h4.5l.5 3.25h-5.5z"/>',
  llama: '<path d="M12 21c-3.75 0-6.5-2.6-6.5-6.25 0-3.3 2.4-5.4 3.6-8.25.55 1.75 1.6 2.9 2.7 3.3.2-2.6 1.4-5 3.6-6.8-.3 2.6.6 4.6 1.8 6.4 1 1.5 1.3 3 1.3 4.4C18.5 18.1 15.75 21 12 21z"/><path d="M12 21c-1.6 0-2.75-1.2-2.75-2.75 0-1.75 1.5-2.5 2.25-4 .75 1.25 3.25 2.1 3.25 4 0 1.55-1.15 2.75-2.75 2.75z"/>',
  "flecha-arriba": '<path d="M12 19.5v-15M6 10.5l6-6 6 6"/>',
  "flecha-abajo": '<path d="M12 4.5v15M6 13.5l6 6 6-6"/>',
  "flecha-derecha": '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
  "sube": '<path d="M6.5 17.5L17 7M9.5 6.5H17.5V14.5"/>',
  "baja": '<path d="M6.5 6.5L17 17M17.5 9.5V17.5H9.5"/>',
  "igual": '<path d="M4.5 12h15M14 7l5.5 5-5.5 5"/>',
  opciones: '<g fill="currentColor" stroke="none"><circle cx="5.5" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="18.5" cy="12" r="1.75"/></g>',
  "opciones-circulo": '<circle cx="12" cy="12" r="9"/><g fill="currentColor" stroke="none"><circle cx="7.75" cy="12" r="1.25"/><circle cx="12" cy="12" r="1.25"/><circle cx="16.25" cy="12" r="1.25"/></g>',
  papelera: '<path d="M4.5 6.5h15M9.5 6.5V4.25h5V6.5M6.5 6.5l1 13.25h9l1-13.25M10 10.5v5.75M14 10.5v5.75"/>',
  arrastrar: '<path d="M5 8.5h14M5 12h14M5 15.5h14"/>',
  compartir: '<path d="M12 3.5v11M8 7.25l4-3.75 4 3.75"/><path d="M8.5 10.5H6.75A1.75 1.75 0 0 0 5 12.25v6.5c0 .97.78 1.75 1.75 1.75h10.5c.97 0 1.75-.78 1.75-1.75v-6.5c0-.97-.78-1.75-1.75-1.75H15.5"/>',
  descargar: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 19.75h14"/>',
  subir: '<path d="M12 15.5v-11M7.5 9L12 4.5 16.5 9M5 19.75h14"/>',
  aviso: '<path d="M10.3 4.6a2 2 0 0 1 3.4 0l7.1 12.4a2 2 0 0 1-1.7 3H4.9a2 2 0 0 1-1.7-3z"/><path d="M12 9.5v4"/><circle cx="12" cy="16.75" r=".6" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.75" r=".6" fill="currentColor"/>',
  lapiz: '<path d="M4.5 19.5l1-4L16 5a2.12 2.12 0 0 1 3 3L8.5 18.5z"/><path d="M14 7l3 3"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.25 2"/>',
  minimizar: '<path d="M5.5 9.5L12 16l6.5-6.5"/>',
  play: '<path fill="currentColor" d="M8 5.75v12.5a.75.75 0 0 0 1.15.63l9.7-6.25a.75.75 0 0 0 0-1.26l-9.7-6.25A.75.75 0 0 0 8 5.75z"/>',
  pausa: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  lista: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><g fill="currentColor" stroke="none"><circle cx="4.75" cy="6.5" r="1.25"/><circle cx="4.75" cy="12" r="1.25"/><circle cx="4.75" cy="17.5" r="1.25"/></g>',
  diana: '<circle cx="12" cy="12" r="8.75"/><circle cx="12" cy="12" r="4.75"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  capas: '<path d="M12 3.75l8.5 4.5-8.5 4.5-8.5-4.5z"/><path d="M3.5 12.25l8.5 4.5 8.5-4.5M3.5 16.25l8.5 4.5 8.5-4.5"/>',
  apariencia: '<circle cx="12" cy="12" r="8.75"/><path fill="currentColor" d="M12 3.25a8.75 8.75 0 0 1 0 17.5z"/>',
  datos: '<ellipse cx="12" cy="6" rx="7.5" ry="2.75"/><path d="M4.5 6v12c0 1.5 3.4 2.75 7.5 2.75s7.5-1.25 7.5-2.75V6M4.5 12c0 1.5 3.4 2.75 7.5 2.75s7.5-1.25 7.5-2.75"/>',
  ajustar: '<path d="M4 7h9.5M18.5 7H20M4 17h3M11.5 17H20"/><circle cx="16" cy="7" r="2.5"/><circle cx="9" cy="17" r="2.5"/>',
  persona: '<circle cx="12" cy="7.5" r="3.75"/><path d="M4.75 20.25a7.25 7.25 0 0 1 14.5 0"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  repetir: '<path d="M4.5 11.5V10a3.5 3.5 0 0 1 3.5-3.5h11M16 3.5l3 3-3 3M19.5 12.5V14a3.5 3.5 0 0 1-3.5 3.5H5M8 20.5l-3-3 3-3"/>',
  nota: '<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8.5h5M9 12.5h6M9 16h6"/>',
  sonido: '<path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z"/><path d="M15.5 9a4.25 4.25 0 0 1 0 6M18 6.5a7.75 7.75 0 0 1 0 11"/>',
  vibrar: '<rect x="7.5" y="3.5" width="9" height="17" rx="2.25"/><path d="M4 8.5v7M20 8.5v7"/>',
  escudo: '<path d="M12 3.25l7.25 2.75v5.5c0 4.5-3 7.75-7.25 9.25-4.25-1.5-7.25-4.75-7.25-9.25V6z"/><path d="M8.75 12l2.25 2.25 4.25-4.5"/>',
  copia: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/>',
  ojo: '<path d="M2.75 12S6 5.75 12 5.75 21.25 12 21.25 12 18 18.25 12 18.25 2.75 12 2.75 12z"/><circle cx="12" cy="12" r="3"/>',
  rayo: '<path d="M13 3L5 13.5h6.5L11 21l8-10.5h-6.5z"/>',
  cuerpo: '<circle cx="12" cy="4.75" r="2"/><path d="M5 8.5l7 1 7-1M12 9.5v5M12 14.5l-3 6.5M12 14.5l3 6.5"/>',
};

/**
 * Devuelve un <svg> del icono `nombre`. `relleno: true` usa la variante rellena si existe.
 * `tam` en px (por defecto lo fija el CSS del contenedor).
 */
export function icono(nombre, { relleno = false, tam = null, clase = null, grosor = null } = {}) {
  const clave = relleno && T[nombre + "·r"] ? nombre + "·r" : nombre;
  const cont = T[clave];
  if (!cont) throw new Error("Icono desconocido: " + nombre);
  const el = s("svg", {
    viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": grosor || 1.75,
    "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false", class: clase,
    width: tam, height: tam, html: cont,
  });
  return el;
}

export const NOMBRES_ICONOS = Object.keys(T).filter((k) => !k.includes("·"));

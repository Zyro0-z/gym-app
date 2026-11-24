// Enlace entre un mapa corporal y su lista: tocar una zona marca su fila y tocar una fila enfoca su zona.
import { reducirMovimiento } from "../ui/dom.js";

const suave = () => ({ block: "nearest", behavior: reducirMovimiento() ? "auto" : "smooth" });

/** Marca la fila `nombre` (o ninguna). Un toque en el mapa no desplaza la página: la fila se marca donde está. */
export function marcarFila(filas, nombre) {
  for (const [n, el] of filas) {
    const on = n === nombre;
    el.classList.toggle("enfocada", on);
    if (el.tagName === "BUTTON") el.setAttribute("aria-pressed", String(on));
  }
}

/** Acerca el mapa a la vista (al tocar una fila que está lejos de él). */
export const verMapa = (mapa) => mapa.scrollIntoView(suave());

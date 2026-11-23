// Series de aproximación para llegar a un peso de trabajo sin gastar fuerza antes de tiempo.
// Pauta clásica de aproximación (pocas repeticiones, subiendo cargas); no hay un reparto con
// respaldo experimental mejor que otro, así que es un punto de partida editable.
// Puro: devuelve [{ peso, reps }] ya redondeado a cargas que se pueden montar.
import { calcularDiscos } from "./discos.js";

const ESQUEMA = [{ f: 0.4, reps: 8 }, { f: 0.6, reps: 5 }, { f: 0.75, reps: 3 }, { f: 0.88, reps: 1 }];

/**
 * @param {number} trabajo peso de la primera serie de trabajo (kg)
 * @param {{barra?:number, discos?:number[]|null, paso?:number}} o  con `discos` se redondea a lo que se puede montar con ellos
 */
export function generarCalentamiento(trabajo, { barra = 20, discos = null, paso = 2.5 } = {}) {
  if (!(trabajo > 0)) return [];
  const montable = (w) => {
    if (discos && discos.length) { const r = calcularDiscos(w, barra, discos); return r.error ? barra : r.logrado; }
    return Math.max(0, Math.round(w / paso) * paso);
  };
  const out = [];
  const conBarra = discos && discos.length && barra > 0 && trabajo >= barra * 1.6;
  if (conBarra) out.push({ peso: barra, reps: 10 });
  for (const { f, reps } of ESQUEMA) {
    const peso = montable(trabajo * f);
    const previo = out.length ? out[out.length - 1].peso : 0;
    if (peso <= previo || peso >= trabajo * 0.95 || peso <= 0) continue;
    if (conBarra && peso <= barra) continue;
    out.push({ peso, reps });
  }
  return out;
}

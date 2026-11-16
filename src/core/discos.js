// Calculadora de discos: qué discos poner a cada lado de la barra para llegar a un peso.
// Voraz de mayor a menor con los discos disponibles (pares ilimitados de cada uno). Si el peso no
// se puede formar exacto, devuelve el más cercano por debajo y cuánto falta.

const EPS = 1e-6;
const red = (x) => Math.round(x * 1000) / 1000;

/**
 * @param {number} total  peso total en kg (barra incluida)
 * @param {number} barra  peso de la barra en kg
 * @param {number[]} discos tamaños disponibles en kg
 * @returns {{ porLado: number[], lado: number, logrado: number, falta: number } | { error: string }}
 */
export function calcularDiscos(total, barra, discos) {
  if (!(total > 0)) return { error: "Escribe un peso" };
  if (!(barra >= 0)) return { error: "La barra no tiene un peso válido" };
  if (total + EPS < barra) return { error: "El peso es menor que la barra" };
  const tam = [...new Set((discos || []).filter((d) => d > 0))].sort((a, b) => b - a);
  let resto = red((total - barra) / 2);
  const porLado = [];
  for (const d of tam) while (resto + EPS >= d) { porLado.push(d); resto = red(resto - d); }
  const lado = red(porLado.reduce((a, b) => a + b, 0));
  const logrado = red(barra + 2 * lado);
  return { porLado, lado, logrado, falta: red(total - logrado) };
}

/** Agrupa una lista de discos: [20, 20, 5] → [{ kg: 20, n: 2 }, { kg: 5, n: 1 }]. */
export function agrupar(porLado) {
  const out = [];
  for (const d of porLado) { const u = out[out.length - 1]; if (u && u.kg === d) u.n++; else out.push({ kg: d, n: 1 }); }
  return out;
}

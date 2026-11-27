// Barra y discos de la calculadora (ajustes.entreno). Puro.
export const DISCOS_BASE = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];

export function gimnasioActivo(aj) {
  const e = (aj && aj.entreno) || {};
  return { barra: e.barra ?? 20, discos: Array.isArray(e.discos) && e.discos.length ? e.discos : DISCOS_BASE };
}

// Gimnasios: cada uno con su barra y sus discos (y, en el futuro, su material). Puro.
// `ajustes.gimnasios` puede estar vacío en datos antiguos: entonces hay un gimnasio implícito
// con la barra y los discos de `ajustes.entreno`.
export const DISCOS_BASE = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5];
export const ID_PRINCIPAL = "principal";

export function gimnasiosDe(aj) {
  if (aj && Array.isArray(aj.gimnasios) && aj.gimnasios.length) return aj.gimnasios;
  const e = (aj && aj.entreno) || {};
  return [{ id: ID_PRINCIPAL, nombre: "Mi gimnasio", barra: e.barra ?? 20, discos: Array.isArray(e.discos) && e.discos.length ? e.discos : DISCOS_BASE }];
}

export function gimnasioActivo(aj) {
  const l = gimnasiosDe(aj);
  return l.find((g) => g.id === (aj && aj.gimnasioActivo)) || l[0];
}

/** Id nuevo a partir del nombre, sin chocar con los existentes. */
export function idGimnasio(nombre, existentes) {
  const base = String(nombre || "gimnasio").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gimnasio";
  const ids = new Set(existentes.map((g) => g.id));
  let id = base, n = 2;
  while (ids.has(id)) id = base + "-" + n++;
  return id;
}

export const nombreGimnasio = (aj, id) => { const g = gimnasiosDe(aj).find((x) => x.id === id); return g ? g.nombre : null; };

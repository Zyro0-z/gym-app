// Estadística mínima para los análisis que cruzan dos variables (sin librerías).

export const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
export const mediana = (l) => { if (!l.length) return null; const s = [...l].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const desviacion = (l) => {
  if (l.length < 2) return null;
  const m = media(l);
  return Math.sqrt(l.reduce((a, x) => a + (x - m) * (x - m), 0) / (l.length - 1));
};

/** Rangos con los empates repartidos (1-based). */
export function rangos(l) {
  const idx = l.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(l.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const m = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = m;
    i = j + 1;
  }
  return r;
}

/**
 * Correlación de Spearman entre dos listas del mismo tamaño y estadístico t (n − 2 grados de
 * libertad). Con n < 3 o sin variación en alguna lista no hay correlación: { rho: null }.
 * La regla «concluyente» es deliberadamente conservadora: n ≥ 12 y |t| ≥ 2 (aprox. p < 0,05).
 */
export function spearman(x, y) {
  const n = x.length;
  if (n < 3 || y.length !== n) return { n, rho: null, t: null, concluyente: false };
  const a = rangos(x), b = rangos(y), ma = media(a), mb = media(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  if (!saa || !sbb) return { n, rho: null, t: null, concluyente: false };
  const rho = sab / Math.sqrt(saa * sbb);
  const t = Math.abs(rho) >= 1 ? Infinity : rho * Math.sqrt((n - 2) / (1 - rho * rho));
  return { n, rho, t, concluyente: n >= 12 && Math.abs(t) >= 2 };
}

/** Media con intervalo de confianza aproximado del 95 % (normal). Con n < 3, sin intervalo. */
export function mediaConIntervalo(l) {
  const n = l.length, m = media(l);
  if (n < 3) return { n, media: m, lo: null, hi: null };
  const e = 1.96 * desviacion(l) / Math.sqrt(n);
  return { n, media: m, lo: m - e, hi: m + e };
}

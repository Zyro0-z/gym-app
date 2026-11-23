// Comparación entre gimnasios: para cada ejercicio hecho en dos o más, el e1RM de cada sitio.
// Una diferencia aquí mezcla el gimnasio (máquinas y poleas que no marcan igual, barras distintas) con el
// progreso en el tiempo y la fatiga de cada día: por eso se muestra la mediana de las mejores marcas por
// sesión y se avisa cuando hay pocas sesiones. Puro.
const mediana = (xs) => { const s = xs.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const red1 = (x) => Math.round(x * 10) / 10;
export const MIN_SESIONES = 3;   // por debajo, la comparación es anecdótica

/**
 * @param {{st:object, k:string, ejercicio:string, dia:string|null, ses:{id:string, ref:{gimnasio?:string}}}[]} TODAS series de todasLasSeries()
 * @returns {{k:string, nombre:string, referencia:string, filas:{id:string, sesiones:number, series:number, mejor:number, mediana:number, difPct:number|null}[], pocos:boolean}[]}
 */
export function compararGimnasios(TODAS) {
  const por = new Map();   // k → { nombre, gims: Map(id → { ses: Map(sesId → mejor e1RM), series }) }
  for (const x of TODAS) {
    const g = x.ses && x.ses.ref && x.ses.ref.gimnasio;
    if (!g || !x.st.paraPR || !(x.st.oneRM > 0)) continue;
    let e = por.get(x.k);
    if (!e) { e = { nombre: x.ejercicio, gims: new Map() }; por.set(x.k, e); }
    let d = e.gims.get(g);
    if (!d) { d = { ses: new Map(), series: 0 }; e.gims.set(g, d); }
    d.series++;
    d.ses.set(x.ses.id, Math.max(d.ses.get(x.ses.id) || 0, x.st.oneRM));
  }
  const out = [];
  for (const [k, e] of por) {
    if (e.gims.size < 2) continue;
    const filas = [...e.gims].map(([id, d]) => { const v = [...d.ses.values()]; return { id, sesiones: v.length, series: d.series, mejor: red1(Math.max(...v)), mediana: red1(mediana(v)), difPct: null }; })
      .sort((a, b) => b.sesiones - a.sesiones || (a.id < b.id ? -1 : 1));
    const ref = filas[0];
    for (const f of filas) f.difPct = f === ref ? null : Math.round(((f.mediana - ref.mediana) / ref.mediana) * 1000) / 10;
    out.push({ k, nombre: e.nombre, referencia: ref.id, filas, pocos: filas.some((f) => f.sesiones < MIN_SESIONES) });
  }
  return out.sort((a, b) => b.filas.reduce((s, f) => s + f.sesiones, 0) - a.filas.reduce((s, f) => s + f.sesiones, 0) || (a.nombre < b.nombre ? -1 : 1));
}

// Contexto del análisis: el modelo de datos más las consultas que comparten todos los
// cálculos (grupo de un ejercicio, rutina por nombre, bloques activos…). Puro.
import { canon } from "./nombres.js";
import { SIN_CATEGORIZAR, GRUPOS_ESPERADOS } from "./constantes.js";
import { numDia } from "./fechas.js";

export function crearContexto(modelo, hoy) {
  const A = modelo.ajustes || {};
  const catalogo = new Map((modelo.catalogo || []).map((c) => [c.id, c]));

  // Grafía única por grupo (la de Ajustes)
  const grafia = new Map();
  for (const g of A.grupos || []) grafia.set(canon(g.nombre), g.nombre);
  for (const c of catalogo.values()) if (c.grupo && !grafia.has(canon(c.grupo))) grafia.set(canon(c.grupo), c.grupo);
  const nombreGrupo = (g) => {
    const k = canon(g);
    if (!grafia.has(k)) grafia.set(k, String(g).trim());
    return grafia.get(k);
  };
  const grupoDe = (nombreOId) => {
    const c = catalogo.get(canon(nombreOId));
    return nombreGrupo(c && c.grupo ? c.grupo : SIN_CATEGORIZAR);
  };
  const conGrupo = [];
  for (const c of catalogo.values()) if (c.grupo) conGrupo.push({ clave: c.id, nombre: c.nombre, grupo: c.grupo });
  const gruposConocidos = new Set(conGrupo.map((x) => canon(x.grupo)));

  const incrementos = ((A.objetivos && A.objetivos.incrementos) || []).map((t) => ({ tipo: t.tipo, k: canon(t.tipo), kg: t.kg }));
  const objetivos = new Map();
  for (const c of catalogo.values()) {
    if (!c.rangoReps) continue;
    const tipo = c.tipoMaterial ? incrementos.filter((t) => t.k === canon(c.tipoMaterial))[0] || null : null;
    objetivos.set(c.id, { nombre: c.nombre, min: c.rangoReps.min, max: c.rangoReps.max, top: !!c.top, inc: c.incremento || null, tipo });
  }

  const plantillas = new Map();
  for (const r of modelo.rutinas || []) {
    const ejercicios = r.ejercicios.map((e) => {
      const c = catalogo.get(e.ejercicioId);
      return { nombre: c ? c.nombre : e.ejercicioId, k: e.ejercicioId, target: Number(e.series) || 3 };
    });
    const porEj = new Map();
    for (const e of ejercicios) porEj.set(e.k, e.target);
    plantillas.set(canon(r.nombre), { nombre: r.nombre, ejercicios, porEj });
  }

  const horario = new Map();
  for (let i = 1; i <= 7; i++) { const v = A.horario && A.horario[i]; if (v) horario.set(i, v); }

  const conocidosBloque = new Set(GRUPOS_ESPERADOS.map(canon));
  for (const k of gruposConocidos) conocidosBloque.add(k);
  const bloques = (A.bloques || []).map((b) => ({ inicio: b.inicio, fin: b.fin, tipo: b.tipo, esDeload: canon(b.tipo) === "deload",
    grupos: (b.grupos || []).map(canon), gruposTxt: (b.grupos || []).slice() }));
  const protege = (b, kGrupo) => (b.esDeload ? !b.grupos.length || b.grupos.indexOf(kGrupo) >= 0 : b.grupos.length > 0 && b.grupos.indexOf(kGrupo) < 0);
  const bloquesActivos = (dia) => bloques.filter((b) => dia >= b.inicio && dia <= b.fin);
  const bloqueProtector = (grupo, dia) => {
    const k = canon(grupo);
    for (const b of bloquesActivos(dia)) if (protege(b, k)) return b;
    return null;
  };
  // Días protegidos para `grupo` en el tramo (desde, hasta]; los tramos solapados cuentan una vez
  const diasProtegidos = (grupo, desde, hasta) => {
    const a = numDia(desde) + 1, z = numDia(hasta), k = canon(grupo);
    const tramos = [];
    for (const b of bloques) {
      if (!protege(b, k)) continue;
      const i = Math.max(a, numDia(b.inicio)), f = Math.min(z, numDia(b.fin));
      if (i <= f) tramos.push([i, f]);
    }
    tramos.sort((x, y) => x[0] - y[0]);
    let total = 0, hastaAhora = -Infinity;
    for (const t of tramos) {
      const i = Math.max(t[0], hastaAhora + 1);
      if (t[1] >= i) total += t[1] - i + 1;
      hastaAhora = Math.max(hastaAhora, t[1]);
    }
    return total;
  };

  const umbrales = new Map();
  for (const u of A.umbrales || []) umbrales.set(canon(u.rutina), { plantilla: u.rutina, maxDur: u.maxDur, maxSerie: u.maxSerie });

  const pesajes = (modelo.pesajes || []).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const cuerpo = A.cuerpo || {};
  const peso = { registros: pesajes, sexo: cuerpo.sexo || null, fases: (cuerpo.fases || []).slice() };
  const pesoEn = (dia) => { let r = null; for (const x of pesajes) { if (x.fecha <= dia) r = x; else break; } return r; };

  const L = A.ligas || {};
  const ligas = { ok: !!L.activa && (L.escala || []).length > 0, lista: (L.escala || []).map((x) => ({ nombre: x.nombre, desde: x.desde, hasta: x.hasta == null ? Infinity : x.hasta, ndiv: x.ndiv })),
    puntos: L.puntos ?? 5, margen: L.margen ?? 1, semCarga: L.semCarga ?? 8, semSeries: L.semSeries ?? 4 };
  const correccionPolea = L.correccionPolea ?? 1;
  const tablas = new Map();
  for (const slug of Object.keys(A.estandares || {}))
    tablas.set(canon(slug), { slug, filas: A.estandares[slug].slice().sort((a, b) => a.pc - b.pc) });
  const estandares = new Map();
  for (const c of catalogo.values()) {
    if (!c.estandar) continue;
    const e = c.estandar;
    if (e.sin) { estandares.set(c.id, { nombre: c.nombre, sinEstandar: true }); continue; }
    estandares.set(c.id, { nombre: c.nombre, slug: e.slug, factorBase: e.factor, factor: e.polea ? e.factor * correccionPolea : e.factor,
      revisado: !!e.revisado, aprox: !!e.aproximado, polea: !!e.polea });
  }

  const colores = new Map();
  for (const g of A.grupos || []) if (g.color) colores.set(canon(g.nombre), g.color);

  return {
    hoy, modelo, catalogo, nombreGrupo, grupoDe, conGrupo, gruposConocidos, incrementos, objetivos, plantillas, horario,
    bloques, protege, bloquesActivos, bloqueProtector, diasProtegidos, umbrales, peso, pesoEn, ligas, correccionPolea,
    tablas, estandares, colores, volumenObj: ((A.objetivos && A.objetivos.seriesSemana) || []).slice(),
    unilateral: (k) => { const c = catalogo.get(k); return !!(c && c.unilateral); },
    fraccionSecundaria: fraccion(A.analisis && A.analisis.fraccionSecundaria),
  };
}

/** Peso de una serie en un músculo secundario (0 a 1). Por defecto 0,5. */
const fraccion = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.5);

export const esDescanso = (s) => canon(s) === canon("Descanso") || canon(s) === "off" || canon(s) === "libre";

// Calidad de los datos: avisos accionables. Cada aviso lleva un `codigo` y lo necesario
// para que la interfaz ofrezca el arreglo (elegir grupo, revisar sesión, etc.).
import { canon, posiblesVariantes } from "./nombres.js";
import { numDia } from "./fechas.js";
import { SIN_CATEGORIZAR, REPS_MAX_UNILATERAL, DIAS_PESO_RECIENTE } from "./constantes.js";

export function calidad(C, SESIONES, TODAS, LIGA) {
  const sinCatTodos = Array.from(new Set(TODAS.filter((x) => x.grupo === C.nombreGrupo(SIN_CATEGORIZAR)).map((x) => x.ejercicio))).sort();
  const variantes = [], sinCat = [];
  for (const n of sinCatTodos) {
    const v = posiblesVariantes(n, C.conGrupo);
    if (v.length) variantes.push({ nombre: n, k: canon(n), cands: v });
    else sinCat.push(n);
  }
  const malasDur = SESIONES.filter((s) => !s.dur.fiable);
  const totalSinPeso = SESIONES.reduce((a, s) => a + s.sinPeso, 0);
  const descartadas = SESIONES.reduce((a, s) => a + s.descartadas, 0);

  const avisos = [];
  if (C.peso.registros.length && !C.peso.sexo) avisos.push({ codigo: "sinSexo" });
  const vistas = new Set(SESIONES.map((s) => canon(s.plantilla)));
  for (const u of C.umbrales.values()) if (!vistas.has(canon(u.plantilla))) avisos.push({ codigo: "umbralSinRutina", rutina: u.plantilla });
  if (C.peso.registros.length && C.peso.sexo) {
    const antes = SESIONES.filter((s) => s.dia && s.dia < C.peso.registros[0].fecha).length;
    if (antes) avisos.push({ codigo: "antesDelPeso", n: antes, fecha: C.peso.registros[0].fecha });
  }

  // Ejercicios de una sesión que no están en su rutina ni tienen rango: informativo
  const fueraPlantilla = new Map(), plantillasPerdidas = new Map();
  const hayObjetivos = C.objetivos.size > 0;
  if (hayObjetivos || C.plantillas.size) {
    for (const s of SESIONES) {
      const pl = C.plantillas.get(canon(s.plantilla));
      if (!pl && s.rutina) {
        const q = plantillasPerdidas.get(canon(s.plantilla)) || { nombre: s.plantilla, n: 0 };
        q.n += 1; plantillasPerdidas.set(canon(s.plantilla), q);
      }
      for (const ex of s.ejercicios) {
        if ((pl && pl.porEj.has(ex.k)) || C.objetivos.has(ex.k)) continue;
        const f = fueraPlantilla.get(ex.k) || { nombre: ex.nombre, k: ex.k, n: 0, ultima: s };
        f.n += 1;
        fueraPlantilla.set(ex.k, f);
      }
    }
  }
  // Ejercicios unilaterales o con rango que no tienen grupo
  const sinMapeoCfg = [];
  for (const c of C.catalogo.values()) {
    if (c.grupo || !(c.unilateral || c.rangoReps)) continue;
    const de = [];
    if (c.unilateral) de.push("unilaterales");
    if (c.rangoReps) de.push("objetivos");
    sinMapeoCfg.push({ nombre: c.nombre, k: c.id, de, variantes: posiblesVariantes(c.nombre, C.conGrupo) });
  }
  // Unilateral con demasiadas reps: ¿se apuntó la suma de los dos lados?
  const sumaLados = [];
  for (const s of SESIONES) for (const ex of s.ejercicios) {
    if (!ex.unilateral) continue;
    ex.sets.forEach((st, i) => { if (st.paraSeries && st.reps > REPS_MAX_UNILATERAL) sumaLados.push({ s, ex, st, i }); });
  }
  // Ligas
  const est = Array.from(C.estandares.values());
  const ultimoPeso = C.peso.registros.length ? C.peso.registros[C.peso.registros.length - 1] : null;
  const diasPeso = ultimoPeso ? numDia(C.hoy) - numDia(ultimoPeso.fecha) : null;
  const ligas = {
    sinEstandar: Array.from(C.catalogo.values()).filter((c) => c.rangoReps && !c.estandar).map((c) => c.nombre),
    explicitos: est.filter((e) => e.sinEstandar).map((e) => e.nombre),
    sinFactor: est.filter((e) => !e.sinEstandar && !e.revisado).map((e) => e.nombre),
    aprox: est.filter((e) => e.aprox).map((e) => e.nombre),
    poleas: est.filter((e) => e.polea).map((e) => e.nombre),
    sinPeso: !ultimoPeso,
    pesoViejo: diasPeso != null && diasPeso > DIAS_PESO_RECIENTE, diasPeso, ultimoPeso,
    fueraDeTabla: LIGA.ok ? LIGA.fueraDeTabla.slice() : [],
    escala: C.ligas.lista.length,
  };
  const sinColor = [];
  for (const g of C.conGrupo) { const n = C.nombreGrupo(g.grupo); if (!C.colores.has(canon(g.grupo)) && sinColor.indexOf(n) < 0) sinColor.push(n); }

  const problemas = sinCat.length + variantes.length + malasDur.length + sinMapeoCfg.length + sumaLados.length +
    ligas.sinEstandar.length + ligas.sinFactor.length + (ligas.pesoViejo ? 1 : 0) + (ligas.sinPeso ? 1 : 0) +
    avisos.filter((a) => a.codigo === "sinSexo").length;
  return { sinCat, variantes, malasDur, totalSinPeso, descartadas, avisos, fueraPlantilla: Array.from(fueraPlantilla.values()),
    plantillasPerdidas: Array.from(plantillasPerdidas.values()), sinMapeoCfg, sumaLados, ligas, sinColor, problemas };
}

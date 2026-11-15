// Doble progresión: qué hacer la próxima vez con cada ejercicio que tiene rango de reps.
import { canon } from "./nombres.js";
import { kgCorto } from "./formato.js";

export const ESTADO_PROG = { sube: "Sube carga", "mantén": "Mantén", debajo: "Por debajo del rango" };

/**
 * Evalúa la ÚLTIMA sesión del ejercicio con sus series normales y al fallo. Las series
 * objetivo salen de la rutina de esa sesión; sin rutina, no se exige un número de series.
 *   sube    todas las series con el peso máximo llegan al tope y son ≥ series objetivo
 *           (modo top: basta con que la serie más pesada llegue al tope)
 *   mantén  lo demás dentro del rango
 *   debajo  la primera serie no llega al mínimo del rango
 */
export function evaluarProgresion(C, SESIONES, k, obj) {
  let ses = null, work = [], unilateral = false;
  for (const s of SESIONES) {
    const w = [];
    for (const ex of s.ejercicios) {
      if (ex.k !== k) continue;
      unilateral = ex.unilateral;
      for (const st of ex.sets) if (st.paraSeries && st.tipoEj !== "duration") w.push(st);
    }
    if (w.length) { ses = s; work = w; break; }
  }
  if (!ses) return { k, obj, sinDatos: true };
  const plantilla = C.plantillas.get(canon(ses.plantilla));
  const target = plantilla && plantilla.porEj.has(k) ? plantilla.porEj.get(k) : null;
  const pesoMax = Math.max.apply(null, work.map((st) => st.peso));
  const enMax = work.filter((st) => st.peso === pesoMax);
  const topSet = enMax[0];
  const alTope = (st) => st.reps >= obj.max;
  let clave;
  if (work[0].reps < obj.min) clave = "debajo";
  else if (obj.top ? alTope(topSet) : enMax.every(alTope) && enMax.length >= (target != null ? target : work.length)) clave = "sube";
  else clave = "mantén";
  let piramide = false;
  if (!obj.top) for (let i = 1; i < work.length; i++) if (work[i].peso < work[i - 1].peso) piramide = true;
  return { k, obj, ses, work, unilateral, target, pesoMax, clave, estado: ESTADO_PROG[clave], piramide,
           pocas: target != null && work.length < target, sinPlantilla: !plantilla };
}

export const rangoTxt = (p) => p.obj.min + "–" + p.obj.max + (p.unilateral ? "/lado" : "") + (p.obj.top ? " · top" : "");

export function avisosProgresion(p) {
  const a = [];
  if (p.pocas) a.push("Pocas series: " + p.work.length + " de " + p.target);
  if (p.piramide) a.push("pesos distintos · cuenta el máximo");
  if (p.clave === "mantén" && !p.obj.top) {
    const enMax = p.work.filter((st) => st.peso === p.pesoMax);
    const alTope = enMax.filter((st) => st.reps >= p.obj.max).length;
    a.push(alTope === enMax.length
      ? "todas las de " + kgCorto(p.pesoMax) + " kg al tope, pero son " + enMax.length + " de " + (p.target != null ? p.target : p.work.length) + " series"
      : alTope + " de " + enMax.length + " con " + kgCorto(p.pesoMax) + " kg al tope");
  }
  if (p.sinPlantilla) a.push("sin rutina «" + p.ses.plantilla + "»");
  return a;
}

/** El salto más pequeño entre dos pesos que has usado en el ejercicio (último recurso). */
export function pasoMinimo(SESIONES, k) {
  const pesos = [];
  for (const s of SESIONES) for (const ex of s.ejercicios)
    if (ex.k === k) for (const st of ex.sets) if (st.paraPR && pesos.indexOf(st.peso) < 0) pesos.push(st.peso);
  pesos.sort((a, b) => a - b);
  let paso = null;
  for (let i = 1; i < pesos.length; i++) { const d = Math.round((pesos[i] - pesos[i - 1]) * 100) / 100; if (d > 0 && (paso == null || d < paso)) paso = d; }
  return paso;
}

/** Incremento y de dónde sale: propio · material declarado · material en el nombre · salto mínimo. */
export function incrementoDe(C, SESIONES, p) {
  if (p.obj.inc != null) return { kg: p.obj.inc, origen: "propio" };
  if (p.obj.tipo) return { kg: p.obj.tipo.kg, origen: p.obj.tipo.tipo };
  const k = canon(p.obj.nombre);
  for (const ti of C.incrementos) if (k.indexOf(ti.k) >= 0) return { kg: ti.kg, origen: ti.tipo };
  const paso = pasoMinimo(SESIONES, p.k);
  if (paso) return { kg: paso, origen: "salto mínimo", flojo: true };
  return null;
}

/** Texto «próxima vez». */
export function proximaVez(C, SESIONES, p) {
  const kg = kgCorto(p.pesoMax), inc = incrementoDe(C, SESIONES, p);
  const rep = (n) => n + " reps" + (p.unilateral ? "/lado" : "");
  const series = p.target != null ? p.target : p.work.length;
  const sinInc = " (sin incremento definido)";
  if (p.clave === "sube")
    return "sube de " + kg + " kg " + (inc ? "a " + kgCorto(p.pesoMax + inc.kg) + " kg (+" + kgCorto(inc.kg) + " · " + inc.origen + ")"
      : "al siguiente peso que tengas" + sinInc) + " · desde " + rep(p.obj.min);
  if (p.clave === "debajo")
    return "baja de " + kg + " kg" + (inc && p.pesoMax - inc.kg > 0 ? " a " + kgCorto(p.pesoMax - inc.kg) + " kg (−" + kgCorto(inc.kg) + " · " + inc.origen + ")" : "") +
      ", hasta que la primera serie llegue a " + rep(p.obj.min) + ".";
  return "repite " + kg + " kg" + (p.obj.top ? " en la serie pesada hasta llegar a " + rep(p.obj.max) + "."
    : " en " + series + " series, hasta que todas lleguen a " + rep(p.obj.max) + ".");
}

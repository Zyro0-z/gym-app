// Ajustes antiguos (2/2): series semanales, colores, ligas, estándares, horario y regiones del diagrama. Mismas reglas que la versión 1.
import { canon, sinTildes, riqueza } from "../core/nombres.js";
import { fechaISO } from "../core/fechas.js";
import { aKg, ARCHIVOS, DIAS, META } from "./claves.js";
import { leerLineas, simple, valor, asArray, comoTexto, numCfg, NUM_CFG, camposConfig, parseRango, parseKg } from "./lineas.js";
import { SIN_CATEGORIZAR, GRUPOS_ESPERADOS } from "../core/constantes.js";

export function leerConfigResto({ pagina, errores, avisos, GRUPOS, UMBRALES, BLOQUES, PESO, UNILATERALES, OBJETIVOS, cfgHorario }) {
  // Series semanales objetivo:  Pecho:: 12-16
  const VOLUMEN_OBJ = { existe: false, lista: [] };
  {
    const cfg = pagina(ARCHIVOS.volumen);
    if (cfg) {
      VOLUMEN_OBJ.existe = true;
      const conocidos = new Set(Array.from(GRUPOS.mapa.values()).map((v) => canon(v.grupo)));
      for (const c of camposConfig(cfg)) {
        const t = comoTexto(c.valores[c.valores.length - 1]).trim();
        const linea = c.clave + ":: " + t;
        const r = parseRango(t);
        if (r.error) { errores.push({ archivo: ARCHIVOS.volumen, linea, motivo: r.error + "; no se aplica" }); continue; }
        if (!conocidos.has(canon(c.clave)))
          errores.push({ archivo: ARCHIVOS.volumen, linea, motivo: "«" + c.clave + "» no es ningún grupo muscular: se muestra, pero ninguna serie puede contar para él. Revisa la grafía" });
        VOLUMEN_OBJ.lista.push({ grupo: c.clave, min: r.min, max: r.max });
      }
    }
  }

  // Colores de grupo:  Pecho:: #F2727F | #C73A50   (oscuro | claro)
  const COLORES = { existe: false, mapa: new Map() };
  {
    const cfg = pagina(ARCHIVOS.colores);
    if (cfg) {
      COLORES.existe = true;
      for (const c of camposConfig(cfg)) {
        const t = comoTexto(c.valores[c.valores.length - 1]);
        const hex = t.match(/#[0-9a-f]{6}\b/gi) || [];
        if (!hex.length) {
          errores.push({ archivo: ARCHIVOS.colores, linea: c.clave + ":: " + t, motivo: "se espera un color como #F2727F (y otro para el tema claro, tras «|»); no se aplica" });
          continue;
        }
        COLORES.mapa.set(canon(c.clave), { nombre: c.clave, oscuro: hex[0], claro: hex[1] || hex[0] });
      }
    }
  }

  // Escala de ligas
  const LIGAS_CFG = { existe: false, ok: false, lista: [], puntos: 5, margen: 1, semCarga: 8, semSeries: 4 };
  {
    const cfg = pagina(ARCHIVOS.ligas);
    if (cfg) {
      LIGAS_CFG.existe = true;
      const out = LIGAS_CFG;
      const err = (l, m) => errores.push({ archivo: ARCHIVOS.ligas, linea: l, motivo: m });
      const ajuste = (clave, campo, valido, pide) => {
        const vals = asArray(cfg[clave]);
        if (!vals.length) return;
        const t = comoTexto(vals[vals.length - 1]).trim(), n = numCfg(t);
        if (valido(n)) out[campo] = n;
        else err(clave + ":: " + t, "se espera " + pide + "; se usa " + String(out[campo]).replace(".", ","));
      };
      const semanas = (n) => Number.isInteger(n) && n >= 1;
      ajuste("puntos-sobre-elite", "puntos", (n) => n > 0, "un número mayor que 0");
      ajuste("margen-descenso", "margen", (n) => n >= 0, "un número (0 o más)");
      ajuste("semanas-carga", "semCarga", semanas, "un número entero de semanas");
      ajuste("semanas-series", "semSeries", semanas, "un número entero de semanas");
      const deElite = (m) => 95 + ((m - 1) / 0.1) * out.puntos;
      const rP = new RegExp("^p\\s*" + NUM_CFG + "\\s*-\\s*" + NUM_CFG + "$");
      const rE = new RegExp("^elite\\s*" + NUM_CFG + "\\s*(?:-\\s*" + NUM_CFG + "|(\\+))$");
      let roto = false;
      for (const raw of asArray(cfg.liga)) {
        const linea = comoTexto(raw).trim();
        const mal = (m) => { err("liga:: " + linea, m); roto = true; };
        const p = linea.split("|").map((x) => x.trim());
        if (p.length !== 3 || !p[0]) { mal("se esperan 3 campos «nombre | tramo | divisiones»"); continue; }
        const t = sinTildes(p[1]).replace(/\s+/g, " ");
        let desde, hasta, m;
        if ((m = t.match(rP))) { desde = numCfg(m[1]); hasta = numCfg(m[2]); if (hasta > 95) { mal("un tramo en percentil no puede pasar de p95 (Elite): por encima usa «elite A-B»"); continue; } }
        else if ((m = t.match(rE))) { desde = deElite(numCfg(m[1])); hasta = m[3] ? Infinity : deElite(numCfg(m[2])); if (numCfg(m[1]) < 1) { mal("«elite» empieza en 1,00 (la carga Elite)"); continue; } }
        else { mal("tramo no reconocido «" + p[1] + "» (usa «p 40-50» o «elite 1,10-1,20», o «elite 1,20+» en la última)"); continue; }
        if (!(hasta > desde)) { mal("el final del tramo no es mayor que el principio"); continue; }
        const d = canon(p[2]);
        if (d !== "divisiones" && d !== "sindivisiones") { mal("tercer campo no reconocido (usa «divisiones» o «sin divisiones»)"); continue; }
        out.lista.push({ nombre: p[0], desde, hasta, ndiv: d === "divisiones" && hasta !== Infinity ? 3 : 1, linea });
      }
      const L = out.lista;
      if (L.length && Math.abs(L[0].desde) > 1e-9) { err("liga:: " + L[0].linea, "la primera liga tiene que empezar en p 0"); roto = true; }
      for (let i = 1; i < L.length; i++)
        if (Math.abs(L[i].desde - L[i - 1].hasta) > 1e-6) { err("liga:: " + L[i].linea, "no empieza donde acaba «" + L[i - 1].nombre + "»: hay un hueco o un solape"); roto = true; }
      out.ok = L.length > 0 && !roto;
      if (L.length && !out.ok) avisos.push("La escala de ligas tiene errores: las ligas no se muestran hasta corregirla.");
    }
  }

  // Estándares de fuerza: mapeo «Ejercicio:: slug | factor N | aproximado | polea», tablas «slug:: pc | 5 niveles»
  const ESTANDARES = { existe: false, mapa: new Map(), tablas: new Map(), correccionPolea: 1, lineaPolea: null };
  {
    const cfg = pagina(ARCHIVOS.estandares);
    if (cfg) {
      const out = ESTANDARES;
      out.existe = true;
      const err = (l, m) => errores.push({ archivo: ARCHIVOS.estandares, linea: l, motivo: m });
      const esNum = (x) => /^\d+(?:[.,]\d+)?$/.test(x);
      const vistas = new Set(), filas = new Map();
      for (const k of Object.keys(cfg)) {
        if (canon(k) !== "correccionpolea" || out.lineaPolea) continue;
        const raw = cfg[k];
        const t = comoTexto(raw).trim();
        out.lineaPolea = k + ":: " + t;
        const m = sinTildes(t).match(new RegExp("^(?:factor\\s+)?" + NUM_CFG + "$"));
        if (Array.isArray(raw) || !m) { err(out.lineaPolea, "se espera «factor N», por ejemplo «factor 1,4»; no se aplica"); continue; }
        const v = numCfg(m[1]);
        if (!(v > 0 && v <= 5)) { err(out.lineaPolea, "la corrección tiene que estar entre 0 y 5; no se aplica"); continue; }
        out.correccionPolea = v;
      }
      for (const k of Object.keys(cfg)) {
        if (META[k.toLowerCase()] || canon(k) === "correccionpolea") continue;
        for (const raw of asArray(cfg[k])) {
          const t = comoTexto(raw).trim();
          const firma = canon(k) + "::" + t;
          if (!t || vistas.has(firma)) continue;
          vistas.add(firma);
          const p = t.split("|").map((x) => x.trim());
          if (p.length === 6 && p.every(esNum)) {
            const v = p.map(numCfg);
            const niveles = v.slice(1);
            if (!(v[0] >= 30 && v[0] <= 250)) { err(k + ":: " + t, "peso corporal fuera de 30-250 kg; la fila no se aplica"); continue; }
            if (!niveles.every((n, i) => n > 0 && (i === 0 || n > niveles[i - 1]))) { err(k + ":: " + t, "los cinco niveles tienen que ir de menor a mayor; la fila no se aplica"); continue; }
            const f = filas.get(canon(k)) || { slug: k, filas: new Map() };
            if (f.filas.has(v[0])) avisos.push("Estándar «" + k + "»: la fila de " + v[0] + " kg está repetida; se usa la última.");
            f.filas.set(v[0], niveles);
            filas.set(canon(k), f);
            continue;
          }
          const linea = k + ":: " + t;
          if (canon(p[0]) === "sinestandar") { out.mapa.set(canon(k), { nombre: k, sinEstandar: true, linea }); continue; }
          if (!/^[a-z0-9-]+$/i.test(p[0])) { err(linea, "se espera «estándar | factor N», con el estándar escrito como en Strength Level (por ejemplo «chest-press»); no se aplica"); continue; }
          const e = { nombre: k, slug: p[0], factor: 1, revisado: false, aprox: false, linea };
          let mal = null;
          for (const campo of p.slice(1)) {
            const m = sinTildes(campo).match(new RegExp("^factor\\s+" + NUM_CFG + "$"));
            if (m && numCfg(m[1]) > 0 && numCfg(m[1]) <= 10) { e.factor = numCfg(m[1]); e.revisado = true; }
            else if (canon(campo) === "aproximado") e.aprox = true;
            else if (canon(campo) === "polea") e.polea = true;
            else { mal = "«" + campo + "» no es «factor N» (entre 0 y 10), «aproximado» ni «polea»"; break; }
          }
          if (mal) { err(linea, mal + "; no se aplica"); continue; }
          if (out.mapa.has(canon(k)) && out.mapa.get(canon(k)).linea !== linea)
            avisos.push("«" + k + "» aparece más de una vez en estándares: se usa la última.");
          out.mapa.set(canon(k), e);
        }
      }
      for (const f of filas.values()) {
        const pcs = Array.from(f.filas.keys()).sort((a, b) => a - b);
        out.tablas.set(canon(f.slug), { slug: f.slug, filas: pcs.map((pc) => ({ pc, niveles: f.filas.get(pc) })) });
      }
      for (const e of out.mapa.values())
        if (!e.sinEstandar && !out.tablas.has(canon(e.slug)))
          err(e.linea, "no hay ninguna tabla «" + e.slug + "» en estándares; el ejercicio queda sin liga");
      for (const e of out.mapa.values()) {
        if (e.sinEstandar) continue;
        e.factorBase = e.factor;
        if (e.polea) e.factor = e.factorBase * out.correccionPolea;
      }
    }
  }

  // Horario semanal:  Lunes:: Rutina
  const HORARIO = { mapa: new Map(), existe: false };
  if (cfgHorario) {
    HORARIO.existe = true;
    for (const k of Object.keys(cfgHorario)) {
      if (META[k.toLowerCase()]) continue;
      const vals = asArray(cfgHorario[k]);
      if (!vals.length) continue;
      const v = String(vals[vals.length - 1]).trim();
      if (!v) continue;
      for (let i = 1; i <= 7; i++) if (canon(DIAS[i]) === canon(k)) { if (!HORARIO.mapa.has(i)) HORARIO.mapa.set(i, v); break; }
    }
  }

  // Regiones del diagrama corporal:  Grupo:: chest-* lats-*
  const REGIONES = [];
  {
    const cfg = pagina(ARCHIVOS.regiones);
    if (cfg) {
      const vistos = new Set();
      for (const k of Object.keys(cfg)) {
        if (META[k.toLowerCase()] || vistos.has(canon(k))) continue;
        const vals = asArray(cfg[k]);
        if (!vals.length) continue;
        const tokens = String(vals[vals.length - 1]).trim().split(/\s+/).filter(Boolean);
        if (tokens.length) { vistos.add(canon(k)); REGIONES.push({ grupo: String(k).trim(), tokens }); }
      }
    }
  }
  return { VOLUMEN_OBJ, COLORES, LIGAS_CFG, ESTANDARES, HORARIO, REGIONES };
}

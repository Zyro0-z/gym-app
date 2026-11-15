// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ GYM DASHBOARD · lee el formato nativo de LiftOff 0.3.3 (sólo lectura)    ║
// ║ Verificado para Obsidian Mobile (iOS): sin Node (fs/path/require), sin   ║
// ║ dv.io, sin dv.view, sin Intl/toLocaleString, sin DOM propio.             ║
// ║ 1RM = Epley con el caso especial de 1 rep de LiftOff (README §4).        ║
// ║ El mapeo de grupos musculares NO está aquí: se lee de ARCHIVO_GRUPOS.    ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// ─────────────── CONFIG · edita SÓLO este bloque ───────────────
const CARPETA_LOGS = '"Workouts"';          // carpeta de LiftOff · SÓLO LECTURA
const ARCHIVO_GRUPOS = "Gym/Config/grupos-musculares.md";
const ARCHIVO_REGIONES = "Gym/Config/regiones-svg.md";   // grupo -> regiones del diagrama
const ARCHIVO_HORARIO  = "Gym/Config/horario-semanal.md"; // día -> rutina, bloques y umbrales (opcional)
const ARCHIVO_PESO     = "Gym/Config/peso-corporal.md";   // peso corporal para IPF GL (opcional)
const ARCHIVO_UNILATERALES = "Gym/Config/unilaterales.md";     // ejercicios con reps POR LADO (opcional)
const ARCHIVO_OBJETIVOS    = "Gym/Config/objetivos.md";        // rango de reps por ejercicio (opcional)
const ARCHIVO_VOLUMEN_OBJ  = "Gym/Config/volumen-objetivo.md"; // series semanales por grupo (opcional)
const ARCHIVO_LIGAS        = "Gym/Config/ligas.md";            // escala de ligas (opcional)
const ARCHIVO_ESTANDARES   = "Gym/Config/estandares.md";       // estándares de fuerza por ejercicio (opcional)
const ARCHIVO_COLORES      = "Gym/Config/colores-grupos.md";   // color de cada grupo muscular (opcional, README §25)
const CARPETA_PLANTILLAS = '"Workout Templates"';  // plantillas de LiftOff: de aquí salen los targetSets · SÓLO LECTURA
const SIN_CATEGORIZAR = "Sin categorizar";
// Grupos que esperas entrenar cada semana; el dashboard avisa de los que falten
const GRUPOS_ESPERADOS = ["Pecho", "Espalda", "Pierna", "Hombro", "Bíceps", "Tríceps"];

const ULTIMAS_SESIONES = 8;   // filas en "Sesiones recientes"
const SEMANAS = 8;            // semanas en el gráfico de volumen
const MESES = 6;              // meses en el sparkline de progreso
const MAX_SERIES_GRAFICA = 6;        // máx. líneas en la gráfica de progreso (legibilidad en móvil)
const SESIONES_GRAFICA = 24;         // sesiones en la gráfica "Por sesión" (README §11)
const SESIONES_FILAS_FALLBACK = 10;  // filas de la tabla "Por sesión" cuando Charts no está
const RECORDAR_FILTRO = true;        // conserva tu elección del selector entre refrescos de Dataview
const PERIODO_INICIAL = "sem";       // diagrama muscular: sem | 7d | 30d | all

// Por encima de estas repeticiones, Epley pierde fiabilidad y el 1RM estimado se
// marca con ≈. No cambia el cálculo, sólo avisa de que el número vale menos.
const REPS_UMBRAL_FIABILIDAD_1RM = 12;

// Semanas que dibuja el calendario de actividad (README §10). Propio desde el 2026-09-24:
// ya no necesita el plugin Heatmap Calendar.
const CALENDARIO_SEMANAS = 16;

// Unilaterales (README §17): una serie de más de estas reps POR LADO huele a que
// se apuntó la suma de los dos lados. Sólo avisa en Calidad de los datos.
const REPS_MAX_UNILATERAL = 40;

// Ligas (README §23): Calidad de los datos avisa si tu último peso corporal tiene más días
// que esto, porque los estándares se interpolan con él.
const DIAS_PESO_RECIENTE = 14;
// Ligas: una serie por encima del máximo de su rango de objetivos cuenta si no pasa de estas
// repeticiones (hasta ahí Epley aún es razonable). Las de por debajo del mínimo, nunca.
const LIGA_REPS_MAX = 15;

// ─── Posibles erratas en nombres de ejercicio (README §3) ───
// Un nombre NO mapeado a esta distancia de Levenshtein (o menos) de una clave del
// mapeo se lista como "posible variante, confirmar". Nunca se fusiona solo.
const DISTANCIA_MAX_VARIANTE = 2;

// ─── Sparkline y flecha de tendencia (README §11) ───
const CHISPA_REGISTROS = 5;        // últimos N 1RM de sesión en el sparkline
const CHISPA_RANGO_MIN = 0.10;     // el sparkline nunca amplía variaciones < 10 % del máximo
const FLECHA_PLANA_PCT = 1;        // |pendiente| < 1 % del 1RM medio por registro ⇒ →
const FLECHA_FUERTE_PCT = 2.5;     // ≥ 2,5 % por registro ⇒ ↑/↓ ; entre medias ⇒ ↗/↘

// ─── Peso corporal: tendencia frente al objetivo (README §7) ───
// Criterio confirmado y simulado: media de 21 días frente a la de los 21 anteriores.
const PESO_VENTANA_DIAS = 21;        // tamaño de cada ventana de media
const PESO_MIN_REGISTROS = 4;        // mínimo por ventana; con menos, ese punto va sin color
const PESO_UMBRAL_PCT_SEMANA = 0.25; // ritmo significativo: ≥ 0,25 % del peso por semana
const PESO_BANDA_MANTENER_KG = 1.0;  // "mantener": ± alrededor de la media de los primeros 21 días
const PESO_DIAS_GRAFICA = 180;       // días que dibuja la gráfica (la tendencia usa todo el historial)
const PESO_FILAS_FALLBACK = 8;       // registros en la tabla cuando Charts no está

// ─── Calidad del campo `duration` (ver README §3) ───
const MAX_DURACION_MIN = 180;   // más de 3 h = sesión que no se cerró
const TOLERANCIA_MIN = 5;       // desvío admitido entre `duration` y (end − start)
const MAX_MIN_POR_SERIE = 15;   // más de 15 min por serie trabajada = sospechosa

// ─── Regla de estancamiento (confirmada) ───
const MIN_SESIONES_VEREDICTO = 3;   // por debajo de esto no se dictamina
const VENTANA_SESIONES = 3;         // "últimas N sesiones" = RM_rec
const DIAS_ESTANCADO = 21;          // días sin PR para que 🟡 sea posible
const DIAS_INACTIVO = 28;           // por encima, 💤 y no se juzga
const UMBRAL_RETROCESO = 0.95;      // RM_rec < RM_ant × esto ⇒ 🔴

// ─── Estilos del sistema de diseño (README §25) ───
// El CSS es Gym/Dashboards/assets/gym-dashboard.css; aquí va una copia (cssDashboard(), al final
// del bloque, que escribe Gym/Scripts/css-dashboard.mjs). Se aplica en UN <style> con id fijo:
// Dataview vuelve a ejecutar el bloque y, si ya existe, sólo se cambia su contenido (y sólo si
// ha cambiado). Todas sus reglas cuelgan de .gym-dashboard, la clase de esta nota, así que no
// tocan ninguna otra. Va antes que nada porque los colores de las gráficas se leen de las
// variables que define. Si falla, el dashboard sigue con sus estilos en línea de respaldo.
(function aplicarCSS() {
  try {
    if (typeof document === "undefined" || !document.head || typeof cssDashboard !== "function") return;
    const css = cssDashboard();
    let st = document.getElementById("gym-dashboard-css");
    if (!st) {
      st = document.createElement("style");
      st.id = "gym-dashboard-css";
      document.head.appendChild(st);
    }
    if (st.textContent !== css) st.textContent = css;
  } catch (e) { /* sin estilos: quedan los de respaldo en línea */ }
})();

// ─── Formato de números SIN Intl/toLocaleString: idéntico en iOS y en Linux ───
function fmt(n, d) {
  d = d || 0;
  const v = Number(n) || 0;
  const p = Math.abs(v).toFixed(d).split(".");
  return (v < 0 ? "-" : "") + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (p[1] ? "," + p[1] : "");
}
// Cantidad con su palabra, sin «(s)»: plural(1, "ejercicio", "ejercicios") → «1 ejercicio».
// Si concuerda un verbo o un adjetivo, va en los dos textos: plural(n, "serie requiere", "series requieren").
const plural = (n, uno, varios) => n + " " + (n === 1 ? uno : varios);
const DT = dv.luxon.DateTime;
// ═══ NORMALIZACIÓN DE NOMBRES (punto único de todo el sistema) ═══
// Escribir desde el móvil con prisa produce variantes del mismo ejercicio. Esta
// función es la ÚNICA vía por la que el sistema compara nombres, así que la
// normalización es consistente en todo: mapeo de grupos, PRs, histórico,
// estancamiento y ejercicios principales.
//   "Press militar máquina" · "PRESS  MILITAR MAQUINA" · "press-militar-máquina" → pressmilitarmaquina
//   "Extensión de cuádriceps" · "Extension de cuadriceps"                  → extensiondecuadriceps
// Quita tildes/diacríticos (NFD), pasa a minúsculas y elimina espacios,
// guiones, guiones bajos y puntos. NO corrige erratas: "macuernas" seguirá
// siendo distinto de "mancuernas" (para eso, añade un alias en el config). Las
// erratas probables se SEÑALAN, sin fusionarlas, en posiblesVariantes() (más abajo).
function canon(s) {
  return String(s == null ? "" : s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "")
    .trim();
}

// El nombre del GRUPO también se unifica: "Pecho" y "pecho" no deben salir como
// dos grupos distintos. Se conserva la primera grafía vista para mostrarla.
const nombreGrupo = (function () {
  const vistos = new Map();
  return function (g) {
    const k = canon(g);
    if (!vistos.has(k)) vistos.set(k, String(g).trim());
    return vistos.get(k);
  };
})();

// Dataview devuelve las listas del frontmatter como array plano o como DataArray
// según versión. Esto normaliza ambos casos (y el valor único).
const asArray = (v) =>
  v == null ? [] : typeof v.array === "function" ? v.array() : Array.isArray(v) ? v : [v];

// 1RM de LiftOff 0.3.3, verificada en .obsidian/plugins/liftoff/main.js:
//   oneRM(w,r) = w<=0||r<=0 ? 0 : r===1 ? w : w*(1+r/30)
// Epley, pero con 1 repetición devuelve el peso tal cual (no lo infla x1,033).
const epley = (w, r) => (w <= 0 || r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30));

const LB_A_KG = 0.45359237;
const aKg = (w, unidad) =>
  String(unidad || "kg").toLowerCase().indexOf("lb") === 0 ? w * LB_A_KG : w;

// Fecha de la sesión: frontmatter `date` de LiftOff; si falta, el nombre del archivo
function dayOf(p) {
  const f = p.date;
  if (f && typeof f.toISODate === "function") return f;
  if (typeof f === "string") {
    const d = DT.fromISO(f.slice(0, 10));
    if (d.isValid) return d;
  }
  if (p.file.day && typeof p.file.day.toISODate === "function") return p.file.day;
  return null;
}

// `start`/`end` de LiftOff son "HH:MM", pero OJO: en YAML 1.1 `10:00` es
// sexagesimal y un parser puede devolver el entero 600, mientras `00:28`
// (cero inicial) se queda como string. Ambos significan "minutos desde
// medianoche", así que unificamos. Sin esto, end-start da NaN en silencio.
function minutosDelDia(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && typeof v.hour === "number") return v.hour * 60 + (v.minute || 0);
  const m = String(v).match(/^(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Semana ISO: el lunes se calcula a mano (weekday 1..7) para no depender de cómo
// resuelve startOf("week") la versión de Luxon empaquetada ni del locale del móvil.
const lunesDe = (d) => d.minus({ days: d.weekday - 1 }).startOf("day");
const claveSemana = (d) => lunesDe(d).toFormat("yyyy-MM-dd");
const claveMes = (d) => d.toFormat("yyyy-MM");

// Sparklines de texto: caracteres Unicode de bloque, renderizan igual en iOS y en
// desktop, sin librerías y sin SVG (van también dentro de un <option>, que sólo admite texto).
// `rangoMin` (fracción del máximo) evita que un sparkline min-max convierta una
// oscilación de 1 kg en un salto de ▁ a █: si la variación real es menor, se
// dibuja centrada en la franja media en vez de estirarse a toda la altura.
const CHISPAS = "▁▂▃▄▅▆▇█";
function chispa(valores, rangoMin) {
  const v = valores.filter((x) => x != null);
  if (!v.length) return "";
  const min = Math.min.apply(null, v), max = Math.max.apply(null, v);
  const rango = Math.max(max - min, (rangoMin || 0) * max);
  const base = min - (rango - (max - min)) / 2;
  return valores
    // todos iguales ⇒ nivel medio fijo (sin esto, el redondeo de 3,5 daba ▄ o ▅ al azar)
    .map((x) => (x == null ? "·" : CHISPAS.charAt(rango <= 0 || max === min ? 3
      : Math.min(7, Math.max(0, Math.round(((x - base) / rango) * 7))))))
    .join("");
}

// ═══ BARRAS CSS (reserva cuando el plugin Charts no está) ═══
// <div> con `width` en % dentro de una pista: sin canvas, sin SVG, sin librerías.
// No uso <progress>: en iOS su aspecto lo decide WebKit (-webkit-appearance) y el
// relleno vive en un pseudo-elemento (::-webkit-progress-value) que no se puede
// colorear con estilos inline. Un <div> se pinta igual en todas partes.
// fila = { etiqueta, texto, valor } o, apilada, { etiqueta, texto, segmentos:[{valor, color, titulo}] }
function barrasEn(cont, filas, destacar) {
  const total = (f) => (f.segmentos ? f.segmentos.reduce((a, s) => a + s.valor, 0) : f.valor);
  const max = Math.max.apply(null, filas.map(total).concat([0]));
  const caja = cont.createDiv();
  caja.style.margin = "0.3em 0 1em 0";
  for (const f of filas) {
    const fila = caja.createDiv();
    fila.style.display = "flex";
    fila.style.alignItems = "center";
    fila.style.gap = "0.5em";
    fila.style.margin = "0.2em 0";
    fila.style.fontSize = "0.9em";
    const et = fila.createEl("span");
    et.textContent = f.etiqueta;
    et.style.flex = "0 0 27%";
    et.style.minWidth = "0";
    et.style.overflow = "hidden";
    et.style.textOverflow = "ellipsis";
    et.style.whiteSpace = "nowrap";
    if (destacar && destacar(f)) et.style.fontWeight = "600";
    const pista = fila.createDiv();
    pista.style.flex = "1 1 0";
    pista.style.minWidth = "0";
    pista.style.height = "0.85em";
    pista.style.display = "flex";
    pista.style.borderRadius = "3px";
    pista.style.overflow = "hidden";
    pista.style.background = "var(--background-modifier-border, rgba(128,128,128,0.2))";
    const segs = f.segmentos || [{ valor: f.valor, color: f.color || traslucido(PALETA[0]) }];
    for (const s of segs) {
      if (!(s.valor > 0) || !(max > 0)) continue;
      const b = pista.createDiv();
      b.style.width = ((s.valor / max) * 100).toFixed(2) + "%";
      b.style.height = "100%";
      b.style.flex = "0 0 auto";
      b.style.background = s.color;
      if (s.titulo) b.setAttribute("title", s.titulo);
    }
    const tx = fila.createEl("span");
    tx.textContent = f.texto;
    tx.style.flex = "0 0 auto";
    tx.style.whiteSpace = "nowrap";
    tx.style.opacity = "0.8";
    tx.style.fontSize = "0.9em";
  }
  return caja;
}
// Mini-gráfica de columnas CSS (reserva de las líneas de progreso). Escala desde 0,
// así que la altura es proporcional de verdad; los cambios pequeños se leen mejor
// en la tabla Δ y en el sparkline. `flojos[i]` atenúa la columna (1RM menos fiable).
function columnasEn(cont, titulo, valores, etiquetas, color, flojos) {
  const bloque = cont.createDiv();
  bloque.style.margin = "0.2em 0 0.9em 0";
  const t = bloque.createDiv();
  t.textContent = titulo;
  t.style.fontSize = "0.85em";
  const max = Math.max.apply(null, valores.filter((v) => v != null).concat([0]));
  const zona = bloque.createDiv();
  zona.style.display = "flex"; zona.style.alignItems = "flex-end"; zona.style.gap = "3px";
  zona.style.height = "3.2em";
  zona.style.borderBottom = "1px solid var(--background-modifier-border, rgba(128,128,128,0.35))";
  valores.forEach((v, i) => {
    const c = zona.createDiv();
    c.style.flex = "1 1 0"; c.style.minWidth = "0";
    c.style.height = v != null && max > 0 ? ((v / max) * 100).toFixed(2) + "%" : "0";
    c.style.background = color;
    c.style.borderRadius = "2px 2px 0 0";
    if (flojos && flojos[i]) { c.style.opacity = "0.45"; c.style.outline = "1px dashed " + color; }
    c.setAttribute("title", etiquetas[i] + (v != null ? " · " + fmt(v, 1) + " kg" : " · sin datos"));
  });
  const pie = bloque.createDiv();
  pie.style.display = "flex"; pie.style.gap = "3px"; pie.style.fontSize = "0.7em"; pie.style.opacity = "0.6";
  for (const et of etiquetas) {
    const s = pie.createEl("span");
    s.textContent = et;
    s.style.flex = "1 1 0"; s.style.minWidth = "0"; s.style.textAlign = "center"; s.style.overflow = "hidden";
  }
  return bloque;
}

// Leyenda de colores para las barras apiladas (se parte en líneas en pantalla estrecha)
function leyendaEn(cont, items) {
  const l = cont.createDiv();
  l.style.display = "flex"; l.style.flexWrap = "wrap"; l.style.gap = "0.3em 0.9em";
  l.style.fontSize = "0.8em"; l.style.margin = "0 0 1em 0";
  for (const it of items) {
    const s = l.createEl("span");
    const m = s.createEl("span");
    m.style.display = "inline-block"; m.style.width = "0.8em"; m.style.height = "0.8em";
    m.style.borderRadius = "2px"; m.style.marginRight = "0.3em"; m.style.verticalAlign = "middle";
    m.style.background = it.color;
    const t = s.createEl("span"); t.textContent = it.texto;
  }
  return l;
}


// ═══ GRÁFICAS (plugin Obsidian Charts v3.9.0 · Chart.js v3.9.1) ═══
// El plugin expone window.renderChart(config, elemento). Si le pasamos
// {chartOptions, width} fija el ancho del contenedor al 100% (clave en móvil).
// Si el plugin no estuviera cargado, HAY_CHARTS es false y cada sección cae a
// su tabla de texto en vez de dejar un hueco en blanco.
const HAY_CHARTS = typeof window !== "undefined" && typeof window.renderChart === "function";
// Colores tomados del TEMA (README §22). Chart.js pinta en un <canvas>, que no entiende
// var(--…): cada variable se resuelve aplicándola como `color` a un <span> oculto dentro
// de <body> (donde Obsidian pone la clase del tema) y leyendo el color calculado, que el
// navegador devuelve como rgb()/rgba() aunque el tema la defina con hsl(), calc() u otras
// variables. Si la variable no existe (lo delata el color centinela) o no hay
// getComputedStyle, se usa el respaldo: el color que había antes.
const CENTINELA = "rgb(1, 2, 3)";
function colorTema(nombre, respaldo) {
  try {
    if (typeof document === "undefined" || !document.body || typeof window.getComputedStyle !== "function") return respaldo;
    // Dentro de la nota (clase gym-dashboard) si está en pantalla: ahí los estilos del sistema de
    // diseño redefine las variables del tema (README §25). Si no, en <body>, como siempre.
    const ambito = document.querySelector(".gym-dashboard") || document.body;
    const sonda = document.createElement("span");
    sonda.style.display = "none";
    sonda.style.color = "var(" + nombre + ", " + CENTINELA + ")";
    ambito.appendChild(sonda);
    const c = window.getComputedStyle(sonda).color;
    ambito.removeChild(sonda);
    return c && c !== CENTINELA ? c : respaldo;
  } catch (e) { return respaldo; }
}
// Transparencia sobre cualquier rgb()/rgba()/#rrggbb (antes: reemplazar "1)" en rgba fijos)
function alfa(c, a) {
  let m = String(c).match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (m) return "rgba(" + m[1] + ", " + m[2] + ", " + m[3] + ", " + a + ")";
  m = String(c).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (m) return "rgba(" + parseInt(m[1], 16) + ", " + parseInt(m[2], 16) + ", " + parseInt(m[3], 16) + ", " + a + ")";
  return c;
}
const TEMA = {
  texto:   colorTema("--text-normal", "#666666"),        // leyendas
  apagado: colorTema("--text-muted", "#888888"),         // etiquetas de los ejes
  rejilla: colorTema("--background-modifier-border", "rgba(128,128,128,0.25)"),
  acento:  colorTema("--interactive-accent", "rgba(54,162,235,1)"),
  verde:   colorTema("--color-green", "rgba(22,163,74,1)"),
  rojo:    colorTema("--color-red", "rgba(220,38,38,1)"),
  naranja: colorTema("--color-orange", "rgba(255,159,64,1)"),
};
// Series categóricas: acento, verde, rojo y naranja del tema; del 5.º al 8.º, los demás
// colores con nombre de Obsidian. Respaldo: la paleta de siempre, en el mismo orden.
const PALETA = [TEMA.acento, colorTema("--color-green", "rgba(75,192,192,1)"), colorTema("--color-red", "rgba(255,99,132,1)"),
                TEMA.naranja, colorTema("--color-purple", "rgba(153,102,255,1)"), colorTema("--color-yellow", "rgba(255,206,86,1)"),
                colorTema("--color-cyan", "rgba(46,204,113,1)"), colorTema("--color-pink", "rgba(231,76,60,1)")];
const traslucido = (c) => alfa(c, 0.55);
// Ejes, rejilla y leyenda con los colores del tema: es lo que se perdía en modo oscuro.
function aplicarTema(o) {
  if (!o) return;
  const sc = o.scales || {};
  for (const k of Object.keys(sc)) {
    sc[k].ticks = Object.assign({ color: TEMA.apagado }, sc[k].ticks || {});
    sc[k].grid = Object.assign({ color: TEMA.rejilla, borderColor: TEMA.rejilla }, sc[k].grid || {});
  }
  o.plugins = o.plugins || {};
  o.plugins.legend = o.plugins.legend || {};
  o.plugins.legend.labels = Object.assign({ color: TEMA.texto }, o.plugins.legend.labels || {});
}

// Estilo de las gráficas (README §25), sólo presentación: los datos no se tocan. Rejilla sólo
// horizontal y tenue, sin bordes de eje; puntos pequeños; leyenda compacta con puntos; tooltip
// con el aspecto de una tarjeta; barras redondeadas; y, en una gráfica de UNA línea, un
// degradado suave de su color bajo ella.
function degradadoDe(c) {
  return function (ctx) {
    const a = ctx.chart && ctx.chart.chartArea;
    if (!a) return alfa(c, 0.12);
    const g = ctx.chart.ctx.createLinearGradient(0, a.top, 0, a.bottom);
    g.addColorStop(0, alfa(c, 0.32));
    g.addColorStop(1, alfa(c, 0));
    return g;
  };
}
function estiloGrafica(cfg) {
  const o = cfg.options || (cfg.options = {});
  const sc = o.scales || {};
  for (const k of Object.keys(sc)) {
    const horizontal = o.indexAxis === "y";
    const esX = horizontal ? k.indexOf("y") === 0 : k.indexOf("x") === 0;
    sc[k].grid = Object.assign({ display: !esX, drawBorder: false, drawTicks: false, color: alfa(TEMA.rejilla, 0.6) }, sc[k].grid || {});
    sc[k].ticks = Object.assign({ padding: 6 }, sc[k].ticks || {});
  }
  o.plugins = o.plugins || {};
  o.plugins.legend = o.plugins.legend || {};
  o.plugins.legend.labels = Object.assign({ usePointStyle: true, pointStyle: "circle", boxWidth: 6, boxHeight: 6, padding: 12 },
                                          o.plugins.legend.labels || {});
  o.plugins.tooltip = Object.assign({ backgroundColor: colorTema("--background-secondary", "rgba(30,30,30,0.95)"),
    titleColor: TEMA.texto, bodyColor: TEMA.texto, borderColor: TEMA.rejilla, borderWidth: 1, cornerRadius: 10, padding: 10,
    boxPadding: 4, usePointStyle: true }, o.plugins.tooltip || {});
  const ds = (cfg.data && cfg.data.datasets) || [];
  const lineas = cfg.type === "line";
  for (const d of ds) {
    if (lineas || d.type === "line") {
      if (d.borderWidth == null || d.borderWidth === 2) d.borderWidth = 2.5;
      if (d.pointRadius == null) d.pointRadius = 2.5;
      else if (Array.isArray(d.pointRadius)) d.pointRadius = d.pointRadius.map((r) => r * 0.8);
      else d.pointRadius = Math.min(d.pointRadius, 2.5);
      d.pointHoverRadius = 4;
      if (d.pointBackgroundColor == null && typeof d.borderColor === "string") d.pointBackgroundColor = d.borderColor;
      if (ds.length === 1 && !d.fill && !d.yAxisID && typeof d.borderColor === "string") {
        d.fill = "start";
        d.backgroundColor = degradadoDe(d.borderColor);
      }
    } else if (cfg.type === "bar") {
      if (!(sc.x && sc.x.stacked)) { if (d.borderRadius == null || d.borderRadius < 6) d.borderRadius = 6; }
      if (d.maxBarThickness == null) d.maxBarThickness = 32;
    }
  }
}

function grafica(cfg, alto, padre) {
  if (!HAY_CHARTS) return false;
  try {
    const cont = (padre || dv.container).createDiv({ cls: "gd-grafica" });
    cont.style.height = (alto || 260) + "px";
    cont.style.marginBottom = "1.2em";
    aplicarTema(cfg.options);
    estiloGrafica(cfg);
    window.renderChart({ chartOptions: cfg, width: "100%" }, cont);
    return true;
  } catch (e) {
    dv.paragraph("> [!bug] No se pudo dibujar la gráfica\n> " + String(e && e.message ? e.message : e));
    return false;
  }
}

// Opciones comunes: responsive de verdad (el alto lo pone el contenedor) y
// tipografía pequeña para que quepa en pantalla estrecha.
function opcionesBase(extra) {
  const o = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, position: "bottom",
                labels: { boxWidth: 12, boxHeight: 12, font: { size: 12 } } },
    },
    scales: {
      x: { ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, ticks: { font: { size: 11 } } },
    },
  };
  if (extra && extra.sinLeyenda) o.plugins.legend.display = false;
  if (extra && extra.apilado) { o.scales.x.stacked = true; o.scales.y.stacked = true; }
  if (extra && extra.horizontal) { o.indexAxis = "y"; o.scales.y.beginAtZero = false; o.scales.x.beginAtZero = true; }
  return o;
}

// Eje Y dinámico para gráficas de LÍNEAS: el mismo criterio que la de peso corporal
// (margen del 15 % del rango, mínimo 0,5; ±1 si todos los valores coinciden),
// redondeado a 0,5 y nunca por debajo de 0. Las barras siguen desde 0: en ellas el
// largo es el dato. Con varias series, un único rango compartido (README §11).
// Al usarlo, pon `ticks.includeBounds: false`: si no, Chart.js etiqueta también
// min y max, y en el móvil se montan sobre las marcas redondas ("95" sobre "90").
function ejeYDinamico(valores) {
  const v = valores.filter((x) => x != null && isFinite(x));
  if (!v.length) return null;
  const vMin = Math.min.apply(null, v), vMax = Math.max.apply(null, v);
  const rango = vMax - vMin;
  const margen = rango > 0 ? Math.max(0.5, 0.15 * rango) : 1;
  return { min: Math.max(0, Math.floor((vMin - margen) * 2) / 2),
           max: Math.ceil((vMax + margen) * 2) / 2 };
}

// ═══ Construcción de tablas en un contenedor propio ═══
// dv.table() sólo sabe escribir al final del bloque; para las secciones que se
// redibujan al cambiar el filtro necesitamos escribir dentro de un <div> nuestro.
// Una celda puede ser un texto o {principal, sec} para la línea secundaria pequeña.
function tablaEn(cont, cabeceras, filas) {
  const t = cont.createEl("table");
  t.style.width = "100%";
  t.style.boxSizing = "border-box";
  const tr0 = t.createEl("thead").createEl("tr");
  for (const c of cabeceras) { const th = tr0.createEl("th"); th.textContent = c; }
  const tb = t.createEl("tbody");
  for (const f of filas) {
    const tr = tb.createEl("tr");
    for (const celda of f) {
      const td = tr.createEl("td");
      if (celda && typeof celda === "object") {
        const p = td.createEl("div"); p.textContent = celda.principal;
        if (celda.fuerte) p.style.fontWeight = "600";
        if (celda.sec) {
          const s = td.createEl("div");
          s.textContent = celda.sec;
          s.style.opacity = "0.65"; s.style.fontSize = "0.85em";
        }
      } else td.textContent = String(celda);
    }
  }
  return t;
}

// Callout de Obsidian construido a mano (dentro de un contenedor propio no
// podemos usar dv.paragraph, que escribe al final del bloque).
function calloutEn(cont, tipo, titulo, lineas) {
  const d = cont.createEl("div", { cls: "callout" });
  d.setAttribute("data-callout", tipo);
  const t = d.createEl("div", { cls: "callout-title" });
  const tt = t.createEl("div", { cls: "callout-title-inner" });
  tt.textContent = titulo;
  if (lineas && lineas.length) {
    const c = d.createEl("div", { cls: "callout-content" });
    for (const l of lineas) { const p = c.createEl("p"); p.textContent = l; p.style.margin = "0.2em 0"; }
  }
  return d;
}

// ═══ PRESENTACIÓN · MÓVIL PRIMERO (README §22 y §25) ═══
// Pensado para ~390 px. Las tablas anchas son listas de tarjetas (el mismo diseño a cualquier
// anchura). El aspecto lo pone Gym/Dashboards/assets/gym-dashboard.css (README §25), copiado al
// final de este bloque y aplicado al principio, con dos mecanismos que no necesitan saber si
// esos estilos se han aplicado:
//   · redefine, sólo dentro de la nota, las variables del tema de Obsidian (--background-
//     secondary, --text-muted, --interactive-accent…): los estilos en línea que las usan
//     toman el aspecto nuevo sin tocarlos;
//   · lo que no existe en el tema va con variables propias y un respaldo, var(--gd-radio, 8px):
//     sin esos estilos vale el respaldo, que es el aspecto de antes.
// Cada pieza lleva además una clase «gd-…» para lo que sólo hace el CSS (sombras, anillos,
// pestañas, resplandores). Sin él todo se sigue leyendo con los estilos en línea.
const CSSV = (n, respaldo) => "var(" + n + (respaldo ? ", " + respaldo : "") + ")";
const BORDE = "1px solid " + CSSV("--background-modifier-border", "rgba(128,128,128,0.3)");
const RADIO = "var(--gd-radio, 8px)";
const SOMBRA = "var(--gd-sombra, none)";

// Iconos Lucide (ISC, aviso en Gym/Dashboards/assets/NOTICE-lucide.txt): el trazado de cada uno,
// sin modificar. Van en línea como el diagrama y las insignias, con stroke: currentColor, así
// que toman el color del texto que los rodea.
const ICONOS = {
  "calendar-check": "<path d=\"M8 2v3\"/> <path d=\"M16 2v3\"/> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/> <path d=\"M3 9h18\"/> <path d=\"m9 15 2 2 4-4\"/>",
  "search": "<path d=\"m21 21-4.34-4.34\"/> <circle cx=\"11\" cy=\"11\" r=\"8\"/>",
  "layout-dashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/> <rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/> <rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/> <rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <circle cx=\"12\" cy=\"12\" r=\"6\"/> <circle cx=\"12\" cy=\"12\" r=\"2\"/>",
  "trophy": "<path d=\"M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2\"/> <path d=\"M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2\"/> <path d=\"M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3\"/> <path d=\"M4 22h16\"/> <path d=\"M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z\"/> <path d=\"M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3\"/>",
  "history": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/> <path d=\"M3 3v5h5\"/> <path d=\"M12 7v5l4 2\"/>",
  "trending-up": "<path d=\"M16 7h6v6\"/> <path d=\"m22 7-8.5 8.5-5-5L2 17\"/>",
  "trending-down": "<path d=\"M16 17h6v-6\"/> <path d=\"m22 17-8.5-8.5-5 5L2 7\"/>",
  "dumbbell": "<path d=\"M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z\"/> <path d=\"m2.5 21.5 1.4-1.4\"/> <path d=\"m20.1 3.9 1.4-1.4\"/> <path d=\"M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z\"/> <path d=\"m9.6 14.4 4.8-4.8\"/>",
  "chart-bar-stacked": "<path d=\"M11 13v4\"/> <path d=\"M15 5v4\"/> <path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/> <rect x=\"7\" y=\"13\" width=\"9\" height=\"4\" rx=\"1\"/> <rect x=\"7\" y=\"5\" width=\"12\" height=\"4\" rx=\"1\"/>",
  "scale": "<path d=\"M12 3v18\"/> <path d=\"m19 8 3 8a5 5 0 0 1-6 0zV7\"/> <path d=\"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1\"/> <path d=\"m5 8 3 8a5 5 0 0 1-6 0zV7\"/> <path d=\"M7 21h10\"/>",
  "activity": "<path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\"/>",
  "calendar-days": "<path d=\"M8 2v3\"/> <path d=\"M16 2v3\"/> <rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/> <path d=\"M3 9h18\"/> <path d=\"M8 13h.01\"/> <path d=\"M12 13h.01\"/> <path d=\"M16 13h.01\"/> <path d=\"M8 17h.01\"/> <path d=\"M12 17h.01\"/> <path d=\"M16 17h.01\"/>",
  "shield-check": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/> <path d=\"m9 12 2 2 4-4\"/>",
  "medal": "<path d=\"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15\"/> <path d=\"M11 12 5.12 2.2\"/> <path d=\"m13 12 5.88-9.8\"/> <path d=\"M8 7h8\"/> <circle cx=\"12\" cy=\"17\" r=\"5\"/> <path d=\"M12 18v-2h-.5\"/>",
  "chart-spline": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/> <path d=\"M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7\"/>",
  "gauge": "<path d=\"m12 14 4-4\"/> <path d=\"M3.34 19a10 10 0 1 1 17.32 0\"/>",
  "arrow-up": "<path d=\"m5 12 7-7 7 7\"/> <path d=\"M12 19V5\"/>",
  "arrow-right": "<path d=\"M5 12h14\"/> <path d=\"m12 5 7 7-7 7\"/>",
  "arrow-down": "<path d=\"M12 5v14\"/> <path d=\"m19 12-7 7-7-7\"/>",
  "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/> <path d=\"M12 9v4\"/> <path d=\"M12 17h.01\"/>",
  "check": "<path d=\"M20 6 9 17l-5-5\"/>",
  "circle-check": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"m16 9-5.5 5.5L8 12\"/>",
  "minus": "<path d=\"M5 12h14\"/>",
  "flame": "<path d=\"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/> <path d=\"M12 16v-4\"/> <path d=\"M12 8h.01\"/>",
  "chart-column": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/> <path d=\"M18 17V9\"/> <path d=\"M13 17V5\"/> <path d=\"M8 17v-3\"/>",
  "person-standing": "<circle cx=\"12\" cy=\"5\" r=\"1\"/> <path d=\"m9 20 3-6 3 6\"/> <path d=\"m6 8 6 2 6-2\"/> <path d=\"M12 10v4\"/>",
};
function icono(nombre, px) {
  const d = ICONOS[nombre];
  if (!d) return "";
  px = px || 18;
  return '<svg xmlns="http://www.w3.org/2000/svg" class="gd-ico" width="' + px + '" height="' + px + '" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
    'style="flex:0 0 auto;vertical-align:-0.15em">' + d + "</svg>";
}
function iconoEn(cont, nombre, px, extra) {
  const s = cont.createEl("span");
  s.innerHTML = icono(nombre, px);
  estilo(s, Object.assign({ display: "inline-flex", lineHeight: "0" }, extra || {}));
  return s;
}
// Símbolo al principio de un texto de estado → icono, sólo al dibujar: los textos calculados
// (p. ej. «⬆ Sube carga», que se comparan en otras partes) no cambian. Los círculos de color
// del semáforo pasan a un punto con el color del estado.
const SIMBOLO_ICONO = [["⬆", "arrow-up"], ["⏫", "arrow-up"], ["→", "arrow-right"], ["✅", "circle-check"], ["✓", "check"],
  ["🔻", "arrow-down"], ["⚠️", "triangle-alert"], ["⚠", "triangle-alert"], ["🏆", "trophy"], ["💤", "minus"]];
const SIMBOLO_PUNTO = [["🟢", "--color-green"], ["🟡", "--color-yellow"], ["🔴", "--color-red"], ["⚪", "--text-faint"]];
function textoConIcono(cont, txt, px) {
  txt = String(txt == null ? "" : txt);
  const cab = SIMBOLO_ICONO.filter((x) => txt.indexOf(x[0]) === 0)[0];
  const pun = SIMBOLO_PUNTO.filter((x) => txt.indexOf(x[0]) === 0)[0];
  if (!cab && !pun) { cont.appendChild(document.createTextNode(txt)); return cont; }
  if (cab) iconoEn(cont, cab[1], px || 15, { marginRight: "4px", verticalAlign: "-0.12em" });
  else estilo(cont.createEl("span"), { display: "inline-block", width: "0.62em", height: "0.62em", borderRadius: "50%",
    background: CSSV(pun[1]), marginRight: "5px", verticalAlign: "0.02em" });
  cont.appendChild(document.createTextNode(txt.slice((cab || pun)[0].length).replace(/^\uFE0F?\s*/, "")));
  return cont;
}

function estilo(e, s) { for (const k of Object.keys(s)) e.style[k] = s[k]; return e; }
function tarjeta(cont, extra) {
  return estilo(cont.createDiv({ cls: "gd-tarjeta" }), Object.assign({
    background: CSSV("--background-secondary"), border: BORDE, borderRadius: RADIO, boxShadow: SOMBRA,
    padding: "10px 12px", margin: "8px 0", minWidth: "0",
    // border-box: el borde y el relleno van DENTRO del ancho; sin esto, una tarjeta al 100 %
    // se sale por la derecha y se pierde su borde derecho (visto en el portátil)
    boxSizing: "border-box", maxWidth: "100%" }, extra || {}));
}
// Texto secundario: atenuado con --text-muted, nunca por debajo de ~13 px
function textoSec(cont, txt, extra) {
  const d = estilo(cont.createDiv({ cls: "gd-texto-sec" }), Object.assign({ color: CSSV("--text-muted"), fontSize: "0.85em" }, extra || {}));
  d.textContent = txt;
  return d;
}
// Etiqueta redondeada. tono: acento · verde · naranja · neutro
function etiqueta(cont, txt, tono) {
  const e = cont.createEl("span", { cls: "gd-chip gd-chip-" + (tono || "neutro") });
  textoConIcono(e, txt, 13);
  const base = { display: "inline-block", borderRadius: "999px", padding: "2px 10px", fontSize: "0.85em",
                 fontWeight: "600", whiteSpace: "nowrap", flex: "0 0 auto" };
  const tonos = {
    acento: { border: "1px solid " + CSSV("--interactive-accent"), color: CSSV("--text-accent") },
    verde: { background: CSSV("--color-green"), color: CSSV("--text-on-accent") },
    naranja: { border: "1px solid " + CSSV("--color-orange"), color: CSSV("--color-orange") },
    neutro: { background: CSSV("--background-modifier-border"), color: CSSV("--text-muted") },
  };
  return estilo(e, Object.assign(base, tonos[tono] || tonos.neutro));
}
// Lista de tarjetas en lugar de una tabla ancha.
// item = { titulo, derecha?, fuerte?, lineas: [texto], color? (borde izquierdo) }
function listaEn(cont, items) {
  const caja = tarjeta(cont, { padding: "2px 12px" });
  caja.addClass("gd-lista");
  const conColor = items.filter((it) => it.color).length > 0;   // si alguna fila lleva color, todas se alinean
  items.forEach((it, i) => {
    const f = estilo(caja.createDiv(), { padding: "8px 0", borderTop: i ? BORDE : "none" });
    if (conColor) estilo(f, { borderLeft: "3px solid " + (it.color || "transparent"), paddingLeft: "8px" });
    const cab = estilo(f.createDiv(), { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" });
    const ti = estilo(cab.createDiv(), { fontWeight: "600", minWidth: "0", overflowWrap: "anywhere" });
    if (it.punto) estilo(ti.createEl("span", { cls: "gd-punto" }), { display: "inline-block", width: "0.6em", height: "0.6em",
      borderRadius: "50%", background: it.punto, marginRight: "6px", verticalAlign: "0.05em" });
    ti.appendChild(document.createTextNode(it.titulo));
    if (it.derecha)
      textoConIcono(estilo(cab.createDiv({ cls: "gd-lista-der" }), { flex: "0 0 auto", textAlign: "right", fontWeight: it.fuerte ? "700" : "400",
        fontVariantNumeric: "tabular-nums" }), it.derecha, 14);
    for (const l of it.lineas || []) if (l) textoSec(f, l, { overflowWrap: "anywhere" });
  });
  return caja;
}
// Sección plegada con <details>/<summary>, HTML estándar. La cabecera mide 44 px (zona
// táctil) y conserva el triángulo nativo de cada plataforma. Dataview vuelve a ejecutar el
// bloque cuando cambia el índice; sin recordar qué abriste, se te cerraría solo, igual que
// pasaba con el buscador. Mientras se dibuja, dv.container apunta al interior: dv.table,
// dv.paragraph y dv.header escriben en this.container (comprobado en Dataview 0.5.68).
const CLAVE_ABIERTAS = "gym-dashboard-abiertas";
function leerAbiertas() {
  try { const v = window.localStorage.getItem(CLAVE_ABIERTAS); if (v) return JSON.parse(v); } catch (e) {}
  return window.__GYM_ABIERTAS__ || [];
}
function guardarAbierta(id, abierta) {
  const l = leerAbiertas().filter((x) => x !== id);
  if (abierta) l.push(id);
  try { window.localStorage.setItem(CLAVE_ABIERTAS, JSON.stringify(l)); } catch (e) {}
  window.__GYM_ABIERTAS__ = l;
}
// Icono de cada sección (README §25), en vez del emoji con el que empezaba su título
const ICONO_SECCION = { consulta: "search", resumen: "layout-dashboard", "series-objetivo": "target", ligas: "trophy",
  "ligas-musculo": "dumbbell", "ligas-ejercicio": "activity", sesiones: "history", "vol-semanal": "trending-up",
  "grupo-semana": "chart-column", "vol-grupo": "chart-bar-stacked", peso: "scale", balance: "person-standing",
  calendario: "calendar-days", calidad: "shield-check" };
function plegable(id, titulo, resumen, dibujar) {
  const d = estilo(dv.container.createEl("details", { cls: "gd-sec" }), { border: BORDE, borderRadius: RADIO, margin: "8px 0",
    background: "var(--gd-tarjeta, transparent)", boxShadow: SOMBRA, boxSizing: "border-box", maxWidth: "100%" });
  if (leerAbiertas().indexOf(id) >= 0) d.open = true;
  const s = estilo(d.createEl("summary", { cls: "gd-sec-cab" }), { padding: "10px 12px", lineHeight: "24px", cursor: "pointer",
                                             fontWeight: "600", fontSize: "1.05em" });
  // Cabecera: icono + título + el dato clave a la derecha. El emoji inicial del título se
  // cambia por el icono de la sección (con ⚠️, el de aviso: lo usa Calidad de los datos).
  const aviso = /^\u26A0/.test(titulo);
  titulo = titulo.replace(/^[^\p{L}]+/u, "");
  if (ICONO_SECCION[id]) iconoEn(s, aviso ? "triangle-alert" : ICONO_SECCION[id], 18, { marginRight: "8px", verticalAlign: "-3px",
    color: aviso ? CSSV("--color-orange") : "var(--gd-acento, inherit)" }).addClass("gd-sec-ico");
  s.createEl("span", { cls: "gd-sec-tit" }).textContent = titulo;
  // Subtítulo gris con el dato clave. Se guarda en d.resumenEl para poder actualizarlo
  // (la consulta lo cambia al elegir otro ejercicio).
  d.resumenEl = estilo(s.createEl("span", { cls: "gd-sec-dato" }), { fontWeight: "400", fontSize: "0.8em", color: CSSV("--text-muted"),
                                             marginLeft: "0.5em" });
  d.resumenEl.textContent = resumen || "";
  d.addEventListener("toggle", () => guardarAbierta(id, d.open));
  const cuerpo = estilo(d.createDiv({ cls: "gd-sec-cuerpo" }), { padding: "0 12px 10px 12px", minWidth: "0", boxSizing: "border-box" });
  const antes = dv.container;
  dv.container = cuerpo;
  try { dibujar(cuerpo, d); }
  catch (e) { calloutEn(cuerpo, "bug", "No se pudo dibujar esta sección", [String(e && e.message ? e.message : e)]); }
  finally { dv.container = antes; }
  return d;
}
// Controles táctiles: 44 px de alto y letra de 16 px (con menos, iOS amplía la página al
// tocar un <select>).
const CONTROL = { minHeight: "44px", fontSize: "16px", borderRadius: "var(--gd-radio-s, 8px)", boxSizing: "border-box" };

// Buscador: selector a todo el ancho y botón «Limpiar», con la elección recordada. Lo usan la
// consulta y «Por ejercicio» de las ligas, cada uno con su clave: las dos elecciones son
// independientes. Dataview reejecuta el bloque cada vez que cambia el índice (tienes
// refreshInterval 2500); sin recordarla, tu selección desaparecería sola mientras lees.
//   o = { clave (localStorage), respaldo (variable global si no hay localStorage),
//         vacio (texto de la opción vacía), grupos: [{ etiqueta, opciones: [{ valor, texto }] }] }
// Devuelve { sel, salida, iniciar(alCambiar) }. iniciar() recupera la elección guardada, conecta
// el selector y el botón, y llama a alCambiar(valor) una vez: va aparte de la construcción para
// poder crear el selector antes que las funciones que pintan su salida.
function buscadorEn(cont, o) {
  const panel = cont.createDiv();
  const barra = estilo(panel.createDiv(), { display: "flex", flexWrap: "wrap", gap: "0.5em", alignItems: "center",
                                            margin: "0.4em 0 0.8em 0" });
  const sel = barra.createEl("select", { cls: "dropdown gd-select" });
  // 44 px de alto y letra de 16 px: zona táctil, y sin el zoom de iOS al tocar el selector
  estilo(sel, Object.assign({ flex: "1 1 12em", minWidth: "0", maxWidth: "100%", padding: "0 0.5em" }, CONTROL));
  const limpiar = barra.createEl("button", { cls: "gd-boton" });
  limpiar.textContent = "Limpiar";
  estilo(limpiar, Object.assign({ flex: "0 0 auto", padding: "0 16px" }, CONTROL));
  const o0 = sel.createEl("option");
  o0.value = "";
  o0.textContent = o.vacio;
  for (const g of o.grupos) {
    if (!g.opciones.length) continue;
    const og = sel.createEl("optgroup");
    og.label = g.etiqueta;
    for (const x of g.opciones) { const op = og.createEl("option"); op.value = x.valor; op.textContent = x.texto; }
  }
  const leer = () => {
    if (!RECORDAR_FILTRO) return "";
    try { const v = window.localStorage.getItem(o.clave); if (v != null) return v; } catch (e) {}
    return window[o.respaldo] || "";
  };
  const guardar = (v) => {
    try { window.localStorage.setItem(o.clave, v); } catch (e) {}
    window[o.respaldo] = v;
  };
  const salida = panel.createDiv();
  return {
    sel, salida,
    iniciar(alCambiar) {
      sel.value = leer();
      if (sel.value !== leer()) sel.value = "";   // la opción guardada ya no existe
      sel.onchange = () => { guardar(sel.value); alCambiar(sel.value); };
      limpiar.onclick = () => { sel.value = ""; guardar(""); alCambiar(""); };
      alCambiar(sel.value);
    },
  };
}

// Pestañas (README §25): una fila de botones de 44 px con icono y texto, y un panel por
// pestaña. Se dibujan todos los paneles y sólo se oculta el que no está activo, así que lo que
// hay en cada uno es lo mismo que antes, en el mismo orden. La activa se recuerda con su clave.
function pestanasEn(cont, clave, respaldo, lista) {
  const barra = estilo(cont.createDiv({ cls: "gd-tabs" }), { display: "flex", gap: "4px", margin: "8px 0 10px 0" });
  barra.setAttribute("role", "tablist");
  const paneles = {}, botones = {};
  for (const x of lista) {
    const b = estilo(barra.createEl("button", { cls: "gd-tab" }), Object.assign({}, CONTROL, { flex: "1 1 auto", minWidth: "0",
      padding: "4px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
      fontSize: "13px", lineHeight: "1.2" }));
    b.setAttribute("role", "tab");
    iconoEn(b, x[1], 16);
    b.createEl("span").textContent = x[2];
    botones[x[0]] = b;
    paneles[x[0]] = cont.createDiv({ cls: "gd-panel" });
  }
  const leer = () => { try { const v = window.localStorage.getItem(clave); if (v) return v; } catch (e) {} return window[respaldo] || ""; };
  const activa = (id) => {
    if (!paneles[id]) id = lista[0][0];
    for (const x of lista) {
      const si = x[0] === id;
      paneles[x[0]].style.display = si ? "" : "none";
      botones[x[0]].setAttribute("aria-selected", si ? "true" : "false");
      estilo(botones[x[0]], { fontWeight: si ? "700" : "400", background: si ? CSSV("--background-secondary") : "transparent" });
    }
    try { window.localStorage.setItem(clave, id); } catch (e) {}
    window[respaldo] = id;
  };
  for (const x of lista) botones[x[0]].onclick = () => activa(x[0]);
  activa(leer());
  return paneles;
}

// Insignia de liga (README §23). La dibuja crearInsignias(), al final del script. Va en
// línea, como el diagrama, con dos retoques en cada copia:
//   · los id de sus degradados se renombran: si dos copias compartieran id y la primera
//     estuviera dentro de un <details> cerrado, algunos navegadores no pintarían la segunda;
//   · la división (I, II, III) va como numeral en la cinta: se pide la insignia ya con ella.
// Hasta 48 px se usa la versión simplificada, sin texturas finas ni animación.
let INSIGNIAS = null, insigniasN = 0;
function insigniaEn(cont, nivel, px, extra) {
  if (!INSIGNIAS) INSIGNIAS = crearInsignias();
  const simple = px <= 48, n = nivel.insignia;
  const pre = "L" + String(n).padStart(2, "0") + (simple ? "s" : "") + "-";
  const s = INSIGNIAS.svg(n, simple, nivel.div).split(pre).join(pre + "u" + (++insigniasN) + "-");
  const caja = estilo(cont.createEl("span", { cls: "gd-ins" + (px < 28 ? " gd-ins-mini" : "") }),
    Object.assign({ display: "inline-block", width: px + "px", height: px + "px", flex: "0 0 auto", lineHeight: "0" }, extra || {}));
  caja.style.setProperty("--liga", COLOR_LIGA[n - 1] || "transparent");   // el resplandor lo pinta el CSS
  caja.innerHTML = s.replace('width="128" height="128"', 'width="' + px + '" height="' + px + '"');
  return caja;
}
// Color dominante de cada insignia de liga (1-15), para su resplandor y su barra de progreso
const COLOR_LIGA = ["#9a6232", "#d9722e", "#8a96a3", "#c48a3a", "#c3cfdc", "#f5b800", "#4fb5a8", "#3b6ff0", "#12b366",
  "#e0284f", "#8fd8ff", "#9b5cf0", "#e0337a", "#f5c400", "#8b6cff"];
// Barra de progreso fina, con los colores del tema (o el que se pida: el de la liga, el del grupo)
function barraEn(cont, frac, color) {
  const pista = estilo(cont.createDiv({ cls: "gd-barra" }), { height: "8px", borderRadius: "4px", overflow: "hidden", margin: "8px 0 4px 0",
                                           background: CSSV("--background-modifier-border") });
  estilo(pista.createDiv(), { height: "100%", width: (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + "%",
                              background: color || CSSV("--interactive-accent"), borderRadius: "4px" });
  return pista;
}

// Anillo de progreso (README §25), al estilo de los anillos de actividad: lo hecho en color
// sólido, lo previsto en el mismo color más claro, cerrado en `1` y con una marca opcional
// (el mínimo de un rango). El centro lo escribe quien lo llama, en la caja que devuelve.
function anilloEn(cont, px, grosor, frac, fracPrev, color, marca) {
  const r = (px - grosor) / 2, L = 2 * Math.PI * r, c = px / 2;
  const a = Math.max(0, Math.min(1, frac || 0)), b = Math.max(a, Math.min(1, (frac || 0) + (fracPrev || 0)));
  const arco = (f, op) => '<circle cx="' + c + '" cy="' + c + '" r="' + r.toFixed(2) + '" fill="none" stroke-width="' + grosor +
    '" stroke-linecap="round" style="stroke:' + color + ';stroke-opacity:' + op + '" stroke-dasharray="' + (f * L).toFixed(2) + " " +
    L.toFixed(2) + '" transform="rotate(-90 ' + c + " " + c + ')"/>';
  let marcaSvg = "";
  if (marca != null) {
    const ang = -Math.PI / 2 + 2 * Math.PI * Math.min(1, marca), r1 = r - grosor / 2 - 1, r2 = r + grosor / 2 + 1;
    marcaSvg = '<line x1="' + (c + r1 * Math.cos(ang)).toFixed(1) + '" y1="' + (c + r1 * Math.sin(ang)).toFixed(1) + '" x2="' +
      (c + r2 * Math.cos(ang)).toFixed(1) + '" y2="' + (c + r2 * Math.sin(ang)).toFixed(1) +
      '" stroke-width="2" stroke-linecap="round" style="stroke:var(--text-muted, #888)"/>';
  }
  const caja = estilo(cont.createDiv({ cls: "gd-anillo" }), { position: "relative", width: px + "px", height: px + "px", flex: "0 0 auto" });
  caja.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + " " + px +
    '" aria-hidden="true" style="display:block"><circle cx="' + c + '" cy="' + c + '" r="' + r.toFixed(2) + '" fill="none" stroke-width="' +
    grosor + '" style="stroke:var(--gd-pista, var(--background-modifier-border, rgba(128,128,128,0.25)))"/>' +
    (b > a ? arco(b, 0.35) : "") + (a > 0 ? arco(a, 1) : "") + marcaSvg + "</svg>";
  return estilo(caja.createDiv({ cls: "gd-anillo-centro" }), { position: "absolute", top: "0", right: "0", bottom: "0", left: "0",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: "1.05", textAlign: "center" });
}
// Minigráfico de tendencia de una cifra clave: línea, relleno suave y el último punto
function minigraficoEn(cont, vals, color) {
  const v = vals.filter((x) => x != null && isFinite(x));
  if (v.length < 2) return null;
  const w = 100, h = 28, mn = Math.min.apply(null, v), d = (Math.max.apply(null, v) - mn) || 1;
  const pts = vals.map((x, i) => [(i / (vals.length - 1)) * (w - 4) + 2, h - 3 - ((x - mn) / d) * (h - 6)]);
  const linea = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
  const u = pts[pts.length - 1];
  const caja = estilo(cont.createDiv({ cls: "gd-mini" }), { height: h + "px", lineHeight: "0" });
  caja.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" width="100%" height="' + h +
    '" aria-hidden="true" style="display:block"><path d="' + linea + " L" + u[0].toFixed(1) + " " + h + " L2 " + h + ' Z" style="fill:' + color +
    ';fill-opacity:0.14"/><path d="' + linea + '" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
    'vector-effect="non-scaling-stroke" style="stroke:' + color + '"/></svg>';
  return caja;
}

// ══════════════ LECTURA DEL FORMATO NATIVO DE LIFTOFF (sólo lectura) ══════════════
// Frontmatter real que escribe LiftOff 0.3.3:
//   type: workout · template · date · start · end · duration
//   exercises: [ { name, sets: [ { weight, reps, unit, setType? } ] } ]
// `setType` SÓLO se escribe cuando no es "working" (verificado en main.js), así que
// su ausencia significa serie de trabajo. LiftOff cuenta working+failure para PRs y
// volumen, y excluye warmup y drop: hacemos exactamente lo mismo.
const CUENTA_PARA_PR = { working: true, failure: true };

// Valora si se puede confiar en la duración. Tres controles, no uno:
//  1) cota superior dura (el error es unidireccional: olvidar cerrar sólo infla)
//  2) contraste con start→end (caza el frontmatter editado a mano)
//  3) minutos por serie (caza sesiones sin cerrar que quedan por debajo del umbral)
// (umbralesDe y UMBRALES se definen más abajo, junto al horario; esta función sólo
//  se ejecuta en la CARGA, cuando ya existen.)
// Los umbrales 1) y 3) pueden ser propios de la plantilla (`umbral::` en el horario);
// si la plantilla no declara uno, se usa el global de CONFIG. TOLERANCIA_MIN es
// siempre global: mide si los datos cuadran entre sí, no el tipo de rutina.
function evaluarDuracion(p, seriesContadas) {
  const u = umbralesDe(p.template);
  const MAX_DURACION_MIN = u.maxDur, MAX_MIN_POR_SERIE = u.maxSerie;   // sombrean las globales
  const deQuien = (propio) => (propio ? " de la plantilla «" + u.plantilla + "»" : "");
  const d = Number(p.duration);
  const ini = minutosDelDia(p.start), fin = minutosDelDia(p.end);
  let rango = null;
  if (ini != null && fin != null) {
    rango = fin - ini;
    if (rango < 0) rango += 1440; // sesión que cruza medianoche
  }
  if (!Number.isFinite(d) || d <= 0)
    return { min: null, fiable: false, motivo: "sin dato de `duration`" };
  if (d > MAX_DURACION_MIN)
    return { min: d, fiable: false, motivo: "irreal: " + fmt(d) + " min supera el umbral" + deQuien(u.durPropio) +
             " de " + fmt(MAX_DURACION_MIN) + " min" };
  if (rango != null && Math.abs(d - rango) > TOLERANCIA_MIN)
    return { min: d, fiable: false,
             motivo: "inconsistente: `duration` dice " + fmt(d) + " min pero start→end son " + fmt(rango) + " min" };
  if (seriesContadas > 0 && d / seriesContadas > MAX_MIN_POR_SERIE)
    return { min: d, fiable: false,
             motivo: "sospechosa: " + fmt(d / seriesContadas, 1) + " min por serie (máx " + fmt(MAX_MIN_POR_SERIE, Number.isInteger(MAX_MIN_POR_SERIE) ? 0 : 1) +
                     deQuien(u.seriePropio) + ")" };
  return { min: d, fiable: true, motivo: null };
}

function leerSesiones() {
  const out = [];
  for (const p of dv.pages(CARPETA_LOGS)) {
    // Filtro por valor EXACTO: "workout-template" también empieza por "workout"
    if (String(p.type || "").trim() !== "workout") continue;
    const ejercicios = [];
    let series = 0, volumen = 0, descartadas = 0, sinPeso = 0;
    for (const ex of asArray(p.exercises)) {
      if (!ex || !ex.name) continue;
      // LiftOff tiene 3 tipos de ejercicio: peso (por defecto), "duration"
      // (series por tiempo: plancha) y "timer" (intervalos, sin series).
      const tipoEj = String(ex.exerciseType || "weight").toLowerCase();
      // Unilateral (README §17): las reps son POR LADO. El volumen en kg cuenta los dos
      // lados (×2); el 1RM, los PRs y la doble progresión usan las reps tal cual; y una
      // serie apuntada sigue siendo UNA serie del grupo. (UNILATERALES se define más
      // abajo, con el resto de la config; esta función sólo se ejecuta en la CARGA.)
      const unilateral = UNILATERALES.set.has(canon(ex.name));
      const lados = unilateral ? 2 : 1;
      const sets = [];
      for (const s of asArray(ex.sets)) {
        if (!s) continue;
        const tipo = String(s.setType || "working").toLowerCase();
        const segundos = Number(s.durationSeconds) || 0;
        const peso = aKg(Number(s.weight) || 0, s.unit);
        const reps = Number(s.reps) || 0;
        // Serie REALIZADA: cuenta para la distribución de series por grupo
        // muscular aunque no haya peso (dominadas a peso corporal, plancha).
        const paraSeries = !!CUENTA_PARA_PR[tipo] &&
                           (tipoEj === "duration" ? segundos > 0 : reps > 0);
        // PR y volumen en kg: SÓLO con peso real. Un weight:0 no puede generar
        // un PR falso de 0 kg ni un 1RM de 0.
        const paraPR = paraSeries && tipoEj !== "duration" && peso > 0 && reps > 0;
        sets.push({ peso, reps, segundos, tipo, tipoEj, paraSeries, paraPR, unilateral,
                    volumen: paraPR ? peso * reps * lados : 0,
                    oneRM: paraPR ? epley(peso, reps) : 0 });
        if (paraSeries) { series += 1; volumen += paraPR ? peso * reps * lados : 0; if (!paraPR) sinPeso += 1; }
        else descartadas += 1;
      }
      ejercicios.push({ nombre: String(ex.name).trim(), tipoEj, unilateral, sets });
    }
    out.push({
      p, dia: dayOf(p),
      plantilla: p.template ? String(p.template) : "—",
      ejercicios, series, volumen, descartadas, sinPeso,
      dur: evaluarDuracion(p, series),
    });
  }
  out.sort((a, b) => (b.dia ? b.dia.toMillis() : 0) - (a.dia ? a.dia.toMillis() : 0));
  return out;
}

// ══════════ MAPEO EJERCICIO → GRUPO MUSCULAR, LEÍDO DEL ARCHIVO DE CONFIG ══════════
// Aquí NO hay ningún mapeo hardcodeado. Todo sale de ARCHIVO_GRUPOS a través del
// índice de Dataview (campos inline), así que no hace falta dv.io ni leer ficheros.
// Si el archivo no existe, todo queda "Sin categorizar" y el dashboard lo avisa.
const META_CONFIG = { file: 1, tipo: 1, type: 1, tags: 1, tag: 1, aliases: 1, alias: 1,
  cssclass: 1, cssclasses: 1, position: 1, mapa: 1, titulo: 1, descripcion: 1, nota: 1, notas: 1 };

function leerGrupos() {
  const mapa = new Map();
  const cfg = dv.page(ARCHIVO_GRUPOS);
  if (!cfg) return { mapa, existe: false };

  // Forma 1 (la recomendada):   Press militar máquina:: Hombro
  for (const k of Object.keys(cfg)) {
    if (META_CONFIG[k.toLowerCase()]) continue;
    const vals = asArray(cfg[k]);
    if (!vals.length) continue;
    const g = String(vals[vals.length - 1]).trim();
    if (!g) continue;
    if (!mapa.has(canon(k))) mapa.set(canon(k), { grupo: g, nombre: k });
  }
  // Forma 2, para nombres que chocarían con un metadato:  mapa:: Press militar máquina | Hombro
  for (const linea of asArray(cfg.mapa)) {
    const partes = String(linea).split("|");
    if (partes.length < 2) continue;
    const n = partes[0].trim(), g = partes[1].trim();
    if (n && g) mapa.set(canon(n), { grupo: g, nombre: n });
  }
  return { mapa, existe: true };
}
const GRUPOS = leerGrupos();
// canon() normaliza mayúsculas, tildes y espacios, así que "press militar maquina",
// "Press militar máquina" y "Press  Militar  Máquina" encuentran la misma entrada del mapeo.
const grupoDe = (nombre) => {
  const e = GRUPOS.mapa.get(canon(nombre));
  return nombreGrupo(e ? e.grupo : SIN_CATEGORIZAR);
};

// ═══ POSIBLES ERRATAS (distancia de Levenshtein sobre canon) ═══
// canon() no corrige erratas y esto TAMPOCO: sólo las señala. Un nombre que no está
// en el mapeo pero queda a DISTANCIA_MAX_VARIANTE ediciones o menos de una clave que
// sí está se lista en Calidad de los datos como "posible variante, confirmar", y
// sigue contando como Sin categorizar hasta que tú decidas. Fusionar solo sería
// peligroso: "Curl barra" y "Curl barra Z" están a 1 edición y son dos ejercicios.
// Se compara sobre canon(), así que tildes, mayúsculas y espacios no suman distancia.
function levenshtein(a, b, tope) {
  // inserción, borrado y sustitución cuestan 1; en cuanto supera `tope` devuelve tope+1
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let prev = [];
  for (let j = 0; j <= b.length; j++) prev.push(j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let minFila = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1,
                         prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      cur.push(v);
      if (v < minFila) minFila = v;
    }
    if (minFila > tope) return tope + 1;   // ninguna fila posterior puede bajar de aquí
    prev = cur;
  }
  return Math.min(prev[b.length], tope + 1);
}
// Claves del mapeo más cercanas a un nombre NO mapeado (todas las empatadas a la
// distancia mínima). Vacío si el nombre está mapeado o nada queda lo bastante cerca.
function posiblesVariantes(nombre) {
  const k = canon(nombre);
  if (!k || GRUPOS.mapa.has(k)) return [];
  let mejor = DISTANCIA_MAX_VARIANTE + 1;
  let cands = [];
  for (const par of Array.from(GRUPOS.mapa.entries())) {
    const d = levenshtein(k, par[0], DISTANCIA_MAX_VARIANTE);
    if (d > DISTANCIA_MAX_VARIANTE) continue;
    if (d < mejor) { mejor = d; cands = []; }
    if (d === mejor) cands.push({ nombre: par[1].nombre, grupo: par[1].grupo, distancia: d });
  }
  return cands;
}


// ═══ NOMBRE A MOSTRAR DE UN EJERCICIO ═══
// Al fusionar variantes ("Press militar máquina" / "press-militar-maquina" / "PRESS  MILITAR MÁQUINA")
// hay que elegir cuál se enseña. Prioridad:
//   1. la grafía del archivo de mapeo — es la que tú has curado;
//   2. si no está mapeado, la variante más usada en los logs;
//   3. a igualdad, la que conserva mayúsculas y tildes (la escrita con cuidado).
const NOMBRES = (function () {
  const variantes = new Map();
  const riqueza = (v) => (String(v).match(/[A-ZÁÉÍÓÚÜÑ]/g) || []).length +
                         (String(v).match(/[áéíóúüñ]/g) || []).length;
  return {
    registrar(n) {
      const k = canon(n);
      if (!variantes.has(k)) variantes.set(k, new Map());
      const m = variantes.get(k);
      m.set(n, (m.get(n) || 0) + 1);
    },
    resolver(n) {
      const k = canon(n);
      const e = GRUPOS.mapa.get(k);
      if (e && e.nombre) return e.nombre;
      const m = variantes.get(k);
      if (!m) return n;
      let mejor = n, mc = -1, mr = -1;
      for (const par of Array.from(m.entries())) {
        const r = riqueza(par[0]);
        if (par[1] > mc || (par[1] === mc && r > mr)) { mejor = par[0]; mc = par[1]; mr = r; }
      }
      return mejor;
    },
  };
})();

// ═══ HORARIO SEMANAL (opcional) ═══
// Día de la semana -> rutina esperada, leído del archivo de config. Si el archivo
// no existe, devuelve existe:false y la tarjeta "Hoy toca" se omite en silencio.
const DIAS_SEMANA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
function leerHorario() {
  const mapa = new Map();
  const cfg = dv.page(ARCHIVO_HORARIO);
  if (!cfg) return { mapa, existe: false };
  for (const k of Object.keys(cfg)) {
    if (META_CONFIG[k.toLowerCase()]) continue;
    const vals = asArray(cfg[k]);
    if (!vals.length) continue;
    const v = String(vals[vals.length - 1]).trim();
    if (!v) continue;
    // sólo nos quedamos con claves que sean días de la semana
    for (let i = 1; i <= 7; i++) {
      if (canon(DIAS_SEMANA[i]) === canon(k)) { if (!mapa.has(i)) mapa.set(i, v); break; }
    }
  }
  return { mapa, existe: true };
}
const esDescanso = (s) => canon(s) === canon("Descanso") || canon(s) === "off" || canon(s) === "libre";

// ═══ CONFIG AMPLIADA: bloques, umbrales por plantilla y peso corporal (todo opcional) ═══
// Mismo patrón que el resto: líneas `clave:: valor` leídas por el índice de Dataview
// (dv.page), sin dv.io. Una línea mal escrita NUNCA se ignora en silencio: va a
// ERRORES_CONFIG y sale en Calidad de los datos. AVISOS_CONFIG es informativo.
const ERRORES_CONFIG = [];   // { archivo, linea, motivo }
const AVISOS_CONFIG = [];    // textos
const sinTildes = (s) => String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
// Dataview convierte algunos valores antes de dárnoslos (fechas, números, listas
// separadas por comas). Los devolvemos a texto para parsear siempre por el mismo camino.
function comoTexto(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v.toISODate === "function") return v.toISODate();
  if (typeof v.array === "function") v = v.array();
  if (Array.isArray(v)) return v.map(comoTexto).join(", ");
  return String(v);
}
const fechaISO = (s) => {
  const t = String(s == null ? "" : s).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) && DT.fromISO(t).isValid ? t : null;
};
const isoDe = (d) => (typeof d === "string" ? d : d.toFormat("yyyy-MM-dd"));
const ddmm = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
// nº de día absoluto, sin Luxon ni zona horaria: sólo para restar fechas ISO
const numDia = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);

// ─── Umbrales de duración por plantilla ───
//   umbral:: Pierna | duración 240 | por serie 25      (cada parámetro es opcional)
function leerUmbrales() {
  const mapa = new Map();
  const cfg = dv.page(ARCHIVO_HORARIO);
  if (!cfg) return mapa;
  for (const raw of asArray(cfg.umbral)) {
    const linea = comoTexto(raw);
    const err = (m) => ERRORES_CONFIG.push({ archivo: ARCHIVO_HORARIO, linea: "umbral:: " + linea, motivo: m });
    const p = linea.split("|").map((x) => x.trim());
    if (p.length < 2 || !p[0]) { err("se espera «Plantilla | duración N | por serie N»; no se aplica"); continue; }
    const u = { plantilla: p[0], maxDur: null, maxSerie: null };
    let ok = true;
    for (const par of p.slice(1)) {
      const m = sinTildes(par).match(/^(duracion|por\s+serie)\s+(\d+(?:[.,]\d+)?)\s*(min)?$/);
      const n = m ? parseFloat(m[2].replace(",", ".")) : NaN;
      if (!m || !(n > 0)) {
        err("parámetro no reconocido «" + par + "» (usa «duración 240» o «por serie 25»); la línea no se aplica");
        ok = false; break;
      }
      if (m[1] === "duracion") u.maxDur = n; else u.maxSerie = n;
    }
    if (!ok) continue;
    if (mapa.has(canon(p[0]))) AVISOS_CONFIG.push("Hay más de un `umbral::` para «" + p[0] + "»: se usa el último.");
    mapa.set(canon(p[0]), u);
  }
  return mapa;
}
const UMBRALES = leerUmbrales();
function umbralesDe(plantilla) {
  const u = plantilla ? UMBRALES.get(canon(plantilla)) : null;
  return {
    plantilla: u ? u.plantilla : null,
    maxDur: u && u.maxDur != null ? u.maxDur : MAX_DURACION_MIN,
    maxSerie: u && u.maxSerie != null ? u.maxSerie : MAX_MIN_POR_SERIE,
    durPropio: !!(u && u.maxDur != null),
    seriePropio: !!(u && u.maxSerie != null),
  };
}

// ─── Bloques / mesociclos ───
//   bloque:: 2026-09-21 | 2026-09-27 | deload
//   bloque:: 2026-10-05 | 2026-11-01 | especialización tren superior | Pecho, Espalda, Hombro
// Fechas inclusivas. Sólo el tipo "deload" es especial; cualquier otro texto es un
// bloque de especialización. Un bloque PROTEGE a un grupo (el semáforo no lo juzga):
//   · deload          → a sus grupos (o a todos, si no declara grupos)
//   · especialización → a los grupos que quedan FUERA de su objetivo (si no declara
//                       grupos, no hay "fuera" y no protege a nadie)
function leerBloques() {
  const lista = [];
  const cfg = dv.page(ARCHIVO_HORARIO);
  if (!cfg) return lista;
  const conocidos = new Set(GRUPOS_ESPERADOS.map(canon));
  for (const v of Array.from(GRUPOS.mapa.values())) conocidos.add(canon(v.grupo));
  for (const raw of asArray(cfg.bloque)) {
    const linea = comoTexto(raw);
    const err = (m) => ERRORES_CONFIG.push({ archivo: ARCHIVO_HORARIO, linea: "bloque:: " + linea, motivo: m });
    const p = linea.split("|").map((x) => x.trim());
    if (p.length < 3 || p.length > 4) { err("se esperan 3 o 4 campos «inicio | fin | tipo | grupos»; no se aplica"); continue; }
    const ini = fechaISO(p[0]), fin = fechaISO(p[1]);
    if (!ini || !fin) { err("fecha no válida (usa AAAA-MM-DD); no se aplica"); continue; }
    if (fin < ini) { err("la fecha de fin es anterior a la de inicio; no se aplica"); continue; }
    if (!p[2]) { err("falta el tipo («deload» u otro texto); no se aplica"); continue; }
    const grupos = p.length === 4 ? p[3].split(",").map((x) => x.trim()).filter(Boolean) : [];
    // Un grupo mal escrito no se descarta (el bloque se aplica igual), pero se avisa:
    // en especialización, «Pehco» dejaría a Pecho FUERA del objetivo y protegido.
    const raros = grupos.filter((g) => !conocidos.has(canon(g)));
    if (raros.length) err((raros.length === 1 ? "grupo que no existe" : "grupos que no existen") + " en tu taxonomía: " + raros.join(", ") +
                          ". El bloque SÍ se aplica tal cual: revisa la grafía");
    lista.push({ inicio: ini, fin, tipo: p[2], esDeload: canon(p[2]) === "deload",
                 grupos: grupos.map(canon), gruposTxt: grupos, linea });
  }
  for (let i = 0; i < lista.length; i++)
    for (let j = i + 1; j < lista.length; j++)
      if (lista[i].inicio <= lista[j].fin && lista[j].inicio <= lista[i].fin)
        AVISOS_CONFIG.push("Bloques solapados: «" + lista[i].tipo + "» y «" + lista[j].tipo +
          "». Se combinan: objetivo = unión de grupos; cada uno protege a los suyos.");
  return lista;
}
const BLOQUES = leerBloques();
const protege = (b, kGrupo) => b.esDeload
  ? (!b.grupos.length || b.grupos.indexOf(kGrupo) >= 0)
  : (b.grupos.length > 0 && b.grupos.indexOf(kGrupo) < 0);
const bloquesActivos = (dia) => { const f = isoDe(dia); return BLOQUES.filter((b) => f >= b.inicio && f <= b.fin); };
// Bloque que protege a `grupo` en `dia`, o null
function bloqueProtector(grupo, dia) {
  const k = canon(grupo);
  for (const b of bloquesActivos(dia)) if (protege(b, k)) return b;
  return null;
}
// Días protegidos para `grupo` en el tramo (desde, hasta] — tramos solapados se cuentan una vez
function diasProtegidos(grupo, desde, hasta) {
  const a = numDia(isoDe(desde)) + 1, z = numDia(isoDe(hasta)), k = canon(grupo);
  const tramos = [];
  for (const b of BLOQUES) {
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
}

// ─── Peso corporal e IPF GL ───
//   sexo:: hombre
//   2026-09-14:: 78,5 kg
// La unidad es OBLIGATORIA: sin ella Dataview lee «78,5» como la lista [78, 5] (y
// «78,05» también como [78, 5]: el cero se pierde y no hay forma de recuperarlo).
function leerPeso() {
  const out = { existe: false, registros: [], sexo: null, fases: [] };
  const cfg = dv.page(ARCHIVO_PESO);
  if (!cfg) return out;
  out.existe = true;
  const err = (l, m) => ERRORES_CONFIG.push({ archivo: ARCHIVO_PESO, linea: l, motivo: m });
  for (const k of Object.keys(cfg)) {
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(k)) { err(k + ":: …", "fecha en formato no reconocido: usa AAAA-MM-DD; no se aplica"); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    if (!fechaISO(k)) { err(k + ":: …", "fecha imposible; no se aplica"); continue; }
    let v = cfg[k];
    if (v && typeof v.array === "function") v = v.array();
    const vals = Array.isArray(v) ? v : [v];
    if (vals.some((x) => typeof x === "number")) {
      err(k + ":: …", "falta la unidad. Sin «kg» o «lb», Dataview convierte «78,5» en la lista [78, 5]. " +
          "Escríbelo como «78,5 kg»; no se aplica");
      continue;
    }
    if (vals.length > 1) AVISOS_CONFIG.push("Peso corporal: la fecha " + k + " aparece " + vals.length + " veces; se usa la última.");
    const t = comoTexto(vals[vals.length - 1]).trim();
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)\.?$/i);
    if (!m) { err(k + ":: " + t, "no se reconoce el peso (ejemplo válido: «78,5 kg»); no se aplica"); continue; }
    const kg = aKg(parseFloat(m[1].replace(",", ".")), m[2]);
    if (!(kg >= 35 && kg <= 250)) { err(k + ":: " + t, "fuera del rango 35-250 kg, ¿errata?; no se aplica"); continue; }
    out.registros.push({ fecha: k, kg });
  }
  out.registros.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const s = sinTildes(comoTexto(cfg.sexo));
  if (/^(hombre|h|masculino|varon)$/.test(s)) out.sexo = "h";
  else if (/^(mujer|m|femenino)$/.test(s)) out.sexo = "m";
  else if (s) err("sexo:: " + comoTexto(cfg.sexo), "valor no reconocido (usa «hombre» o «mujer»)");

  // Objetivo:  objetivo:: cut   ·   objetivo:: cut | desde 2026-10-01
  // Varias líneas = historial de fases: cada una rige desde su fecha hasta la siguiente.
  // Una sin `desde` rige desde el primer registro. Antes de la primera fase, sin color.
  const vistasDesde = new Map();
  for (const raw of asArray(cfg.objetivo)) {
    const linea = comoTexto(raw).trim();
    if (!linea) continue;                       // `objetivo::` vacío = sin objetivo
    const e2 = (m) => err("objetivo:: " + linea, m);
    const p = linea.split("|").map((x) => x.trim());
    const tipo = sinTildes(p[0]);
    if (["bulk", "cut", "mantener"].indexOf(tipo) < 0) { e2("valor no reconocido (usa «bulk», «cut» o «mantener»); no se aplica"); continue; }
    let desde = null;
    if (p.length > 2) { e2("sobran campos: «objetivo | desde AAAA-MM-DD»; no se aplica"); continue; }
    if (p.length === 2) {
      const m = sinTildes(p[1]).match(/^desde\s+(\S+)$/);
      desde = m ? fechaISO(m[1]) : null;
      if (!desde) { e2("se espera «desde AAAA-MM-DD» detrás de la barra; no se aplica"); continue; }
    }
    const k = desde || "";
    if (vistasDesde.has(k))
      AVISOS_CONFIG.push("Hay más de un `objetivo::` " + (desde ? "con desde " + desde : "sin fecha") + ": se usa el último.");
    vistasDesde.set(k, { tipo, desde });
  }
  out.fases = Array.from(vistasDesde.values()).sort((a, b) => ((a.desde || "") < (b.desde || "") ? -1 : 1));
  return out;
}
const PESO = leerPeso();
// IPF GL (GOODLIFT, IPF 2020): puntos = 1RM × 100 / (A − B·e^(−C·peso corporal)).
// Constantes de la categoría «Classic Bench» (calibrada para UN levantamiento, no
// para el total de tres), verificadas en opl-data/crates/coefficients/src/goodlift.rs.
// Se aplica a todos los ejercicios: el número absoluto NO es comparable con puntos
// de competición; lo que vale es su evolución para ti (README §7).
const IPF_GL = { h: [320.98041, 281.40258, 0.01008], m: [142.40398, 442.52671, 0.04724] };
const HAY_GL = PESO.registros.length > 0 && !!PESO.sexo;
function pesoEn(dia) {
  const f = isoDe(dia);
  let r = null;
  for (const x of PESO.registros) { if (x.fecha <= f) r = x; else break; }
  return r;   // el último registro en o antes de ese día; null si no hay ninguno previo
}
function glDe(rm, dia) {
  if (!HAY_GL || !(rm > 0) || !dia) return null;
  const p = pesoEn(dia);
  if (!p) return null;
  const c = IPF_GL[PESO.sexo];
  const den = c[0] - c[1] * Math.exp(-c[2] * p.kg);
  return den > 0 ? (rm * 100) / den : null;
}

// ═══ PROGRAMA v5.1: unilaterales, rangos de reps, volumen objetivo y plantillas ═══
// Todo opcional y todo fuera del código, con el patrón de siempre: `clave:: valor`
// leído por el índice (dv.page / dv.pages, sin dv.io). Si un archivo no existe, su
// función no aparece. Una línea mal escrita va a ERRORES_CONFIG con el motivo.
//
// Claves de un archivo de config sin metadatos y sin duplicados: Dataview entrega cada
// clave dos veces («Press militar máquina» y «press-militar-máquina»); canon() las une y gana la primera.
function camposConfig(cfg) {
  const out = [], vistos = new Set();
  for (const k of Object.keys(cfg)) {
    if (META_CONFIG[k.toLowerCase()] || vistos.has(canon(k))) continue;
    vistos.add(canon(k));
    out.push({ clave: k, valores: asArray(cfg[k]) });
  }
  return out;
}
// "8-12" → {min, max}. Dataview lo entrega como texto: una fecha exige año de 4 cifras
// y un número tiene que ocupar el valor entero (comprobado en su parser, README §8.3-M).
function parseRango(t) {
  const m = String(t).trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return { error: "se espera «mínimo-máximo», por ejemplo «8-12»" };
  const min = parseInt(m[1], 10), max = parseInt(m[2], 10);
  if (!(min >= 1)) return { error: "el mínimo tiene que ser 1 o más" };
  if (min > max) return { error: "el mínimo (" + min + ") es mayor que el máximo (" + max + ")" };
  return { min, max };
}
const gruposConocidos = () => {
  const s = new Set();
  for (const v of Array.from(GRUPOS.mapa.values())) s.add(canon(v.grupo));
  return s;
};

// ─── Unilaterales ───   unilateral:: Curl mancuernas   (reps apuntadas POR LADO)
function leerUnilaterales() {
  const out = { existe: false, set: new Set(), nombres: [] };
  const cfg = dv.page(ARCHIVO_UNILATERALES);
  if (!cfg) return out;
  out.existe = true;
  for (const raw of asArray(cfg.unilateral)) {
    const n = comoTexto(raw).trim();
    if (!n) { ERRORES_CONFIG.push({ archivo: ARCHIVO_UNILATERALES, linea: "unilateral::",
      motivo: "vacío: falta el nombre del ejercicio; no se aplica" }); continue; }
    if (out.set.has(canon(n))) { AVISOS_CONFIG.push("`unilateral:: " + n + "` está repetido en unilaterales: cuenta una vez."); continue; }
    out.set.add(canon(n));
    out.nombres.push(n);
  }
  return out;
}
const UNILATERALES = leerUnilaterales();
// "16/lado" en las vistas por ejercicio; nada en los bilaterales
const repsTxt = (r, unilateral) => r + (unilateral ? "/lado" : "");

// ─── Rango de reps por ejercicio (doble progresión) ───
//   Aperturas polea:: 12-15   ·   Press plano máquina:: 6-10 | top | +5   ·   Pull over polea:: 12-15 | polea
// Tras el rango, en cualquier orden y todos opcionales: `top`, un incremento propio `+N`
// (kg) y un tipo de material declarado en `incremento::`. Los incrementos por defecto
// también viven en el archivo:   incremento:: máquina | +2,5
// El tipo se toma del campo explícito o, si no lo hay, de la palabra en el nombre
// («Press plano máquina» → máquina). README §18.
const parseKg = (s) => {
  const m = String(s).trim().match(/^\+\s*(\d+(?:[.,]\d+)?)\s*(kg)?$/i);
  const n = m ? parseFloat(m[1].replace(",", ".")) : NaN;
  return n > 0 ? n : null;
};
function leerObjetivos() {
  const out = { existe: false, mapa: new Map(), tipos: [] };
  const cfg = dv.page(ARCHIVO_OBJETIVOS);
  if (!cfg) return out;
  out.existe = true;
  // Incrementos por tipo de material, en el orden del archivo (gana el primero que encaje)
  for (const raw of asArray(cfg.incremento)) {
    const linea = comoTexto(raw).trim();
    const p = linea.split("|").map((x) => x.trim());
    const kg = p.length === 2 ? parseKg(p[1]) : null;
    if (!p[0] || kg == null) {
      ERRORES_CONFIG.push({ archivo: ARCHIVO_OBJETIVOS, linea: "incremento:: " + linea,
        motivo: "se espera «tipo | +N», por ejemplo «máquina | +2,5»; no se aplica" });
      continue;
    }
    out.tipos.push({ tipo: p[0], k: canon(p[0]), kg });
  }
  const tipoDe = (x) => out.tipos.filter((ti) => ti.k === canon(x))[0] || null;
  for (const c of camposConfig(cfg)) {
    if (canon(c.clave) === "incremento") continue;          // clave reservada, leída arriba
    const t = comoTexto(c.valores[c.valores.length - 1]).trim();
    const err = (m) => ERRORES_CONFIG.push({ archivo: ARCHIVO_OBJETIVOS, linea: c.clave + ":: " + t, motivo: m + "; no se aplica" });
    if (c.valores.length > 1) AVISOS_CONFIG.push("«" + c.clave + "» aparece " + c.valores.length + " veces en objetivos: se usa la última.");
    if (!t) { err("sin rango"); continue; }
    const p = t.split("|").map((x) => x.trim());
    const r = parseRango(p[0]);
    if (r.error) { err(r.error); continue; }
    const o = { nombre: c.clave, min: r.min, max: r.max, top: false, inc: null, tipo: null };
    let mal = null;
    for (const campo of p.slice(1)) {
      if (canon(campo) === "top") o.top = true;
      else if (/^\+/.test(campo)) { o.inc = parseKg(campo); if (o.inc == null) mal = "incremento no válido «" + campo + "» (usa «+2,5»)"; }
      else if (tipoDe(campo)) o.tipo = tipoDe(campo);
      else mal = "«" + campo + "» no es «top», ni un incremento «+N», ni un tipo de `incremento::` (" +
                 (out.tipos.map((x) => x.tipo).join(", ") || "no hay ninguno declarado") + ")";
      if (mal) break;
    }
    if (mal) { err(mal); continue; }
    out.mapa.set(canon(c.clave), o);
  }
  return out;
}
const OBJETIVOS = leerObjetivos();

// ─── Series semanales objetivo por grupo ───   Pecho:: 12-16
function leerVolumenObjetivo() {
  const out = { existe: false, lista: [] };
  const cfg = dv.page(ARCHIVO_VOLUMEN_OBJ);
  if (!cfg) return out;
  out.existe = true;
  const conocidos = gruposConocidos();
  for (const c of camposConfig(cfg)) {
    const t = comoTexto(c.valores[c.valores.length - 1]).trim();
    const linea = c.clave + ":: " + t;
    const r = parseRango(t);
    if (r.error) { ERRORES_CONFIG.push({ archivo: ARCHIVO_VOLUMEN_OBJ, linea, motivo: r.error + "; no se aplica" }); continue; }
    // Un grupo que no está en el mapeo se muestra igual (siempre con 0 series), pero se avisa
    if (!conocidos.has(canon(c.clave)))
      ERRORES_CONFIG.push({ archivo: ARCHIVO_VOLUMEN_OBJ, linea, motivo: "«" + c.clave + "» no es ningún grupo de " +
        "grupos-musculares: se muestra, pero ninguna serie puede contar para él. Revisa la grafía" });
    out.lista.push({ grupo: c.clave, min: r.min, max: r.max });
  }
  return out;
}
const VOLUMEN_OBJ = leerVolumenObjetivo();

// ─── Color de cada grupo muscular (README §25) ───   Pecho:: `#F2727F` | `#C73A50`
// El primero, para el tema oscuro; el segundo, para el claro (si falta, vale el primero). Se
// usa en etiquetas, gráficas, anillos, diagrama y calendario. Un grupo sin color toma uno del
// tema y Calidad de los datos lo avisa.
const OSCURO = typeof document !== "undefined" && !!document.body && document.body.classList.contains("theme-dark");
function leerColores() {
  const out = { existe: false, mapa: new Map() };
  const cfg = dv.page(ARCHIVO_COLORES);
  if (!cfg) return out;
  out.existe = true;
  for (const c of camposConfig(cfg)) {
    const t = comoTexto(c.valores[c.valores.length - 1]);
    const hex = (t.match(/#[0-9a-f]{6}\b/gi) || []);
    if (!hex.length) {
      ERRORES_CONFIG.push({ archivo: ARCHIVO_COLORES, linea: c.clave + ":: " + t, motivo: "se espera un color como #F2727F (y otro para el tema claro, tras «|»); no se aplica" });
      continue;
    }
    out.mapa.set(canon(c.clave), { nombre: c.clave, oscuro: hex[0], claro: hex[1] || hex[0] });
  }
  return out;
}
const COLORES = leerColores();
const colorGrupo = (g, i) => {
  const e = COLORES.mapa.get(canon(g));
  return e ? (OSCURO ? e.oscuro : e.claro) : PALETA[(i || 0) % PALETA.length];
};

// ─── Plantillas de LiftOff: targetSets de cada ejercicio (SÓLO LECTURA) ───
// Sin targetSets, LiftOff usa 3 (`Number(c.targetSets)||3` en su main.js): lo mismo aquí.
// Las plantillas no guardan versiones: una sesión antigua se compara con la plantilla
// ACTUAL de su nombre (README §16 y §18).
function leerPlantillas() {
  const mapa = new Map();
  for (const p of dv.pages(CARPETA_PLANTILLAS)) {
    if (String(p.type || "").trim() !== "workout-template") continue;
    const nombre = String(p.name || p.file.name).trim();
    const ejercicios = [];
    for (const ex of asArray(p.exercises)) {
      if (!ex || !ex.name) continue;
      ejercicios.push({ nombre: String(ex.name).trim(), target: Number(ex.targetSets) || 3 });
    }
    const porEj = new Map();
    for (const e of ejercicios) porEj.set(canon(e.nombre), e.target);
    mapa.set(canon(nombre), { nombre, ejercicios, porEj });
  }
  return mapa;
}
const PLANTILLAS = leerPlantillas();

// ═══ LIGAS: escala y estándares de fuerza (README §23, todo opcional) ═══
// Mismo patrón que el resto: `clave:: valor` por el índice, sin dv.io, y una línea mal
// escrita va a Calidad de los datos con el motivo. Todos los números de la escala se pasan
// a una sola medida, la «puntuación»: el percentil de Strength Level hasta Elite (p95) y,
// por encima, `puntos-sobre-elite` puntos por cada ×0,10 de la carga Elite (con 5,
// Elite × 1,10 = 100). Es lo que permite promediar ejercicios y grupos en una escala.
const numCfg = (t) => parseFloat(String(t).replace(",", "."));
const NUM_CFG = "(\\d+(?:[.,]\\d+)?)";
function leerLigas() {
  const out = { existe: false, ok: false, lista: [], puntos: 5, margen: 1, semCarga: 8, semSeries: 4 };
  const cfg = dv.page(ARCHIVO_LIGAS);
  if (!cfg) return out;
  out.existe = true;
  const err = (l, m) => ERRORES_CONFIG.push({ archivo: ARCHIVO_LIGAS, linea: l, motivo: m });
  // Ajustes:   puntos-sobre-elite:: 5 · margen-descenso:: 1 · semanas-carga:: 8 · semanas-series:: 4
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
  // liga:: Oro | p 40-50 | divisiones   ·   liga:: Élite | elite 1,10-1,20 | divisiones   ·   liga:: Leyenda | elite 1,20+ | sin divisiones
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
  // La escala tiene que ser continua: empieza en p0, cada liga empieza donde acaba la
  // anterior y sólo la última puede quedar abierta. Si no, no se adivina: no hay ligas.
  const L = out.lista;
  if (L.length && Math.abs(L[0].desde) > 1e-9) { err("liga:: " + L[0].linea, "la primera liga tiene que empezar en p 0"); roto = true; }
  for (let i = 1; i < L.length; i++)
    if (Math.abs(L[i].desde - L[i - 1].hasta) > 1e-6) { err("liga:: " + L[i].linea, "no empieza donde acaba «" + L[i - 1].nombre + "»: hay un hueco o un solape"); roto = true; }
  out.ok = L.length > 0 && !roto;
  if (L.length && !out.ok) AVISOS_CONFIG.push("La escala de [[ligas]] tiene errores: las ligas no se muestran hasta corregirla.");
  return out;
}
const LIGAS_CFG = leerLigas();

// estandares.md tiene dos tipos de línea, y se distinguen por el valor:
//   mapeo:  Press plano máquina:: chest-press | factor 0,85 | aproximado   (o «sin estándar»)
//   tabla:  chest-press:: 80 | 39 | 61 | 89 | 123 | 160   (peso corporal | Beginner … Elite)
// Se mira el valor y no la clave porque Dataview duplica cada clave con su forma
// normalizada, y «Face pull» normalizada es «face-pull», la misma clave que su tabla.
//   corrección:  correccion-polea:: factor 1,4   → multiplica el factor de los marcados «| polea»
function leerEstandares() {
  const out = { existe: false, mapa: new Map(), tablas: new Map(), correccionPolea: 1, lineaPolea: null };
  const cfg = dv.page(ARCHIVO_ESTANDARES);
  if (!cfg) return out;
  out.existe = true;
  const err = (l, m) => ERRORES_CONFIG.push({ archivo: ARCHIVO_ESTANDARES, linea: l, motivo: m });
  const esNum = (x) => /^\d+(?:[.,]\d+)?$/.test(x);
  const vistas = new Set(), filas = new Map();
  // Corrección de polea (README §23). Con «factor» delante el valor es texto: un «1,4» a secas
  // Dataview lo lee como la lista (1, 4), y «1,05» como (1, 5), que no se puede distinguir de
  // 1,5. Por eso una lista es un error y no se adivina. Un número con punto (1.4) también vale.
  for (const k of Object.keys(cfg)) {
    if (canon(k) !== "correccionpolea" || out.lineaPolea) continue;
    let raw = cfg[k];
    if (raw && typeof raw.array === "function") raw = raw.array();
    const t = comoTexto(raw).trim();
    out.lineaPolea = k + ":: " + t;
    const m = sinTildes(t).match(new RegExp("^(?:factor\\s+)?" + NUM_CFG + "$"));
    if (Array.isArray(raw) || !m) { err(out.lineaPolea, "se espera «factor N», por ejemplo «factor 1,4» (sin «factor», Dataview lee «1,4» como la lista 1, 4); no se aplica"); continue; }
    const v = numCfg(m[1]);
    if (!(v > 0 && v <= 5)) { err(out.lineaPolea, "la corrección tiene que estar entre 0 y 5; no se aplica"); continue; }
    out.correccionPolea = v;
  }
  for (const k of Object.keys(cfg)) {
    if (META_CONFIG[k.toLowerCase()] || canon(k) === "correccionpolea") continue;
    for (const raw of asArray(cfg[k])) {
      const t = comoTexto(raw).trim();
      const firma = canon(k) + "::" + t;
      if (!t || vistas.has(firma)) continue;                 // la copia normalizada de la clave
      vistas.add(firma);
      const p = t.split("|").map((x) => x.trim());
      if (p.length === 6 && p.every(esNum)) {                // fila de tabla
        const v = p.map(numCfg);
        const niveles = v.slice(1);
        if (!(v[0] >= 30 && v[0] <= 250)) { err(k + ":: " + t, "peso corporal fuera de 30-250 kg; la fila no se aplica"); continue; }
        if (!niveles.every((n, i) => n > 0 && (i === 0 || n > niveles[i - 1]))) {
          err(k + ":: " + t, "los cinco niveles tienen que ir de menor a mayor; la fila no se aplica"); continue; }
        const f = filas.get(canon(k)) || { slug: k, filas: new Map() };
        if (f.filas.has(v[0])) AVISOS_CONFIG.push("Estándar «" + k + "»: la fila de " + v[0] + " kg está repetida; se usa la última.");
        f.filas.set(v[0], niveles);
        filas.set(canon(k), f);
        continue;
      }
      // línea de mapeo
      const linea = k + ":: " + t;
      if (canon(p[0]) === "sinestandar") { out.mapa.set(canon(k), { nombre: k, sinEstandar: true, linea }); continue; }
      if (!/^[a-z0-9-]+$/i.test(p[0])) { err(linea, "se espera «estándar | factor N», con el estándar escrito como en la URL de Strength Level (por ejemplo «chest-press»); no se aplica"); continue; }
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
        AVISOS_CONFIG.push("«" + k + "» aparece más de una vez en estandares: se usa la última.");
      out.mapa.set(canon(k), e);
    }
  }
  for (const f of Array.from(filas.values())) {
    const pcs = Array.from(f.filas.keys()).sort((a, b) => a - b);
    out.tablas.set(canon(f.slug), { slug: f.slug, filas: pcs.map((pc) => ({ pc, niveles: f.filas.get(pc) })) });
  }
  for (const e of Array.from(out.mapa.values()))
    if (!e.sinEstandar && !out.tablas.has(canon(e.slug)))
      err(e.linea, "no hay ninguna tabla «" + e.slug + "» en estandares; el ejercicio queda sin liga");
  // Factor efectivo = factor × corrección de polea. El ×2 de un ejercicio a una mano comparado
  // con un estándar a dos manos va dentro de `factor`, así que se aplica una sola vez.
  for (const e of Array.from(out.mapa.values())) {
    if (e.sinEstandar) continue;
    e.factorBase = e.factor;
    if (e.polea) e.factor = e.factorBase * out.correccionPolea;
  }
  return out;
}
const ESTANDARES = leerEstandares();

// ══════════════════ DIAGRAMA DE BALANCE MUSCULAR ══════════════════
// Geometría: body-muscles © 2024 Ivan Vulović · Apache License 2.0.
// El SVG original y sus ficheros de licencia están en Gym/Dashboards/assets/.
// Los paths van EMBEBIDOS en datosRegiones() (al final del script) en vez de
// leerse del fichero: leerlo exigiría dv.io, que es zona gris en iOS.

const NIVELES = ["#fde68a", "#fcd34d", "#fb923c", "#f97316", "#dc2626"];
// Desde el 2026-09-26 (README §25) el diagrama y el calendario pintan con el color de cada grupo
// y la intensidad va en la opacidad: un nivel por cada color de NIVELES, que queda como escala.
const OPACIDADES = [0.28, 0.44, 0.6, 0.78, 0.95];
const GRIS_NO_ENTRENADO = CSSV("--text-faint", "#9ca3af");   // van en style="", que sí admite var()
const GRIS_NEUTRO = CSSV("--text-faint", "#9ca3af");

// Mapeo grupo → regiones, leído del archivo de config (nada hardcodeado aquí)
function leerRegiones() {
  const mapa = [];
  const cfg = dv.page(ARCHIVO_REGIONES);
  if (!cfg) return { mapa, existe: false };
  for (const k of Object.keys(cfg)) {
    if (META_CONFIG[k.toLowerCase()]) continue;
    const vals = asArray(cfg[k]);
    if (!vals.length) continue;
    const tokens = String(vals[vals.length - 1]).trim().split(/\s+/).filter(Boolean);
    if (tokens.length) mapa.push({ grupo: String(k).trim(), tokens });
  }
  return { mapa, existe: true };
}

const escXml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function diagramaMuscular(cont, seriesPorGrupo) {
  const REG = leerRegiones();
  if (!REG.existe) {
    calloutEn(cont, "failure", "No se encuentra " + ARCHIVO_REGIONES,
      ["Sin ese archivo no sé qué región del cuerpo corresponde a cada grupo muscular."]);
    return false;
  }
  const datos = datosRegiones();
  const todas = datos.front.concat(datos.back);

  // Sólo se consideran "entrenables" los grupos que existen de verdad en tu
  // taxonomía (los del mapeo de ejercicios). Así, una línea de ejemplo en el
  // archivo de regiones no puede inventarse un grupo que tú no sigues.
  const conocidos = new Set();
  for (const v of Array.from(GRUPOS.mapa.values())) conocidos.add(canon(v.grupo));

  const deRegion = new Map();
  for (const entrada of REG.mapa) {
    if (!conocidos.has(canon(entrada.grupo))) continue;
    for (const tok of entrada.tokens) {
      const pref = tok.charAt(tok.length - 1) === "*" ? tok.slice(0, -1) : null;
      for (const r of todas) {
        const id = r[0];
        if (pref ? id.indexOf(pref) === 0 : id === tok) deRegion.set(id, entrada.grupo);
      }
    }
  }

  let max = 0;
  for (const k of Object.keys(seriesPorGrupo)) if (seriesPorGrupo[k] > max) max = seriesPorGrupo[k];

  const usados = new Map();   // grupo mostrado -> series
  const pinta = (r, vista) => {
    const id = r[0], nombre = r[1], d = r[2];
    const g = deRegion.get(id);
    // No es un grupo que sigas: sin relleno y contorno discontinuo (sólo la silueta)
    let fill = GRIS_NEUTRO, op = "0", extra = ' stroke-dasharray="0.7 0.7"', titulo = nombre;
    if (g) {
      const n = seriesPorGrupo[canon(g)] || 0;
      usados.set(g, n);
      if (n > 0) {
        const nivel = Math.min(NIVELES.length, Math.max(1, Math.ceil((n / max) * NIVELES.length)));
        fill = colorGrupo(g); op = String(OPACIDADES[nivel - 1]);
        titulo = g + " · " + n + " series";
      } else {
        // "sin entrenar": gris sólido, inconfundible con el nivel más bajo de la escala y con
        // las regiones que no sigues (que van sin relleno)
        fill = GRIS_NO_ENTRENADO; op = "0.45";
        extra = "";
        titulo = g + " · sin entrenar en el periodo";
      }
    }
    return '<path d="' + escXml(d) + '" style="fill:' + fill + ';fill-opacity:' + op + '"' + extra +
           '><title>' + escXml(titulo) + '</title></path>';
  };

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 99" ' +
    'style="width:100%;height:auto;max-width:520px;display:block;margin:0 auto" ' +
    'role="img" aria-label="Balance muscular, vista frontal y trasera">' +
    '<g style="stroke:var(--text-faint, #6b7280)" stroke-width="0.22" stroke-linejoin="round">' +
    datos.front.map((r) => pinta(r, "front")).join("") +
    datos.back.map((r) => pinta(r, "back")).join("") +
    '</g>' +
    '<text x="17.5" y="97" text-anchor="middle" font-size="3.2" style="fill:var(--text-muted, #9ca3af)">Frontal</text>' +
    '<text x="54.5" y="97" text-anchor="middle" font-size="3.2" style="fill:var(--text-muted, #9ca3af)">Trasera</text>' +
    '</svg>';

  const caja = cont.createDiv();
  caja.innerHTML = svg;

  // ─── Leyenda en dos filas: la escala y los dos grises. Cada elemento va entero (nowrap),
  // así que a 390 px sólo se parte ENTRE elementos, nunca entre la casilla y su texto. ───
  const leyenda = estilo(cont.createDiv(), { display: "flex", flexDirection: "column", alignItems: "center",
                                             gap: "0.4em", margin: "0.6em 0 0.2em 0", fontSize: "0.85em", color: CSSV("--text-muted") });
  const filaL = () => estilo(leyenda.createDiv(), { display: "flex", flexWrap: "wrap", justifyContent: "center",
                                                    alignItems: "center", gap: "0.3em 1em" });
  const itemL = (f) => estilo(f.createEl("span"), { display: "inline-flex", alignItems: "center", gap: "0.35em", whiteSpace: "nowrap" });
  // La casilla imita a la región: borde fijo y relleno con su opacidad en una capa aparte
  const muestra = (cont2, color, op, punteado) => {
    const s = estilo(cont2.createEl("span"), { display: "inline-block", position: "relative", width: "1.15em", height: "1.15em",
      flex: "0 0 auto", boxSizing: "border-box", borderRadius: "2px",
      border: (punteado ? "1px dashed " : "1px solid ") + CSSV("--text-faint", "#6b7280") });
    if (color && op !== "0") estilo(s.createEl("span"), { position: "absolute", top: "0", right: "0", bottom: "0", left: "0",
                                                          background: color, opacity: op });
    return s;
  };
  const escalaL = itemL(filaL());
  escalaL.createEl("span").textContent = "Menos";
  for (const o of OPACIDADES) muestra(escalaL, CSSV("--text-normal", "#333"), String(o), false);
  escalaL.createEl("span").textContent = "Más";
  const coloresL = filaL();
  for (const par of Array.from(usados.entries())) if (par[1] > 0) {
    const it = itemL(coloresL); muestra(it, colorGrupo(par[0]), "0.95", false); it.createEl("span").textContent = nombreGrupo(par[0]);
  }
  const grises = filaL();
  const g1 = itemL(grises); muestra(g1, GRIS_NO_ENTRENADO, "0.45", false); g1.createEl("span").textContent = "sin entrenar";
  const g2 = itemL(grises); muestra(g2, null, "0", true); g2.createEl("span").textContent = "no seguido";

  return { max, grupos: usados };
}

// ══════════════════ CALENDARIO DE ACTIVIDAD · ÚLTIMAS SEMANAS (README §10) ══════════════════
// Propio, sin el plugin Heatmap Calendar: el plugin dibuja el año entero y en 390 px los
// días quedaban como rayas y los meses, letra a letra. Aquí, las últimas
// CALENDARIO_SEMANAS semanas ISO (lunes a domingo) en un SVG en línea, como el diagrama
// muscular (README 8.3-I): celdas cuadradas que escalan con el ancho, sin scroll.
// Intensidad = series de trabajo del día (suma de sesiones), con la MISMA rampa (NIVELES) y
// la misma fórmula que usaba el plugin (leída en su main.js):
//   nivel = round(1 + (series − mín) · (5 − 1) / (máx − mín))   ·   todos iguales ⇒ 5
// sobre los días con series de las semanas visibles. Hoy lleva borde sólido; los días de un
// bloque deload (README §12), borde discontinuo. Fechas en texto AAAA-MM-DD, sin Intl.
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS_CORTOS = ["L", "M", "X", "J", "V", "S", "D"];

function seccionCalendario() {
  // Un día = una casilla. Reutiliza SESIONES, ya parseado: aquí no se vuelve a leer ningún log.
  const porDia = new Map();
  for (const s of SESIONES) {
    if (!s.dia) continue;
    const k = s.dia.toFormat("yyyy-MM-dd");
    const d = porDia.get(k) || { fecha: k, dia: s.dia, series: 0, volumen: 0, plantillas: [], porGrupo: new Map() };
    d.series += s.series;
    d.volumen += s.volumen;
    for (const e of s.ejercicios) d.porGrupo.set(grupoDe(e.nombre), (d.porGrupo.get(grupoDe(e.nombre)) || 0) + e.sets.length);
    if (s.plantilla && d.plantillas.indexOf(s.plantilla) < 0) d.plantillas.push(s.plantilla);
    porDia.set(k, d);
  }
  const dias = Array.from(porDia.values()).sort((a, b) => b.dia.toMillis() - a.dia.toMillis());
  if (!dias.length) {
    dv.paragraph("> [!info] Sin días registrados\n> El calendario aparecerá en cuanto haya alguna sesión.");
    return;
  }

  const inicio = lunesDe(HOY).minus({ weeks: CALENDARIO_SEMANAS - 1 });
  const hoyIso = isoDe(HOY);
  const visibles = [];
  for (let i = 0; i < CALENDARIO_SEMANAS * 7; i++) {
    const dia = inicio.plus({ days: i });
    const k = isoDe(dia);
    visibles.push({ dia, k, d: porDia.get(k) || null, futuro: k > hoyIso,
                    deload: bloquesActivos(dia).some((b) => b.esDeload) });
  }
  const conSeries = visibles.filter((c) => c.d && c.d.series > 0).map((c) => c.d.series);
  const mn = conSeries.length ? Math.min.apply(null, conSeries) : 0;
  const mx = conSeries.length ? Math.max.apply(null, conSeries) : 0;
  const nivelDe = (n) => (!(n > 0) ? 0 : mn === mx ? NIVELES.length
    : Math.min(NIVELES.length, Math.max(1, Math.round(1 + ((n - mn) * (NIVELES.length - 1)) / (mx - mn)))));

  // Geometría (unidades del viewBox): columna de días + una columna por semana
  const C = 10, G = 2, IZQ = 10, ARRIBA = 10;
  const ancho = IZQ + CALENDARIO_SEMANAS * (C + G) - G, alto = ARRIBA + 7 * (C + G) - G;
  const partes = [];
  const texto = (x, y, t, anc) => '<text x="' + x + '" y="' + y + '" font-size="6.5" text-anchor="' + (anc || "start") +
    '" style="fill:var(--text-muted, #888)">' + escXml(t) + "</text>";
  for (let f = 0; f < 7; f++) partes.push(texto(IZQ - 3, ARRIBA + f * (C + G) + C - 2.2, DIAS_CORTOS[f], "end"));
  // Rótulo de mes en cada semana en la que empieza uno, y en la primera columna si no la pisa
  const rotulos = [];
  for (let s = 0; s < CALENDARIO_SEMANAS; s++) {
    const lunes = inicio.plus({ weeks: s });
    let mes = null;
    for (let d = 0; d < 7; d++) if (lunes.plus({ days: d }).day === 1) mes = lunes.plus({ days: d }).month;
    if (s === 0 && mes == null) mes = lunes.month;
    if (mes != null) rotulos.push({ s, mes });
  }
  if (rotulos.length > 1 && rotulos[0].s === 0 && rotulos[1].s === 1) rotulos.shift();
  for (const r of rotulos) partes.push(texto(IZQ + r.s * (C + G), ARRIBA - 3, MESES_CORTOS[r.mes - 1]));
  const gruposCal = new Set();
  visibles.forEach((c, i) => {
    const x = IZQ + Math.floor(i / 7) * (C + G), y = ARRIBA + (i % 7) * (C + G);
    if (c.futuro) {
      // futuro: sólo el contorno; si cae en un deload, también discontinuo (así ves la semana de descarga)
      partes.push('<rect x="' + x + '" y="' + y + '" width="' + C + '" height="' + C + '" rx="2" style="fill:none;' +
        (c.deload ? "stroke:var(--text-accent, #8a5cf5);stroke-width:1;stroke-dasharray:2 1.4"
                  : "stroke:var(--background-modifier-border, #ccc);stroke-width:0.6") + '"/>');
      return;
    }
    const n = c.d ? c.d.series : 0, nivel = nivelDe(n);
    // Color del grupo con más series ese día; la intensidad, en la opacidad (README §25)
    const gDia = c.d ? Array.from(c.d.porGrupo.entries()).sort((a, b) => b[1] - a[1])[0] : null;
    if (gDia && nivel) gruposCal.add(gDia[0]);
    const relleno = nivel ? colorGrupo(gDia ? gDia[0] : "") + ";fill-opacity:" + OPACIDADES[nivel - 1] : "var(--background-modifier-border, #ddd)";
    const esHoy = c.k === hoyIso;
    const borde = esHoy ? "stroke:var(--text-normal, #333);stroke-width:1.6"
      : c.deload ? "stroke:var(--text-accent, #8a5cf5);stroke-width:1;stroke-dasharray:2 1.4" : "stroke:none";
    const titulo = c.dia.toFormat("dd/MM") + " · " + (n ? n + " series · " + c.d.plantillas.join(", ") : "sin entrenar") +
      (esHoy ? " · hoy" : "") + (c.deload ? " · deload" : "");
    partes.push('<rect x="' + x + '" y="' + y + '" width="' + C + '" height="' + C + '" rx="2" style="fill:' + relleno +
      ";" + borde + '"><title>' + escXml(titulo) + "</title></rect>");
  });
  const caja = dv.container.createDiv();
  caja.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ' + (ancho + 2) + " " + (alto + 2) + '" ' +
    'style="width:100%;height:auto;max-width:560px;display:block;margin:0.4em auto" role="img" ' +
    'aria-label="Calendario de actividad, últimas ' + CALENDARIO_SEMANAS + ' semanas">' + partes.join("") + "</svg>";

  // Leyenda en dos filas que no se parten de forma rara a 390 px
  const leyenda = estilo(dv.container.createDiv(), { display: "flex", flexDirection: "column", alignItems: "center",
                                                     gap: "0.35em", margin: "0.3em 0", fontSize: "0.85em", color: CSSV("--text-muted") });
  const fila = () => estilo(leyenda.createDiv(), { display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.3em 0.9em" });
  const item = (f) => estilo(f.createEl("span"), { display: "inline-flex", alignItems: "center", gap: "0.3em", whiteSpace: "nowrap" });
  const casilla = (cont, fondo, borde) => estilo(cont.createEl("span"), { display: "inline-block", width: "0.95em", height: "0.95em",
    borderRadius: "2px", boxSizing: "border-box", background: fondo, border: borde || "none", flex: "0 0 auto" });
  const f1 = fila(), escala = item(f1);
  escala.createEl("span").textContent = "Menos";
  for (const o of OPACIDADES) estilo(casilla(escala, CSSV("--text-normal", "#333")), { opacity: String(o) });
  escala.createEl("span").textContent = "Más";
  const fG = fila();
  for (const g of Array.from(gruposCal)) { const it = item(fG); casilla(it, colorGrupo(g)); it.createEl("span").textContent = g; }
  const f2 = fila();
  const i0 = item(f2); casilla(i0, CSSV("--background-modifier-border", "#ddd")); i0.createEl("span").textContent = "sin entrenar";
  const i1 = item(f2); casilla(i1, "transparent", "2px solid " + CSSV("--text-normal", "#333")); i1.createEl("span").textContent = "hoy";
  if (visibles.some((c) => c.deload)) {
    const i2 = item(f2); casilla(i2, "transparent", "1px dashed " + CSSV("--text-accent", "#8a5cf5")); i2.createEl("span").textContent = "deload";
  }

  // Resumen: las semanas visibles y, como antes, el año en curso
  const enVentana = visibles.filter((c) => c.d && c.d.series > 0);
  const serVentana = enVentana.reduce((a, c) => a + c.d.series, 0);
  const pico = enVentana.reduce((m, c) => (!m || c.d.series > m.d.series ? c : m), null);
  const anio = HOY.year, delAnio = dias.filter((d) => d.dia.year === anio);
  const totSer = delAnio.reduce((a, d) => a + d.series, 0);
  const maxDia = delAnio.reduce((m, d) => (!m || d.series > m.series ? d : m), null);
  const nota = (t) => textoSec(dv.container, t, { margin: "0.3em 0" });
  nota(enVentana.length + (enVentana.length === 1 ? " día entrenado" : " días entrenados") + " en las últimas " +
    CALENDARIO_SEMANAS + " semanas · " + serVentana + " series" +
    (pico ? " · día más cargado: " + pico.dia.toFormat("dd/MM") + " con " + pico.d.series : "") + ".");
  nota(delAnio.length
    ? delAnio.length + (delAnio.length === 1 ? " día entrenado" : " días entrenados") + " en " + anio +
      " · " + totSer + " series · media " + fmt(totSer / delAnio.length, 1) + " series por día" +
      (maxDia ? " · día más cargado: " + maxDia.dia.toFormat("dd/MM") + " con " + maxDia.series : "")
    : "Sin días entrenados en " + anio + ".");

}

// ══════════════════ PESO CORPORAL · TENDENCIA FRENTE AL OBJETIVO ══════════════════
// Nunca se comparan dos pesajes sueltos: el peso diario oscila por agua, sal y
// digestión. Para cada registro de fecha t:
//   media reciente = registros en (t−21, t]      media anterior = registros en (t−42, t−21]
//   (cada una con ≥ PESO_MIN_REGISTROS; si no, ese punto va sin color)
//   ritmo = (reciente − anterior) / semanas entre sus fechas medias
//   sube/baja si |ritmo| ≥ 0,25 % de la media reciente por semana; si no, estable
// "mantener" no usa el ritmo: compara la media reciente con la media de los primeros
// 21 días de la fase, ±1 kg. Así un deslizamiento lento no pasa como "estable".
const COLOR_PESO = { verde: TEMA.verde, ambar: TEMA.naranja, rojo: TEMA.rojo,   // del tema (README §22)
                     neutro: colorTema("--text-faint", "rgba(156,163,175,1)") };
const EMOJI_PESO = { verde: "🟢", ambar: "🟡", rojo: "🔴", neutro: "⚪" };
const pesoTxt = (kg) => fmt(kg, 1) + " kg";
const conSigno = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v), d);

function faseEn(iso) {
  let f = null;
  for (const x of PESO.fases) if (!x.desde || x.desde <= iso) f = x;
  return f;
}

// Medias móviles y ritmo para cada registro, en O(n) con sumas acumuladas (con
// años de pesajes diarios esto se recalcula en cada refresco de Dataview, también en el móvil).
function analizarPeso() {
  const R = PESO.registros, n = R.length, V = PESO_VENTANA_DIAS;
  const dia = R.map((r) => numDia(r.fecha));
  const sKg = [0], sDia = [0];
  for (let i = 0; i < n; i++) { sKg.push(sKg[i] + R[i].kg); sDia.push(sDia[i] + dia[i]); }
  const media = (a, b) => (sKg[b] - sKg[a]) / (b - a);     // índices [a, b)
  const mDia = (a, b) => (sDia[b] - sDia[a]) / (b - a);
  let lo1 = 0, lo0 = 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = dia[i];
    while (dia[lo1] <= t - V) lo1++;          // primera con día > t−21
    while (dia[lo0] <= t - 2 * V) lo0++;      // primera con día > t−42
    const n1 = i + 1 - lo1, n0 = lo1 - lo0;
    const x = { fecha: R[i].fecha, kg: R[i].kg, dia: t, media: null, ritmo: null, dir: null };
    // Además del mínimo de registros, el historial debe CUBRIR la ventana entera: si no,
    // 4 pesajes de los primeros días "llenarían" una ventana de 21 y el color saldría
    // antes de tiempo, comparando contra una media mucho más ruidosa de lo simulado.
    if (n1 >= PESO_MIN_REGISTROS && dia[0] <= t - V + 1) x.media = media(lo1, i + 1);
    if (x.media != null && n0 >= PESO_MIN_REGISTROS && dia[0] <= t - 2 * V + 1) {
      const semanas = (mDia(lo1, i + 1) - mDia(lo0, lo1)) / 7;
      x.ritmo = (x.media - media(lo0, lo1)) / semanas;
      const umbral = (PESO_UMBRAL_PCT_SEMANA / 100) * x.media;
      x.dir = x.ritmo >= umbral ? "sube" : x.ritmo <= -umbral ? "baja" : "estable";
    }
    out.push(x);
  }
  // Referencia de cada fase "mantener": media de sus primeros 21 días de registros
  const refDe = new Map();
  for (const f of PESO.fases) {
    if (f.tipo !== "mantener") continue;
    const ini = f.desde ? numDia(f.desde) : (n ? dia[0] : 0);
    const dentro = out.filter((x) => x.dia >= ini && x.dia < ini + V);
    refDe.set(f, { media: dentro.length >= PESO_MIN_REGISTROS
                     ? dentro.reduce((a, x) => a + x.kg, 0) / dentro.length : null,
                   fin: ini + V - 1, n: dentro.length });
  }
  for (const x of out) {
    const f = faseEn(x.fecha);
    x.fase = f;
    x.color = "neutro";
    if (!f) continue;
    if (f.tipo === "mantener") {
      const ref = refDe.get(f);
      if (ref.media == null || x.dia < ref.fin || x.media == null) continue;   // referencia aún incompleta
      x.desvio = x.media - ref.media;
      x.color = Math.abs(x.desvio) <= PESO_BANDA_MANTENER_KG ? "verde" : "rojo";
    } else if (x.dir) {
      const aFavor = f.tipo === "bulk" ? "sube" : "baja";
      x.color = x.dir === "estable" ? "ambar" : x.dir === aFavor ? "verde" : "rojo";
    }
  }
  return { puntos: out, refDe };
}

// dd/MM a partir de un número de día (UTC, sin locale). Autocontenida a propósito:
// Chart.js la llama desde el eje, fuera de este ámbito.
const etiquetaDia = function (v) {
  const d = new Date(Math.round(v) * 864e5);
  const p = (k) => (k < 10 ? "0" : "") + k;
  return p(d.getUTCDate()) + "/" + p(d.getUTCMonth() + 1);
};

function seccionPeso() {
  if (!PESO.registros.length) return;          // sin registros: la sección no existe
  const A = analizarPeso();
  const P = A.puntos;
  const ult = P[P.length - 1];
  const faseHoy = faseEn(isoDe(HOY));
  const hayObjetivo = PESO.fases.length > 0;

  // ─── Gráfica (últimos PESO_DIAS_GRAFICA días) ───
  const desdeGraf = numDia(isoDe(HOY)) - PESO_DIAS_GRAFICA;
  const vis = P.filter((x) => x.dia > desdeGraf);
  const serie = vis.length ? vis : P.slice(-1);
  const valores = serie.map((x) => x.kg).concat(serie.filter((x) => x.media != null).map((x) => x.media));
  const vMin = Math.min.apply(null, valores), vMax = Math.max.apply(null, valores);
  const rango = vMax - vMin;
  const margen = rango > 0 ? Math.max(0.5, 0.15 * rango) : 1;
  const yMin = Math.floor((vMin - margen) * 2) / 2, yMax = Math.ceil((vMax + margen) * 2) / 2;
  const colores = serie.map((x) => COLOR_PESO[x.color]);
  const opc = opcionesBase({});
  // Eje X lineal en días (no por categorías): un hueco sin pesarte ocupa su tiempo real.
  // Acotado a la primera y última fecha: si no, Chart.js lo "redondea" y en móvil se pierde anchura.
  opc.scales.x = { type: "linear", ticks: { font: { size: 11 }, maxRotation: 0, precision: 0,
                   maxTicksLimit: 6, callback: etiquetaDia } };
  if (serie.length > 1) { opc.scales.x.min = serie[0].dia; opc.scales.x.max = serie[serie.length - 1].dia; }
  opc.scales.y = { min: yMin, max: yMax, beginAtZero: false, ticks: { font: { size: 11 } } };
  opc.plugins.tooltip = { callbacks: { title: (items) => (items.length ? etiquetaDia(items[0].parsed.x) : "") } };
  const ok = grafica({
    type: "line",
    data: { datasets: [
      { label: "Peso", data: serie.map((x) => ({ x: x.dia, y: Math.round(x.kg * 10) / 10 })),
        borderColor: COLOR_PESO.neutro, backgroundColor: COLOR_PESO.neutro, borderWidth: 2, tension: 0,
        pointRadius: serie.length > 90 ? 1.5 : 3, pointBackgroundColor: colores, pointBorderColor: colores,
        // Autocontenida: lee el color del punto de llegada desde el propio dataset
        segment: { borderColor: (c) => {
          const cs = c.chart.data.datasets[c.datasetIndex].pointBackgroundColor;
          return cs && cs[c.p1DataIndex] ? cs[c.p1DataIndex] : undefined;
        } } },
      { label: "Media " + PESO_VENTANA_DIAS + " días",
        data: serie.map((x) => ({ x: x.dia, y: x.media == null ? null : Math.round(x.media * 100) / 100 })),
        borderColor: TEMA.apagado, backgroundColor: TEMA.apagado,
        borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, tension: 0.2, spanGaps: false },
    ] },
    options: opc,
  }, 250);

  // ─── Sin Charts: últimos registros + tendencia en palabras ───
  if (!ok) {
    listaEn(dv.container,
      P.slice(-PESO_FILAS_FALLBACK).reverse().map((x) => [
        ddmm(x.fecha), pesoTxt(x.kg), x.media == null ? "—" : pesoTxt(x.media),
        EMOJI_PESO[x.color] + " " + (x.fase && x.fase.tipo === "mantener"
          ? (x.desvio == null ? "—" : conSigno(x.desvio, 1) + " kg " + (x.color === "verde" ? "en banda" : "fuera de banda"))
          : (x.dir ? x.dir + " " + conSigno(x.ritmo, 2) + " kg/sem" : "—")),
      ]).map((f) => ({ titulo: f[0] + " · " + f[1], lineas: ["media " + PESO_VENTANA_DIAS + " d: " + f[2], f[3]] })));
  }

  // ─── Texto: ganado/perdido con el MISMO criterio (medias de 21 días, nunca extremos sueltos) ───
  const L = [];
  const V = PESO_VENTANA_DIAS;
  const inicio = faseHoy && faseHoy.desde ? faseHoy.desde : P[0].fecha;
  const dIni = numDia(inicio);
  const primeros = P.filter((x) => x.dia >= dIni && x.dia < dIni + V);
  const ultimos = P.filter((x) => x.dia > ult.dia - V);
  const mediaDe = (a) => a.reduce((s, x) => s + x.kg, 0) / a.length;
  const noSolapan = ult.dia >= dIni + 2 * V - 1;
  if (primeros.length >= PESO_MIN_REGISTROS && ultimos.length >= PESO_MIN_REGISTROS && noSolapan) {
    const mi = mediaDe(primeros), mf = mediaDe(ultimos), dif = mf - mi;
    L.push("**" + (Math.abs(dif) < 0.05 ? "Sin cambio" : dif > 0 ? "Has ganado " + pesoTxt(dif) : "Has perdido " + pesoTxt(-dif)) +
      "** desde el " + ddmm(inicio) + " · media de tus primeros " + V + " días " + pesoTxt(mi) +
      " → últimos " + V + " días " + pesoTxt(mf));
  } else {
    L.push("**Sin tendencia aún** · " + plural(P.length, "registro", "registros") +
      (P.length > 1 ? " en " + (ult.dia - numDia(P[0].fecha) + 1) + " días" : "") + " · último " + pesoTxt(ult.kg) + " (" + ddmm(ult.fecha) + ")");
  }
  if (!hayObjetivo) {
    L.push(ERRORES_CONFIG.some((x) => x.archivo === ARCHIVO_PESO && x.linea.indexOf("objetivo::") === 0)
      ? "Tu `objetivo::` no es válido (el motivo está en Calidad de los datos): la gráfica va sin colores."
      : "Sin `objetivo::` en [[" + ARCHIVO_PESO + "|peso-corporal]]: la gráfica va sin colores.");
  } else if (!faseHoy) {
    L.push("Objetivo desde el " + ddmm(PESO.fases[0].desde));
  } else if (faseHoy.tipo === "mantener") {
    const ref = A.refDe.get(faseHoy);
    L.push(ref.media == null || ult.dia < ref.fin || ult.media == null
      ? "Objetivo **mantener** · referencia " + ref.n + "/" + PESO_MIN_REGISTROS + " registros"
      : EMOJI_PESO[ult.color] + " Objetivo **mantener**: tu media de " + V + " días está a " + conSigno(ult.desvio, 1) +
        " kg de tu referencia (" + pesoTxt(ref.media) + "), " +
        (ult.color === "verde" ? "dentro" : "fuera") + " de la banda ±" + fmt(PESO_BANDA_MANTENER_KG, 1) + " kg.");
  } else if (ult.dir) {
    const texto = { verde: "a favor de tu objetivo", ambar: "estable: no avanza hacia tu objetivo", rojo: "en contra de tu objetivo" };
    L.push(EMOJI_PESO[ult.color] + " Objetivo **" + faseHoy.tipo + "** · ritmo actual " + conSigno(ult.ritmo, 2) +
      " kg/semana (" + ult.dir + "), " + texto[ult.color] + ".");
  } else {
    L.push("Objetivo **" + faseHoy.tipo + "** · sin color aún");
  }
  if (hayObjetivo)
    L.push("<small>🟢 a favor · 🟡 estable · 🔴 en contra · ⚪ sin datos" + (ok ? " · ┄ media " + V + " d" +
      (P.length > serie.length ? " · últimos " + PESO_DIAS_GRAFICA + " días" : "") : "") + "</small>");
  dv.paragraph(L.join("\n\n"));
}

// ══════════════════════════ CARGA ══════════════════════════
const SESIONES = leerSesiones();
const HOY = DT.now().startOf("day");

if (!SESIONES.length) {
  dv.paragraph("> [!warning] Sin datos\n> No se ha encontrado ningún log con `type: workout` en **" +
    CARPETA_LOGS + "**. Comprueba la carpeta en Ajustes → LiftOff → *Workout folder*.");
} else {

// Todas las series REALIZADAS (incluidas las de peso corporal, que cuentan para
// la distribución por grupo aunque no generen PR).
const TODAS = [];
for (const s of SESIONES) {
  for (const ex of s.ejercicios) {
    for (const st of ex.sets) {
      if (st.paraSeries) {
        NOMBRES.registrar(ex.nombre);
        TODAS.push({ st, ejercicio: ex.nombre, grupo: grupoDe(ex.nombre), dia: s.dia, ses: s });
      }
    }
  }
}

// ─── Agregado por ejercicio (nombres ya normalizados por canon) ───
const porEj = new Map();
for (const x of TODAS) {
  const k = canon(x.ejercicio);
  let e = porEj.get(k);
  if (!e) {
    e = { nombre: NOMBRES.resolver(x.ejercicio), grupo: x.grupo, ser: 0, serSinPeso: 0, vol: 0,
          unilateral: UNILATERALES.set.has(k), pesoMax: null, rmMax: null, sesiones: new Map() };
    porEj.set(k, e);
  }
  e.ser += 1;
  e.vol += x.st.volumen;
  if (!x.st.paraPR) { e.serSinPeso += 1; continue; }   // sin peso: no genera PR
  if (!e.pesoMax || x.st.peso > e.pesoMax.st.peso ||
      (x.st.peso === e.pesoMax.st.peso && x.st.reps > e.pesoMax.st.reps)) e.pesoMax = x;
  if (!e.rmMax || x.st.oneRM > e.rmMax.st.oneRM) e.rmMax = x;
  if (x.dia) {
    const ks = x.dia.toFormat("yyyy-MM-dd");
    const s = e.sesiones.get(ks) || { dia: x.dia, mejorRM: 0, mejorRMReps: 0, vol: 0, ser: 0 };
    if (x.st.oneRM > s.mejorRM) { s.mejorRM = x.st.oneRM; s.mejorRMReps = x.st.reps; }
    s.vol += x.st.volumen; s.ser += 1;
    e.sesiones.set(ks, s);
  }
}
const EJERCICIOS = Array.from(porEj.values());
// hist SÓLO con sesiones que tienen algún peso registrado: si no, un día de
// dominadas a peso corporal entraría con 1RM 0 y parecería un retroceso.
EJERCICIOS.forEach((e) => {
  e.hist = Array.from(e.sesiones.values()).sort((a, b) => a.dia.toMillis() - b.dia.toMillis());
});

// Sparkline de los últimos CHISPA_REGISTROS 1RM de sesión. Siempre ocupa el mismo
// número de caracteres (relleno con ·) para que los nombres queden alineados.
function chispaDe(e) {
  const v = e.hist.slice(-CHISPA_REGISTROS).map((h) => h.mejorRM);
  while (v.length < CHISPA_REGISTROS) v.unshift(null);
  return chispa(v, CHISPA_RANGO_MIN) || "·".repeat(CHISPA_REGISTROS);
}

// ─── Fiabilidad del 1RM estimado ───
// Epley se degrada por encima de ~10-12 reps: es una propiedad del modelo, no del
// ejercicio. No tocamos el cálculo, sólo marcamos el número como menos fiable.
const pocoFiable = (reps) => Number(reps) > REPS_UMBRAL_FIABILIDAD_1RM;
const MARCA_1RM = "≈";
const notaFiabilidad = (reps) => pocoFiable(reps)
  ? MARCA_1RM + " estimación menos fiable: " + reps + " reps (Epley pierde precisión por encima de " +
    REPS_UMBRAL_FIABILIDAD_1RM + ")"
  : null;

// ─── Flecha de tendencia: PISTA VISUAL, no estadística (README §6) ───
// Pendiente por mínimos cuadrados de los 3 últimos 1RM de sesión, con x = 0,1,2
// (registros, no días), expresada en % del 1RM medio por registro. Con 3 puntos
// equiespaciados esa pendiente se reduce a (último − primero) / 2: el del medio NO
// influye. Tres puntos con el ruido de Epley no son una medida robusta; la flecha
// sólo resume a ojo lo que ya dice el sparkline.
function tendencia(hist) {
  if (!hist || hist.length < 3) return null;
  const y = hist.slice(-3).map((h) => h.mejorRM);
  const n = y.length, mx = (n - 1) / 2;
  const my = y.reduce((a, v) => a + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (i - mx) * (y[i] - my); den += (i - mx) * (i - mx); }
  if (!(my > 0) || !(den > 0)) return null;
  const pct = (num / den / my) * 100;
  const a = Math.abs(pct);
  const flecha = a < FLECHA_PLANA_PCT ? "→"
    : a < FLECHA_FUERTE_PCT ? (pct > 0 ? "↗" : "↘")
    : (pct > 0 ? "↑" : "↓");
  return { flecha, pct };
}
const textoTendencia = (t) => t
  ? t.flecha + " " + (t.pct >= 0 ? "+" : "") + fmt(t.pct, 1) + " %/registro en los 3 últimos"
  : "";

// ─── Diagnóstico de estancamiento ───
const ORDEN = { "🔴 Retrocediendo": 0, "🟡 Estancado": 1, "⏳ Sin PR reciente": 2,
                "🛌 En deload": 2.4, "🎯 Fuera de foco": 2.6,
                "🟢 Progresando": 3, "💤 Inactivo": 4, "⚪ Sin datos": 5, "⚪ Sin peso": 6 };
// Bloques (README §12): las sesiones hechas mientras un bloque PROTEGÍA al grupo del
// ejercicio (deload, o especialización que lo deja fuera de su objetivo) se conservan
// como dato —PRs, volumen, gráficas, calendario— pero NO son punto de comparación
// del semáforo ni de la flecha. Tampoco cuentan como "días sin PR". Y mientras HOY
// esté dentro de un bloque que protege al grupo, 🔴/🟡 se sustituyen por un estado
// neutro. Sin bloques declarados, todo esto es inerte y el semáforo es el de siempre.
const diagnostico = EJERCICIOS.map((e) => {
  if (!e.hist.length)
    return { e, estado: "⚪ Sin peso", detalle: "sólo series sin peso registrado", nSes: 0, diasSinPR: null };
  const h = e.hist.filter((x) => !bloqueProtector(e.grupo, x.dia));
  const excluidas = e.hist.length - h.length;
  const notaExcl = excluidas
    ? " · " + excluidas + " ses. en bloque sin comparar" : "";
  if (!h.length)
    return { e, estado: "⚪ Sin datos", nSes: 0, diasSinPR: null,
             detalle: "todas sus sesiones (" + excluidas + ") están en bloques protegidos" };
  const nSes = h.length;
  // inactividad sobre el historial COMPLETO: una sesión de deload también es entrenar
  const diasInactivo = Math.floor(HOY.diff(e.hist[e.hist.length - 1].dia, "days").days);
  const mejorGlobal = Math.max.apply(null, h.map((x) => x.mejorRM));
  const primeroMax = h.filter((x) => x.mejorRM >= mejorGlobal - 1e-9)[0];
  const diasSinPR = Math.floor(HOY.diff(primeroMax.dia, "days").days) -
                    diasProtegidos(e.grupo, primeroMax.dia, HOY);
  let estado, detalle;
  if (nSes < MIN_SESIONES_VEREDICTO) {
    estado = "⚪ Sin datos";
    detalle = nSes + " de " + MIN_SESIONES_VEREDICTO + " sesiones necesarias";
  } else {
    const rec = h.slice(-VENTANA_SESIONES), ant = h.slice(0, -VENTANA_SESIONES);
    const rmRec = Math.max.apply(null, rec.map((x) => x.mejorRM));
    const rmAnt = ant.length ? Math.max.apply(null, ant.map((x) => x.mejorRM)) : 0;
    // si alguno de los dos extremos sale de una serie larga, el veredicto se apoya
    // en una estimación floja y hay que decirlo
    const flojo = rec.concat(ant).filter((x) => (x.mejorRM === rmRec || x.mejorRM === rmAnt) &&
                                                 pocoFiable(x.mejorRMReps)).length > 0;
    detalle = (flojo ? MARCA_1RM + " " : "") + "RM_rec " + fmt(rmRec, 1) + " vs RM_ant " +
              fmt(rmAnt, 1) + " kg · " + diasSinPR + " d sin PR";
    if (diasInactivo > DIAS_INACTIVO) { estado = "💤 Inactivo"; detalle = "sin entrenar hace " + diasInactivo + " días"; }
    else if (rmRec > rmAnt) estado = "🟢 Progresando";
    else if (rmRec < rmAnt * UMBRAL_RETROCESO) estado = "🔴 Retrocediendo";
    else if (diasSinPR >= DIAS_ESTANCADO) estado = "🟡 Estancado";
    else estado = "⏳ Sin PR reciente";
  }
  detalle += notaExcl;
  // Hoy dentro de un bloque que protege al grupo: no se emite alarma de retroceso
  const hoyProt = bloqueProtector(e.grupo, HOY);
  if (hoyProt && (estado === "🔴 Retrocediendo" || estado === "🟡 Estancado")) {
    detalle = "sería " + estado.replace(/^\S+\s/, "").toLowerCase() + "; «" + hoyProt.tipo + "» hasta " +
              ddmm(hoyProt.fin) + (hoyProt.esDeload ? "" : ", fuera de su objetivo") + ": no se juzga · " + detalle;
    estado = hoyProt.esDeload ? "🛌 En deload" : "🎯 Fuera de foco";
  }
  // la flecha no se calcula para 💤: una tendencia de hace más de un mes no es "tendencia"
  const tend = estado === "💤 Inactivo" ? null : tendencia(h);
  return { e, estado, detalle, nSes, diasSinPR, tend, flecha: tend ? tend.flecha : "" };
});
//   = espacio no separable: en una celda estrecha la flecha no cae sola a otra línea
const estadoConFlecha = (d) => d.estado + (d.flecha ? " " + d.flecha : "");

// ─── Asistente de doble progresión (README §18) ───
// Para cada ejercicio con rango en ARCHIVO_OBJETIVOS se evalúa SU ÚLTIMA SESIÓN, sólo con
// series working/failure (las mismas que el resto del sistema). Las series objetivo
// salen del targetSets de la plantilla de ESA sesión; si la plantilla no existe o no
// incluye el ejercicio, no se exige un número de series. En unilaterales, reps por lado.
//   ⬆ Sube carga      todas las series con el peso máximo llegan al tope y son ≥ targetSets
//                     (modo top: basta con que la serie más pesada llegue al tope)
//   → Mantén          lo demás, dentro del rango
//   ⚠ Por debajo      la primera serie de trabajo no llega al mínimo del rango
// Y dos avisos que se suman al estado: ⚠ Pocas series (hechas < targetSets) y pirámide
// descendente (el peso baja entre series; en modo top no aplica).
const ESTADO_PROG = { sube: "⬆ Sube carga", "mantén": "→ Mantén", debajo: "⚠ Por debajo del rango" };
const ORDEN_PROG = { sube: 0, debajo: 1, "mantén": 2 };
function evaluarProgresion(k, obj) {
  let ses = null, work = [], unilateral = false;
  for (const s of SESIONES) {                       // SESIONES va de la más reciente a la más antigua
    const w = [];
    for (const ex of s.ejercicios) {
      if (canon(ex.nombre) !== k) continue;
      unilateral = ex.unilateral;
      for (const st of ex.sets) if (st.paraSeries && st.tipoEj !== "duration") w.push(st);
    }
    if (w.length) { ses = s; work = w; break; }
  }
  if (!ses) return { k, obj, sinDatos: true };
  const plantilla = PLANTILLAS.get(canon(ses.plantilla));
  const target = plantilla && plantilla.porEj.has(k) ? plantilla.porEj.get(k) : null;
  const pesoMax = Math.max.apply(null, work.map((st) => st.peso));
  const enMax = work.filter((st) => st.peso === pesoMax);
  const topSet = enMax[0];
  const alTope = (st) => st.reps >= obj.max;
  let clave;
  if (work[0].reps < obj.min) clave = "debajo";
  else if (obj.top ? alTope(topSet)
           : enMax.every(alTope) && enMax.length >= (target != null ? target : work.length)) clave = "sube";
  else clave = "mantén";
  let piramide = false;
  if (!obj.top) for (let i = 1; i < work.length; i++) if (work[i].peso < work[i - 1].peso) piramide = true;
  return { k, obj, ses, work, unilateral, target, pesoMax, clave, estado: ESTADO_PROG[clave], piramide,
           pocas: target != null && work.length < target, sinPlantilla: !plantilla };
}
const PROGRESION = Array.from(OBJETIVOS.mapa.entries()).map((par) => evaluarProgresion(par[0], par[1]));
// ─── Presentación de la doble progresión (consulta y "Hoy toca") ───
const kgCorto = (kg) => fmt(kg, Number.isInteger(kg) ? 0 : 1);   // 60 · 17,5 (sin ",0": cabe mejor en el móvil)
const rangoTxt = (p) => p.obj.min + "–" + p.obj.max + (p.unilateral ? "/lado" : "") + (p.obj.top ? " · top" : "");
function avisosProgresion(p) {
  const a = [];
  if (p.pocas) a.push("⚠ Pocas series: " + p.work.length + " de " + p.target);
  if (p.piramide) a.push("pesos distintos · cuenta el máximo");
  if (p.clave === "mantén" && !p.obj.top) {
    const enMax = p.work.filter((st) => st.peso === p.pesoMax);
    const alTope = enMax.filter((st) => st.reps >= p.obj.max).length;
    a.push(alTope === enMax.length
      ? "todas las de " + kgCorto(p.pesoMax) + " kg al tope, pero son " + enMax.length + " de " +
        (p.target != null ? p.target : p.work.length) + " series"
      : alTope + " de " + enMax.length + " con " + kgCorto(p.pesoMax) + " kg al tope");
  }
  if (p.sinPlantilla) a.push("sin plantilla «" + p.ses.plantilla + "»");
  return a;
}
// Incremento para la "próxima vez" y de dónde sale (README §18), por orden:
//   1. `+N` propio en objetivos · 2. tipo declarado en la línea · 3. tipo deducido del
//   nombre · 4. ÚLTIMO RECURSO: el salto más pequeño que has usado en este ejercicio.
function pasoMinimo(k) {
  const pesos = [];
  for (const s of SESIONES) for (const ex of s.ejercicios)
    if (canon(ex.nombre) === k) for (const st of ex.sets) if (st.paraPR && pesos.indexOf(st.peso) < 0) pesos.push(st.peso);
  pesos.sort((a, b) => a - b);
  let paso = null;
  for (let i = 1; i < pesos.length; i++) { const d = Math.round((pesos[i] - pesos[i - 1]) * 100) / 100; if (d > 0 && (paso == null || d < paso)) paso = d; }
  return paso;
}
function incrementoDe(p) {
  // `origen`, como etiqueta corta (README §18): «propio», el material o «salto mínimo»
  if (p.obj.inc != null) return { kg: p.obj.inc, origen: "propio" };
  if (p.obj.tipo) return { kg: p.obj.tipo.kg, origen: p.obj.tipo.tipo };
  const k = canon(p.obj.nombre);
  for (const ti of OBJETIVOS.tipos)
    if (k.indexOf(ti.k) >= 0) return { kg: ti.kg, origen: ti.tipo };
  const paso = pasoMinimo(p.k);
  if (paso) return { kg: paso, origen: "salto mínimo", flojo: true };
  return null;
}
function proximaVez(p) {
  const kg = kgCorto(p.pesoMax), inc = incrementoDe(p);
  const rep = (n) => n + " reps" + (p.unilateral ? "/lado" : "");
  const series = p.target != null ? p.target : p.work.length;
  const sinInc = " (sin incremento en objetivos)";
  if (p.clave === "sube")
    return "sube de " + kg + " kg " + (inc ? "a " + kgCorto(p.pesoMax + inc.kg) + " kg (+" + kgCorto(inc.kg) + " · " + inc.origen + ")"
      : "al siguiente peso que tengas" + sinInc) + " · desde " + rep(p.obj.min);
  if (p.clave === "debajo")
    return "baja de " + kg + " kg" + (inc && p.pesoMax - inc.kg > 0 ? " a " + kgCorto(p.pesoMax - inc.kg) +
      " kg (−" + kgCorto(inc.kg) + " · " + inc.origen + ")" : "") + ", hasta que la primera serie llegue a " + rep(p.obj.min) + ".";
  return "repite " + kg + " kg" + (p.obj.top ? " en la serie pesada hasta llegar a " + rep(p.obj.max) + "."
    : " en " + series + " series, hasta que todas lleguen a " + rep(p.obj.max) + ".");
}
const progresionDe = (nombre) => PROGRESION.filter((p) => p.k === canon(nombre) && !p.sinDatos)[0] || null;

// ─── Ligas (README §23) ───
// Carga comparada = el mejor 1RM estimado de las últimas `semanas-carga` semanas × el factor
// del ejercicio, sólo con series de trabajo (working/failure con peso) dentro de su rango de
// objetivos, fuera de los deload que protegen a su grupo y con un peso corporal registrado
// en o antes de ese día. Mismo Epley que el resto; en unilaterales, reps por lado. Se compara
// con el estándar de Strength Level interpolado a tu peso de ESE día. No toca ningún cálculo
// anterior: sólo lee SESIONES, TODAS, OBJETIVOS, PESO y BLOQUES.
const LIGAS_OK = LIGAS_CFG.ok && ESTANDARES.existe && ESTANDARES.mapa.size > 0 && PESO.registros.length > 0;
const LIGA = (function () {
  const out = { ok: LIGAS_OK, ejercicios: new Map(), grupos: new Map(), general: null, cambios: [], fueraDeTabla: [] };
  if (!LIGAS_OK) return out;
  const C = LIGAS_CFG, L = C.lista;
  const PCT = [5, 20, 50, 80, 95];                       // Beginner … Elite, por definición de Strength Level
  // Estándar a un peso corporal: interpolación lineal entre filas; fuera de la tabla, la fila del extremo
  const nivelesEn = (tabla, pc) => {
    const f = tabla.filas;
    if (pc <= f[0].pc) return f[0].niveles;
    if (pc >= f[f.length - 1].pc) return f[f.length - 1].niveles;
    for (let i = 1; i < f.length; i++)
      if (pc <= f[i].pc) {
        const u = (pc - f[i - 1].pc) / (f[i].pc - f[i - 1].pc);
        return f[i].niveles.map((v, j) => f[i - 1].niveles[j] + (v - f[i - 1].niveles[j]) * u);
      }
    return f[f.length - 1].niveles;
  };
  // Carga → puntuación: lineal entre (0 kg, p0) y los cinco niveles; encima de Elite, extrapolado
  const puntuacion = (carga, niv) => {
    if (carga >= niv[4]) return 95 + ((carga / niv[4] - 1) / 0.1) * C.puntos;
    let x0 = 0, y0 = 0;
    for (let i = 0; i < 5; i++) {
      if (carga <= niv[i]) return y0 + ((PCT[i] - y0) * (carga - x0)) / (niv[i] - x0);
      x0 = niv[i]; y0 = PCT[i];
    }
    return 95;
  };
  const cargaDe = (sc, niv) => {                        // la inversa, para «te faltan X kg»
    if (sc >= 95) return niv[4] * (1 + ((sc - 95) / C.puntos) * 0.1);
    let x0 = 0, y0 = 0;
    for (let i = 0; i < 5; i++) {
      if (sc <= PCT[i]) return x0 + ((niv[i] - x0) * (sc - y0)) / (PCT[i] - y0);
      x0 = niv[i]; y0 = PCT[i];
    }
    return niv[4];
  };
  // Puntuación → liga y división. `ord` ordena de Madera III a Leyenda para comparar.
  const nivelDe = (sc) => {
    let i = 0;
    while (i < L.length - 1 && sc >= L[i].hasta) i++;
    const l = L[i], w = (l.hasta - l.desde) / l.ndiv;
    const d = l.ndiv === 1 ? 0 : Math.max(0, Math.min(l.ndiv - 1, Math.floor((sc - l.desde) / w)));
    const div = l.ndiv === 3 ? ["III", "II", "I"][d] : "";
    return { i, d, ord: i * 3 + d, liga: l.nombre, div, txt: l.nombre + (div ? " " + div : ""),
             desde: l.desde + d * w, hasta: l.ndiv === 1 ? l.hasta : l.desde + (d + 1) * w, insignia: Math.min(i + 1, 15),
             chevrones: l.ndiv === 3 ? d + 1 : 0 };
  };
  out.nivelDe = nivelDe;
  out.pct = (sc) => sc <= 95 ? "≈ p" + Math.round(sc) : "Elite ×" + fmt(1 + ((sc - 95) / C.puntos) * 0.1, 2);

  // Candidatas de cada ejercicio con estándar, una vez: toda serie que podría contar
  const deloadEn = (dia, grupo) => bloquesActivos(dia).some((b) => b.esDeload && protege(b, canon(grupo)));
  const cand = new Map();
  for (const par of Array.from(ESTANDARES.mapa.entries())) {
    const k = par[0], m = par[1], obj = OBJETIVOS.mapa.get(k);
    const nombre = NOMBRES.resolver(m.nombre), grupo = grupoDe(m.nombre);
    const e = { k, m, obj, nombre, grupo, series: [], motivo: null, tabla: m.sinEstandar ? null : ESTANDARES.tablas.get(canon(m.slug)) || null };
    if (m.sinEstandar) e.motivo = "sin estándar razonable (estandares)";
    else if (!e.tabla) e.motivo = "falta la tabla «" + m.slug + "» en estandares";
    else if (!obj) e.motivo = "sin rango en objetivos: la liga sólo cuenta series dentro de tu rango";
    else
      for (const s of SESIONES) {
        if (!s.dia) continue;
        for (const ex of s.ejercicios) {
          if (canon(ex.nombre) !== k) continue;
          for (const st of ex.sets) {
            if (!st.paraPR || st.reps < obj.min || (st.reps > obj.max && st.reps > LIGA_REPS_MAX)) continue;
            e.series.push({ st, s, nd: numDia(isoDe(s.dia)), pc: pesoEn(s.dia), deload: deloadEn(s.dia, grupo) });
          }
        }
      }
    cand.set(k, e);
  }
  // Estado crudo de un ejercicio en la fecha nd (ventana (nd − semanas, nd])
  const crudo = (e, nd) => {
    let mejor = null, sinPeso = 0;
    for (const c of e.series) {
      if (c.nd > nd || c.nd <= nd - C.semCarga * 7 || c.deload) continue;
      if (!c.pc) { sinPeso++; continue; }
      if (!mejor || c.st.oneRM > mejor.st.oneRM) mejor = c;
    }
    if (!mejor) return { sc: null, sinPeso };
    const niv = nivelesEn(e.tabla, mejor.pc.kg), carga = mejor.st.oneRM * e.m.factor;
    return { sc: puntuacion(carga, niv), mejor, niv, carga };
  };
  const seriesEn = (k, nd) => TODAS.filter((x) => x.dia && canon(x.ejercicio) === k &&
    numDia(isoDe(x.dia)) <= nd && numDia(isoDe(x.dia)) > nd - C.semSeries * 7).length;
  // Con margen: se sube en cuanto se llega; se baja sólo al caer más de `margen-descenso`
  // puntos por debajo del corte de la división en la que estabas.
  const conMargen = (puntos) => {
    let actual = null;
    return puntos.map((p) => {
      if (p.sc == null) actual = null;
      else {
        const raw = nivelDe(p.sc);
        if (!actual || raw.ord >= actual.ord || p.sc < actual.desde - C.margen) actual = raw;
      }
      return Object.assign({}, p, { nivel: actual });
    });
  };
  // Una comprobación por semana, el mismo día de la semana que hoy, desde MESES atrás
  // (o desde la primera sesión): basta para la semana anterior y el historial mensual.
  const ndHoy = numDia(isoDe(HOY));
  const primera = SESIONES.filter((s) => s.dia).map((s) => numDia(isoDe(s.dia))).reduce((a, b) => Math.min(a, b), ndHoy);
  const desde = Math.max(primera, numDia(isoDe(HOY.minus({ months: MESES }))) - 7);
  const cortes = [];
  for (let nd = ndHoy; nd >= desde - 7; nd -= 7) cortes.unshift(nd);
  // Ejercicios
  const porCorte = cortes.map(() => new Map());          // grupo → [{sc, peso}]
  for (const e of Array.from(cand.values())) {
    const linea = cortes.map((nd, i) => {
      const r = e.motivo ? { sc: null } : crudo(e, nd);
      if (r.sc != null && !e.m.aprox) {
        const peso = seriesEn(e.k, nd);
        if (peso > 0) {
          const g = porCorte[i].get(canon(e.grupo)) || { grupo: e.grupo, v: [] };
          g.v.push({ sc: r.sc, peso });
          porCorte[i].set(canon(e.grupo), g);
        }
      }
      return Object.assign({ nd }, r);
    });
    e.linea = conMargen(linea);
    e.hoy = e.linea[e.linea.length - 1];
    if (!e.motivo && e.hoy.sc == null)
      e.motivo = e.hoy.sinPeso ? "sus series en rango son de antes de tu primer peso corporal"
        : "sin series de " + e.obj.min + " reps o más (y como mucho " + Math.max(e.obj.max, LIGA_REPS_MAX) + ") en las últimas " + C.semCarga + " semanas";
    if (e.hoy.mejor && (e.hoy.mejor.pc.kg < e.tabla.filas[0].pc || e.hoy.mejor.pc.kg > e.tabla.filas[e.tabla.filas.length - 1].pc))
      out.fueraDeTabla.push(e.nombre);
    e.series4 = seriesEn(e.k, ndHoy);
    out.ejercicios.set(e.k, e);
  }
  // Grupos: media de las puntuaciones de sus ejercicios, ponderada por sus series de las
  // últimas `semanas-series` semanas. Los aproximados no cuentan. General: media de grupos.
  const gruposVistos = new Map();
  porCorte.forEach((m) => { for (const par of Array.from(m.entries())) gruposVistos.set(par[0], par[1].grupo); });
  const media = (v) => v.reduce((a, x) => a + x.sc * x.peso, 0) / v.reduce((a, x) => a + x.peso, 0);
  for (const par of Array.from(gruposVistos.entries())) {
    const linea = conMargen(cortes.map((nd, i) => {
      const g = porCorte[i].get(par[0]);
      return { nd, sc: g ? media(g.v) : null, n: g ? g.v.length : 0 };
    }));
    out.grupos.set(par[0], { k: par[0], grupo: par[1], linea, hoy: linea[linea.length - 1] });
  }
  const lineaGen = conMargen(cortes.map((nd, i) => {
    const v = Array.from(porCorte[i].values()).map((g) => media(g.v));
    return { nd, sc: v.length ? v.reduce((a, x) => a + x, 0) / v.length : null, n: v.length };
  }));
  out.general = { linea: lineaGen, hoy: lineaGen[lineaGen.length - 1] };
  // Ascensos y descensos frente a la semana anterior (sólo entre dos ligas: aparecer o
  // desaparecer no es ascender ni descender)
  const cambio = (tipo, nombre, linea, k) => {
    if (linea.length < 2) return;
    const a = linea[linea.length - 2].nivel, b = linea[linea.length - 1].nivel;
    if (!a || !b || a.ord === b.ord) return;
    out.cambios.push({ tipo, k, sube: b.ord > a.ord, nombre, nivel: b,
      txt: (b.ord > a.ord ? "🏆 Ascenso: " : "🔻 Descenso: ") + nombre + " → " + b.txt });
  };
  cambio("general", "Liga general", lineaGen, "");
  for (const g of Array.from(out.grupos.values())) cambio("grupo", g.grupo, g.linea, g.k);
  for (const e of Array.from(out.ejercicios.values())) cambio("ejercicio", e.nombre, e.linea, e.k);
  // Progreso dentro de la división y lo que falta para la siguiente
  out.progreso = (p) => {
    const n = p.nivel;
    if (!n || n.hasta === Infinity) return { frac: 1, siguiente: null };
    return { frac: Math.max(0, Math.min(1, (p.sc - n.desde) / (n.hasta - n.desde))), siguiente: nivelDe(n.hasta + 1e-9),
             retenido: p.sc < n.desde };
  };
  out.falta = (e) => {
    const p = e.hoy, pr = out.progreso(p);
    if (!pr.siguiente || !p.mejor) return null;
    const rmObj = cargaDe(Math.max(p.nivel.hasta, p.sc), p.niv) / e.m.factor;
    const reps = p.mejor.st.reps;
    return { siguiente: pr.siguiente, kg: rmObj - p.mejor.st.oneRM, reps,
             mas: rmObj / (reps === 1 ? 1 : 1 + reps / 30) - p.mejor.st.peso };
  };
  // Nivel a final de cada mes (la última comprobación semanal de ese mes)
  // Texto de lo que falta, común a la consulta y a la sección de ligas
  out.faltaTxt = (e) => {
    const fa = out.falta(e);
    if (!fa) return "máximo";
    const u = e.hoy.mejor.st.unilateral ? "/lado" : "";
    return "te faltan " + (fa.kg < 0.05 ? "menos de 0,1" : fmt(fa.kg, 1)) + " kg de 1RM" + (u ? " por lado" : "") + " para " + fa.siguiente.txt +
      " (≈ +" + (fa.mas < 0.05 ? "0,1" : fmt(fa.mas, 1)) + " kg × " + fa.reps + " reps" + u + ")";
  };
  out.faltaGrupoTxt = (p) => {
    const pr = out.progreso(p);
    if (!pr.siguiente) return "máximo";
    const n = p.nivel.hasta - p.sc;
    return "te faltan " + (n < 0.05 ? "menos de 0,1" : fmt(n, 1)) + " puntos de percentil para " + pr.siguiente.txt;
  };
  out.mensual = (linea, meses) => meses.map((m) => {
    const fin = Math.min(numDia(isoDe(m.endOf("month"))), ndHoy);
    let r = null;
    for (const p of linea) if (p.nd <= fin) r = p;
    return r && r.nivel ? r : null;
  });
  return out;
})();

// ─── Tarjeta de liga de un ejercicio (README §23) ───
// La usa el buscador de «Por ejercicio» (hasta el 2026-09-26, también la consulta): insignia
// de 96 px, liga, percentil, de dónde sale, progreso a la siguiente división e historial
// mensual (los mismos meses que la consulta).
const MESES_LIGA = [];
for (let i = MESES - 1; i >= 0; i--) MESES_LIGA.push(HOY.minus({ months: i }));
// «factor 2 × polea 1,4», «polea 1,4» o «factor 0,85»: de dónde sale el factor efectivo
const factorTxt = (m) => m.polea && ESTANDARES.correccionPolea !== 1
  ? (m.factorBase !== 1 ? "factor " + fmt(m.factorBase, 2) + " × " : "") + "polea " + fmt(ESTANDARES.correccionPolea, 2)
  : "factor " + fmt(m.factor, 2);
function tarjetaLigaEn(cont, e) {
  if (!e.hoy.nivel) { textoSec(cont, "Sin liga: " + e.motivo + "."); return; }
  const p = e.hoy, st = p.mejor.st, c = tarjeta(cont);
  c.addClass("gd-liga-tarjeta");
  c.style.setProperty("--liga", COLOR_LIGA[p.nivel.insignia - 1]);
  const cab = estilo(c.createDiv(), { display: "flex", gap: "12px", alignItems: "center" });
  insigniaEn(cab, p.nivel, 96);
  const col = estilo(cab.createDiv(), { minWidth: "0" });
  estilo(col.createDiv(), { fontSize: "1.4em", fontWeight: "700", lineHeight: "1.2" }).textContent = p.nivel.txt;
  textoSec(col, p.sc <= 95 ? "percentil ≈ " + Math.round(p.sc) : LIGA.pct(p.sc) + " · extrapolado");
  if (e.m.aprox) textoSec(col, MARCA_1RM + " estándar aproximado: no cuenta en la liga de " + e.grupo);
  textoSec(c, "1RM " + (pocoFiable(st.reps) ? MARCA_1RM + " " : "") + fmt(st.oneRM, 1) + " kg" +
    (e.m.factor !== 1 ? " × " + factorTxt(e.m) + " = " + fmt(p.carga, 1) + " kg" : "") +
    " · " + kgCorto(st.peso) + "×" + repsTxt(st.reps, st.unilateral) + " el " + p.mejor.s.dia.toFormat("dd/MM/yy"),
    { margin: "8px 0 0 0" });
  textoSec(c, "Estándar «" + e.m.slug + "» a " + fmt(p.mejor.pc.kg, 1) + " kg de peso corporal: " +
    p.niv.map((v) => fmt(v, 0)).join(" · ") + " kg (Beginner → Elite)");
  const pr = LIGA.progreso(p), fa = LIGA.falta(e);
  barraEn(c, pr.frac, COLOR_LIGA[p.nivel.insignia - 1]);
  if (pr.retenido) textoSec(c, "bajo el corte de " + p.nivel.txt + " · la mantienes");
  textoSec(c, fa ? LIGA.faltaTxt(e).replace(/^t/, "T") : "Liga máxima.");
  const hist = LIGA.mensual(e.linea, MESES_LIGA);
  if (hist.some(Boolean)) {
    textoSec(c, "Historial de ligas", { margin: "10px 0 4px 0", fontWeight: "600" });
    const fila = estilo(c.createDiv(), { display: "flex", flexWrap: "wrap", gap: "8px" });
    MESES_LIGA.forEach((m, i) => {
      if (!hist[i]) return;
      const celda = estilo(fila.createDiv(), { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" });
      insigniaEn(celda, hist[i].nivel, 32);
      textoSec(celda, m.toFormat("MM/yy"), { fontSize: "0.75em" });
    });
  }
}

// ─── Semanas y meses de referencia ───
const deSemana = (ref) => {
  const k = claveSemana(ref);
  return SESIONES.filter((s) => s.dia && claveSemana(s.dia) === k);
};
const sumVol = (ss) => ss.reduce((a, s) => a + s.volumen, 0);
const sumSer = (ss) => ss.reduce((a, s) => a + s.series, 0);
const semanas = [];
for (let i = SEMANAS - 1; i >= 0; i--) {
  const ref = HOY.minus({ weeks: i });
  const ss = deSemana(ref);
  semanas.push({ clave: claveSemana(ref), etiqueta: lunesDe(ref).toFormat("dd/MM"),
                 vol: sumVol(ss), ser: sumSer(ss), n: ss.length });
}

// ══════════════════════════ 1. RESUMEN ══════════════════════════
const act = deSemana(HOY), prev = deSemana(HOY.minus({ weeks: 1 }));
const fiables = SESIONES.filter((s) => s.dur.fiable);
const mediaDur = fiables.length ? fiables.reduce((a, s) => a + s.dur.min, 0) / fiables.length : null;
const ultima = SESIONES[0];
let delta = "—";
if (sumVol(prev) > 0) {
  const pct = ((sumVol(act) - sumVol(prev)) / sumVol(prev)) * 100;
  delta = (pct >= 0 ? "▲ +" : "▼ ") + fmt(pct, 1) + " %";
} else if (sumVol(act) > 0) delta = "▲ primera semana con datos";

// ══════════════════════════ 0. HOY TOCA (README §12 y §22) ══════════════════════════
// Lo primero del dashboard: es lo que se mira en el gimnasio. Tarjeta propia (antes, un
// callout) con la rutina en grande, el estado como etiqueta y los ⬆ de la doble
// progresión (README §18) como etiquetas, con el peso de ahora y el de la próxima vez.
const HORARIO = leerHorario();
if (HORARIO.existe && HORARIO.mapa.size) {
  const diaHoy = HOY.weekday;                       // 1 = lunes … 7 = domingo
  const esperado = HORARIO.mapa.get(diaHoy);
  if (esperado) {
    const nombreDia = DIAS_SEMANA[diaHoy];
    const logsHoy = SESIONES.filter((s) => s.dia && s.dia.toFormat("yyyy-MM-dd") === HOY.toFormat("yyyy-MM-dd"));
    const descanso = esDescanso(esperado);
    const coincide = logsHoy.filter((s) => canon(s.plantilla) === canon(esperado));
    // descanso · pendiente · hecho · otra rutina (cambiar de rutina no es un error: tono neutro)
    const estadoHoy = descanso ? "descanso" : !logsHoy.length ? "pendiente" : coincide.length ? "hecho" : "otra";
    // Color de la rutina: el del grupo con más series en su plantilla (README §25)
    const pl = PLANTILLAS.get(canon(esperado));
    const porG = new Map();
    if (pl) for (const e of pl.ejercicios) porG.set(grupoDe(e.nombre), (porG.get(grupoDe(e.nombre)) || 0) + e.target);
    const gHoy = Array.from(porG.entries()).sort((a, b) => b[1] - a[1])[0];
    const colHoy = descanso || !gHoy ? CSSV("--interactive-accent") : colorGrupo(gHoy[0]);
    const c = tarjeta(dv.container, { borderLeft: "4px solid " + (estadoHoy === "hecho" ? CSSV("--color-green") : colHoy),
                                      padding: "12px 14px", margin: "4px 0 12px 0" });
    c.addClass("gd-hoy");
    c.style.setProperty("--c", colHoy);
    const fila = estilo(c.createDiv({ cls: "gd-hoy-fila" }), { display: "flex", alignItems: "center", gap: "12px" });
    const izq = estilo(fila.createDiv(), { flex: "1 1 auto", minWidth: "0" });
    textoSec(izq, "Hoy toca · " + nombreDia + " " + HOY.toFormat("dd/MM"), { fontSize: "0.9em" });
    estilo(izq.createDiv({ cls: "gd-hoy-rutina" }), { fontSize: "1.35em", fontWeight: "700", lineHeight: "1.25", margin: "4px 0 6px 0",
                            overflowWrap: "anywhere" }).textContent = descanso ? "Descanso" : esperado;
    const chips = estilo(izq.createDiv({ cls: "gd-chips" }), { display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" });
    etiqueta(chips, { descanso: "descanso", pendiente: "pendiente", hecho: "✓ hecho", otra: "otra rutina" }[estadoHoy],
             estadoHoy === "hecho" ? "verde" : estadoHoy === "pendiente" ? "acento" : "neutro");
    // Anillo: series de hoy frente a las de la plantilla
    if (!descanso && pl) {
      const objetivo = pl.ejercicios.reduce((a, e) => a + e.target, 0);
      const hechas = sumSer(coincide.length ? coincide : logsHoy);
      const centro = anilloEn(fila, 80, 8, objetivo ? hechas / objetivo : 0, 0, colHoy);
      estilo(centro.createDiv({ cls: "gd-num-m" }), { fontSize: "1.35em", fontWeight: "700", fontVariantNumeric: "tabular-nums" }).textContent = hechas;
      textoSec(centro, "/ " + objetivo, { fontSize: "0.8em" });
    }
    if (descanso && logsHoy.length) textoSec(c, "Has entrenado igualmente: " + logsHoy.map((s) => s.plantilla).join(", ") + ".");
    if (estadoHoy === "hecho" && coincide[0].series)
      textoSec(c, coincide[0].series + " series · " + fmt(coincide[0].volumen) + " kg");
    if (estadoHoy === "otra")
      textoSec(c, "Hiciste " + logsHoy.map((s) => s.plantilla).join(" y "));
    // ⬆ de la plantilla de hoy, como etiquetas. Sin plantilla o sin ninguno en ⬆, no se añade nada.
    const plSub = estadoHoy === "pendiente" || estadoHoy === "hecho" ? pl : null;
    const subidas = plSub ? plSub.ejercicios.map((e) => progresionDe(e.nombre)).filter((p) => p && p.clave === "sube") : [];
    if (subidas.length) {
      textoSec(c, estadoHoy === "hecho" ? "La próxima vez, sube carga" : "Toca subir carga",
               { margin: "10px 0 6px 0", fontWeight: "600" });
      const chipsSub = estilo(c.createDiv({ cls: "gd-chips" }), { display: "flex", flexWrap: "wrap", gap: "6px" });
      for (const p of subidas) {
        const inc = incrementoDe(p);
        const ch = estilo(chipsSub.createDiv({ cls: "gd-chip-sube" }), { background: CSSV("--interactive-accent"), color: CSSV("--text-on-accent"),
                                               borderRadius: "var(--gd-radio-s, 8px)", padding: "6px 10px", lineHeight: "1.3", minWidth: "0" });
        textoConIcono(estilo(ch.createDiv(), { fontWeight: "700" }), "⬆ " + p.obj.nombre, 14);
        estilo(ch.createDiv(), { fontSize: "0.85em", fontVariantNumeric: "tabular-nums" }).textContent =
          kgCorto(p.pesoMax) + " kg → " + (inc ? kgCorto(p.pesoMax + inc.kg) + " kg" : "siguiente peso");
      }
    }
    // Ligas (README §23): ascensos y descensos frente a la semana anterior, en letra pequeña.
    // Dos como mucho, primero los de la rutina de hoy; el resto, en la sección de ligas.
    if (LIGA.ok && LIGA.cambios.length) {
      const plHoy = PLANTILLAS.get(canon(esperado));
      const kHoy = new Set(plHoy ? plHoy.ejercicios.map((e) => canon(e.nombre)) : []);
      const orden = LIGA.cambios.slice().sort((a, b) => (kHoy.has(b.k) ? 1 : 0) - (kHoy.has(a.k) ? 1 : 0));
      const lin = estilo(c.createDiv({ cls: "gd-hoy-cambios" }), { margin: "10px 0 0 0", paddingTop: "6px", borderTop: BORDE });
      for (const x of orden.slice(0, 2)) textoConIcono(textoSec(lin, ""), x.txt, 14);
      if (orden.length > 2) textoSec(lin, "y " + (orden.length - 2) + " más en Ligas", { fontSize: "0.8em" });
    }
  }
}
// Cifras clave (README §25): series de la semana, racha, liga general y peso. El contenedor
// va aquí, bajo «Hoy toca»; se rellena más abajo, cuando ya está calculada la racha.
const KPIS = estilo(dv.container.createDiv({ cls: "gd-kpis" }), { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                                                  gap: "8px", margin: "0 0 12px 0" });

// ══════════════════ 7-9. CONSULTA POR EJERCICIO O GRUPO ══════════════════
// Plegable como el resto (README §22). El subtítulo dice qué hay elegido y su estado de
// doble progresión: "Press plano máquina · ⬆", "Pecho · 1 ⬆", o "elige ejercicio o grupo".
plegable("consulta", "🔎 Consulta", "", function (cuerpoConsulta, detConsulta) {
function resumenConsulta(valor) {
  let txt = "elige ejercicio o grupo";
  if (valor) {
    const k = valor.slice(3);
    if (valor.indexOf("gr:") === 0) {
      const e = EJERCICIOS.filter((x) => canon(x.grupo) === k)[0];
      const suben = PROGRESION.filter((p) => !p.sinDatos && p.clave === "sube" && canon(grupoDe(p.obj.nombre)) === k).length;
      txt = (e ? e.grupo : k) + (suben ? " · " + suben + " ⬆" : "");
    } else {
      const e = EJERCICIOS.filter((x) => canon(x.nombre) === k)[0];
      const p = PROGRESION.filter((x) => x.k === k && !x.sinDatos)[0];
      txt = (e ? e.nombre : k) + (p ? " · " + p.estado.split(" ")[0] : "");
    }
  }
  detConsulta.resumenEl.textContent = txt;
}
// Un ÚNICO selector gobierna las tres secciones (PRs, progreso mensual y
// estancamiento): las tres responden a la pregunta "¿cómo voy en esto?", así
// que tener tres desplegables sincronizándose sería peor. Por defecto no se
// muestra nada: primero eliges, después ves.

// ─── Opciones generadas desde los datos reales (nunca hardcodeadas) ───
// Las claves usan canon(), así que "Press militar máquina" y "press militar maquina" son una
// sola entrada, igual que en el resto del sistema.
const gruposDatos = [];
const vistosG = new Set();
for (const x of TODAS) {
  const k = canon(x.grupo);
  if (!vistosG.has(k)) { vistosG.add(k); gruposDatos.push(x.grupo); }
}
gruposDatos.sort((a, b) => a.localeCompare(b));
const ejerOrden = EJERCICIOS.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
// Selector y «Limpiar» con el componente común (buscadorEn), con la clave de siempre
const buscador = buscadorEn(dv.container, {
  clave: "gym-dashboard-filtro", respaldo: "__GYM_FILTRO__", vacio: "— elige un ejercicio o un grupo —",
  grupos: [
    { etiqueta: "Grupos musculares (" + gruposDatos.length + ")",
      opciones: gruposDatos.map((g) => ({ valor: "gr:" + canon(g),
        texto: g + " · " + TODAS.filter((x) => canon(x.grupo) === canon(g)).length + " series" })) },
    // El sparkline va DELANTE del nombre: la rueda nativa de iOS recorta por el final
    // los textos largos, y detrás desaparecería justo en los nombres más largos.
    { etiqueta: "Ejercicios (" + ejerOrden.length + ")",
      opciones: ejerOrden.map((e) => ({ valor: "ej:" + canon(e.nombre), texto: chispaDe(e) + "  " + e.nombre + " · " + e.ser + " series" })) },
  ],
});
const salida = buscador.salida;

// ─── Render de las tres secciones para la selección actual ───
const meses = [];
for (let i = MESES - 1; i >= 0; i--) meses.push(HOY.minus({ months: i }));
const mejorDelMes = (e, m) => {
  const k = claveMes(m);
  let mejor = null;
  for (const h of e.hist) if (claveMes(h.dia) === k && (!mejor || h.mejorRM > mejor.mejorRM)) mejor = h;
  return mejor;
};
const serieDe = (e) => meses.map((m) => {
  const h = mejorDelMes(e, m);
  return h ? Math.round(h.mejorRM * 10) / 10 : null;
});
// IPF GL del mejor 1RM de cada mes, con el peso corporal vigente el día de esa sesión
const serieGLDe = (e) => meses.map((m) => {
  const h = mejorDelMes(e, m);
  const g = h ? glDe(h.mejorRM, h.dia) : null;
  return g == null ? null : Math.round(g * 10) / 10;
});
// reps con las que se consiguió el mejor 1RM de cada mes, para marcar fiabilidad
const serieRepsDe = (e) => meses.map((m) => {
  const h = mejorDelMes(e, m);
  return h ? h.mejorRMReps : null;
});

function pintar(valor) {
  salida.innerHTML = "";
  if (!valor) return;
  const esGrupo = valor.indexOf("gr:") === 0;
  const clave = valor.slice(3);
  const sel2 = esGrupo
    ? EJERCICIOS.filter((e) => canon(e.grupo) === clave)
    : EJERCICIOS.filter((e) => canon(e.nombre) === clave);

  if (!sel2.length) {
    calloutEn(salida, "warning", "Sin datos para esa selección", []);
    return;
  }
  const titulo = esGrupo
    ? "Grupo: " + sel2[0].grupo + " · " + plural(sel2.length, "ejercicio", "ejercicios") + ", " +
      sel2.reduce((a, e) => a + e.ser, 0) + " series"
    : sel2[0].nombre + " · " + sel2[0].grupo + " · " + sel2[0].ser + " series";
  const h = estilo(salida.createEl("h4", { cls: "gd-consulta-tit" }), { margin: "0.6em 0 0.3em 0" });
  estilo(h.createEl("span", { cls: "gd-punto" }), { display: "inline-block", width: "0.55em", height: "0.55em", borderRadius: "50%",
    background: colorGrupo(sel2[0].grupo), marginRight: "8px", verticalAlign: "0.1em" });
  h.appendChild(document.createTextNode(titulo));
  // Cuatro pestañas (README §25): Progresión · PRs · Gráficas · Estancamiento
  const PAN = pestanasEn(salida, "gym-dashboard-consulta-pestana", "__GYM_PESTANA__", [["progresion", "trending-up", "Progresión"],
    ["prs", "medal", "PRs"], ["graficas", "chart-spline", "Gráficas"], ["estancamiento", "gauge", "Estancamiento"]]);

  // ── 6. Doble progresión (README §18) ── pestaña «Progresión»
  // Lo primero de la consulta: es lo que se mira en el gimnasio. Un ejercicio: tarjeta con
  // su estado, "Próxima vez", última sesión y rango. Un grupo: lista compacta, ⬆ primero.
  { const salida = PAN.progresion;
  if (!OBJETIVOS.existe || !OBJETIVOS.mapa.size) textoSec(salida, "Sin objetivos: no hay doble progresión.");
  if (OBJETIVOS.existe && OBJETIVOS.mapa.size) {
    const colorProg = (p) => (!p || p.sinDatos ? null : CSSV(p.clave === "sube" ? "--interactive-accent"
      : p.clave === "debajo" ? "--color-orange" : "--background-modifier-border"));
    const seriesTxt = (p) => p.work.map((st) => kgCorto(st.peso) + "×" + repsTxt(st.reps, p.unilateral)).join(" · ");
    if (!esGrupo) {
      const p = PROGRESION.filter((x) => x.k === clave)[0];
      if (!p) textoSec(salida, "Sin rango en objetivos: añade una línea «" + sel2[0].nombre + ":: mín-máx» en objetivos para ver su doble progresión.");
      else if (p.sinDatos) textoSec(salida, "Rango " + rangoTxt(p) + ", pero aún sin sesiones con series de trabajo.");
      else {
        const c = tarjeta(salida, { borderLeft: "4px solid " + colorProg(p) });
        c.addClass("gd-prog-" + p.clave);
        textoConIcono(estilo(c.createDiv({ cls: "gd-num-s" }), { fontSize: "1.25em", fontWeight: "700", lineHeight: "1.3" }), p.estado, 18);
        for (const a of avisosProgresion(p)) textoSec(c, a);
        const prox = estilo(c.createDiv({ cls: "gd-proxima" }), { background: CSSV("--background-primary"), border: BORDE, borderRadius: "var(--gd-radio-s, 6px)",
                                             padding: "8px 10px", margin: "8px 0" });
        estilo(prox.createDiv(), { fontWeight: "700" }).textContent = "Próxima vez";
        prox.createDiv().textContent = proximaVez(p);
        const dato = (etq, valor, sec) => {
          const d = estilo(c.createDiv(), { margin: "6px 0 0 0" });
          textoSec(d, etq, { fontSize: "0.8em" });
          estilo(d.createDiv(), { fontVariantNumeric: "tabular-nums" }).textContent = valor;
          if (sec) textoSec(d, sec);
        };
        dato("Última sesión", seriesTxt(p), (p.ses.dia ? p.ses.dia.toFormat("dd/MM/yy") : "?") + " · " + p.ses.plantilla);
        dato("Rango", rangoTxt(p), p.target != null ? p.target + " series en la plantilla" : "sin series objetivo");
      }
    } else {
      // Ejercicios del grupo: los de la consulta y los de objetivos de ese grupo aún sin sesiones
      const vistos = new Set(), filas = [];
      const añade = (k, nombre) => {
        if (vistos.has(k)) return;
        vistos.add(k);
        const p = PROGRESION.filter((x) => x.k === k)[0] || null;
        filas.push({ nombre: p ? p.obj.nombre : nombre, p,
                     orden: !p ? 4 : p.sinDatos ? 3 : ORDEN_PROG[p.clave] });
      };
      for (const e of sel2) añade(canon(e.nombre), e.nombre);
      for (const o of Array.from(OBJETIVOS.mapa.values())) if (canon(grupoDe(o.nombre)) === clave) añade(canon(o.nombre), o.nombre);
      filas.sort((a, b) => (a.orden - b.orden) || (canon(a.nombre) < canon(b.nombre) ? -1 : 1));
      listaEn(salida, filas.map((f) => ({
        titulo: f.nombre, color: colorProg(f.p), fuerte: !!(f.p && f.p.clave === "sube"),
        derecha: !f.p ? "— sin rango" : f.p.sinDatos ? "⚪ sin sesiones" : f.p.estado,
        lineas: f.p && !f.p.sinDatos ? [seriesTxt(f.p) + " · rango " + rangoTxt(f.p)].concat(avisosProgresion(f.p)) : [],
      })));
    }
  }
  }

  // (La liga del ejercicio o del grupo no va aquí desde el 2026-09-26: está en 🏆 Ligas,
  // en «Por ejercicio» y «Por músculo». README §23.)

  // ── 7. PRs ── pestaña «PRs»
  { const salida = PAN.prs;
  const conPR = sel2.filter((e) => e.rmMax).sort((a, b) => b.rmMax.st.oneRM - a.rmMax.st.oneRM);
  const sinPR = sel2.filter((e) => !e.rmMax);
  if (conPR.length) {
    listaEn(salida, conPR.map((e) => ({
      titulo: e.nombre, fuerte: true, punto: colorGrupo(e.grupo),
      derecha: "1RM " + (pocoFiable(e.rmMax.st.reps) ? MARCA_1RM + " " : "") + fmt(e.rmMax.st.oneRM, 1) + " kg",
      lineas: [fmt(e.rmMax.st.peso, 1) + "×" + repsTxt(e.rmMax.st.reps, e.unilateral) +
                 (e.rmMax.dia ? " · " + e.rmMax.dia.toFormat("dd/MM/yy") : "") +
                 (pocoFiable(e.rmMax.st.reps) ? " · menos fiable" : ""),
               "Peso máx " + fmt(e.pesoMax.st.peso, 1) + " kg ×" + repsTxt(e.pesoMax.st.reps, e.unilateral) +
                 " · " + e.ser + " series",
               chispaDe(e) + " · " + e.grupo],
    })));
  }
  if (sinPR.length)
    calloutEn(salida, "note", sinPR.length + " sin PR de peso calculable",
      [sinPR.map((e) => e.nombre + " (" + e.ser + " series)").join(" · ")]);
  if (!conPR.length && !sinPR.length) textoSec(salida, "Sin PRs.");
  }

  // ── 8. Progreso mensual ── pestaña «Gráficas»
  { const salida = PAN.graficas;
  const h2 = salida.createEl("h5"); h2.textContent = "Progreso mensual · 1RM estimado";
  const conHist = sel2.filter((e) => e.hist.length).sort((a, b) => b.ser - a.ser);
  if (!conHist.length) {
    textoSec(salida, "Sin series con peso.");
  } else {
    const enGrafica = conHist.slice(0, MAX_SERIES_GRAFICA);
    // Un ejercicio solo, con el color de su grupo; varios, con la paleta del tema
    const colorLinea = (e, i) => (enGrafica.length === 1 ? colorGrupo(e.grupo) : PALETA[i % PALETA.length]);
    // La gráfica mensual, sólo a partir del segundo mes con datos (README §25): con uno, es una
    // barra suelta que no enseña nada. La lista de abajo sale siempre.
    const nMeses = meses.filter((m, i) => enGrafica.some((e) => serieDe(e)[i] != null)).length;
    // IPF GL como línea sólo con UN ejercicio: con varios, duplicar líneas haría la
    // gráfica ilegible en el móvil; para grupos va como dato secundario en la tabla.
    const glLinea = HAY_GL && enGrafica.length === 1 && serieGLDe(enGrafica[0]).some((v) => v != null);
    const opcProg = opcionesBase({ sinLeyenda: enGrafica.length === 1 && !glLinea });
    const ejeRM = ejeYDinamico([].concat.apply([], enGrafica.map(serieDe)));
    if (ejeRM) opcProg.scales.y = { min: ejeRM.min, max: ejeRM.max, beginAtZero: false,
      ticks: { font: { size: 11 }, includeBounds: false } };
    const ejeGL = glLinea ? ejeYDinamico(serieGLDe(enGrafica[0])) : null;
    if (glLinea) opcProg.scales.yGL = Object.assign({ position: "right", beginAtZero: false,
      grid: { drawOnChartArea: false }, ticks: { font: { size: 11 }, includeBounds: false } },
      ejeGL ? { min: ejeGL.min, max: ejeGL.max } : {});
    const ok = nMeses >= 2 && grafica({
      type: "line",
      data: {
        labels: meses.map((m) => m.toFormat("MM/yy")),
        datasets: enGrafica.map((e, i) => {
          const reps = serieRepsDe(e);
          return {
            label: e.nombre, data: serieDe(e),
            borderColor: colorLinea(e, i),
            backgroundColor: traslucido(colorLinea(e, i)),
            tension: 0.3, spanGaps: true, borderWidth: 2, fill: false,
            // triángulo (más grande) = mes cuyo mejor 1RM sale de una serie larga
            pointStyle: reps.map((r) => (pocoFiable(r) ? "triangle" : "circle")),
            pointRadius: reps.map((r) => (pocoFiable(r) ? 5 : 3)),
          };
        }).concat(glLinea ? [{
          label: "IPF GL (eje derecho)", data: serieGLDe(enGrafica[0]), yAxisID: "yGL",
          borderColor: PALETA[4], backgroundColor: traslucido(PALETA[4]),
          borderDash: [6, 4], tension: 0.3, spanGaps: true, borderWidth: 2, fill: false, pointRadius: 2,
        }] : []),
      },
      options: opcProg,
    }, 280, salida);
    if (!ok && nMeses >= 2)
      enGrafica.forEach((e, i) => {
        const s = serieDe(e), g = serieGLDe(e);
        let iu = -1;
        for (let k = 0; k < s.length; k++) if (s[k] != null) iu = k;
        // el GL del MISMO mes que el 1RM mostrado (puede no existir si aún no había peso)
        columnasEn(salida, e.nombre + (iu >= 0 ? " · último mes con datos " + fmt(s[iu], 1) + " kg" +
          (g[iu] != null ? " · GL " + fmt(g[iu], 1) : "") : ""),
          s, meses.map((m) => m.toFormat("MM/yy")), traslucido(colorLinea(e, i)),
          serieRepsDe(e).map(pocoFiable));
      });
    listaEn(salida, conHist.map((e) => {
      const s = serieDe(e), reps = serieRepsDe(e);
      const idx = [];
      for (let i = 0; i < s.length; i++) if (s[i] != null) idx.push(i);
      let dd = "1 mes";
      if (idx.length >= 2) {
        const a = s[idx[0]], b = s[idx[idx.length - 1]];
        const pct = ((b - a) / a) * 100;
        dd = (pct > 0 ? "▲ +" : pct < 0 ? "▼ " : "= ") + fmt(pct, 1) + " %";
      }
      const pinta = (i) => (pocoFiable(reps[i]) ? MARCA_1RM + " " : "") + fmt(s[i], 1);
      const txt = idx.length ? pinta(idx[0]) + " → " + pinta(idx[idx.length - 1]) + " kg" : "—";
      // IPF GL como línea secundaria, sólo si hay algún mes con peso corporal previo
      const g = serieGLDe(e);
      const gTxt = (i) => (g[i] == null ? "—" : fmt(g[i], 1));
      const conGL = idx.length && (g[idx[0]] != null || g[idx[idx.length - 1]] != null);
      return { titulo: e.nombre, derecha: dd,
               lineas: [txt, conGL ? "IPF GL " + gTxt(idx[0]) + " → " + gTxt(idx[idx.length - 1]) : null] };
    }));
    // Datos cortos, sin explicación (README §7 y §11)
    const notas = [];
    if (HAY_GL) notas.push("peso " + fmt(PESO.registros[PESO.registros.length - 1].kg, 1) + " kg (" +
      ddmm(PESO.registros[PESO.registros.length - 1].fecha) + ")");
    if (nMeses >= 2 && conHist.filter((e) => serieRepsDe(e).filter(pocoFiable).length).length)
      notas.push(MARCA_1RM + (ok ? " ▲" : " columna atenuada") + " >" + REPS_UMBRAL_FIABILIDAD_1RM + " reps");
    if (nMeses >= 2 && !ok) notas.push("sin plugin Charts: columnas");
    if (nMeses >= 2 && conHist.length > enGrafica.length) notas.push("gráfica: los " + enGrafica.length + " con más series");
    if (notas.length) textoSec(salida, notas.join(" · "), { margin: "0.2em 0 0.6em 0" });
  }

  // ── 8b. Por sesión ──
  // Un punto por sesión (el mejor 1RM de ese día), no por mes: la variación entre
  // entrenamientos concretos. Mismo filtro, mismos ejercicios y mismos colores que
  // la mensual. Recorte (README §11): el periodo visible lo fijan las últimas
  // SESIONES_GRAFICA sesiones del ejercicio con más sesiones; los demás muestran
  // todas las suyas dentro de ese periodo, así las líneas comparten fechas.
  if (conHist.length) {
    const hS = salida.createEl("h5"); hS.textContent = "Por sesión · 1RM estimado";
    const enGraficaS = conHist.slice(0, MAX_SERIES_GRAFICA);
    const ref = enGraficaS.reduce((a, e) => (e.hist.length > a.hist.length ? e : a));
    const desde = ref.hist.length > SESIONES_GRAFICA ? ref.hist[ref.hist.length - SESIONES_GRAFICA].dia : null;
    const series = enGraficaS.map((e) => ({
      e, pts: e.hist.filter((h) => !desde || h.dia.toMillis() >= desde.toMillis()),
    }));
    const todos = [].concat.apply([], series.map((s) => s.pts));
    const nota = (txt) => textoSec(salida, txt, { margin: "0.2em 0" });

    const opcS = opcionesBase({ sinLeyenda: enGraficaS.length === 1 });
    // "nearest" y no "index": cada ejercicio tiene sus propias fechas, y por índice
    // el tooltip emparejaría sesiones de días distintos.
    opcS.interaction = { mode: "nearest", axis: "x", intersect: false };
    // Eje X lineal en días, como el de peso: una semana sin entrenar ocupa su tiempo.
    // Se deja un pequeño margen a los lados: con min/max exactos, Chart.js recorta
    // por la mitad los puntos de los extremos.
    const xs = todos.map((h) => numDia(isoDe(h.dia)));
    const xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
    opcS.scales.x = { type: "linear", ticks: { font: { size: 11 }, maxRotation: 0, precision: 0,
                      maxTicksLimit: 6, callback: etiquetaDia } };
    if (xMax > xMin) {
      const pad = Math.max(1, Math.ceil((xMax - xMin) * 0.04));
      opcS.scales.x.min = xMin - pad; opcS.scales.x.max = xMax + pad;
    }
    const ejeS = ejeYDinamico(todos.map((h) => Math.round(h.mejorRM * 10) / 10));
    if (ejeS) opcS.scales.y = { min: ejeS.min, max: ejeS.max, beginAtZero: false,
      ticks: { font: { size: 11 }, includeBounds: false } };
    opcS.plugins.tooltip = { callbacks: { title: (items) => (items.length ? etiquetaDia(items[0].parsed.x) : "") } };

    const okS = grafica({
      type: "line",
      data: {
        datasets: series.map((s, i) => ({
          label: s.e.nombre,
          data: s.pts.map((h) => ({ x: numDia(isoDe(h.dia)), y: Math.round(h.mejorRM * 10) / 10 })),
          borderColor: enGraficaS.length === 1 ? colorGrupo(s.e.grupo) : PALETA[i % PALETA.length],
          backgroundColor: traslucido(enGraficaS.length === 1 ? colorGrupo(s.e.grupo) : PALETA[i % PALETA.length]),
          // tramos rectos: entre dos sesiones no hay datos que justifiquen una curva
          tension: 0, borderWidth: 2, fill: false,
          pointStyle: s.pts.map((h) => (pocoFiable(h.mejorRMReps) ? "triangle" : "circle")),
          pointRadius: s.pts.map((h) => (pocoFiable(h.mejorRMReps) ? 5 : 3)),
        })),
      },
      options: opcS,
    }, 280, salida);

    if (!okS) {
      if (enGraficaS.length === 1) {
        const ult = series[0].pts.slice(-SESIONES_FILAS_FALLBACK).reverse();
        tablaEn(salida, ["Fecha", "1RM est.", "Reps"], ult.map((h) => [
          h.dia.toFormat("dd/MM/yy"),
          (pocoFiable(h.mejorRMReps) ? MARCA_1RM + " " : "") + fmt(h.mejorRM, 1) + " kg",
          repsTxt(h.mejorRMReps, series[0].e.unilateral),
        ]));
        nota("sin plugin Charts: últimas " + ult.length + " sesiones");
      } else {
        nota("sin plugin Charts: sin vista por sesión");
      }
    }
    const notasS = [];
    if (okS && desde) notasS.push("últimas " + SESIONES_GRAFICA + " sesiones" +
      (enGraficaS.length > 1 ? " de " + ref.nombre : "") + ", desde " + desde.toFormat("dd/MM/yy"));
    if (Math.max.apply(null, series.map((s) => s.pts.length)) < 2) notasS.push("una sola sesión");
    if (okS && todos.filter((h) => pocoFiable(h.mejorRMReps)).length) notasS.push(MARCA_1RM + " ▲ >" + REPS_UMBRAL_FIABILIDAD_1RM + " reps");
    if (okS && conHist.length > enGraficaS.length) notasS.push("los " + enGraficaS.length + " con más series");
    if (notasS.length) nota(notasS.join(" · "));
  }
  }

  // ── 9. Estancamiento ── pestaña «Estancamiento»
  { const salida = PAN.estancamiento;
  const claves = new Set(sel2.map((e) => canon(e.nombre)));
  const diag = diagnostico.filter((d) => claves.has(canon(d.e.nombre)))
    .sort((a, b) => (ORDEN[a.estado] - ORDEN[b.estado]) || (b.e.ser - a.e.ser));
  listaEn(salida, diag.map((d) => ({
    titulo: d.e.nombre, derecha: estadoConFlecha(d),
    lineas: [d.detalle + (d.tend ? " · " + textoTendencia(d.tend) : ""),
             (d.nSes || "—") + (d.nSes === 1 ? " sesión" : " sesiones") + " comparables"],
  })));
  const ojo = diag.filter((d) => d.estado === "🟡 Estancado" || d.estado === "🔴 Retrocediendo");
  if (ojo.length)
    calloutEn(salida, "warning", plural(ojo.length, "ejercicio requiere", "ejercicios requieren") + " atención",
      ojo.map((d) => d.e.nombre + " — " + d.estado.replace(/^\S+\s/, "") + (d.flecha ? " " + d.flecha : "") +
        " (" + d.detalle + ")"));
  if (!diag.length) textoSec(salida, "Sin datos de estancamiento.");
  }
}

buscador.iniciar((v) => { pintar(v); resumenConsulta(v); });
});

// ─────────── Racha de constancia ───────────
// En SEMANAS, no en días: descansar es parte de entrenar, así que una racha diaria
// se rompería cada semana por diseño y no mediría constancia, sólo mediría suerte.
// Regla estricta: una semana ISO sin ninguna sesión corta la racha. Sin indultos.
const semanasConSesion = new Set();
for (const s of SESIONES) if (s.dia) semanasConSesion.add(claveSemana(s.dia));
let racha = 0, rachaViva = false, semanasSinEntrenar = null;
if (semanasConSesion.size) {
  const ultimaSes = SESIONES.filter((s) => s.dia)[0];
  if (ultimaSes) {
    let cursor = lunesDe(ultimaSes.dia);
    while (semanasConSesion.has(claveSemana(cursor))) {
      racha += 1;
      cursor = cursor.minus({ weeks: 1 });
    }
    semanasSinEntrenar = Math.round(
      (lunesDe(HOY).toMillis() - lunesDe(ultimaSes.dia).toMillis()) / (7 * 24 * 3600 * 1000));
    // viva = todavía se puede alargar: entrenaste esta semana o la semana pasada
    // (la semana en curso aún no ha terminado, eso no es un día de gracia)
    rachaViva = semanasSinEntrenar <= 1;
  }
}
const textoRacha = !racha ? "—"
  : racha + (racha === 1 ? " semana seguida · " : " semanas seguidas · ") +
    (semanasSinEntrenar === 0 ? "viva"
     : semanasSinEntrenar === 1 ? "viva · falta esta semana"
     : "cortada hace " + semanasSinEntrenar + " semanas");

// Estado de la racha, corto: lo usan las cifras clave y el Resumen
const estadoRacha = !racha ? "" : semanasSinEntrenar === 0 ? "viva"
  : semanasSinEntrenar === 1 ? "viva · falta esta semana"
  : "cortada hace " + semanasSinEntrenar + " semanas";
// Cifras clave bajo «Hoy toca» (el contenedor KPIS se creó allí)
{
  const kpi = (icon, etq) => {
    const k = tarjeta(KPIS, { margin: "0", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px" });
    k.addClass("gd-kpi");
    const cab = estilo(k.createDiv({ cls: "gd-kpi-cab" }), { display: "flex", alignItems: "center", gap: "6px", color: CSSV("--text-muted"),
                                                              fontSize: "0.8em" });
    iconoEn(cab, icon, 14);
    cab.createEl("span").textContent = etq;
    return k;
  };
  const valor = (k, v, unidad) => {
    const d = estilo(k.createDiv({ cls: "gd-num-m" }), { fontSize: "1.35em", fontWeight: "700", lineHeight: "1.15",
                                                          fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" });
    d.textContent = v;
    if (unidad) textoSec(d, unidad, { display: "inline", marginLeft: "4px", fontWeight: "400" });
    return d;
  };
  const k1 = kpi("chart-column", "Series semana");
  valor(k1, String(sumSer(act)));
  minigraficoEn(k1, semanas.map((s) => s.ser), CSSV("--interactive-accent"));
  const k2 = kpi("flame", "Racha");
  valor(k2, racha ? String(racha) : "—", racha ? (racha === 1 ? "sem." : "sem.") : "");
  if (estadoRacha) textoSec(k2, estadoRacha);
  if (LIGA.ok && LIGA.general.hoy.nivel) {
    const G = LIGA.general.hoy;
    const k3 = kpi("trophy", "Liga general");
    const f = estilo(k3.createDiv(), { display: "flex", alignItems: "center", gap: "8px" });
    insigniaEn(f, G.nivel, 36);
    const d = f.createDiv();
    estilo(d.createDiv(), { fontWeight: "700" }).textContent = G.nivel.txt;
    textoSec(d, LIGA.pct(G.sc));
  }
  if (PESO.registros.length) {
    const ult = PESO.registros[PESO.registros.length - 1];
    const k4 = kpi("scale", "Peso");
    valor(k4, fmt(ult.kg, 1), "kg · " + ddmm(ult.fecha));
    minigraficoEn(k4, PESO.registros.slice(-30).map((r) => r.kg), CSSV("--text-muted"));
  }
}

// Plegable (README §22): cifras y avisos de PRs y semáforo. Subtítulo: series y racha.
plegable("resumen", "📊 Resumen", sumSer(act) + " series esta semana · racha " + racha, function () {
// Rejilla de cifras, 2 por fila (antes, una tabla de 2 columnas). Mismos datos.
const rejilla = estilo(dv.container.createDiv(), { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                                   gap: "8px", margin: "8px 0" });
function cifra(etq, valor, sec, extra) {
  const t = tarjeta(rejilla, Object.assign({ margin: "0", padding: "8px 10px" }, extra || {}));
  textoSec(t, etq, { fontSize: "0.8em" });
  estilo(t.createDiv(), { fontSize: "1.2em", fontWeight: "700", lineHeight: "1.3", overflowWrap: "anywhere" }).textContent = valor;
  if (sec) textoSec(t, sec);
  return t;
}
cifra("Esta semana", fmt(sumVol(act)) + " kg", sumSer(act) + " series · " + act.length + " ses.");
cifra("Semana anterior", fmt(sumVol(prev)) + " kg", sumSer(prev) + " series · " + prev.length + " ses.");
cifra("Variación", delta, "volumen frente a la semana anterior");
cifra("Racha", racha ? racha + (racha === 1 ? " semana" : " semanas") : "—", estadoRacha);
cifra("Duración media", mediaDur == null ? "—" : fmt(mediaDur) + " min",
      mediaDur == null ? "sin duraciones fiables" : fiables.length + "/" + SESIONES.length + " fiables");
cifra("Última sesión", ultima.dia ? ultima.dia.toFormat("dd/MM/yy") : "?", ultima.plantilla);
cifra("Sesiones", String(SESIONES.length), "desde " +
      (SESIONES[SESIONES.length - 1].dia ? SESIONES[SESIONES.length - 1].dia.toFormat("dd/MM/yyyy") : "?"),
      { gridColumn: "1 / -1" });
for (const b of bloquesActivos(HOY))
  cifra("Bloque activo", b.tipo, ddmm(b.inicio) + "–" + ddmm(b.fin) + (b.gruposTxt.length ? " · " + b.gruposTxt.join(", ") : ""),
        { gridColumn: "1 / -1", borderLeft: "4px solid " + CSSV("--interactive-accent") });
// Ligas (README §23): los cambios de la semana, uno por línea y en letra pequeña
if (LIGA.ok && LIGA.cambios.length) {
  const lin = estilo(dv.container.createDiv(), { margin: "4px 0 8px 0" });
  for (const x of LIGA.cambios) textoConIcono(textoSec(lin, ""), x.txt, 14);
}

// ══════════════════════════ 2. AVISOS DESTACADOS (callouts) ══════════════════════════
const diaUlt = ultima.dia ? ultima.dia.toFormat("yyyy-MM-dd") : null;
const nuevosPR = [];
for (const e of EJERCICIOS) {
  if (!e.rmMax || !e.rmMax.dia) continue;
  const esRM = e.rmMax.dia.toFormat("yyyy-MM-dd") === diaUlt;
  const esPeso = e.pesoMax && e.pesoMax.dia && e.pesoMax.dia.toFormat("yyyy-MM-dd") === diaUlt;
  if (esRM || esPeso) {
    const tipos = [];
    if (esPeso) tipos.push("peso " + fmt(e.pesoMax.st.peso, 1) + " kg");
    if (esRM) tipos.push("1RM est. " + (pocoFiable(e.rmMax.st.reps) ? MARCA_1RM + " " : "") +
                         fmt(e.rmMax.st.oneRM, 1) + " kg");
    nuevosPR.push("> - **" + e.nombre + "** — " + tipos.join(" · "));
  }
}
if (nuevosPR.length) {
  dv.paragraph("> [!success] " + nuevosPR.length + " PR" + (nuevosPR.length > 1 ? "s" : "") +
    " en la última sesión (" + (ultima.dia ? ultima.dia.toFormat("dd/MM/yyyy") : "?") + ")\n" +
    nuevosPR.join("\n"));
}
const alerta = diagnostico.filter((d) => d.estado === "🟡 Estancado" || d.estado === "🔴 Retrocediendo");
if (alerta.length) {
  dv.paragraph("> [!warning] " + plural(alerta.length, "ejercicio requiere", "ejercicios requieren") + " atención\n" +
    alerta.map((d) => "> - **" + d.e.nombre + "** — " + d.estado.replace(/^\S+\s/, "") +
      (d.flecha ? " " + d.flecha : "") + " <small>(" + d.detalle + ")</small>").join("\n"));
}
});

// ══════════════════ 5a. SERIES SEMANALES FRENTE A OBJETIVO (README §19) ══════════════════
// Series de trabajo DIRECTAS por grupo (las de TODAS: working + failure, también a peso
// corporal; un unilateral cuenta una), semana ISO actual y anterior, contra el rango de
// ARCHIVO_VOLUMEN_OBJ. Si algún día de esa semana cae en un deload que protege al grupo,
// quedarse corto no se marca "por debajo": se muestra, pero entrenar menos era el plan.
// Presentación (README §22): una fila por grupo con una barra; la franja es el objetivo.
if (VOLUMEN_OBJ.existe && VOLUMEN_OBJ.lista.length) {
  const seriesSemana = (ref) => {
    const k = claveSemana(ref), m = new Map();
    for (const x of TODAS) {
      if (!x.dia || claveSemana(x.dia) !== k) continue;
      const g = m.get(canon(x.grupo)) || { grupo: x.grupo, n: 0 };
      g.n += 1;
      m.set(canon(x.grupo), g);
    }
    return m;
  };
  const deloadEn = (ref, grupo) => {
    const lunes = lunesDe(ref);
    for (let i = 0; i < 7; i++)
      for (const b of bloquesActivos(lunes.plus({ days: i })))
        if (b.esDeload && protege(b, canon(grupo))) return b;
    return null;
  };
  const refAnt = HOY.minus({ weeks: 1 });
  const sAct = seriesSemana(HOY), sAnt = seriesSemana(refAnt);
  const nDe = (m, grupo) => (m.get(canon(grupo)) || { n: 0 }).n;
  // Semana CERRADA (la anterior): sólo series hechas, como siempre.
  const estadoObj = (n, o, ref) => {
    if (n < o.min) return deloadEn(ref, o.grupo) ? { txt: "🛌 deload, no se juzga", color: CSSV("--text-faint") }
      : { txt: "🔻 por debajo", color: CSSV("--color-orange") };
    if (n > o.max) return { txt: "🔺 por encima", color: CSSV("--color-orange") };
    return { txt: "✅ en rango", color: CSSV("--color-green") };
  };
  // ─── Semana EN CURSO: hechas + PREVISTAS (README §19) ───
  // Previstas = targetSets de las plantillas de los días que quedan (hoy incluido) según
  // horario-semanal, repartidas por el grupo de cada ejercicio (mismo mapeo que las hechas).
  //   · hoy cuenta sólo si aún NO hay ningún log de hoy; si lo hay, sus series ya son
  //     hechas y no se duplican · descanso: 0 · plantilla que no existe: 0 (se avisa)
  //   · día de deload que protege al grupo: la mitad de cada targetSets, hacia arriba
  // Sin horario, no hay previstas y todo funciona como antes, sólo con las hechas.
  const prevista = new Map(), diasPrevistos = [], sinPlantillaPrev = [];
  if (HORARIO.existe && HORARIO.mapa.size) {
    const hayLogHoy = SESIONES.some((s) => s.dia && isoDe(s.dia) === isoDe(HOY));
    for (let i = 0; i <= 7 - HOY.weekday; i++) {
      const dia = HOY.plus({ days: i });
      if (i === 0 && hayLogHoy) continue;
      const rutina = HORARIO.mapa.get(dia.weekday);
      if (!rutina || esDescanso(rutina)) continue;
      const pl = PLANTILLAS.get(canon(rutina));
      if (!pl) { sinPlantillaPrev.push(rutina); continue; }
      let enDeload = false;
      for (const e of pl.ejercicios) {
        const g = canon(grupoDe(e.nombre));
        const deload = bloquesActivos(dia).some((b) => b.esDeload && protege(b, g));
        if (deload) enDeload = true;
        prevista.set(g, (prevista.get(g) || 0) + (deload ? Math.ceil(e.target / 2) : e.target));
      }
      diasPrevistos.push(DIAS_SEMANA[dia.weekday].slice(0, 3).toLowerCase() + " " + pl.nombre +
        (i === 0 ? " (hoy)" : "") + (enDeload ? " (deload)" : ""));
    }
  }
  const prevDe = (grupo) => prevista.get(canon(grupo)) || 0;
  // Se clasifica por el TOTAL previsto al cierre de la semana, no sólo por lo hecho
  const estadoCierre = (hechas, prev, o) => {
    const total = hechas + prev;
    if (total < o.min) return deloadEn(HOY, o.grupo) ? { txt: "🛌 deload, no se juzga", color: CSSV("--text-faint") }
      : { txt: "🔻 no llegará · faltarán " + (o.min - total), color: CSSV("--color-orange") };
    if (total > o.max) return { txt: "🔺 por encima al cierre", color: CSSV("--color-orange") };
    return { txt: prev ? "✅ llegará al rango" : "✅ en rango", color: CSSV("--color-green") };
  };
  // Subtítulo: grupos que no llegarán (sin contar los protegidos por un deload)
  const total = (o) => nDe(sAct, o.grupo) + prevDe(o.grupo);
  const noLlegan = VOLUMEN_OBJ.lista.filter((o) => total(o) < o.min && !deloadEn(HOY, o.grupo)).length;
  const encima = VOLUMEN_OBJ.lista.filter((o) => total(o) > o.max).length;
  const enDeload = VOLUMEN_OBJ.lista.filter((o) => total(o) < o.min && deloadEn(HOY, o.grupo)).length;
  plegable("series-objetivo", "🎯 Series semanales",
    noLlegan ? noLlegan + (noLlegan === 1 ? " grupo no llegará" : " grupos no llegarán") + " al objetivo"
    : encima ? encima + (encima === 1 ? " grupo" : " grupos") + " por encima al cierre"
    : enDeload ? "deload: no se juzga" : "todo en rango al cierre", function () {
  // Un anillo por grupo (README §25): cerrado en el máximo del rango, con una marca en el
  // mínimo; lo hecho en el color del grupo y lo previsto, en el mismo color más claro.
  // Debajo, los mismos datos que antes en corto: rango, estado al cierre y la semana anterior.
  const rejilla = estilo(dv.container.createDiv({ cls: "gd-anillos" }), { display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))", gap: "14px 6px", margin: "8px 0" });
  const corto = (txt) => txt.replace(/^\S+\s/, "").replace("no llegará · faltarán ", "no llegará · −")
    .replace("llegará al rango", "llegará").replace("por encima al cierre", "por encima").replace("deload, no se juzga", "deload");
  VOLUMEN_OBJ.lista.forEach((o, i) => {
    const n = nDe(sAct, o.grupo), prev = prevDe(o.grupo), nA = nDe(sAnt, o.grupo);
    const eAct = estadoCierre(n, prev, o), eAnt = estadoObj(nA, o, refAnt);
    const col = colorGrupo(o.grupo, i);
    const celda = estilo(rejilla.createDiv({ cls: "gd-anillo-celda" }), { display: "flex", flexDirection: "column", alignItems: "center",
      textAlign: "center", minWidth: "0", gap: "1px" });
    celda.setAttribute("title", o.grupo + ": " + n + " hechas · " + prev + " previstas · objetivo " + o.min + "–" + o.max +
      " · anterior " + nA + " · " + eAnt.txt);
    const centro = anilloEn(celda, 64, 7, n / o.max, prev / o.max, col, o.min / o.max);
    estilo(centro.createDiv({ cls: "gd-num-s" }), { fontWeight: "700", fontSize: "1.1em", fontVariantNumeric: "tabular-nums" }).textContent = String(n + prev);
    const nom = estilo(celda.createDiv({ cls: "gd-anillo-nombre" }), { fontWeight: "600", fontSize: "0.85em", marginTop: "4px",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" });
    estilo(nom.createEl("span", { cls: "gd-punto" }), { display: "inline-block", width: "0.55em", height: "0.55em", borderRadius: "50%",
      background: col, marginRight: "4px", verticalAlign: "0.05em" });
    nom.appendChild(document.createTextNode(o.grupo));
    textoSec(celda, o.min + "–" + o.max + (prev ? " · " + prev + " prev." : ""), { fontSize: "0.8em", fontVariantNumeric: "tabular-nums" });
    textoConIcono(estilo(celda.createDiv({ cls: "gd-anillo-estado" }), { fontSize: "0.8em", color: eAct.color, fontWeight: "600",
      overflowWrap: "anywhere" }), eAct.txt.replace(/^(\S+)\s.*$/, "$1") + " " + corto(eAct.txt), 12);
    textoConIcono(textoSec(celda, "", { fontSize: "0.8em" }), eAnt.txt.replace(/^(\S+)\s.*$/, "$1") + " ant. " + nA, 11);
  });
  // Datos de la semana, sin la explicación (README §19)
  const conObj = new Set(VOLUMEN_OBJ.lista.map((o) => canon(o.grupo)));
  const sinObj = Array.from(sAct.entries()).filter((par) => !conObj.has(par[0]))
    .map((par) => par[1].grupo + " (" + par[1].n + ")");
  const datosSem = ["semana del " + lunesDe(HOY).toFormat("dd/MM")];
  if (diasPrevistos.length) datosSem.push("previstas: " + diasPrevistos.join(" · "));
  if (sinPlantillaPrev.length) datosSem.push("sin plantilla: " + sinPlantillaPrev.join(", "));
  if (sinObj.length) datosSem.push("sin objetivo: " + sinObj.join(" · "));
  textoSec(dv.container, datosSem.join(" · "), { margin: "0.4em 0 0.2em 0" });
  });
}

// ─── Tarjeta de liga de un grupo (README §23) ───
// La de «Por músculo». Es la que salía en la consulta de grupo hasta el 2026-09-26, con dos
// añadidos: insignia de 96 px (antes 64) y la barra con lo que falta, y una barra en cada
// ejercicio. Arriba el grupo; debajo sus ejercicios con estándar, de mayor a menor liga
// (los aproximados con ≈ y «no cuenta en el grupo»; los que no tienen liga, al final con su motivo).
function tarjetaGrupoLigaEn(cont, k) {
  const g = LIGA.grupos.get(k);
  const ejs = Array.from(LIGA.ejercicios.values()).filter((e) => canon(e.grupo) === k)
    .sort((a, b) => ((b.hoy.nivel ? b.hoy.nivel.ord : -1) - (a.hoy.nivel ? a.hoy.nivel.ord : -1)) || (canon(a.nombre) < canon(b.nombre) ? -1 : 1));
  const c = tarjeta(cont);
  c.addClass("gd-liga-tarjeta");
  if (g && g.hoy.nivel) c.style.setProperty("--liga", COLOR_LIGA[g.hoy.nivel.insignia - 1]);
  if (g && g.hoy.nivel) {
    const cab = estilo(c.createDiv(), { display: "flex", gap: "12px", alignItems: "center", marginBottom: "4px" });
    insigniaEn(cab, g.hoy.nivel, 96);
    const col = estilo(cab.createDiv(), { minWidth: "0" });
    estilo(col.createDiv(), { fontSize: "1.3em", fontWeight: "700" }).textContent = g.hoy.nivel.txt;
    textoSec(col, LIGA.pct(g.hoy.sc) + " · media de " + plural(g.hoy.n, "ejercicio", "ejercicios") + ", ponderada por series");
    barraEn(c, LIGA.progreso(g.hoy).frac, COLOR_LIGA[g.hoy.nivel.insignia - 1]);
    textoSec(c, LIGA.faltaGrupoTxt(g.hoy), { fontSize: "0.8em", marginBottom: "4px" });
  } else textoSec(c, "Sin liga de grupo");
  ejs.forEach((e, i) => {
    const f = estilo(c.createDiv(), { display: "flex", gap: "10px", alignItems: "center", padding: "6px 0", borderTop: BORDE });
    if (e.hoy.nivel) insigniaEn(f, e.hoy.nivel, 32);
    else estilo(f.createDiv(), { width: "32px", height: "32px", flex: "0 0 32px", borderRadius: "50%", boxSizing: "border-box",
                                 border: "1.5px dashed " + CSSV("--text-faint") });
    const d = estilo(f.createDiv(), { minWidth: "0", flex: "1 1 auto" });
    estilo(d.createDiv(), { overflowWrap: "anywhere" }).textContent = e.nombre;
    textoSec(d, e.hoy.nivel ? e.hoy.nivel.txt + " · " + LIGA.pct(e.hoy.sc) +
      (e.m.aprox ? " · " + MARCA_1RM + " aproximado, no cuenta en el grupo" : "") : "sin liga: " + e.motivo, { overflowWrap: "anywhere" });
    if (e.hoy.nivel) barraEn(d, LIGA.progreso(e.hoy).frac, COLOR_LIGA[e.hoy.nivel.insignia - 1]);
  });
  if (!ejs.length) textoSec(c, "Ningún ejercicio de este grupo está en estandares.");
}

// ══════════════════ 5b. LIGAS (README §23) ══════════════════
// Sólo si hay escala, estándares y algún peso corporal; si no, la sección no existe. Plegada
// como el resto; dentro, la liga general, la escalera de ligas y dos buscadores plegables.
if (LIGA.ok) {
  const G = LIGA.general.hoy;
  const detLigas = plegable("ligas", "🏆 Ligas", "", function () {
    // Liga general
    // La insignia, dentro de un anillo con el progreso hacia la siguiente división (README §25)
    const tg = tarjeta(dv.container);
    tg.addClass("gd-liga-general");
    if (G.nivel) tg.style.setProperty("--liga", COLOR_LIGA[G.nivel.insignia - 1]);
    const t = estilo(tg.createDiv(), { display: "flex", gap: "12px", alignItems: "center" });
    if (G.nivel) insigniaEn(anilloEn(t, 112, 6, LIGA.progreso(G).frac, 0, COLOR_LIGA[G.nivel.insignia - 1]), G.nivel, 80);
    const col = estilo(t.createDiv(), { minWidth: "0", flex: "1 1 auto" });
    textoSec(col, "Liga general", { fontSize: "0.8em" });
    estilo(col.createDiv({ cls: "gd-num-l" }), { fontSize: "1.5em", fontWeight: "700", lineHeight: "1.2" }).textContent = G.nivel ? G.nivel.txt : "—";
    if (G.nivel) {
      textoSec(col, "media de " + G.n + (G.n === 1 ? " grupo" : " grupos") + " · " + LIGA.pct(G.sc));
      const pr = LIGA.progreso(G);
      textoSec(col, pr.siguiente ? "hacia " + pr.siguiente.txt : "liga máxima", { fontSize: "0.8em" });
    } else textoSec(col, "Aún no hay ningún grupo con liga.");
    // Escalera: las ligas de la escala en orden, sin división, dentro de la tarjeta general y
    // marcando la tuya. 8 por fila (8 + 7), insignia simplificada de 34 px; el nombre de cada
    // una va en su `title` y, debajo, el de la tuya con su posición (README §25).
    const esc = estilo(tg.createDiv({ cls: "gd-escalera" }), { display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
      gap: "4px 2px", marginTop: "12px", padding: "6px 4px", borderRadius: "var(--gd-radio-s, 8px)", background: CSSV("--background-primary") });
    LIGAS_CFG.lista.forEach((l, i) => {
      const tuya = !!(G.nivel && G.nivel.i === i);
      const celda = estilo(esc.createDiv({ cls: "gd-esc" + (tuya ? " gd-esc-tuya" : "") }), { display: "flex", justifyContent: "center",
        padding: "3px 0", borderRadius: "8px", minWidth: "0", boxSizing: "border-box", opacity: tuya ? "1" : "0.5",
        outline: tuya ? "1.5px solid " + CSSV("--interactive-accent") : "none" });
      celda.title = l.nombre + (tuya ? " · tu liga general" : "");
      insigniaEn(celda, { insignia: Math.min(i + 1, 15), div: "" }, 34);
    });
    if (G.nivel) {
      const pie = estilo(tg.createDiv({ cls: "gd-escalera-pie" }), { display: "flex", justifyContent: "space-between", marginTop: "4px" });
      estilo(pie.createEl("span"), { fontWeight: "600", fontSize: "0.85em" }).textContent = LIGAS_CFG.lista[G.nivel.i].nombre;
      textoSec(pie, (G.nivel.i + 1) + " de " + LIGAS_CFG.lista.length, { fontVariantNumeric: "tabular-nums" });
    }
    // Por músculo: buscador con el mismo componente que la consulta y «Por ejercicio», y su
    // propia clave. Opciones de mayor a menor liga; los grupos sin liga, al final. Al elegir,
    // la tarjeta del grupo (tarjetaGrupoLigaEn). Sin elección, el top 3.
    const nombresG = [];
    for (const v of Array.from(GRUPOS.mapa.values())) if (nombresG.indexOf(nombreGrupo(v.grupo)) < 0) nombresG.push(nombreGrupo(v.grupo));
    const infoG = nombresG.map((g) => ({ g, k: canon(g), lg: LIGA.grupos.get(canon(g)) || null }));
    const gConLiga = infoG.filter((x) => x.lg && x.lg.hoy.nivel)
      .sort((a, b) => (b.lg.hoy.nivel.ord - a.lg.hoy.nivel.ord) || (b.lg.hoy.sc - a.lg.hoy.sc));
    const gSinLiga = infoG.filter((x) => !(x.lg && x.lg.hoy.nivel));
    plegable("ligas-musculo", "Por músculo", "", function (cuerpoM, detM) {
      const b = buscadorEn(dv.container, {
        clave: "gym-dashboard-liga-musculo", respaldo: "__GYM_LIGA_MUS__", vacio: "— elige un músculo —",
        grupos: [{ etiqueta: "Grupos musculares (" + infoG.length + ")",
          opciones: gConLiga.concat(gSinLiga).map((x) => ({ valor: "gr:" + x.k,
            texto: x.g + " · " + (x.lg && x.lg.hoy.nivel ? x.lg.hoy.nivel.txt : "sin liga") })) }],
      });
      b.iniciar((v) => {
        b.salida.innerHTML = "";
        const x = v ? infoG.filter((y) => "gr:" + y.k === v)[0] : null;
        detM.resumenEl.textContent = x ? x.g + " · " + (x.lg && x.lg.hoy.nivel ? x.lg.hoy.nivel.txt : "sin liga")
          : gConLiga.length + " con liga";
        if (x) { tarjetaGrupoLigaEn(b.salida, x.k); return; }
        textoSec(b.salida, "Elige un músculo · " + gConLiga.length + " con liga");
        for (const y of gConLiga.slice(0, 3)) {
          const c = tarjeta(b.salida);
          const cab = estilo(c.createDiv(), { display: "flex", gap: "12px", alignItems: "center" });
          insigniaEn(cab, y.lg.hoy.nivel, 48);
          const d = estilo(cab.createDiv(), { minWidth: "0" });
          estilo(d.createDiv(), { fontWeight: "600", overflowWrap: "anywhere" }).textContent = y.g;
          estilo(d.createDiv(), { fontSize: "1.1em", fontWeight: "700", lineHeight: "1.25" }).textContent = y.lg.hoy.nivel.txt;
          barraEn(c, LIGA.progreso(y.lg.hoy).frac, COLOR_LIGA[y.lg.hoy.nivel.insignia - 1]);
        }
        if (!gConLiga.length) textoSec(b.salida, "Ningún grupo con liga aún");
      });
    });
    // Por ejercicio, de mayor a menor liga
    const conLiga = Array.from(LIGA.ejercicios.values()).filter((e) => e.hoy.nivel)
      .sort((a, b) => (b.hoy.nivel.ord - a.hoy.nivel.ord) || (b.hoy.sc - a.hoy.sc));
    const sinLiga = Array.from(LIGA.ejercicios.values()).filter((e) => !e.hoy.nivel)
      .sort((a, b) => (canon(a.nombre) < canon(b.nombre) ? -1 : 1));
    // Buscador con el mismo componente que la consulta y su propia clave. Opciones agrupadas por
    // grupo muscular (en el orden de grupos-musculares), de mayor a menor liga; sin liga, al final.
    // Al elegir, la misma tarjeta que la consulta (tarjetaLigaEn). Sin elección, el top 3.
    plegable("ligas-ejercicio", "Por ejercicio", "", function (cuerpoEj, detEj) {
      const ordenGrupos = [];
      for (const v of Array.from(GRUPOS.mapa.values())) if (ordenGrupos.indexOf(nombreGrupo(v.grupo)) < 0) ordenGrupos.push(nombreGrupo(v.grupo));
      const todos = conLiga.concat(sinLiga);
      for (const e of todos) if (ordenGrupos.indexOf(e.grupo) < 0) ordenGrupos.push(e.grupo);
      const b = buscadorEn(dv.container, {
        clave: "gym-dashboard-liga-ejercicio", respaldo: "__GYM_LIGA_EJ__", vacio: "— elige un ejercicio —",
        grupos: ordenGrupos.map((g) => ({ etiqueta: g,
          opciones: todos.filter((e) => e.grupo === g)
            .map((e) => ({ valor: "ej:" + e.k, texto: e.nombre + " · " + (e.hoy.nivel ? e.hoy.nivel.txt : "sin liga") })) })),
      });
      b.iniciar((v) => {
        b.salida.innerHTML = "";
        const e = v ? LIGA.ejercicios.get(v.slice(3)) : null;
        detEj.resumenEl.textContent = e ? e.nombre + " · " + (e.hoy.nivel ? e.hoy.nivel.txt : "sin liga") : conLiga.length + " con liga";
        if (e) { tarjetaLigaEn(b.salida, e); return; }
        textoSec(b.salida, "Elige un ejercicio · " + conLiga.length + " con liga");
        for (const x of conLiga.slice(0, 3)) {
          const c = tarjeta(b.salida);
          const cab = estilo(c.createDiv(), { display: "flex", gap: "12px", alignItems: "center" });
          insigniaEn(cab, x.hoy.nivel, 48);
          const d = estilo(cab.createDiv(), { minWidth: "0" });
          estilo(d.createDiv(), { fontWeight: "600", overflowWrap: "anywhere" }).textContent = x.nombre;
          estilo(d.createDiv(), { fontSize: "1.1em", fontWeight: "700", lineHeight: "1.25" }).textContent = x.hoy.nivel.txt;
          barraEn(c, LIGA.progreso(x.hoy).frac, COLOR_LIGA[x.hoy.nivel.insignia - 1]);
        }
      });
    });
  });
  // Subtítulo: insignia pequeña y liga general
  detLigas.resumenEl.textContent = "";
  if (G.nivel) insigniaEn(detLigas.resumenEl, G.nivel, 22, { verticalAlign: "-5px", marginRight: "4px" });
  detLigas.resumenEl.createEl("span").textContent = G.nivel ? G.nivel.txt : "sin liga general";
}

// ══════════════════════════ 3. SESIONES RECIENTES ══════════════════════════
// Lista (antes, tabla de 4 columnas). El enlace al log lo sigue pintando Dataview.
// Plegable (README §22). Subtítulo: la última sesión.
plegable("sesiones", "🗓️ Sesiones recientes", "última: " +
  (SESIONES[0].dia ? SESIONES[0].dia.toFormat("dd/MM") : "?") + " " + SESIONES[0].plantilla, function () {
const cajaSes = tarjeta(dv.container, { padding: "2px 12px" });
SESIONES.slice(0, ULTIMAS_SESIONES).forEach((s, i) => {
  const f = estilo(cajaSes.createDiv(), { display: "flex", justifyContent: "space-between", alignItems: "center",
                                          gap: "10px", padding: "6px 0", minHeight: "44px", borderTop: i ? BORDE : "none" });
  const porG = new Map();
  for (const e of s.ejercicios) porG.set(grupoDe(e.nombre), (porG.get(grupoDe(e.nombre)) || 0) + e.sets.length);
  const gPrin = Array.from(porG.entries()).sort((a, b) => b[1] - a[1])[0];
  if (gPrin) estilo(f.createDiv({ cls: "gd-barra-v" }), { width: "4px", alignSelf: "stretch", borderRadius: "2px", flex: "0 0 4px",
    background: colorGrupo(gPrin[0]) });
  const izq = estilo(f.createDiv(), { minWidth: "0", flex: "1 1 auto" });
  const enlace = dv.paragraph(String(dv.fileLink(s.p.file.path, false, s.dia ? s.dia.toFormat("dd/MM/yy") : s.p.file.name)),
                              { container: izq });
  if (enlace && enlace.style) estilo(enlace, { margin: "0", fontWeight: "600" });
  textoSec(izq, s.plantilla, { overflowWrap: "anywhere" });
  const der = estilo(f.createDiv(), { textAlign: "right", flex: "0 0 auto" });
  estilo(der.createDiv(), { fontVariantNumeric: "tabular-nums" }).textContent = fmt(s.volumen) + " kg";
  textoSec(der, s.series + " ser." + (s.sinPeso ? " (" + s.sinPeso + " s/peso)" : "") + " · " +
    (s.dur.min == null ? "—" : fmt(s.dur.min) + (s.dur.fiable ? " min" : " ⚠️")));
});
});

// ══════════════════ SECCIONES DE ANÁLISIS · PLEGADAS (README §22) ══════════════════
// Todo va plegado salvo "Hoy toca". Se abre con un toque y recuerda qué dejaste abierto.
plegable("vol-semanal", "📈 Volumen semanal", "esta semana " + fmt(semanas[semanas.length - 1].vol) + " kg", function () {
// ══════════════════════════ 4. VOLUMEN SEMANAL ══════════════════════════
const okVolSem = grafica({
  type: "bar",
  data: {
    labels: semanas.map((s) => s.etiqueta),
    datasets: [{
      label: "Volumen (kg)",
      data: semanas.map((s) => Math.round(s.vol)),
      backgroundColor: semanas.map((s) => s.clave === claveSemana(HOY) ? TEMA.naranja : traslucido(PALETA[0])),
      borderRadius: 6,
    }],
  },
  options: opcionesBase({ sinLeyenda: true }),
}, 230);
if (!okVolSem) {
  // sin Charts: barras CSS proporcionales, mismo color para la semana en curso
  barrasEn(dv.container, semanas.map((s) => ({
    etiqueta: s.etiqueta, valor: s.vol, actual: s.clave === claveSemana(HOY),
    color: s.clave === claveSemana(HOY) ? TEMA.naranja : traslucido(PALETA[0]),
    texto: fmt(s.vol) + " kg · " + s.ser + " ser.",
  })), (f) => f.actual);
}
leyendaEn(dv.container, [{ texto: "semana en curso", color: TEMA.naranja }]);
});

plegable("grupo-semana", "💪 Esta semana por grupo", sumSer(act) + " series", function () {
// ══════════════════════════ 5. ESTA SEMANA POR GRUPO ══════════════════════════
const kAct = claveSemana(HOY);
const deEstaSemana = TODAS.filter((x) => x.dia && claveSemana(x.dia) === kAct);
if (!deEstaSemana.length) {
  dv.paragraph("> [!info] Semana en blanco\n> Sin series registradas en la semana del " +
    lunesDe(HOY).toFormat("dd/MM") + ".");
} else {
  const porGrupo = new Map();
  for (const x of deEstaSemana) {
    const g = porGrupo.get(x.grupo) || { grupo: x.grupo, ser: 0, vol: 0 };
    g.ser += 1; g.vol += x.st.volumen;
    porGrupo.set(x.grupo, g);
  }
  const lista = Array.from(porGrupo.values()).sort((a, b) => b.ser - a.ser);
  const totSer = lista.reduce((a, g) => a + g.ser, 0);
  const okGrupo = grafica({
    type: "bar",
    data: {
      labels: lista.map((g) => g.grupo),
      datasets: [{ label: "Series", data: lista.map((g) => g.ser),
                   backgroundColor: lista.map((g, i) => colorGrupo(g.grupo, i)),
                   borderRadius: 6 }],
    },
    options: opcionesBase({ sinLeyenda: true, horizontal: true }),
  }, Math.max(160, 34 * lista.length + 50));
  if (!okGrupo)
    barrasEn(dv.container, lista.map((g, i) => ({
      etiqueta: g.grupo, valor: g.ser, color: colorGrupo(g.grupo, i),
      texto: g.ser + " ser.",
    })));
  listaEn(dv.container, lista.map((g, i) => ({
    titulo: g.grupo, derecha: g.ser + " series", punto: colorGrupo(g.grupo, i),
    lineas: [fmt((g.ser / totSer) * 100, 1) + " % · " + (g.vol > 0 ? fmt(g.vol) + " kg" : "sin peso")],
  })));
  // Objetivo: los grupos de los bloques activos que declaran grupos; si no hay
  // ninguno, la constante GRUPOS_ESPERADOS de siempre.
  const activosHoy = bloquesActivos(HOY);
  const conObjetivo = activosHoy.filter((b) => b.gruposTxt.length);
  let objetivo = GRUPOS_ESPERADOS;
  if (conObjetivo.length) {
    const vistosObj = new Set();
    objetivo = [];
    for (const b of conObjetivo) for (const g of b.gruposTxt)
      if (!vistosObj.has(canon(g))) { vistosObj.add(canon(g)); objetivo.push(g); }
  }
  const ausentes = objetivo.map(nombreGrupo).filter((g) => !porGrupo.has(g));
  const origenObj = conObjetivo.length
    ? conObjetivo.map((b) => "bloque " + b.tipo + " hasta " + ddmm(b.fin)).join(" + ")
    : (activosHoy.length ? "bloque " + activosHoy.map((b) => b.tipo).join(", ") : "");
  if (ausentes.length)
    dv.paragraph("> [!tip] Sin entrenar esta semana\n> " + ausentes.join(" · ") +
      (origenObj ? "\n>\n> <small>" + origenObj + "</small>" : ""));
}
});

plegable("vol-grupo", "📊 Volumen por grupo", "últimas " + SEMANAS + " semanas", function () {
// ══════════════════════════ 6. VOLUMEN POR GRUPO EN EL TIEMPO ══════════════════════════
const gruposVistos = Array.from(new Set(TODAS.map((x) => x.grupo))).sort();
if (!gruposVistos.length) dv.paragraph("Sin datos.");
else {
  const okApilado = grafica({
    type: "bar",
    data: {
      labels: semanas.map((s) => s.etiqueta),
      datasets: gruposVistos.map((g, i) => ({
        label: g,
        data: semanas.map((s) => Math.round(
          TODAS.filter((x) => x.grupo === g && x.dia && claveSemana(x.dia) === s.clave)
               .reduce((a, x) => a + x.st.volumen, 0))),
        backgroundColor: colorGrupo(g, i),
      })),
    },
    options: opcionesBase({ apilado: true }),
  }, 290);
  if (!okApilado) {
    // sin Charts: una barra apilada por semana. A diferencia de la tabla de antes,
    // no hay columnas que desborden, así que caben las SEMANAS semanas y no sólo 4.
    const colorG = (i) => colorGrupo(gruposVistos[i], i);
    barrasEn(dv.container, semanas.map((s) => {
      const segmentos = gruposVistos.map((g, i) => {
        const v = TODAS.filter((x) => x.grupo === g && x.dia && claveSemana(x.dia) === s.clave)
                       .reduce((a, x) => a + x.st.volumen, 0);
        return { valor: v, color: colorG(i), titulo: g + " · " + fmt(v) + " kg" };
      });
      return { etiqueta: s.etiqueta, segmentos, actual: s.clave === claveSemana(HOY),
               texto: fmt(segmentos.reduce((a, x) => a + x.valor, 0)) + " kg" };
    }), (f) => f.actual);
    leyendaEn(dv.container, gruposVistos.map((g, i) => ({ texto: g, color: colorG(i) })));
  }

}
});

if (PESO.registros.length)
  plegable("peso", "⚖️ Peso corporal", "último " + fmt(PESO.registros[PESO.registros.length - 1].kg, 1) + " kg · " + ddmm(PESO.registros[PESO.registros.length - 1].fecha), function () {
// ══════════════════ 6b. PESO CORPORAL (opcional) ══════════════════
// (definido en su propio módulo, arriba: seccionPeso)
seccionPeso();
});

plegable("balance", "🫀 Balance muscular", "diagrama por series", function () {
// ══════════════════════ 5b. BALANCE MUSCULAR (diagrama) ══════════════════════
const panelMapa = dv.container.createDiv();
const barraP = panelMapa.createDiv();
barraP.style.display = "flex";
barraP.style.flexWrap = "wrap";
barraP.style.gap = "0.5em";
barraP.style.alignItems = "center";
barraP.style.margin = "0.2em 0 0.6em 0";
const etiqP = barraP.createEl("label");
etiqP.textContent = "Periodo:";
etiqP.style.opacity = "0.75";
const selP = barraP.createEl("select", { cls: "dropdown" });
selP.style.flex = "1 1 12em";
selP.style.minWidth = "0";
estilo(selP, Object.assign({ padding: "0 0.5em" }, CONTROL));

const PERIODOS = [
  { id: "sem", txt: "Semana actual (ISO)",  ok: (d) => claveSemana(d) === claveSemana(HOY) },
  { id: "7d",  txt: "Últimos 7 días",       ok: (d) => d >= HOY.minus({ days: 6 }) },
  { id: "30d", txt: "Últimos 30 días",      ok: (d) => d >= HOY.minus({ days: 29 }) },
  { id: "all", txt: "Todo el historial",    ok: () => true },
];
for (const p of PERIODOS) {
  const o = selP.createEl("option");
  o.value = p.id;
  o.textContent = p.txt;
}
const salidaMapa = panelMapa.createDiv();

const CLAVE_PERIODO = "gym-dashboard-periodo";
function leerPeriodo() {
  try { const v = window.localStorage.getItem(CLAVE_PERIODO); if (v) return v; } catch (e) {}
  return window.__GYM_PERIODO__ || PERIODO_INICIAL;
}
function guardarPeriodo(v) {
  try { window.localStorage.setItem(CLAVE_PERIODO, v); } catch (e) {}
  window.__GYM_PERIODO__ = v;
}

function pintarMapa(idP) {
  salidaMapa.innerHTML = "";
  let P = PERIODOS[0];
  for (const p of PERIODOS) if (p.id === idP) P = p;

  // Todos los grupos de tu taxonomía arrancan a 0, para que los que no has
  // tocado en el periodo salgan como "sin entrenar" y no simplemente ausentes.
  const series = {};
  for (const v of Array.from(GRUPOS.mapa.values())) series[canon(v.grupo)] = 0;
  let total = 0;
  for (const x of TODAS) {
    if (!x.dia || !P.ok(x.dia)) continue;
    const k = canon(x.grupo);
    series[k] = (series[k] || 0) + 1;
    total += 1;
  }
  const r = diagramaMuscular(salidaMapa, series);
  if (!r) return;
  const pie = salidaMapa.createEl("p");
  pie.style.fontSize = "0.85em";
  pie.style.opacity = "0.7";
  pie.style.textAlign = "center";
  pie.textContent = total
    ? total + " series · " + P.txt.toLowerCase()
    : "Sin series en " + P.txt.toLowerCase();
}

selP.value = leerPeriodo();
if (!selP.value) selP.value = PERIODO_INICIAL;
selP.onchange = () => { guardarPeriodo(selP.value); pintarMapa(selP.value); };
pintarMapa(selP.value);
});

plegable("calendario", "🗓️ Calendario", "últimas " + CALENDARIO_SEMANAS + " semanas", function () {
// ══════════════════ 5c. CALENDARIO DE ACTIVIDAD ══════════════════
// (definido en su propio módulo, arriba: seccionCalendario)
seccionCalendario();
});

// ══════════════════════════ 10. CALIDAD DE LOS DATOS ══════════════════════════
// Toda la sección va dentro de UN callout plegable (el guion de "[!warning]-" es lo
// que la deja cerrada al abrir). Es diagnóstico técnico: no estorba en el gimnasio,
// pero sigue a un toque de distancia. Por eso se construye como un único bloque de
// markdown en vez de con dv.table: así las tablas quedan DENTRO del callout.
const malasDur = SESIONES.filter((s) => !s.dur.fiable);
const sinCatTodos = Array.from(new Set(TODAS.filter((x) => x.grupo === nombreGrupo(SIN_CATEGORIZAR))
  .map((x) => x.ejercicio))).sort();
// Los no mapeados a distancia 1-2 de una clave existente van a su propia lista
// ("posible variante, confirmar"); el resto, a la de siempre.
const variantes = [], sinCat = [];
for (const n of sinCatTodos) {
  const v = posiblesVariantes(n);
  if (v.length) variantes.push({ nombre: n, cands: v });
  else sinCat.push(n);
}
const totalSinPeso = SESIONES.reduce((a, s) => a + s.sinPeso, 0);
const descartadas = SESIONES.reduce((a, s) => a + s.descartadas, 0);
const enlaceLog = (s) => "[[" + s.p.file.path + "|" +
  (s.dia ? s.dia.toFormat("dd/MM/yy") : s.p.file.name) + "]]";

const L = [];
let limpio = true;

if (!GRUPOS.existe) {
  limpio = false;
  L.push("**❌ No se encuentra el archivo de mapeo** `" + ARCHIVO_GRUPOS + "`.");
  L.push("Todos los ejercicios saldrán como *" + SIN_CATEGORIZAR + "*.");
  L.push("");
}
if (sinCat.length) {
  limpio = false;
  L.push("**⚪ " + plural(sinCat.length, "ejercicio", "ejercicios") + " sin grupo muscular.** Copia estas líneas en " +
    "[[" + ARCHIVO_GRUPOS + "|grupos-musculares]] y escribe el grupo detrás de los dos puntos:");
  for (const n of sinCat) L.push("- `" + n + ":: `");
  L.push("");
}
if (variantes.length) {
  limpio = false;
  L.push("**🔤 " + plural(variantes.length, "posible errata", "posibles erratas") + ".** No se han fusionado: siguen como *" +
    SIN_CATEGORIZAR + "* hasta que confirmes. Si **es** el mismo ejercicio, corrige el nombre en " +
    "LiftOff (une el histórico) o pega la línea sugerida en [[" + ARCHIVO_GRUPOS + "|grupos-musculares]] " +
    "(lo categoriza, pero sigue separado en PRs). Si **no** lo es, añádelo al mapeo con su grupo real. " +
    "En los dos casos el aviso desaparece.");
  for (const x of variantes) {
    const de = x.cands.map((c) => "**" + c.nombre + "** (" + c.grupo + ")").join(" o ");
    L.push("- `" + x.nombre + "` — Posible variante de " + de + ", confirmar · distancia " +
      x.cands[0].distancia + " · `" + x.nombre + ":: " + x.cands[0].grupo + "`");
  }
  L.push("");
}
if (malasDur.length) {
  limpio = false;
  L.push("**⏱️ " + malasDur.length + " de " + SESIONES.length +
    " sesiones con duración no fiable.** Excluidas de los promedios (nunca en silencio). " +
    "Su volumen y sus PRs sí cuentan.");
  for (const s of malasDur)
    L.push("- " + enlaceLog(s) + " · " + (s.dur.min == null ? "—" : fmt(s.dur.min) + " min") + " · " + s.dur.motivo);
  L.push("");
}
if (!HAY_CHARTS) {
  limpio = false;
  L.push("**📉 Plugin Charts no disponible.** No se ha encontrado `window.renderChart`; " +
    "comprueba que **Charts** está activado. Mientras tanto se muestran barras CSS equivalentes.");
  L.push("");
}
// ─── Config ampliada: bloques, umbrales y peso corporal ───
if (PESO.registros.length && !PESO.sexo && !ERRORES_CONFIG.some((x) => x.archivo === ARCHIVO_PESO && /^sexo/.test(x.linea)))
  ERRORES_CONFIG.push({ archivo: ARCHIVO_PESO, linea: "sexo::",
    motivo: "vacío. Hay pesos registrados, pero IPF GL usa constantes distintas para hombre y mujer: " +
            "escribe «hombre» o «mujer». Mientras tanto no se calcula" });
if (ERRORES_CONFIG.length) {
  limpio = false;
  L.push("**⚙️ " + plural(ERRORES_CONFIG.length, "línea", "líneas") + " de configuración con problemas.** El motivo dice si se ha aplicado o no:");
  for (const x of ERRORES_CONFIG)
    L.push("- [[" + x.archivo + "|" + x.archivo.split("/").pop().replace(/\.md$/, "") + "]] · `" +
           x.linea + "` — " + x.motivo);
  L.push("");
}
const plantillasVistas = new Set(SESIONES.map((s) => canon(s.plantilla)));
for (const u of Array.from(UMBRALES.values()))
  if (!plantillasVistas.has(canon(u.plantilla)))
    AVISOS_CONFIG.push("El `umbral::` de «" + u.plantilla + "» no coincide con ninguna plantilla de tus logs (¿errata, o aún sin sesiones?).");
if (HAY_GL) {
  const antes = SESIONES.filter((s) => s.dia && isoDe(s.dia) < PESO.registros[0].fecha).length;
  if (antes) AVISOS_CONFIG.push(plural(antes, "sesión anterior", "sesiones anteriores") + " a tu primer registro de peso (" +
    ddmm(PESO.registros[0].fecha) + "): sin IPF GL, no se rellena hacia atrás.");
}
if (AVISOS_CONFIG.length) {
  for (const a of AVISOS_CONFIG) L.push("- ℹ️ " + a);
  L.push("");
}
// ─── Programa v5.1 (README §20) ───
// a) Ejercicio de una sesión que no está en su plantilla ni en objetivos: informativo,
//    no es un error (un ejercicio puntual es normal), por si es un nombre mal escrito.
const fueraPlantilla = new Map(), plantillasPerdidas = new Map();
if (OBJETIVOS.existe || PLANTILLAS.size) {
  for (const s of SESIONES) {
    const pl = PLANTILLAS.get(canon(s.plantilla));
    if (!pl && s.p.template) {
      const q = plantillasPerdidas.get(canon(s.plantilla)) || { nombre: s.plantilla, n: 0 };
      q.n += 1; plantillasPerdidas.set(canon(s.plantilla), q);
    }
    for (const ex of s.ejercicios) {
      const k = canon(ex.nombre);
      if ((pl && pl.porEj.has(k)) || OBJETIVOS.mapa.has(k)) continue;
      const f = fueraPlantilla.get(k) || { nombre: ex.nombre, n: 0, ultima: s };
      f.n += 1;                                   // SESIONES va de reciente a antigua: la 1.ª vista es la última
      fueraPlantilla.set(k, f);
    }
  }
}
// b) Ejercicio de unilaterales u objetivos que no existe en el mapeo de grupos
const sinMapeoCfg = new Map();
const anotaSinMapeo = (n, de) => {
  if (GRUPOS.mapa.has(canon(n))) return;
  const x = sinMapeoCfg.get(canon(n)) || { nombre: n, de: [] };
  if (x.de.indexOf(de) < 0) x.de.push(de);
  sinMapeoCfg.set(canon(n), x);
};
for (const n of UNILATERALES.nombres) anotaSinMapeo(n, "unilaterales");
for (const o of Array.from(OBJETIVOS.mapa.values())) anotaSinMapeo(o.nombre, "objetivos");
if (sinMapeoCfg.size) {
  limpio = false;
  L.push("**🏷️ " + plural(sinMapeoCfg.size, "ejercicio", "ejercicios") + " de la config sin grupo muscular.** Están en unilaterales u " +
    "objetivos pero no en [[" + ARCHIVO_GRUPOS + "|grupos-musculares]]. Pega la línea allí y escribe el grupo:");
  for (const x of Array.from(sinMapeoCfg.values())) {
    const v = posiblesVariantes(x.nombre);
    L.push("- `" + x.nombre + ":: " + (v.length ? v[0].grupo : "") + "` — en " + x.de.join(" y ") +
      (v.length ? " · ¿errata de **" + v.map((c) => c.nombre).join("** o **") + "**?" : ""));
  }
  L.push("");
}
// c) Unilateral con demasiadas reps: ¿se apuntó la suma de los dos lados?
const sumaLados = [];
for (const s of SESIONES)
  for (const ex of s.ejercicios) {
    if (!ex.unilateral) continue;
    ex.sets.forEach((st, i) => {
      if (st.paraSeries && st.reps > REPS_MAX_UNILATERAL) sumaLados.push({ s, ex, st, i });
    });
  }
if (sumaLados.length) {
  limpio = false;
  L.push("**↔️ " + plural(sumaLados.length, "serie unilateral", "series unilaterales") + " con más de " + REPS_MAX_UNILATERAL +
    " reps por lado.** ¿Has apuntado la suma de los dos lados? Desde el 2026-09-24 se apuntan las de UN lado:");
  for (const x of sumaLados)
    L.push("- " + enlaceLog(x.s) + " · " + x.ex.nombre + " · serie " + (x.i + 1) + ": " +
      fmt(x.st.peso, 1) + " kg × " + x.st.reps);
  L.push("");
}
if (fueraPlantilla.size) {
  L.push("**🔎 " + plural(fueraPlantilla.size, "ejercicio", "ejercicios") + " fuera de su plantilla y sin rango en objetivos.** " +
    "Informativo, no es un error: un ejercicio puntual es normal. Si es un nombre mal escrito, corrígelo en LiftOff.");
  for (const f of Array.from(fueraPlantilla.values()))
    L.push("- `" + f.nombre + "` · " + f.n + (f.n === 1 ? " sesión" : " sesiones") + ", la última " +
      enlaceLog(f.ultima) + " (" + f.ultima.plantilla + ")");
  if (plantillasPerdidas.size)
    L.push("- ℹ️ Plantillas de tus logs que ya no están en " + CARPETA_PLANTILLAS.replace(/"/g, "") + ": " +
      Array.from(plantillasPerdidas.values()).map((q) => "«" + q.nombre + "» (" + q.n + ")").join(", ") +
      ". Sus sesiones se comparan sólo con objetivos, y el asistente no les exige series.");
  L.push("");
}
// d) Ligas (README §23): ejercicios sin estándar, factores sin revisar y peso corporal viejo
const ligaAvisos = { sinEstandar: 0, sinFactor: 0, pesoViejo: false };
if (LIGAS_CFG.existe || ESTANDARES.existe) {
  const sinLinea = !ESTANDARES.existe ? []
    : Array.from(OBJETIVOS.mapa.values()).filter((o) => !ESTANDARES.mapa.has(canon(o.nombre))).map((o) => o.nombre);
  const explicitos = Array.from(ESTANDARES.mapa.values()).filter((e) => e.sinEstandar).map((e) => e.nombre);
  const sinFactor = Array.from(ESTANDARES.mapa.values()).filter((e) => !e.sinEstandar && !e.revisado).map((e) => e.nombre);
  const aprox = Array.from(ESTANDARES.mapa.values()).filter((e) => e.aprox).map((e) => e.nombre);
  const ultimoPeso = PESO.registros.length ? PESO.registros[PESO.registros.length - 1] : null;
  const diasPeso = ultimoPeso ? numDia(isoDe(HOY)) - numDia(ultimoPeso.fecha) : null;
  ligaAvisos.sinEstandar = sinLinea.length;
  ligaAvisos.sinFactor = sinFactor.length;
  ligaAvisos.pesoViejo = diasPeso != null && diasPeso > DIAS_PESO_RECIENTE;
  const LL = [];
  if (sinLinea.length) LL.push("- **Sin estándar** (tienen rango en objetivos pero ninguna línea en [[estandares]], así que no tienen liga): " +
    sinLinea.join(", ") + ". Añade «Nombre:: estándar | factor N», o «Nombre:: sin estándar» si no hay uno razonable.");
  if (sinFactor.length) LL.push("- **Factor sin revisar** (sin `factor` en [[estandares]], se usa 1): " + sinFactor.join(", ") +
    ". Escribe el factor aunque sea «factor 1», para dejar constancia de que lo has mirado.");
  if (!ultimoPeso) LL.push("- **Sin ningún peso corporal** en [[peso-corporal]]: los estándares van por peso corporal, así que la sección de ligas no aparece.");
  else if (ligaAvisos.pesoViejo) LL.push("- **Peso corporal desfasado:** el último es del " + ddmm(ultimoPeso.fecha) + ", hace " + diasPeso +
    " días (más de " + DIAS_PESO_RECIENTE + "). Las ligas usan el último peso anterior a cada sesión: pésate y apúntalo.");
  if (LL.length) {
    limpio = false;
    L.push("**🏆 Ligas: " + plural(LL.length, "aviso", "avisos") + ".**");
    for (const x of LL) L.push(x);
  }
  const info = [];
  if (!LIGAS_CFG.existe) info.push("no se encuentra `" + ARCHIVO_LIGAS + "`: sin escala no hay ligas");
  if (!ESTANDARES.existe) info.push("no se encuentra `" + ARCHIVO_ESTANDARES + "`: sin estándares no hay ligas");
  if (explicitos.length) info.push("sin estándar a propósito, fuera de las ligas: " + explicitos.join(", "));
  if (aprox.length) info.push("estándar aproximado, con ≈ y fuera de la liga de su grupo: " + aprox.join(", "));
  const poleas = Array.from(ESTANDARES.mapa.values()).filter((e) => e.polea).map((e) => e.nombre);
  if (poleas.length) info.push(ESTANDARES.correccionPolea !== 1
    ? "corrección de polea ×" + fmt(ESTANDARES.correccionPolea, 2) + " en: " + poleas.join(", ")
    : "marcados «polea» sin corrección (falta «correccion-polea:: factor N» o está mal escrita): " + poleas.join(", "));
  if (LIGA.ok && LIGA.fueraDeTabla.length) info.push("peso corporal fuera de las filas de la tabla, se usa la del extremo: " + LIGA.fueraDeTabla.join(", "));
  if (LIGAS_CFG.ok && LIGAS_CFG.lista.length !== 15) info.push("la escala tiene " + LIGAS_CFG.lista.length + " ligas y hay 15 insignias: " +
    "cada liga usa la de su posición" + (LIGAS_CFG.lista.length > 15 ? ", y las que pasan de la 15.ª repiten la de Leyenda" : ""));
  for (const x of info) L.push("- ℹ️ Ligas: " + x + ".");
  if (LL.length || info.length) L.push("");
}
const notas = [];
if (totalSinPeso) notas.push(totalSinPeso === 1 ? "1 serie sin peso: cuenta como serie de su grupo, no genera PR"
  : totalSinPeso + " series sin peso: cuentan como series de su grupo, no generan PR");
if (descartadas) notas.push(plural(descartadas, "serie no realizada o marcada", "series no realizadas o marcadas") + " como calentamiento/drop");
// Colores de grupo (README §25): grupos del mapeo sin color en colores-grupos
{
  const sinColor = [];
  for (const v of Array.from(GRUPOS.mapa.values()))
    if (!COLORES.mapa.has(canon(v.grupo)) && sinColor.indexOf(nombreGrupo(v.grupo)) < 0) sinColor.push(nombreGrupo(v.grupo));
  if (!COLORES.existe) notas.push("sin `" + ARCHIVO_COLORES + "`: los grupos usan los colores del tema");
  else if (sinColor.length) notas.push("sin color en colores-grupos: " + sinColor.join(", "));
}
if (notas.length) { L.push("ℹ️ " + notas.join(" · ") + "."); L.push(""); }
if (limpio) {
  L.push("Todos los ejercicios están categorizados, todas las duraciones son plausibles " +
    "y el plugin de gráficas responde.");
  L.push("");
}

// Plegada con <details> (README §22), como el resto de secciones de análisis. La cabecera
// resume el estado, así sabes si merece la pena abrirla sin abrirla.
const resumenCal = limpio ? "sin problemas"
  : [sinCat.length ? sinCat.length + " sin categorizar" : null,
     variantes.length ? plural(variantes.length, "posible errata", "posibles erratas") : null,
     malasDur.length ? plural(malasDur.length, "duración dudosa", "duraciones dudosas") : null,
     ERRORES_CONFIG.length ? ERRORES_CONFIG.length + " config" : null,
     sinMapeoCfg.size ? sinMapeoCfg.size + " sin grupo en config" : null,
     sumaLados.length ? sumaLados.length + " ¿suma de lados?" : null,
     ligaAvisos.sinEstandar ? ligaAvisos.sinEstandar + " sin estándar" : null,
     ligaAvisos.sinFactor ? plural(ligaAvisos.sinFactor, "factor sin revisar", "factores sin revisar") : null,
     ligaAvisos.pesoViejo ? "peso corporal desfasado" : null,
     (LIGAS_CFG.existe || ESTANDARES.existe) && !PESO.registros.length ? "ligas sin peso corporal" : null,
     !HAY_CHARTS ? "sin gráficas" : null].filter(Boolean).join(" · ");
while (L.length && L[L.length - 1] === "") L.pop();
plegable("calidad", (limpio ? "✅" : "⚠️") + " Calidad de los datos", resumenCal, function () {
  dv.paragraph(L.join("\n"));
});
}


// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ DATOS GENERADOS · NO EDITAR A MANO                                       ║
// ║ Geometría de las 89 regiones musculares, extraída de body-muscles        ║
// ║ (c) 2024 Ivan Vulovic, Apache License 2.0. Copia embebida del SVG que    ║
// ║ hay en Gym/Dashboards/assets/cuerpo-muscular.svg, para no necesitar      ║
// ║ dv.io (lectura de ficheros), que es zona gris en iOS.                    ║
// ║ Es una declaracion hoisted: se puede llamar desde mas arriba del script. ║
// ╚══════════════════════════════════════════════════════════════════════════╝

function datosRegiones() {
  return {
    front: [["head","Head","m 11.671635,6.3585449 -0.0482,-2.59085 4.20648,-2.46806 4.42769,2.95361 -0.0405,1.94408 0.24197,-3.34467 -2.03129,-2.31103004 -2.84508,-0.51629 -2.20423,0.52915 -1.9363,2.63077004 z"],["face","Face","m 19.748825,6.7034949 0.0203,-2.20747 -3.96689,-2.7637 -3.74099,2.23559 -0.006,2.63528 -0.60741,0.0403 0.27408,1.82447 0.97635,0.33932 0.44244,2.1802901 1.82222,2.06556 2.03518,-0.0607 1.79223,-1.94408 0.35957,-2.2406601 0.97616,-0.33932 0.25159,-1.78416 z"],["neck-right","Right Neck","m 13.304665,11.910505 1.64975,2.35202 0.74426,2.62159 -1.73486,-1.38354 -0.86649,-2.97104 z"],["neck-left","Left Neck","m 18.385135,11.910505 -1.64975,2.35202 -0.74538,2.62234 1.73486,-1.38354 0.86649,-2.97104 z"],["shoulder-front-left","Left Shoulder (Front)","m 19.047795,13.248365 3.55748,1.97916 0.72653,-0.35074 z m -0.107,0.43288 -0.37119,1.73073 2.1846,0.53561 1.40116,-0.49436 z"],["shoulder-side-left","Left Shoulder (Side)","m 22.922305,15.657195 0.75814,-0.41 2.40806,1.66799 1.17364,1.50707 0.62662,1.5626 -0.0464,3.70194 -1.3284,-1.72153 0.0407,-2.59376 -0.48842,-0.50049 c 0,0 -3.09778,-3.19058 -3.14371,-3.21401 z m -0.2409,0.10873 c -0.001,0.0525 3.32987,3.54733 3.32987,3.54733 l 0.10067,3.10396 -1.15426,-1.97782 -2.22547,-0.94804 -1.56576,-2.88481 z"],["shoulder-front-right","Right Shoulder (Front)","m 12.624785,13.248365 -3.5574599,1.97916 -0.72653,-0.35074 z m 0.107,0.43288 0.37119,1.73073 -2.18459,0.53561 -1.4011499,-0.49436 z"],["shoulder-side-right","Right Shoulder (Side)","m 8.7502951,15.657195 -0.75814,-0.41 -2.40806,1.66799 -1.17364,1.50707 -0.62662,1.56259 0.0464,3.70195 1.3284,-1.72153 -0.0407,-2.59376 0.48843,-0.5005 c 0,0 3.09777,-3.19057 3.1437,-3.214 z m 0.2409,0.10873 c 0.002,0.0525 -3.32987,3.54733 -3.32987,3.54733 l -0.10067,3.10396 1.15426,-1.97782 2.22547,-0.94804 1.5657499,-2.88481 z"],["biceps-left","Left Biceps","m 27.621665,30.814715 -0.33838,1.70499 -1.81932,-2.54418 -0.6629,-1.26895 z m -2.85271,-2.6096 c -0.0259,-0.0144 -0.0536,-0.0254 -0.0824,-0.0324 l -1.48333,-4.95503 1.00456,-2.08428 1.65511,1.74532 2.23034,6.67667 0.0415,0.93739 c -1.06528,-0.84215 -2.18962,-1.60679 -3.36434,-2.28803 z m 1.6945,-5.75654 1.64893,6.43421 -0.36469,-4.92266 z"],["forearm-left","Left Forearm","m 26.955425,32.969125 1.30083,10.28927 -1.10778,0.01 -1.89387,-7.99609 0.19174,-4.53719 z m 1.21978,-1.94971 -0.58729,2.58635 1.11876,9.15614 0.55849,-0.21663 0.2304,-6.77018 z"],["biceps-right","Right Biceps","m 4.0746451,30.814715 0.33838,1.70499 1.81931,-2.54418 0.66289,-1.26895 z m 2.8527,-2.6096 c 0.0259,-0.0144 0.0536,-0.0254 0.0824,-0.0324 l 1.48332,-4.95503 -1.00455,-2.08428 -1.65509,1.74532 -2.23034,6.67667 -0.0415,0.93739 c 1.06528,-0.84215 2.18961,-1.60679 3.36433,-2.28803 z m -1.6945,-5.75654 -1.64891,6.43421 0.36468,-4.92266 z"],["forearm-right","Right Forearm","m 4.5752651,32.969125 -1.30083,10.28927 1.10778,0.01 1.89387,-7.99609 -0.19174,-4.53719 z m -1.21978,-1.94971 0.58728,2.58635 -1.11875,9.15614 -0.55849,-0.21663 -0.2304,-6.77018 z"],["chest-upper-left","Left Upper Chest (Clavicular)","m 20.337455,17.085495 1.72942,3.09103 1.890,0.94 -0.5,0.3 -6.8, -2.1 z"],["chest-lower-left","Left Lower Chest (Sternal)","m 16.66,19.72 6.8,2.1 -0.65,0.5 -0.90604,2.63773 -2.09968,0.86537 -3.34524,-1.655 0.2,-3.8 z"],["chest-upper-right","Right Upper Chest (Clavicular)","m 11.351215,17.085495 -1.7294199,3.09103 -1.890,0.94 0.5,0.3 6.8,-2.1 z"],["chest-lower-right","Right Lower Chest (Sternal)","m 15.03,19.72 -6.8,2.1 0.65,0.5 0.90586,2.63773 2.0996699,0.86537 3.34636,-1.655 -0.2,-3.8 z"],["abs-upper-left","Left Abs (Upper)","m 19.641935,34.707615 1.81341,-1.36479 0.15748,1.83347 1.28642,2.37338 -1.98044,2.73652 -1.03109,0.16554 -0.37026,-3.88816 z"],["serratus-anterior-left","Left Serratus Anterior","M 19.289,26.152 l -3.11202 -1.40604 0.0937 2.27965 2.80119 1.43603 z M 21.224,27.820 l -1.29355 0.7212 0.14997 -1.70898 z M 20.171,26.183 l 2.47968 -1.03241 -0.9336 2.52093 z M 21.702,27.921 l -1.69005 1.03372 -0.28871 2.0678 1.64975 -1.07533 z"],["obliques-left","Left External Oblique","M 18.791,29.025 l -0.0622 1.62387 -2.30308 -0.49961 -0.12448 -2.21722 z M 18.635,31.429 l 0.0311 1.99844 -2.20953 0.59391 -0.0311 -3.1227 z M 21.290,30.444 l -1.48383 1.03372 -0.20622 2.10905 1.64862 -1.32355 z"],["abs-upper-right","Right Abs (Upper)","m 12.045985,34.707615 -1.81341,-1.36479 -0.15748,1.83347 -1.2856799,2.37432 1.9804499,2.73595 1.03109,0.16554 0.37119,-3.88721 z"],["abs-lower-right","Right Lower Abs","m 15.636055,44.919735 -0.60647,-5.91209 -0.015,-3.84879 -2.18479,-1.07533 -0.24746,7.03017 z"],["abs-lower-left","Left Lower Abs","m 16.051865,44.919165 0.60628,-5.91209 0.0154,-3.84915 2.18404,-1.07515 0.24746,7.03017 z"],["serratus-anterior-right","Right Serratus Anterior","m 12.399365,26.152365 3.11202,-1.40603 -0.0937,2.27965 -2.80138,1.4364 z m -1.93508,1.6685 1.29355,0.72139 -0.14997,-1.70899 z m 1.05303,-1.637 -2.4793099,-1.03259 0.93361,2.52148 z m -1.5316399,1.73729 1.6900499,1.03372 0.28871,2.06743 -1.64881,-1.07515 z"],["obliques-right","Right External Oblique","M 12.897,29.025 l 0.0623 1.62387 2.30327 -0.49961 0.12448 -2.21703 z M 13.053,31.430 l -0.0309 1.99844 2.20973 0.59353 0.0311 -3.1227 z M 10.398,30.445 l 1.48384 1.0339 0.20622 2.10905 -1.64975 -1.32355 z"],["hip-flexor-right","Right Groin / Hip Flexors","m 14.404465,45.040075 0.0221,-0.0277 -0.14866,-0.37945 -3.10172,-3.40449 -0.23283,-0.0825 2.05918,5.32009 z m -1.17263,2.01833 1.27705,3.29948 0.42631,-4.04862 -0.25196,-0.64303 z"],["hip-flexor-left","Left Groin / Hip Flexors","m 17.284025,45.040455 -0.0221,-0.0281 0.14867,-0.37926 3.10171,-3.40449 0.23246,-0.0825 -2.05843,5.3199 z m 1.17263,2.01795 -1.27706,3.29948 -0.42631,-4.04843 0.25197,-0.64303 z"],["quads-left","Left Quadriceps","m 23.419015,50.399125 -0.15504,4.75091 -2.40263,6.60949 0.7362,1.90021 2.36401,-8.34435 z m -0.58154,-11.60825 -0.15485,4.00722 1.31793,7.93154 0.61977,-6.40308 z m -0.38731,5.12268 -2.75152,6.07258 -0.62015,4.87425 1.16232,6.85771 2.51886,-6.98144 0.15504,-7.18764 z"],["adductors-left","Left Adductors","m 22.063225,39.369605 v 4.21363 l -2.94574,5.82511 -1.86027,5.78349 0.19365,-4.0072 z m -3.24944,13.42596 -0.0649,0.15467 -1.21294,2.90207 0.78325,7.18803 1.23619,-0.66122 -1.0714,-6.69272 z"],["foot-left","Left Foot","m 17.255895,87.868445 0.1243,3.45228 0.28983,1.20638 h 0.87136 l 0.24897,-0.83181 0.29058,-0.0416 -0.0624,0.83181 1.09914,-0.33332 0.29058,-0.16629 1.24444,-0.27033 0.0416,-0.97748 -1.20319,-2.03743 -0.82974,-1.0399 -2.03294,-0.83181 z"],["tibialis-anterior-left","Left Tibialis Anterior","m 18.251375,70.441125 0.29058,0.91486 0.6224,3.8681 0.0829,5.15733 -0.87136,5.03304 0.0412,-6.44714 -0.91242,-2.57848 -0.12561,-2.82837 z m 1.9915,2.32915 -0.20753,7.73637 -1.65949,6.23904 1.80478,-0.853 3.00816,-10.83583 -1.03727,-6.82095 z"],["knee-left","Left Knee","m 21.404635,64.784375 0.1243,1.12295 -0.87118,1.08171 -0.29058,1.70599 -0.58116,0.24933 -0.49774,-2.57866 -0.33182,-0.91486 0.29058,-0.58247 z m -3.85853,0.0832 0.6224,1.74685 1.3273,2.57867 -0.33182,2.37095 -0.95423,-2.66209 -0.78738,-1.49734 z m 4.97811,-2.37039 -0.95423,5.11609 0.62241,-0.33295 0.49773,1.66381 z"],["quads-right","Right Quadriceps","m 8.2694651,50.399125 0.15504,4.75053 2.4026299,6.60968 -0.73638,1.90021 -2.3640099,-8.34435 z m 0.58117,-11.60768 0.15503,4.00684 -1.31754,7.93154 -0.61978,-6.40308 z m 0.38769,5.1223 2.7515099,6.07239 0.61997,4.87425 -1.16232,6.85771 -2.5190499,-6.98163 -0.15504,-7.18801 z"],["adductors-right","Right Adductors","m 9.6258251,39.369415 v 4.21363 l 2.9451699,5.8253 1.86028,5.78349 -0.19366,-4.0072 z m 3.2488699,13.42559 0.0647,0.15485 1.21294,2.90207 -0.78307,7.18803 -1.23618,-0.66102 1.0714,-6.69273 z"],["foot-right","Right Foot","m 14.433335,87.868265 -0.12448,3.45228 -0.29058,1.20637 h -0.87118 l -0.24877,-0.83181 -0.29059,-0.0416 0.0623,0.83181 -1.09934,-0.33333 -0.29058,-0.16629 -1.2448,-0.27033 -0.0412,-0.97747 1.2031899,-2.03781 0.82975,-1.04009 2.03294,-0.83181 z"],["tibialis-anterior-right","Right Tibialis Anterior","m 13.437675,70.440945 -0.29058,0.91486 -0.62241,3.86828 -0.0829,5.15733 0.87174,5.03304 -0.0418,-6.44714 0.91298,-2.57848 0.1243,-2.82837 z m -1.99151,2.32914 0.20735,7.73637 1.65968,6.23904 -1.80497,-0.85299 -3.0079799,-10.83584 1.03728,-6.82095 z"],["knee-right","Right Knee","m 10.284405,64.784375 -0.12448,1.12295 0.87118,1.08171 0.29058,1.70599 0.58116,0.24933 0.49774,-2.57866 0.33182,-0.91486 -0.29058,-0.58247 z m 3.85854,0.0832 -0.62241,1.74685 -1.32767,2.57867 0.33182,2.37095 0.95423,-2.66209 0.78832,-1.4964 z m -4.9786799,-2.37058 0.9542299,5.11609 -0.6223999,-0.33313 -0.49793,1.6638 z"],["elbow-right","Right Elbow","m 3.2054751,27.370125 0.005,3.09419 -0.57959,1.91184 -0.54539,-2.41185 z"],["hand-right","Right Hand","m 4.3904451,43.563145 -1.5198,0.0506 -0.76631,-0.67112 -1.21261996,2.15767 -0.86245,3.32873 0.49386,0.22113 0.59814996,-2.20238 0.50016,0.25356 -0.35639,2.49422 0.62382,0.24345 0.41402,-2.49194 0.55839,0.17851 -0.2262,2.76603 0.76938,0.32268 0.25788,-2.86764 0.4578,-0.0181 0.16611,2.65239 0.65997,0.2633 0.0712,-4.56643 0.34158,-0.19428 1.35316,1.68367 0.32832,-0.34354 -0.72644,-2.0551 z"],["elbow-left","Left Elbow","m 28.325215,27.370125 -0.005,3.09419 0.57959,1.91184 0.54538,-2.41185 z"],["hand-left","Left Hand","m 27.140245,43.563145 1.5198,0.0506 0.76631,-0.67111 1.21262,2.15766 0.86245,3.32873 -0.49386,0.22113 -0.59815,-2.20238 -0.50016,0.25356 0.35639,2.49422 -0.62382,0.24345 -0.41402,-2.49194 -0.55839,0.17851 0.2262,2.76603 -0.76938,0.32268 -0.25788,-2.86764 -0.4578,-0.0181 -0.16611,2.6524 -0.65997,0.26329 -0.0712,-4.56643 -0.34158,-0.19428 -1.35316,1.68368 -0.32832,-0.34355 0.72644,-2.0551 z"]],
    back: [["head-back","Head (Posterior)","m 48.157455,6.3585449 0.44208,-0.14964 0.16111,0.16427 1.48163,4.0475101 2.32401,1.45118 2.39971,-1.52387 0.97577,-3.6896901 0.52752,-0.55908 0.23367,0.0981 0.24198,-3.34467 -2.03129,-2.31103004 -2.84509,-0.51629 -2.20422,0.52915 -1.93631,2.63077004 z"],["nape","Nape","m 52.369695,12.105075 -2.35767,-1.55045 -1.47119,-3.9514301 -0.60741,0.0403 0.27409,1.82447 0.97635,0.33932 0.7613,2.2157201 0.33017,1.06849 0.0895,2.14894 1.16448,0.008 0.10563,-0.70833 0.54716,-0.0606 z m 1.01793,1.47595 0.23768,0.64982 1.38107,-0.004 0.01,-2.38784 0.25971,-0.79061 0.57215,-2.1698001 0.76359,-0.41018 0.25158,-1.78416 -0.62859,0.0193 -1.08488,3.8998101 -2.39725,1.46684 0.2768,1.48507 z"],["traps-upper-left","Left Trapezius (Upper)","M 49.625,14.629 L 49.688,12.005 L 48.974,13.157 L 44.594,14.654 L 45.945,16.925 L 51.222,16.925 L 51.183,14.550 Z"],["traps-mid-left","Left Trapezius (Mid)","M 46.034,17.075 L 48.920,21.925 L 51.303,21.925 L 51.224,17.075 Z"],["traps-lower-left","Left Trapezius (Lower)","M 49.009,22.075 L 49.572,23.022 L 51.403,28.104 L 51.305,22.075 Z"],["traps-upper-right","Right Trapezius (Upper)","M 55.439,14.729 L 55.376,12.104 L 56.090,13.256 L 60.470,14.754 L 59.179,16.925 L 53.844,16.925 L 53.881,14.649 Z"],["traps-mid-right","Right Trapezius (Mid)","M 59.089,17.075 L 56.204,21.925 L 53.763,21.925 L 53.842,17.075 Z"],["traps-lower-right","Right Trapezius (Lower)","M 56.114,22.075 L 55.492,23.121 L 53.661,28.203 L 53.761,22.075 Z"],["lats-upper-left","Left Lats (Upper)","M 44.144,15.285 L 39.888,20.286 L 39.426,22.749 L 41.263,21.510 L 44.025,20.355 L 45.663,23.400 L 49.103,23.400 Z"],["deltoid-rear-left","Left Rear Deltoid","M 42.201,16.586 L 40.626,18.152 L 39.736,20.156 L 43.992,15.155 Z"],["lats-mid-left","Left Lats (Mid)","M 45.771,23.600 L 45.872,23.789 L 47.009,29.286 L 47.023,30.400 L 51.080,30.400 L 51.053,28.314 L 49.185,23.600 Z"],["lats-lower-left","Left Lats (Lower)","M 47.026,30.600 L 47.086,35.145 L 51.156,36.255 L 51.082,30.600 Z"],["deltoid-rear-right","Right Rear Deltoid","M 62.863,16.686 L 64.438,18.251 L 65.328,20.255 L 61.073,15.254 Z"],["lats-upper-right","Right Lats (Upper)","M 60.921,15.384 L 65.176,20.385 L 65.290,22.849 L 63.801,21.609 L 61.039,20.454 L 59.455,23.400 L 56.022,23.400 Z"],["lats-mid-right","Right Lats (Mid)","M 59.347,23.600 L 59.192,23.888 L 58.055,29.385 L 58.042,30.400 L 53.986,30.400 L 54.012,28.413 L 55.918,23.600 Z"],["lats-lower-right","Right Lats (Lower)","M 58.039,30.600 L 57.979,35.245 L 53.908,36.354 L 53.983,30.600 Z"],["triceps-long-left","Left Triceps (Long Head)","M 43.593,21.039 L 44.920,23.967 L 43.615,25.653 L 43.186,27.069 L 39.209,29.802 Z"],["triceps-lateral-left","Left Triceps (Lateral Head)","M 43.459,20.972 L 39.075,29.735 L 38.871,25.461 L 39.407,23.674 L 41.242,21.927 Z"],["hand-back-left","Left Hand (Back)","M 40.716955,42.424835 l -1.5182,0.0863 -0.78184,-0.65295 -1.16168,2.1855 -0.78414,3.34805 0.49892,0.20949 0.54632,-2.2158 0.50597,0.24175 -0.29779,2.5019 0.62936,0.22875 0.35546,-2.50096 0.56242,0.16536 -0.16126,2.77057 0.77674,0.30455 0.19056,-2.87291 0.45724,-0.0289 0.22827,2.64778 0.66597,0.24774 -0.0359,-4.56685 0.33693,-0.20224 1.39227,1.65147 0.32017,-0.35115 -0.77444,-2.03749 z"],["forearm-flexors-left","Forearm Flexors Left","M 40.775,29.006 L 42.870,27.644 L 42.187,29.635 L 42.603,34.383 L 40.799,42.081 L 39.814,42.253 Z"],["forearm-extensors-left","Forearm Extensors Left","M 39.665,42.242 L 38.305,41.501 L 37.998,34.491 L 38.635,31.429 L 39.245,30.209 L 40.625,28.994 Z"],["triceps-long-right","Right Triceps (Long Head)","M 61.376,21.213 L 60.056,24.145 L 61.330,26.199 L 61.657,27.251 L 65.780,29.966 Z"],["triceps-lateral-right","Right Triceps (Lateral Head)","M 61.510,21.146 L 65.914,29.899 L 66.108,25.624 L 65.568,23.839 L 63.729,22.096 Z"],["hand-back-right","Right Hand (Back)","M 64.301385,42.592325 l 1.51839,0.0828 0.78033,-0.65476 1.16673,2.18281 0.79187,3.34623 -0.49843,0.21064 -0.55144,-2.21453 -0.50541,0.24292 0.30356,2.5012 -0.62882,0.23021 -0.36124,-2.50014 -0.56203,0.16666 0.16765,2.77019 -0.77603,0.30634 -0.19719,-2.87245 -0.45732,-0.0278 -0.22215,2.64829 -0.66539,0.24928 0.0254,-4.56692 -0.3374,-0.20146 -1.38845,1.65469 -0.32098,-0.35041 0.76973,-2.03928 z"],["forearm-flexors-right","Forearm Flexors Right","M 65.204,42.420 L 63.925,29.007 L 61.764,27.798 L 62.786,29.733 L 62.397,34.555 L 64.219,42.248 Z"],["forearm-extensors-right","Forearm Extensors Right","M 64.075,28.993 L 65.353,42.405 L 66.712,41.663 L 67.002,34.653 L 66.358,31.591 L 65.745,30.373 Z"],["spine","Spine","m 51.733705,14.788555 0.53876,25.33066 0.48967,-0.0297 0.65658,-25.3387 -0.28147,-0.84188 -1.25059,-4.9e-4 z"],["lower-back-erectors-left","Erector Spinae Left","M 52.100,37.310 L 49.537,36.465 L 50.244,40.788 L 52.200,42.030 L 52.200,40.270 L 52.150,40.280 Z"],["lower-back-ql-left","Quadratus Lumborum Left","M 49.389,36.490 L 46.240,35.460 L 44.720,39.420 L 50.096,40.812 Z"],["lower-back-erectors-right","Erector Spinae Right","M 52.800,42.030 L 52.800,40.270 L 52.850,40.260 L 52.900,37.290 L 55.289,36.625 L 54.805,40.801 Z"],["lower-back-ql-right","Quadratus Lumborum Right","M 55.439,36.643 L 55.980,36.470 L 58.320,35.720 L 59.660,39.450 L 54.955,40.819 Z"],["gluteus-medius-left","Gluteus Medius Left","M 50.191,41.481 L 44.740,39.690 L 43.830,41.580 L 43.431,44.301 Z"],["gluteus-maximus-left","Gluteus Maximus Left","M 50.249,41.619 L 43.489,44.439 L 44.410,50.520 L 47.180,51.030 L 51.620,49.090 L 52.200,49.480 L 52.200,42.880 Z"],["gluteus-medius-right","Gluteus Medius Right","M 55.274,41.079 L 61.354,45.519 L 60.640,42.150 L 59.740,39.860 Z"],["gluteus-maximus-right","Gluteus Maximus Right","M 55.186,41.201 L 52.800,42.880 L 52.800,49.480 L 53.570,49.090 L 57.680,50.760 L 60.500,50.600 L 61.266,45.641 Z"],["knee-back-left","Left Back Knee","m 51.176145,64.073985 -1.20605,3.01461 0.70738,0.26558 0.89754,3.51771 -0.55801,-4.01191 z m -5.08496,-3.15003 0.63355,1.8609 0.16813,2.03261 0.61314,1.93117 -0.90585,-0.0851 -0.28534,2.15982 z"],["knee-back-right","Right Back Knee","m 54.019305,64.073985 1.20605,3.01461 -0.70737,0.26558 -0.89755,3.51771 0.55802,-4.01191 z m 5.08496,-3.15003 -0.63355,1.8609 -0.16813,2.03261 -0.61313,1.93117 0.90584,-0.0851 0.28534,2.15982 z"],["calves-gastroc-medial-left","Gastrocnemius Medial Left","M 50.568,67.512 L 51.669,72.509 L 51.379,75.532 L 51.292,76.825 L 48.983,76.825 Z"],["calves-gastroc-lateral-left","Gastrocnemius Lateral Left","M 50.218,67.512 L 48.633,76.825 L 46.283,76.825 L 45.533,74.263 L 46.783,67.088 Z"],["calves-soleus-left","Soleus Left","M 46.386,77.175 L 51.269,77.175 L 50.701,85.598 L 49.037,86.233 Z"],["calves-gastroc-medial-right","Gastrocnemius Medial Right","M 54.628,67.512 L 53.526,72.509 L 53.816,75.532 L 53.903,76.825 L 56.213,76.825 Z"],["calves-gastroc-lateral-right","Gastrocnemius Lateral Right","M 54.978,67.512 L 56.563,76.825 L 58.912,76.825 L 59.662,74.263 L 58.412,67.088 Z"],["calves-soleus-right","Soleus Right","M 53.927,77.175 L 58.810,77.175 L 56.158,86.233 L 54.495,85.598 Z"],["foot-back-left","Left Foot (Back)","M 50.933115,88.340995 l 0.85194,1.3581 0.37189,0.79238 -0.15588,1.21774 -0.76984,0.74446 -1.51185,0.12543 -1.1299,-0.29192 -0.24225,-0.95894 0.80765,-1.30405 -0.22562,-0.85987 0.29679,-0.84153 -0.0194,-1.81524 1.53568,-0.54817 z m -1.19598,0.4675 0.15943,1.25776 -0.6023,0.97431 m -0.54436,0.29544 1.06474,0.40084 1.55326,-0.65137 z"],["hamstrings-medial-left","Medial Hamstrings (Semis) Left","M 49.550,50.504 L 51.751,49.461 L 52.389,49.692 L 52.424,51.499 L 52.499,56.145 L 50.521,62.188 L 50.997,63.602 L 49.569,66.897 L 48.755,66.754 Z"],["hamstrings-lateral-left","Lateral Hamstrings (Biceps) Left","M 49.400,50.496 L 48.605,66.746 L 47.803,66.596 L 47.302,64.480 L 47.133,62.723 L 44.712,54.565 L 44.369,50.918 L 47.200,51.500 Z"],["foot-back-right","Right Foot (Back)","M 54.262335,88.340995 l -0.85194,1.3581 -0.37189,0.79238 0.15589,1.21774 0.76983,0.74446 1.51186,0.12543 1.12989,-0.29192 0.24225,-0.95894 -0.80765,-1.30405 0.22563,-0.85987 -0.29679,-0.84153 0.0194,-1.81524 -1.53568,-0.54817 z m 1.19598,0.4675 -0.15943,1.25776 0.6023,0.97431 m 0.54436,0.29544 -1.06474,0.40084 -1.55326,-0.65137 z"],["hamstrings-medial-right","Medial Hamstrings (Semis) Right","M 57.425,51.196 L 56.565,66.806 L 55.759,66.965 L 54.331,63.670 L 54.807,62.256 L 52.829,56.213 L 52.904,51.567 L 52.956,49.769 L 53.520,49.498 Z"],["hamstrings-lateral-right","Lateral Hamstrings (Biceps) Right","M 57.575,51.204 L 60.625,50.950 L 60.616,54.633 L 58.195,62.791 L 58.026,64.547 L 57.525,66.663 L 56.715,66.814 Z"]]
  };
}
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ INSIGNIAS DE LIGA · CÓDIGO GENERADO · NO EDITAR A MANO                   ║
// ║ Copia exacta de crearInsignias() de Gym/Scripts/insignias-ligas.mjs, que ║
// ║ la escribe aquí al ejecutarlo. Dibuja las 15 insignias (versión completa ║
// ║ y de 32 px) sin leer ficheros: dv.io es zona gris en iOS. Los .svg de    ║
// ║ Gym/Dashboards/assets/ligas/ son la misma salida. README §23.            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// ▼▼▼ INSIGNIAS · NÚCLEO
function crearInsignias() {
const C = 64;
const f = (n) => Math.round(n * 100) / 100;
const rad2 = (g) => (g * Math.PI) / 180;

// ═══════════════════════════ utilidades ═══════════════════════════
function rng(semilla) { // mulberry32
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const paradas = (ps) => ps.map((p, i) => {
  const [o, c, a] = Array.isArray(p) ? p : [i / (ps.length - 1), p];
  return `<stop offset="${f(o)}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ""}/>`;
}).join("");
const lin = (id, ps, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${paradas(ps)}</linearGradient>`;
const rad = (id, ps, cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${paradas(ps)}</radialGradient>`;
const escala = (s, cy, cx = C) => `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
const poli = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L") + " Z";
const linea = (pts) => "M" + pts.map((p) => f(p[0]) + " " + f(p[1])).join(" L");
const circulo = (cx, cy, r) => `M${f(cx - r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)} A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
function estrella(cx, cy, R, r, n = 5, giro = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = rad2(giro + (i * 180) / n), rr = i % 2 ? r : R; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return poli(pts);
}
function poligono(cx, cy, R, n, giro = -90, sx = 1, sy = 1) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = rad2(giro + (i * 360) / n); pts.push([cx + R * Math.cos(a) * sx, cy + R * Math.sin(a) * sy]); }
  return pts;
}
function mezcla(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function destello(x, y, r, op = 0.95, clase = "") {
  return `<path${clase ? ` class="${clase}"` : ""} d="M${f(x)} ${f(y - r)} L${f(x + r * 0.16)} ${f(y - r * 0.16)} L${f(x + r)} ${f(y)} L${f(x + r * 0.16)} ${f(y + r * 0.16)} L${f(x)} ${f(y + r)} L${f(x - r * 0.16)} ${f(y + r * 0.16)} L${f(x - r)} ${f(y)} L${f(x - r * 0.16)} ${f(y - r * 0.16)} Z" fill="#ffffff" fill-opacity="${op}"/>`;
}

// ═══════════════════════════ capas comunes ═══════════════════════════
// Paleta de cada liga: base = color dominante; claro/oscuro sus luces y sombras; emb = el
// emblema (contrasta con la base); cinta = la cinta de la división.
function defsPaleta(P, p, { barrido = false } = {}) {
  return lin(P + "aro", [p.claro, p.base, p.oscuro, mezcla(p.base, p.oscuro, 0.4), p.oscuro], 0, 0, 0.7, 1) +
    rad(P + "cara", [[0, mezcla(p.claro, p.base, 0.25)], [0.55, p.base], [1, mezcla(p.base, p.oscuro, 0.55)]], 0.38, 0.3, 0.8) +
    lin(P + "filo", [[0, "#ffffff", 0.9], [0.4, "#ffffff", 0.2], [0.65, "#ffffff", 0]], 0, 0, 0.4, 1) +
    lin(P + "espec", [[0, "#ffffff", 0.5], [0.6, "#ffffff", 0.08], [1, "#ffffff", 0]], 0, 0, 0.3, 1) +
    lin(P + "emb", [[0, p.embClaro], [0.5, p.emb], [1, p.embOscuro]], 0, 0, 0.35, 1) +
    lin(P + "cinta", [[0, mezcla(p.cinta, "#ffffff", 0.18)], [0.5, p.cinta], [1, mezcla(p.cinta, "#000000", 0.35)]], 0, 0, 0, 1) +
    (barrido ? lin(P + "barrido", [[0, "#ffffff", 0], [0.3, "#ffffff", 0.06], [0.5, "#ffffff", 0.6], [0.7, "#ffffff", 0.06], [1, "#ffffff", 0]], 0, 0, 1, 0) : "");
}
// Sombra proyectada sin filtros: copias desplazadas y translúcidas
const sombra = (d, cy, dy = 3) =>
  [[1.05, dy + 1.4, 0.07], [1.025, dy, 0.1], [1.0, dy * 0.5, 0.15]]
    .map(([s, y, o]) => `<path d="${d}" fill="#000000" fill-opacity="${o}" transform="translate(0 ${y}) ${escala(s, cy)}"/>`).join("");
// Cuerpo con el color dominante: aro, borde brillante, cara, textura (sólo completa),
// sombra interior y reflejo. `cara` es la escala de la cara respecto a la silueta.
function cuerpo(P, d, cy, p, { cara = 0.88, textura = "", simple = false, barrido = "" } = {}) {
  const k = `transform="${escala(cara, cy)}"`;
  let s = sombra(d, cy, simple ? 2.5 : 3);
  s += `<path d="${d}" fill="url(#${P}aro)" stroke="#0d0d0d" stroke-opacity="0.65" stroke-width="${simple ? 3 : 1.8}" stroke-linejoin="round"/>`;
  s += `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${simple ? 2.4 : 1.6}" transform="${escala(0.97, cy)}"/>`;
  s += `<path d="${d}" fill="url(#${P}cara)" ${k}/>`;
  s += `<clipPath id="${P}recorte"><path d="${d}" ${k}/></clipPath><g clip-path="url(#${P}recorte)">`;
  if (!simple) s += textura +
    `<g transform="translate(1.6 2.4)"><path d="${d}" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="6" ${k}/></g>` +
    `<path d="M-4 -4 H132 V${f(cy - 16)} C 96 ${f(cy)} 44 ${f(cy - 24)} -4 ${f(cy - 4)} Z" fill="url(#${P}espec)"/>`;
  else s += `<path d="M-4 -4 H132 V${f(cy - 14)} C 96 ${f(cy)} 44 ${f(cy - 22)} -4 ${f(cy - 2)} Z" fill="url(#${P}espec)" fill-opacity="0.8"/>`;
  s += `</g>`;
  s += `<path d="${d}" fill="none" stroke="${p.oscuro}" stroke-opacity="0.8" stroke-width="${simple ? 2 : 1.2}" ${k}/>`;
  if (barrido) s += `<g clip-path="url(#${P}recorte)">${barridoSvg(P, barrido)}</g>`;
  return s;
}
const barridoSvg = (P, c) => `<g transform="skewX(-18)"><path class="${c}-barrido" d="M-110 -20 h40 v170 h-40 Z" fill="url(#${P}barrido)"/></g>`;
// Emblema en relieve: sombra abajo-derecha, luz arriba-izquierda y la pieza.
function relieve(d, relleno, borde, { trazo = 1, prof = 1.6, simple = false } = {}) {
  return `<path d="${d}" fill="#000000" fill-opacity="0.45" transform="translate(${f(prof * 0.6)} ${f(prof)})"/>` +
    (simple ? "" : `<path d="${d}" fill="#ffffff" fill-opacity="0.5" transform="translate(-0.6 -0.7)"/>`) +
    `<path d="${d}" fill="${relleno}" stroke="${borde}" stroke-width="${simple ? trazo * 1.6 : trazo}" stroke-linejoin="round"/>`;
}
const emb = (P, p, d, o = {}) => relieve(d, `url(#${P}emb)`, p.embOscuro, o);

// ─── Cinta con el numeral romano de la división ───
// El numeral es geométrico (barras con remates arriba y abajo), no texto: no depende de
// las fuentes del dispositivo. III = tres barras, II = dos, I = una.
function numeral(txt, cx, cy, h) {
  const n = txt.length, w = h * 0.27, g = h * 0.17, t = h * 0.17, sal = h * 0.16;
  const ancho = n * w + (n - 1) * g, x0 = cx - ancho / 2, y0 = cy - h / 2;
  let d = `M${f(x0 - sal)} ${f(y0)} h${f(ancho + 2 * sal)} v${f(t)} h${f(-(ancho + 2 * sal))} Z ` +
          `M${f(x0 - sal)} ${f(y0 + h - t)} h${f(ancho + 2 * sal)} v${f(t)} h${f(-(ancho + 2 * sal))} Z `;
  for (let i = 0; i < n; i++) d += `M${f(x0 + i * (w + g))} ${f(y0)} h${f(w)} v${f(h)} h${f(-w)} Z `;
  return d;
}
function cinta(P, p, y, alto, ancho, txt, simple) {
  const x0 = C - ancho / 2, x1 = C + ancho / 2, cola = simple ? 0 : alto * 0.55, m = alto * 0.3;
  const cuerpoC = `M${f(x0)} ${f(y)} H${f(x1)} V${f(y + alto)} H${f(x0)} Z`;
  const colaI = `M${f(x0 + 2)} ${f(y + m)} H${f(x0 - cola)} L${f(x0 - cola + alto * 0.35)} ${f(y + m + alto / 2)} L${f(x0 - cola)} ${f(y + m + alto)} H${f(x0 + 2)} Z`;
  const colaD = `M${f(x1 - 2)} ${f(y + m)} H${f(x1 + cola)} L${f(x1 + cola - alto * 0.35)} ${f(y + m + alto / 2)} L${f(x1 + cola)} ${f(y + m + alto)} H${f(x1 - 2)} Z`;
  const osc = mezcla(p.cinta, "#000000", 0.45);
  let s = `<g class="cinta">` + sombra(cuerpoC, y + alto / 2, 2) +
    (simple ? "" : `<path d="${colaI}" fill="${osc}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="${colaD}" fill="${osc}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="1" stroke-linejoin="round"/>`) +
    `<path d="${cuerpoC}" fill="url(#${P}cinta)" stroke="#0d0d0d" stroke-opacity="0.75" stroke-width="${simple ? 2 : 1.2}" stroke-linejoin="round"/>`;
  if (!simple) s += `<path d="M${f(x0 + 2)} ${f(y + 1.8)} H${f(x1 - 2)}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1"/>`;
  if (txt) {
    const d = numeral(txt, C, y + alto / 2, alto * (simple ? 0.72 : 0.64));
    s += `<path d="${d}" fill="#000000" fill-opacity="0.5" transform="translate(0.7 1.2)"/>` +
         `<path d="${d}" fill="${p.numeral || "#ffffff"}" stroke="${mezcla(p.cinta, "#000000", 0.6)}" stroke-width="${simple ? 1 : 0.6}"/>`;
  }
  return s + `</g>`;
}

// ─── Gemas: facetas de un polígono hacia una mesa interior ───
// Para cada lado, un trapecio entre el contorno y la mesa, con el tono según hacia dónde
// mira (luz arriba-izquierda). La mesa lleva un degradado claro y un reflejo.
function facetas(P, p, pts, cx, cy, kMesa, { simple = false, prisma = null } = {}) {
  const mesa = pts.map(([x, y]) => [cx + (x - cx) * kMesa, cy + (y - cy) * kMesa]);
  let s = "";
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const mx = (pts[i][0] + pts[j][0]) / 2 - cx, my = (pts[i][1] + pts[j][1]) / 2 - cy;
    const luz = Math.cos(Math.atan2(my, mx) - rad2(-135));
    let col = luz > 0 ? mezcla(p.base, p.claro, luz * 0.75) : mezcla(p.base, p.oscuro, -luz * 0.7);
    if (prisma && i % 2 === 0) col = mezcla(col, prisma[(i / 2) % prisma.length], 0.35);
    s += `<path d="${poli([pts[i], pts[j], mesa[j], mesa[i]])}" fill="${col}"/>`;
    if (!simple) {   // subfaceta: una arista desde el centro del lado a la mesa
      const mid = [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
      const mm = [(mesa[i][0] + mesa[j][0]) / 2, (mesa[i][1] + mesa[j][1]) / 2];
      s += `<path d="${poli([mid, pts[j], mesa[j], mm])}" fill="${mezcla(col, "#000000", 0.12)}"/>`;
    }
  }
  s += `<path d="${poli(mesa)}" fill="url(#${P}mesa)"/>`;
  if (!simple) {
    s += `<path d="${pts.map((q, i) => `M${f(q[0])} ${f(q[1])} L${f(mesa[i][0])} ${f(mesa[i][1])}`).join(" ")}" stroke="#ffffff" stroke-opacity="0.45" stroke-width="0.6"/>`;
    s += `<path d="${poli(mesa)}" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="0.7"/>`;
    // reflejo interno: la mesa repite el contorno, más pequeño
    const r2 = pts.map(([x, y]) => [cx + (x - cx) * kMesa * 0.55, cy + (y - cy) * kMesa * 0.55]);
    s += `<path d="${poli(r2)}" fill="none" stroke="${p.oscuro}" stroke-opacity="0.35" stroke-width="0.7"/>`;
  }
  return s;
}
const defsMesa = (P, p) => rad(P + "mesa", [[0, "#ffffff"], [0.3, p.claro], [0.75, p.base], [1, mezcla(p.base, p.oscuro, 0.3)]], 0.35, 0.3, 0.85);
// Cuerpo de gema: la silueta ES la gema. Sombra, contorno, facetas y brillo.
function cuerpoGema(P, p, pts, cx, cy, kMesa, o = {}) {
  const d = poli(pts);
  return sombra(d, cy, o.simple ? 2.5 : 3) +
    `<path d="${d}" fill="${p.oscuro}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${o.simple ? 3 : 1.8}" stroke-linejoin="round"/>` +
    facetas(P, p, pts.map(([x, y]) => [cx + (x - cx) * 0.965, cy + (y - cy) * 0.965]), cx, cy, kMesa, o) +
    `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${o.simple ? 2.4 : 1.6}" transform="${escala(0.97, cy, cx)}"/>` +
    `<clipPath id="${P}recorte"><path d="${d}"/></clipPath>` +
    (o.barrido ? `<g clip-path="url(#${P}recorte)">${barridoSvg(P, o.barrido)}</g>` : "");
}

// ─── Ornamentos de las ligas altas ───
function laurel(P, lado, { cx = C, cy = 58, R = 40, desde = 100, hasta = 245, hojas = 9, tam = 1, simple = false, relleno } = {}) {
  const pa = (g) => [cx + lado * R * Math.cos(rad2(g)), cy + R * Math.sin(rad2(g))];
  const tallo = []; for (let i = 0; i <= 28; i++) tallo.push(pa(desde + ((hasta - desde) * i) / 28));
  let s = `<path d="${linea(tallo)}" fill="none" stroke="url(#${P}tallo)" stroke-width="${simple ? 4 : 2.2}" stroke-linecap="round"/>`;
  const hoja = (x, y, ang, t) =>
    `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})">` +
    `<path d="M0 0 C ${f(3 * t)} ${f(-4 * t)} ${f(9 * t)} ${f(-4.2 * t)} ${f(14 * t)} 0 C ${f(9 * t)} ${f(3.2 * t)} ${f(3 * t)} ${f(3.2 * t)} 0 0 Z" fill="${relleno || `url(#${P}hoja)`}" stroke="#1a0a2e" stroke-opacity="0.6" stroke-width="${simple ? 1 : 0.55}"/>` +
    (simple ? "" : `<path d="M0.8 0 Q ${f(6 * t)} ${f(-0.7 * t)} ${f(12.5 * t)} 0" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.5"/>`) + `</g>`;
  for (let i = 0; i < hojas; i++) {
    const g = desde + ((hasta - desde) * (i + 0.35)) / hojas;
    const [x, y] = pa(g), [x2, y2] = pa(g + 1), [x0, y0] = pa(g - 1);
    const tang = (Math.atan2(y2 - y0, x2 - x0) * 180) / Math.PI, t = tam * (1 - (i / hojas) * 0.25);
    for (const lh of [-1, 1]) s += hoja(x, y, tang + lh * 34, t);
  }
  const [xf, yf] = pa(hasta), [xa, ya] = pa(hasta - 1);
  return s + hoja(xf, yf, (Math.atan2(yf - ya, xf - xa) * 180) / Math.PI, tam * 0.75);
}
// Ala desplegada: plumas largas en abanico, de arriba (remeras) abajo
function ala(P, lado, { cy = 58, raiz = 26, largo = 50, plumas = 8, filas = 3, ancho0 = 8, simple = false, desde = -58, abre = 78 } = {}) {
  let s = "";
  const rx = C + lado * raiz, ry = cy;
  const nFilas = simple ? 1 : filas;
  for (let fila = 0; fila < nFilas; fila++) {
    const escalaFila = 1 - fila * 0.28, ancho = (simple ? 11 : ancho0) - fila * 1.2, n = (simple ? 4 : plumas) - fila;
    for (let i = n - 1; i >= 0; i--) {
      const u = n === 1 ? 0 : i / (n - 1), ang = desde + u * abre;
      const L = largo * escalaFila * (0.66 + 0.34 * Math.sin((1 - u) * Math.PI * 0.75 + 0.35));
      const a = rad2(ang), dx = lado * Math.cos(a), dy = Math.sin(a), nx = -dy * lado, ny = dx * lado;
      const ex = rx + dx * L, ey = ry + dy * L, w = ancho * (1 + (1 - u) * 0.25);
      const d = `M${f(rx)} ${f(ry)} C ${f(rx + dx * L * 0.35 + nx * w)} ${f(ry + dy * L * 0.35 + ny * w)} ${f(ex - dx * L * 0.12 + nx * w * 0.9)} ${f(ey - dy * L * 0.12 + ny * w * 0.9)} ${f(ex)} ${f(ey)} ` +
                `C ${f(ex - dx * L * 0.18 - nx * w * 0.5)} ${f(ey - dy * L * 0.18 - ny * w * 0.5)} ${f(rx + dx * L * 0.3 - nx * w * 0.6)} ${f(ry + dy * L * 0.3 - ny * w * 0.6)} ${f(rx)} ${f(ry)} Z`;
      s += `<path d="${d}" fill="#000000" fill-opacity="0.25" transform="translate(0.6 1.2)"/>`;
      s += `<path d="${d}" fill="url(#${P}pluma${fila})" stroke="#0d0d0d" stroke-opacity="0.55" stroke-width="${simple ? 1.4 : 0.7}" stroke-linejoin="round"/>`;
      if (!simple) s += `<path d="M${f(rx + dx * 3)} ${f(ry + dy * 3)} Q ${f(rx + dx * L * 0.5 + nx * w * 0.25)} ${f(ry + dy * L * 0.5 + ny * w * 0.25)} ${f(ex - dx * 2.5)} ${f(ey - dy * 2.5)}" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="0.55"/>`;
    }
  }
  return s;
}
const defsPlumas = (P, a) => [0, 1, 2].map((k) => lin(P + "pluma" + k, [[0, mezcla(a.claro, "#ffffff", 0.2 - k * 0.07)], [0.5, mezcla(a.base, a.claro, 0.25 - k * 0.1)], [1, mezcla(a.base, a.oscuro, 0.3 + k * 0.2)]], 0, 0, 1, 1)).join("");
// Corona: banda y puntas con perlas. `y` es la base.
function coronaD(cx, y, ancho, alto, puntas) {
  const x0 = cx - ancho / 2, pts = [[x0, y]];
  for (let i = 0; i <= puntas * 2; i++) {
    const x = x0 + (ancho * i) / (puntas * 2);
    const h = i % 2 === 0 ? alto * (i === puntas ? 1.15 : i === 0 || i === puntas * 2 ? 0.85 : 1) : alto * 0.42;
    pts.push([x, y - h]);
  }
  pts.push([x0 + ancho, y]);
  return pts;
}
function corona(P, cx, y, ancho, alto, puntas, relleno, simple, gemas = ["#d1123f", "#1d4ed8", "#0e9a57"]) {
  const pts = coronaD(cx, y, ancho, alto, puntas), d = poli(pts);
  let s = relieve(d, relleno, "#3a2400", { trazo: 1.1, simple });
  s += `<path d="M${f(cx - ancho / 2 - 1.5)} ${f(y - 5)} h${f(ancho + 3)} v7 h${f(-(ancho + 3))} Z" fill="${relleno}" stroke="#3a2400" stroke-width="${simple ? 1.6 : 1}"/>`;
  if (!simple) {
    for (let i = 0; i <= puntas * 2; i += 2) s += `<circle cx="${f(pts[i + 1][0])}" cy="${f(pts[i + 1][1])}" r="2.3" fill="#fff6dc" stroke="#6b4a00" stroke-width="0.5"/>`;
    for (let i = 0; i < 3; i++) {
      const x = cx + (i - 1) * (ancho / 3.2);
      s += `<ellipse cx="${f(x)}" cy="${f(y - 1.5)}" rx="${i === 1 ? 2.8 : 2}" ry="${i === 1 ? 2.3 : 1.8}" fill="${gemas[i % gemas.length]}" stroke="#2a1600" stroke-width="0.5"/>` +
           `<circle cx="${f(x - 0.7)}" cy="${f(y - 2.3)}" r="0.7" fill="#ffffff" fill-opacity="0.9"/>`;
    }
  }
  return s;
}
const destellosGema = (c, pts) => pts.map(([x, y, r], i) => destello(x, y, r, 1, `${c}-destello d${i + 1}`)).join("");

// ═══════════════════════════ animación ═══════════════════════════
function estiloAnim(c, { barrido = 0, destellos = false, aura = false, leyenda = false } = {}) {
  let css = "";
  if (barrido) css += `.${c}-barrido{animation:${c}-barre ${barrido}s ease-in-out infinite}
@keyframes ${c}-barre{0%{transform:translateX(0)}30%,100%{transform:translateX(260px)}}`;
  if (destellos) css += `.${c}-destello{transform-box:fill-box;transform-origin:center;animation:${c}-brilla 3.2s ease-in-out infinite;opacity:0}
.${c}-destello.d2{animation-delay:1.1s}.${c}-destello.d3{animation-delay:2.2s}
@keyframes ${c}-brilla{0%,62%,100%{opacity:0;transform:scale(.2) rotate(0deg)}74%{opacity:1;transform:scale(1) rotate(45deg)}86%{opacity:0;transform:scale(.3) rotate(90deg)}}`;
  if (aura) css += `.${c}-aura{animation:${c}-pulsa 4s ease-in-out infinite}
@keyframes ${c}-pulsa{0%,100%{opacity:.45}50%{opacity:1}}`;
  if (leyenda) css += `.${c}-rayos{transform-origin:64px 58px;animation:${c}-gira 60s linear infinite}
.${c}-halo{transform-origin:64px 52px;animation:${c}-halo 5s ease-in-out infinite}
.${c}-chispa{animation:${c}-sube 4.8s ease-out infinite;opacity:0}
@keyframes ${c}-gira{to{transform:rotate(360deg)}}
@keyframes ${c}-halo{0%,100%{opacity:.6;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
@keyframes ${c}-sube{0%{opacity:0;transform:translateY(6px)}20%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}`;
  const clases = [barrido && `.${c}-barrido`, destellos && `.${c}-destello`, aura && `.${c}-aura`, leyenda && `.${c}-rayos,.${c}-halo,.${c}-chispa`].filter(Boolean).join(",");
  css += `
@media (prefers-reduced-motion: reduce){${clases}{animation:none!important}${barrido ? `.${c}-barrido{opacity:0}` : ""}${destellos ? `.${c}-destello{opacity:.85;transform:none}` : ""}${leyenda ? `.${c}-chispa{opacity:0}` : ""}}`;
  return `<style>${css}</style>`;
}

// ═══════════════════════════ las 15 ligas ═══════════════════════════
// Colocación común: el cuerpo y su emblema arriba; la cinta de la división, abajo.
// `escalaCuerpo` hace crecer la presencia con la liga.
const L = [];
const CINTA = { completa: { y: 92, alto: 22, ancho: 52 }, simple: { y: 90, alto: 34, ancho: 46 } };

// 1 · MADERA · rodaja de tronco irregular, marrón, brote de dos hojas
L.push({ nombre: "Madera", escala: 0.8, cy: 54,
  pal: { base: "#9a6232", claro: "#d9a46a", oscuro: "#3e2008", emb: "#6fbf4a", embClaro: "#c8f5a0", embOscuro: "#1f4a10", cinta: "#5b3413" },
  d: (() => { const r = rng(11), pts = []; for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2, R = 46 + Math.sin(a * 3 + 0.7) * 2.2 + (r() - 0.5) * 2.4;
      // muñón de una rama arriba a la derecha: rompe la simetría del círculo
      const rama = Math.max(0, 1 - Math.abs(a - 5.55) / 0.22) * 16;
      pts.push([64 + (R + rama) * Math.cos(a) * 1.1, 54 + (R + rama) * Math.sin(a) * 0.82]); } return poli(pts); })(),
  textura: (P) => { const r = rng(12); let s = "";
    for (let k = 1; k <= 9; k++) { const pts = []; for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2, R = k * 4.6 + Math.sin(a * 2 + k) * 0.9 + (r() - 0.5) * 0.8; pts.push([58 + R * Math.cos(a), 50 + R * Math.sin(a) * 0.94]); }
      s += `<path d="${poli(pts)}" fill="none" stroke="#3a1c05" stroke-opacity="${f(0.22 + (k % 2) * 0.12)}" stroke-width="${f(0.6 + r() * 0.7)}"/>`; }
    for (let i = 0; i < 5; i++) { const a = r() * Math.PI * 2; s += `<path d="M${f(58 + 8 * Math.cos(a))} ${f(50 + 8 * Math.sin(a))} L${f(58 + 46 * Math.cos(a + 0.05))} ${f(50 + 46 * Math.sin(a + 0.05))}" stroke="#2a1204" stroke-opacity="0.35" stroke-width="0.8"/>`; }
    return s + `<circle cx="58" cy="50" r="2.4" fill="#3a1c05" fill-opacity="0.6"/>`; },
  emblema: (P, p, simple) => `<g transform="translate(64 60)">` +
    emb(P, p, "M-3 20 C -4 8 -1 0 -2 -8 L2 -8 C 3 0 4 8 3 20 Z", { simple }) +
    emb(P, p, "M-1 -2 C -9 -2 -25 -3 -27 -20 C -12 -23 -3 -14 -1 -2 Z", { simple }) +
    emb(P, p, "M1 -7 C 9 -8 25 -12 27 -30 C 12 -32 3 -21 1 -7 Z", { simple }) + `</g>`,
});

// 2 · COBRE · moneda de canto dentado, naranja cobre, martillo
L.push({ nombre: "Cobre", escala: 0.83, cy: 54,
  pal: { base: "#d9722e", claro: "#ffb784", oscuro: "#6a2c0c", emb: "#fbe3cf", embClaro: "#ffffff", embOscuro: "#6a2c0c", cinta: "#7c3210" },
  d: (() => { const pts = []; for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, R = Math.floor(i / 2) % 2 ? 42 : 51; pts.push([64 + R * Math.cos(a), 54 + R * Math.sin(a)]); } return poli(pts); })(),
  cara: 0.84,
  textura: (P) => { const r = rng(22); let s = "";
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 42, R = 2.4 + r() * 3.4;
      s += `<circle cx="${f(64 + rr * Math.cos(a))}" cy="${f(54 + rr * Math.sin(a))}" r="${f(R)}" fill="url(#${P}golpe)"/>`; }
    for (let i = 0; i < 12; i++) { const a = r() * Math.PI * 2, rr = 30 + r() * 10; s += `<ellipse cx="${f(64 + rr * Math.cos(a))}" cy="${f(54 + rr * Math.sin(a))}" rx="${f(1.5 + r() * 2.5)}" ry="${f(1 + r() * 1.5)}" fill="#3fae90" fill-opacity="0.45"/>`; }
    return s + `<circle cx="64" cy="54" r="34" fill="none" stroke="#6a2c0c" stroke-opacity="0.35" stroke-width="0.8"/>`; },
  defs: (P) => rad(P + "golpe", [[0, "#ffe6d2", 0], [0.5, "#ffe6d2", 0.04], [0.78, "#3d1603", 0.3], [0.92, "#ffd6b8", 0.45], [1, "#ffd6b8", 0]], 0.5, 0.5, 0.5, 0.62, 0.66),
  emblema: (P, p, simple) => `<g transform="translate(64 54) rotate(-35)">` +
    emb(P, p, "M-3.4 -6 H3.4 V30 Q 0 33 -3.4 30 Z", { simple }) +
    emb(P, p, "M-20 -20 H14 Q 22 -20 22 -12 V-4 H-20 Q -26 -12 -20 -20 Z", { simple }) + `</g>`,
});

// 3 · HIERRO · placa hexagonal ancha (lado plano arriba) con remaches, gris acero, yunque
L.push({ nombre: "Hierro", escala: 0.86, cy: 54,
  pal: { base: "#58626d", claro: "#a9b4bf", oscuro: "#20262c", emb: "#dfe5ea", embClaro: "#ffffff", embOscuro: "#20262c", cinta: "#2b3137" },
  d: poli(poligono(64, 54, 54, 6, 0, 1, 0.84)),
  textura: (P) => { const r = rng(33); let s = "";
    for (let y = 4; y < 110; y += 0.9) s += `<path d="M4 ${f(y)} H124" stroke="${r() > 0.55 ? "#ffffff" : "#000000"}" stroke-opacity="${f(0.03 + r() * 0.08)}" stroke-width="${f(0.3 + r() * 0.5)}"/>`;
    return s; },
  extra: (P, p, simple) => poligono(64, 54, 45, 6, 0, 1, 0.84).map(([x, y]) =>
    `<circle cx="${f(x + 0.5)}" cy="${f(y + 1.1)}" r="${simple ? 4.6 : 3.4}" fill="#000" fill-opacity="0.45"/><circle cx="${f(x)}" cy="${f(y)}" r="${simple ? 4.6 : 3.4}" fill="url(#${P}remache)" stroke="#111" stroke-width="0.6"/>`).join(""),
  defs: (P) => rad(P + "remache", [[0, "#ffffff"], [0.3, "#d5dbe0"], [0.75, "#6a7178"], [1, "#2c3136"]], 0.5, 0.5, 0.5, 0.35, 0.3),
  emblema: (P, p, simple) => `<g transform="translate(64 56)">` +
    emb(P, p, "M-28 -14 H22 Q 30 -14 34 -8 Q 26 -6 20 -4 Q 14 0 12 4 H-10 Q -12 -2 -20 -4 Q -28 -6 -28 -14 Z M-10 4 H12 V10 H-10 Z M-16 10 H18 V16 H-16 Z", { simple }) + `</g>`,
});

// 4 · BRONCE · escudo redondeado sencillo, bronce marrón-dorado, casco
L.push({ nombre: "Bronce", escala: 0.88, cy: 54,
  pal: { base: "#b4792f", claro: "#f0c07c", oscuro: "#553108", emb: "#f7e2bd", embClaro: "#ffffff", embOscuro: "#4a2a06", cinta: "#6a3f10" },
  d: "M18 16 Q18 8 26 8 H102 Q110 8 110 16 V60 Q110 100 64 110 Q18 100 18 60 Z",
  textura: (P) => { let s = ""; for (let i = 0; i < 20; i++) s += `<path d="M${-20 + i * 9} 0 L${40 + i * 9} 120" stroke="#ffffff" stroke-opacity="${i % 3 ? 0.05 : 0.12}" stroke-width="3"/>`; return s +
    `<path d="M26 16 H102 V60 Q102 94 64 102 Q26 94 26 60 Z" fill="none" stroke="#553108" stroke-opacity="0.45" stroke-width="0.9"/>`; },
  emblema: (P, p, simple) => `<g transform="translate(64 50)">` +
    emb(P, p, "M-24 6 Q -26 -26 0 -28 Q 26 -26 24 6 L24 22 Q 14 24 10 18 L10 6 H-10 L-10 18 Q -14 24 -24 22 Z", { simple }) +
    `<path d="M-18 -4 H18 V2 H-18 Z" fill="${p.embOscuro}"/>` +
    `<path d="M-2 -28 Q 0 -36 12 -38 Q 6 -32 4 -27 Z" fill="${p.embOscuro}" fill-opacity="0.85"/>` + `</g>`,
});

// 5 · PLATA · escudo de punta con hombros, plata brillante fría, espada
L.push({ nombre: "Plata", escala: 0.9, cy: 56,
  pal: { base: "#c3cfdc", claro: "#ffffff", oscuro: "#5d6b7c", emb: "#3d4c60", embClaro: "#8698b0", embOscuro: "#16202c", cinta: "#44546a" },
  d: "M8 8 L30 16 H98 L120 8 L114 36 Q112 54 108 64 Q98 94 64 116 Q30 94 20 64 Q16 54 14 36 Z",
  textura: (P) => { let s = ""; for (let r = 6; r < 70; r += 3) s += `<circle cx="64" cy="48" r="${r}" fill="none" stroke="#5d6b7c" stroke-opacity="0.12" stroke-width="0.5"/>`; return s; },
  emblema: (P, p, simple) => `<g transform="translate(64 54)">` +
    emb(P, p, "M0 -42 L6 -30 V14 H-6 V-30 Z", { simple }) +
    emb(P, p, "M-20 14 H20 Q 22 17 20 20 H-20 Q -22 17 -20 14 Z", { simple }) +
    emb(P, p, "M-3.5 20 H3.5 V32 H-3.5 Z", { simple }) +
    emb(P, p, circulo(0, 35, 4.6), { simple }) +
    (simple ? "" : `<path d="M0 -38 V12" stroke="#ffffff" stroke-opacity="0.5" stroke-width="1"/>`) + `</g>`,
});

// 6 · ORO · escudo con remate de corona, amarillo oro, estrella
L.push({ nombre: "Oro", escala: 0.92, cy: 58, anim: { barrido: 7 },
  pal: { base: "#f5b800", claro: "#fff08a", oscuro: "#8a5a00", emb: "#fffbe8", embClaro: "#ffffff", embOscuro: "#8a4a00", cinta: "#9a5205" },
  d: "M12 30 L26 30 L28 2 L46 22 L64 -6 L82 22 L100 2 L102 30 L116 30 V64 Q114 98 64 118 Q14 98 12 64 Z",
  textura: (P) => { let s = ""; for (let i = 0; i < 40; i++) { const a = rad2(i * 9); s += `<path d="M64 58 L${f(64 + 80 * Math.cos(a))} ${f(58 + 80 * Math.sin(a))}" stroke="${i % 2 ? "#ffffff" : "#8a5a00"}" stroke-opacity="${i % 2 ? 0.18 : 0.12}" stroke-width="0.7"/>`; } return s; },
  emblema: (P, p, simple) => emb(P, p, estrella(64, 60, 32, 13.5), { simple, prof: 2 }),
});

// 7 · PLATINO · escudo alto tipo cometa, platino verde azulado, doble estrella
L.push({ nombre: "Platino", escala: 0.94, cy: 56, anim: { barrido: 6.5 },
  pal: { base: "#4fb5a8", claro: "#c8fff4", oscuro: "#135650", emb: "#f2fffd", embClaro: "#ffffff", embOscuro: "#0d3f3a", cinta: "#15514b" },
  d: "M64 0 Q 98 0 102 28 Q 104 44 96 62 L64 124 L32 62 Q 24 44 26 28 Q 30 0 64 0 Z",
  textura: (P) => { let s = ""; for (let i = 0; i < 72; i++) { const a = rad2(i * 5); s += `<path d="M64 46 L${f(64 + 90 * Math.cos(a))} ${f(46 + 90 * Math.sin(a))}" stroke="${i % 2 ? "#ffffff" : "#135650"}" stroke-opacity="${i % 2 ? 0.2 : 0.1}" stroke-width="0.4"/>`; } return s; },
  emblema: (P, p, simple) => emb(P, p, estrella(78, 34, 15, 6.4), { simple }) + emb(P, p, estrella(60, 52, 26, 11), { simple, prof: 2 }),
});

// 8 · ZAFIRO · la insignia ES una gema hexagonal alta (puntas arriba y abajo), azul profundo
L.push({ nombre: "Zafiro", escala: 0.95, cy: 56, gema: true, anim: { barrido: 6.5 },
  pal: { base: "#1d4ed8", claro: "#9cc2ff", oscuro: "#061556", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#0c2472" },
  puntos: () => poligono(64, 58, 58, 6, -90, 0.78, 1),
  kMesa: 0.52,
  emblema: (P, p, simple, c) => destello(64, 50, simple ? 18 : 16, 0.95) + (simple ? "" : destello(80, 70, 6, 0.6)),
});

// 9 · ESMERALDA · gema octogonal de talla esmeralda (escalonada), verde
L.push({ nombre: "Esmeralda", escala: 0.96, cy: 56, gema: true, anim: { barrido: 6 },
  pal: { base: "#0ea35c", claro: "#93f7c4", oscuro: "#023a1c", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#05512c" },
  puntos: () => { const w = 84, h = 110, c = 22, cx = 64, cy = 58; return [[cx - w / 2 + c, cy - h / 2], [cx + w / 2 - c, cy - h / 2], [cx + w / 2, cy - h / 2 + c], [cx + w / 2, cy + h / 2 - c], [cx + w / 2 - c, cy + h / 2], [cx - w / 2 + c, cy + h / 2], [cx - w / 2, cy + h / 2 - c], [cx - w / 2, cy - h / 2 + c]]; },
  kMesa: 0.78, escalones: true,
  emblema: (P, p, simple) => destello(56, 34, simple ? 12 : 9, 0.9),
});

// 10 · RUBÍ · gema triangular (talla trillón), rojo, facetas y brillo interno
L.push({ nombre: "Rubí", escala: 0.97, cy: 60, gema: true, anim: { barrido: 6, destellos: true },
  pal: { base: "#d8143f", claro: "#ff9ab0", oscuro: "#4e0012", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#6e0a1c" },
  puntos: () => { const pts = [], V = [[64, 2], [122, 104], [6, 104]];   // lados algo curvos
    for (let i = 0; i < 3; i++) { const a = V[i], b = V[(i + 1) % 3]; pts.push(a);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], cx = 64, cy = 70; pts.push([m[0] + (m[0] - cx) * 0.1, m[1] + (m[1] - cy) * 0.1]); }
    return pts; },
  kMesa: 0.45, centro: [64, 70],
  emblema: (P, p, simple, c) => `<circle cx="64" cy="70" r="${simple ? 16 : 20}" fill="url(#${P}brilloInt)"/>` + destello(64, 66, simple ? 14 : 12, 0.95) +
    (c ? destellosGema(c, [[82, 52, 6], [46, 84, 5], [80, 88, 4]]) : ""),
  defs: (P) => rad(P + "brilloInt", [[0, "#ffe0e8", 0.9], [0.5, "#ff5a7e", 0.35], [1, "#ff5a7e", 0]]),
});

// 11 · DIAMANTE · diamante de talla brillante (corona y pabellón), blanco hielo con destellos de color
L.push({ nombre: "Diamante", escala: 1, cy: 56, gema: true, anim: { barrido: 5.5, destellos: true },
  pal: { base: "#d9f1ff", claro: "#ffffff", oscuro: "#5b8fb0", emb: "#ffffff", embClaro: "#ffffff", embOscuro: "#ffffff", cinta: "#2d5f80", numeral: "#ffffff" },
  diamante: true,
  emblema: (P, p, simple, c) => destello(50, 26, simple ? 12 : 10, 1) + (simple ? "" : destello(84, 54, 6, 0.8)) +
    (c ? destellosGema(c, [[74, 22, 7], [40, 50, 6], [70, 74, 5]]) : ""),
});

// 12-15 · medallones
const MED = {
  12: { base: "#7a3ad6", claro: "#d8bcff", oscuro: "#26085c", emb: "#ffd34d", embClaro: "#fff4b8", embOscuro: "#6b4a04", cinta: "#3a1280", numeral: "#fff0b0" },
  13: { base: "#c2185b", claro: "#ff8fbd", oscuro: "#44001d", emb: "#ffe8f1", embClaro: "#ffffff", embOscuro: "#5a0a2a", cinta: "#5a0a2a" },
  14: { base: "#1a1a22", claro: "#6c6c84", oscuro: "#030305", emb: "#f5c400", embClaro: "#fff3a8", embOscuro: "#5e3f00", cinta: "#0c0c10", numeral: "#f5c400" },
  15: { base: "#5b3fc4", claro: "#ffffff", oscuro: "#1a0d4a", emb: "#ffd34d", embClaro: "#fff7cc", embOscuro: "#6b4a04", cinta: "#2a1a6a", numeral: "#fff0b0" },
};
L.push({ nombre: "Maestro", escala: 1, cy: 52, medallon: { r: 34 }, pal: MED[12], anim: { barrido: 6, destellos: true },
  // Contorno liso (el borde dentado es exclusivo de Cobre): un disco ancho morado con aro de
  // oro, y la corona de laurel encima, recortada al disco para que no dentee la silueta.
  detras: (P, p, simple) => {
    const R = 50, d = circulo(64, 52, R);
    return sombra(d, 52, simple ? 2.5 : 3) +
      `<path d="${d}" fill="url(#${P}oro)" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 2.6 : 1.6}"/>` +
      `<path d="${circulo(64, 52, R - 3.5)}" fill="url(#${P}aro)"/>` +
      `<clipPath id="${P}recLaurel"><path d="${circulo(64, 52, R - 4)}"/></clipPath><g clip-path="url(#${P}recLaurel)">` +
      laurel(P, -1, { cy: 52, R: 41, desde: 112, hasta: 248, hojas: simple ? 5 : 9, tam: simple ? 0.95 : 0.8, simple }) +
      laurel(P, 1, { cy: 52, R: 41, desde: 112, hasta: 248, hojas: simple ? 5 : 9, tam: simple ? 0.95 : 0.8, simple }) + `</g>`;
  },
  defs: (P) => lin(P + "hoja", [[0, "#fff4b8"], [0.5, "#f0c94f"], [1, "#8a5a00"]], 0, 0, 1, 1) + lin(P + "tallo", [[0, "#f0c94f"], [1, "#7a5406"]]),
  emblema: (P, p, simple, c) => `<g transform="translate(64 52)">` +
    laurel(P, -1, { cx: 0, cy: 6, R: 20, desde: 95, hasta: 215, hojas: simple ? 3 : 5, tam: simple ? 1.2 : 0.95, simple, relleno: `url(#${P}emb)` }) +
    laurel(P, 1, { cx: 0, cy: 6, R: 20, desde: 95, hasta: 215, hojas: simple ? 3 : 5, tam: simple ? 1.2 : 0.95, simple, relleno: `url(#${P}emb)` }) + `</g>` +
    (c ? destellosGema(c, [[80, 34, 5], [46, 62, 4], [76, 66, 3.5]]) : ""),
});
L.push({ nombre: "Gran Maestro", escala: 1, cy: 54, medallon: { r: 30 }, pal: MED[13], alas: { base: "#c2185b", claro: "#ffc2da", oscuro: "#44001d" },
  anim: { barrido: 6, destellos: true, aura: true }, aura: "#ff6fa8",
  detras: (P, p, simple) => ala(P, -1, { cy: 56, raiz: 22, largo: simple ? 46 : 50, simple }) + ala(P, 1, { cy: 56, raiz: 22, largo: simple ? 46 : 50, simple }),
  emblema: (P, p, simple, c) => {
    const w = (lado) => `M${64 + lado * 2} 58 C ${64 + lado * 10} 40 ${64 + lado * 20} 36 ${64 + lado * 24} 38 C ${64 + lado * 20} 44 ${64 + lado * 22} 48 ${64 + lado * 18} 52 C ${64 + lado * 18} 56 ${64 + lado * 12} 60 ${64 + lado * 2} 62 Z`;
    return emb(P, p, w(-1), { simple }) + emb(P, p, w(1), { simple }) + emb(P, p, circulo(64, 60, 4), { simple }) +
      (c ? destellosGema(c, [[76, 40, 5], [48, 68, 4], [80, 68, 3.5]]) : "");
  },
});
L.push({ nombre: "Élite", escala: 1, cy: 66, medallon: { r: 27 }, pal: MED[14], alas: { base: "#e0ac00", claro: "#fff1a8", oscuro: "#5e3f00" },
  anim: { barrido: 5.5, destellos: true, aura: true }, aura: "#ffd34d",
  detras: (P, p, simple) => ala(P, -1, { cy: 64, raiz: 18, largo: simple ? 56 : 60, simple, desde: -84, abre: 62 }) + ala(P, 1, { cy: 64, raiz: 18, largo: simple ? 56 : 60, simple, desde: -84, abre: 62 }),
  emblema: (P, p, simple, c) => corona(P, 64, 70, 46, 44, simple ? 3 : 5, `url(#${P}emb)`, simple) +
    (c ? destellosGema(c, [[78, 44, 5], [48, 50, 4], [82, 66, 3.5]]) : ""),
});
L.push({ nombre: "Leyenda", escala: 1, cy: 58, medallon: { r: 30 }, pal: MED[15], alas: { base: "#f3ead0", claro: "#ffffff", oscuro: "#a8894a" },
  anim: { barrido: 5, destellos: true, aura: true, leyenda: true }, aura: "#fff3c4",
  defs: (P) => lin(P + "prisma", [[0, "#ff7eb6"], [0.2, "#ffd36e"], [0.4, "#7ef0c1"], [0.6, "#6ec8ff"], [0.8, "#b28dff"], [1, "#ff7eb6"]], 0, 0, 1, 1) +
               rad(P + "halo", [[0.55, "#ffffff", 0], [0.7, "#fff7d6", 0.95], [0.8, "#ffd36e", 0.4], [1, "#ffd36e", 0]]),
  detras: (P, p, simple, c) => {
    // Estallido tipo sol: estrella de 16 puntas rellena por cuñas de colores del arcoíris
    const col = ["#ff5c8a", "#ffb347", "#ffe066", "#6be39a", "#4fc3f7", "#9b7bff"];
    const n = 16, pt = (i) => { const a = rad2((i * 360) / (n * 2) - 90), R = i % 2 ? 46 : i % 4 === 0 ? 64 : 58; return [64 + R * Math.cos(a), 58 + R * Math.sin(a)]; };
    let rayos = "";
    for (let i = 0; i < n * 2; i++) rayos += `<path d="${poli([[64, 58], pt(i), pt(i + 1)])}" fill="${mezcla(col[Math.floor(i / (n * 2 / 6)) % 6], i % 2 ? "#ffffff" : "#000000", i % 2 ? 0.25 : 0.08)}"/>`;
    const contorno = poli(Array.from({ length: n * 2 }, (_, i) => pt(i)));
    let chispas = "";
    if (!simple && c) { const r = rng(1515); for (let i = 0; i < 10; i++) chispas += `<circle class="${c}-chispa" cx="${f(20 + r() * 88)}" cy="${f(20 + r() * 76)}" r="${f(0.9 + r() * 1.1)}" fill="#ffffff" style="animation-delay:${f(r() * 4.8)}s"/>`; }
    return sombra(contorno, 58, 2.5) + `<g${c ? ` class="${c}-rayos"` : ""}>${rayos}<path d="${contorno}" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="${simple ? 2 : 1.2}" stroke-linejoin="round"/>` +
      `<path d="${contorno}" fill="none" stroke="#0d0d0d" stroke-opacity="0.45" stroke-width="${simple ? 1.4 : 0.8}" stroke-linejoin="round" transform="translate(0 0.8)"/></g>` + chispas;
  },
  emblema: (P, p, simple, c) => `<circle${c ? ` class="${c}-halo"` : ""} cx="64" cy="52" r="${simple ? 24 : 26}" fill="url(#${P}halo)"/>` +
    corona(P, 64, 70, 40, 28, simple ? 3 : 5, `url(#${P}emb)`, simple) +
    (c ? destellosGema(c, [[80, 36, 6], [46, 42, 4.5], [82, 64, 4]]) : ""),
});

// ═══════════════════════════ montaje ═══════════════════════════
function montar(n, simple, num) {
  const o = L[n - 1], p = o.pal, nn = String(n).padStart(2, "0");
  const P = "L" + nn + (simple ? "s" : "") + "-", c = simple ? "" : "l" + nn;
  const anim = simple ? null : o.anim || null;
  let defs = defsPaleta(P, p, { barrido: !!(anim && anim.barrido) }) + (o.defs ? o.defs(P) : "");
  let cuerpoSvg = "";
  const cy = o.cy;
  if (o.gema) {
    defs += defsMesa(P, p);
    if (o.diamante) {   // perfil: mesa, corona y pabellón
      const tabla = [[42, 12], [86, 12]], cintura = [[6, 42], [122, 42]], punta = [64, 124];
      const pts = [tabla[0], tabla[1], cintura[1], punta, cintura[0]], d = poli(pts);
      const prisma = ["#ff9aa8", "#ffd48a", "#fff7a0", "#a9f2b4", "#9fd8ff", "#c7a9ff"];
      let fac = "";
      const corona = [[42, 12], [53, 12], [64, 12], [75, 12], [86, 12]], cinturaP = [6, 25, 45, 64, 83, 103, 122].map((x) => [x, 42]);
      for (let i = 0; i < 6; i++) {    // corona: triángulos alternos entre la mesa y la cintura
        const a = corona[Math.min(4, Math.round(i * 4 / 6))], b = corona[Math.min(4, Math.round((i + 1) * 4 / 6))];
        const t = i / 5, col = mezcla(p.claro, p.oscuro, 0.1 + 0.5 * Math.abs(t - 0.3));
        fac += `<path d="${poli([a, cinturaP[i], cinturaP[i + 1], b])}" fill="${!simple && i % 2 ? mezcla(col, prisma[i], 0.3) : col}"/>`;
      }
      for (let i = 0; i < 6; i++) {    // pabellón: gajos hacia la punta
        const t = i / 5, col = mezcla(p.base, p.oscuro, 0.15 + 0.6 * t);
        fac += `<path d="${poli([cinturaP[i], cinturaP[i + 1], punta])}" fill="${!simple && i % 2 === 0 ? mezcla(col, prisma[(i + 3) % 6], 0.28) : col}"/>`;
      }
      fac += `<path d="${poli([tabla[0], tabla[1], [80, 24], [48, 24]])}" fill="url(#${P}mesa)"/>`;
      if (!simple) fac += `<path d="${cinturaP.map((q) => `M${q[0]} ${q[1]} L64 124`).join(" ")} ${corona.map((q, i) => `M${q[0]} ${q[1]} L${cinturaP[Math.min(6, i * 1.5 | 0)][0]} 42`).join(" ")} M6 42 H122" stroke="#ffffff" stroke-opacity="0.55" stroke-width="0.7"/>`;
      cuerpoSvg = sombra(d, 60, simple ? 2.5 : 3) +
        `<path d="${d}" fill="${p.oscuro}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 3 : 1.8}" stroke-linejoin="round"/>` +
        `<g transform="${escala(0.96, 60)}">${fac}</g>` +
        `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${simple ? 2.4 : 1.6}" transform="${escala(0.97, 60)}"/>` +
        `<clipPath id="${P}recorte"><path d="${d}"/></clipPath>` + (anim && anim.barrido ? `<g clip-path="url(#${P}recorte)">${barridoSvg(P, c)}</g>` : "");
    } else if (o.escalones) {
      const pts = o.puntos(), d = poli(pts);
      let esc = "";
      const niveles = simple ? [1, 0.7] : [1, 0.84, 0.7, 0.56];
      const cx = 64, cyG = 58, tono = [0.6, 0.3, -0.2, -0.5, -0.65, -0.4, 0.1, 0.5];
      for (let k = 0; k < niveles.length - 1; k++) {
        const A = pts.map(([x, y]) => [cx + (x - cx) * niveles[k] * 0.965, cyG + (y - cyG) * niveles[k] * 0.965]);
        const B = pts.map(([x, y]) => [cx + (x - cx) * niveles[k + 1] * 0.965, cyG + (y - cyG) * niveles[k + 1] * 0.965]);
        for (let i = 0; i < 8; i++) { const j = (i + 1) % 8, t = tono[i] * (1 - k * 0.2) + (k % 2 ? 0.08 : -0.04);
          esc += `<path d="${poli([A[i], A[j], B[j], B[i]])}" fill="${t > 0 ? mezcla(p.base, p.claro, t) : mezcla(p.base, p.oscuro, -t)}"${simple ? "" : ` stroke="#ffffff" stroke-opacity="0.25" stroke-width="0.5"`}/>`; }
      }
      const mesa = pts.map(([x, y]) => [cx + (x - cx) * niveles[niveles.length - 1] * 0.965, cyG + (y - cyG) * niveles[niveles.length - 1] * 0.965]);
      esc += `<path d="${poli(mesa)}" fill="url(#${P}mesa)"/>`;
      if (!simple) esc += `<path d="${poli(pts.map(([x, y]) => [cx + (x - cx) * 0.3, cyG + (y - cyG) * 0.3]))}" fill="none" stroke="${p.oscuro}" stroke-opacity="0.3" stroke-width="0.7"/>`;
      cuerpoSvg = sombra(d, cyG, simple ? 2.5 : 3) +
        `<path d="${d}" fill="${p.oscuro}" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 3 : 1.8}" stroke-linejoin="round"/>` + esc +
        `<path d="${d}" fill="none" stroke="url(#${P}filo)" stroke-width="${simple ? 2.4 : 1.6}" transform="${escala(0.97, cyG)}"/>` +
        `<clipPath id="${P}recorte"><path d="${d}"/></clipPath>` + (anim && anim.barrido ? `<g clip-path="url(#${P}recorte)">${barridoSvg(P, c)}</g>` : "");
    } else {
      const ctr = o.centro || [64, 58];
      cuerpoSvg = cuerpoGema(P, p, o.puntos(), ctr[0], ctr[1], o.kMesa, { simple, barrido: anim && anim.barrido ? c : "" });
    }
  } else if (o.medallon) {
    const r = o.medallon.r, a = o.alas;
    if (a) defs += defsPlumas(P, a);
    if (o.aura) defs += rad(P + "aura", [[0, o.aura, 0.85], [0.5, o.aura, 0.3], [1, o.aura, 0]]);
    const d = circulo(64, cy, r);
    cuerpoSvg = (o.aura && !simple ? `<circle class="${c}-aura" cx="64" cy="${cy}" r="60" fill="url(#${P}aura)"/>` : "") +
      (o.detras ? o.detras(P, p, simple, c) : "") +
      sombra(circulo(64, cy, r + 5), cy, 2.5) +
      `<path d="${circulo(64, cy, r + 5)}" fill="url(#${P}oro)" stroke="#0d0d0d" stroke-opacity="0.7" stroke-width="${simple ? 2.4 : 1.4}"/>` +
      cuerpo(P, d, cy, p, { cara: 1, simple, barrido: anim && anim.barrido ? c : "",
        textura: (() => { let s = ""; for (let i = 0; i < 36; i++) { const g = rad2(i * 10); s += `<path d="M64 ${cy} L${f(64 + r * Math.cos(g))} ${f(cy + r * Math.sin(g))}" stroke="#ffffff" stroke-opacity="0.1" stroke-width="0.5"/>`; } return s; })() });
    defs += lin(P + "oro", [[0, "#fff4b8"], [0.3, "#f0c94f"], [0.55, "#b8860b"], [0.75, "#f7dc84"], [1, "#7a5406"]], 0, 0, 0.35, 1);
  } else {
    cuerpoSvg = cuerpo(P, o.d, cy, p, { cara: o.cara || 0.88, simple, textura: o.textura ? o.textura(P) : "", barrido: anim && anim.barrido ? c : "" }) +
      (o.extra ? o.extra(P, p, simple) : "");
  }
  const emblema = o.emblema(P, p, simple, anim && anim.destellos ? c : "");
  const k = o.escala * (simple ? 1.07 : 1);
  let cuerpoTodo = `<g transform="${escala(k, 58)}">${cuerpoSvg}${emblema}</g>`;
  // Sin división (y sin cinta), centrada en vertical. Leyenda ya está compuesta así.
  if (!num && n !== 15 && o.cy !== 64) cuerpoTodo = `<g transform="translate(0 ${f(64 - o.cy)})">${cuerpoTodo}</g>`;
  const ci = simple ? CINTA.simple : CINTA.completa;
  const cintaSvg = num ? cinta(P, p, ci.y, ci.alto, ci.ancho, num, simple) : "";
  const nombre = o.nombre + (num ? " " + num : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" class="liga liga-${nn}${simple ? " liga-32" : ""}" data-liga="${n}" role="img" aria-label="Liga ${nombre}">
<title>${nombre}</title>
<!-- Insignia de liga ${n}/15 · ${nombre}${simple ? " · versión de 32 px" : ""}. Diseño propio, generado por Gym/Scripts/insignias-ligas.mjs. -->
<defs>${defs}</defs>${anim ? estiloAnim(c, anim) : ""}
<g class="cuerpo">${cuerpoTodo}</g>
${cintaSvg}
</svg>
`;
}

// ═══════════════════════════ interfaz ═══════════════════════════
const hechas = new Map();
function svg(n, simple, numeral) {
  const num = n === 15 ? "" : numeral || "";
  const clave = n + (simple ? "s" : "") + num;
  if (!hechas.has(clave)) hechas.set(clave, montar(n, simple, num));
  return hechas.get(clave);
}
return { svg, total: L.length, nombres: L.map((o) => o.nombre) };
}
// ▲▲▲ INSIGNIAS · NÚCLEO
// ▼▼▼ CSS · gym-dashboard.css
// Copia generada de Gym/Dashboards/assets/gym-dashboard.css por Gym/Scripts/css-dashboard.mjs.
// No la edites aquí: edita el .css y ejecuta el script con --escribir (README §25).
function cssDashboard() {
  return "/* ═══════════════════════════════════════════════════════════════════════════\n   GYM DASHBOARD · sistema de diseño (README §25)\n   ÚNICA FUENTE de los estilos del dashboard. El dashboard no lee este archivo: lleva una copia\n   dentro de su bloque (entre las marcas «CSS · gym-dashboard.css») y la aplica en un único\n   <style id=\"gym-dashboard-css\">. Después de editarlo:\n       node Gym/Scripts/css-dashboard.mjs --escribir      (copia el CSS al dashboard)\n       node Gym/Scripts/css-dashboard.mjs --comprobar     (0 si coinciden, 1 si no)\n   Todo va bajo .gym-dashboard (la clase de la nota, `cssclasses: gym-dashboard`): no afecta a\n   ninguna otra nota. Sin estos estilos, el dashboard funciona con sus estilos en línea.\n\n   Cómo funciona:\n   · Dentro de la nota redefine las variables del tema de Obsidian (--background-secondary,\n     --text-muted, --interactive-accent…): los estilos en línea del dashboard que las usan\n     toman este aspecto sin tocar el código.\n   · Da valor a las variables propias --gd-… que el código usa con respaldo\n     (var(--gd-radio, 8px)): sin estos estilos vale el respaldo.\n   · Estiliza las clases gd-… (tarjetas, cabeceras, pestañas, anillos, insignias).\n   Colores de grupo: Gym/Config/colores-grupos.md (los lee el dashboard, no este archivo).\n   ═══════════════════════════════════════════════════════════════════════════ */\n\n/* ─── AJUSTES · cámbialos aquí ─── */\n.gym-dashboard {\n  --gd-acento-oscuro: #C6F25A;   /* color de acento con el tema oscuro */\n  --gd-acento-claro: #4C7A00;    /* color de acento con el tema claro */\n  --gd-radio-tarjetas: 14px;     /* esquinas de tarjetas y secciones */\n}\n\n/* ─── Variables de diseño ─── */\n.gym-dashboard {\n  --gd-radio: var(--gd-radio-tarjetas);\n  --gd-radio-s: 10px;\n  --gd-fs-s: 13px;\n  --gd-fs-m: 16px;\n  --gd-fs-l: 28px;\n  --gd-esp: 12px;\n  /* Ancho completo: sin el ancho de lectura limitado de Obsidian */\n  --file-line-width: 100%;\n  font-size: var(--gd-fs-m);\n  line-height: 1.4;\n  -webkit-font-smoothing: antialiased;\n}\n.theme-dark .gym-dashboard {\n  --gd-fondo: #0B0C0F;\n  --gd-tarjeta: #16181D;\n  --gd-tarjeta-2: #1D2026;\n  --gd-borde: rgba(255, 255, 255, 0.07);\n  --gd-texto: #ECEEF2;\n  --gd-texto-2: #8D93A1;\n  --gd-texto-3: #5E6472;\n  --gd-pista: rgba(255, 255, 255, 0.08);\n  --gd-acento: var(--gd-acento-oscuro);\n  --gd-sobre-acento: #0B0C0F;\n  --gd-sombra: 0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 8px 24px rgba(0, 0, 0, 0.35);\n  --gd-ok: #4FC48E;\n  --gd-aviso: #F2B84B;\n  --gd-mal: #F2727F;\n}\n.theme-light .gym-dashboard {\n  --gd-fondo: #F3F4F6;\n  --gd-tarjeta: #FFFFFF;\n  --gd-tarjeta-2: #F6F7F9;\n  --gd-borde: rgba(15, 20, 30, 0.08);\n  --gd-texto: #14161A;\n  --gd-texto-2: #646A78;\n  --gd-texto-3: #9AA0AC;\n  --gd-pista: rgba(15, 20, 30, 0.08);\n  --gd-acento: var(--gd-acento-claro);\n  --gd-sobre-acento: #FFFFFF;\n  --gd-sombra: 0 1px 2px rgba(15, 20, 30, 0.06), 0 6px 18px rgba(15, 20, 30, 0.06);\n  --gd-ok: #17804F;\n  --gd-aviso: #A36A00;\n  --gd-mal: #C73A50;\n}\n/* Las variables del tema de Obsidian, redefinidas sólo dentro de la nota */\n.theme-dark .gym-dashboard, .theme-light .gym-dashboard {\n  --background-primary: var(--gd-fondo);\n  --background-primary-alt: var(--gd-tarjeta-2);\n  --background-secondary: var(--gd-tarjeta);\n  --background-secondary-alt: var(--gd-tarjeta-2);\n  --background-modifier-border: var(--gd-borde);\n  --background-modifier-hover: var(--gd-tarjeta-2);\n  --text-normal: var(--gd-texto);\n  --text-muted: var(--gd-texto-2);\n  --text-faint: var(--gd-texto-3);\n  --interactive-accent: var(--gd-acento);\n  --interactive-accent-hover: var(--gd-acento);\n  --text-accent: var(--gd-acento);\n  --text-on-accent: var(--gd-sobre-acento);\n  --color-green: var(--gd-ok);\n  --color-orange: var(--gd-aviso);\n  --color-yellow: var(--gd-aviso);\n  --color-red: var(--gd-mal);\n  background-color: var(--gd-fondo);\n  color: var(--gd-texto);\n}\n\n/* ─── Lo que sobra de Obsidian en esta nota ─── */\n.gym-dashboard .inline-title,\n.gym-dashboard .metadata-container,\n.gym-dashboard .frontmatter-container,\n.gym-dashboard .mod-header .frontmatter { display: none; }\nbody.is-phone .gym-dashboard { --file-margins: 8px 12px; }\n.gym-dashboard .block-language-dataviewjs { margin: 0; }\n\n/* ─── Tipografía: tres tamaños ─── */\n.gym-dashboard .gd-texto-sec,\n.gym-dashboard .gd-sec-dato,\n.gym-dashboard .gd-kpi-cab,\n.gym-dashboard .gd-tab,\n.gym-dashboard .gd-anillo-estado,\n.gym-dashboard .gd-anillo-nombre { font-size: var(--gd-fs-s) !important; }\n.gym-dashboard .gd-num-m,\n.gym-dashboard .gd-num-l,\n.gym-dashboard .gd-hoy-rutina { font-size: var(--gd-fs-l) !important; font-weight: 750 !important; letter-spacing: -0.02em; line-height: 1.12 !important; }\n.gym-dashboard .gd-num-s,\n.gym-dashboard .gd-sec-tit,\n.gym-dashboard h4, .gym-dashboard h5 { font-size: var(--gd-fs-m) !important; }\n.gym-dashboard h4, .gym-dashboard h5 { font-weight: 700; color: var(--gd-texto); }\n.gym-dashboard .gd-num-s, .gym-dashboard .gd-num-m, .gym-dashboard .gd-num-l,\n.gym-dashboard .gd-lista-der, .gym-dashboard .gd-kpi { font-variant-numeric: tabular-nums; }\n\n/* ─── Tarjetas y secciones ─── */\n.gym-dashboard .gd-tarjeta { border-color: var(--gd-borde); }\n.gym-dashboard .gd-sec { background: var(--gd-tarjeta); border-color: var(--gd-borde); margin: 0 0 10px !important; }\n.gym-dashboard .gd-sec .gd-tarjeta { background: var(--gd-tarjeta-2); box-shadow: none; }\n.gym-dashboard .gd-sec .gd-sec { background: transparent; box-shadow: none; border-width: 1px 0 0 0; border-radius: 0; margin: 6px 0 0 !important; }\n.gym-dashboard .gd-sec-cab {\n  display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 0 14px !important;\n  list-style: none; font-weight: 700; -webkit-tap-highlight-color: transparent;\n}\n.gym-dashboard .gd-sec-cab::-webkit-details-marker { display: none; }\n.gym-dashboard .gd-sec-cab::marker { content: \"\"; }\n.gym-dashboard .gd-sec-cab > .gd-sec-ico { margin: 0 !important; color: var(--gd-acento); }\n.gym-dashboard .gd-sec-tit { flex: 0 0 auto; white-space: nowrap; }\n.gym-dashboard .gd-sec-dato {\n  display: block; flex: 1 1 auto; min-width: 0; margin-left: 6px !important; text-align: right;\n  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;\n}\n/* Flecha a la derecha, dibujada con el icono chevron-down de Lucide como máscara */\n.gym-dashboard .gd-sec-cab::after {\n  content: \"\"; flex: 0 0 16px; width: 16px; height: 16px; background: var(--gd-texto-2);\n  -webkit-mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") center / contain no-repeat;\n          mask: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\") center / contain no-repeat;\n  transform: rotate(-90deg); transition: transform 0.15s ease;\n}\n.gym-dashboard .gd-sec[open] > .gd-sec-cab::after { transform: none; }\n.gym-dashboard .gd-sec .gd-sec > .gd-sec-cab { min-height: 48px; padding: 0 !important; font-weight: 650; }\n.gym-dashboard .gd-sec-cuerpo { padding: 0 12px 12px !important; }\n.gym-dashboard .gd-sec .gd-sec .gd-sec-cuerpo { padding: 0 0 8px !important; }\n\n/* ─── Etiquetas ─── */\n.gym-dashboard .gd-chip {\n  display: inline-flex !important; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px !important;\n  border-radius: 999px !important; font-size: var(--gd-fs-s) !important; font-weight: 650;\n  background: var(--gd-tarjeta-2) !important; border: 1px solid var(--gd-borde) !important; color: var(--gd-texto-2) !important;\n}\n.gym-dashboard .gd-chip-acento { background: color-mix(in srgb, var(--gd-acento) 16%, transparent) !important;\n  color: var(--gd-acento) !important; border-color: color-mix(in srgb, var(--gd-acento) 38%, transparent) !important; }\n.gym-dashboard .gd-chip-verde { background: color-mix(in srgb, var(--gd-ok) 16%, transparent) !important;\n  color: var(--gd-ok) !important; border-color: color-mix(in srgb, var(--gd-ok) 38%, transparent) !important; }\n.gym-dashboard .gd-chip-naranja { color: var(--gd-aviso) !important; border-color: color-mix(in srgb, var(--gd-aviso) 38%, transparent) !important; }\n.gym-dashboard .gd-chip-sube { border-radius: var(--gd-radio-s) !important; }\n\n/* ─── Hoy toca ─── */\n.gym-dashboard .gd-hoy { position: relative; overflow: hidden; padding: 16px !important; border-left-width: 1px !important;\n  border-left-color: var(--gd-borde) !important; }\n.gym-dashboard .gd-hoy::before { content: \"\"; position: absolute; inset: 0; pointer-events: none;\n  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 62%); }\n.gym-dashboard .gd-hoy::after { content: \"\"; position: absolute; left: 0; top: 14px; bottom: 14px; width: 4px;\n  border-radius: 0 4px 4px 0; background: var(--c); }\n.gym-dashboard .gd-hoy > * { position: relative; }\n.gym-dashboard .gd-hoy-cambios { border-top-color: var(--gd-borde) !important; }\n.gym-dashboard .gd-hoy-cambios .gd-ico { color: var(--gd-acento); }\n\n/* ─── Cifras clave ─── */\n.gym-dashboard .gd-kpis { gap: 10px !important; }\n.gym-dashboard .gd-kpi { padding: 12px !important; min-height: 104px; justify-content: space-between; }\n@media (min-width: 700px) { .gym-dashboard .gd-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; } }\n\n/* ─── Controles: buscador y pestañas ─── */\n.gym-dashboard .gd-select, .gym-dashboard .gd-boton {\n  background: var(--gd-tarjeta-2) !important; color: var(--gd-texto) !important; border: 1px solid var(--gd-borde) !important;\n  box-shadow: none !important; border-radius: var(--gd-radio-s) !important;\n}\n.gym-dashboard .gd-tabs { padding: 4px; background: var(--gd-tarjeta-2); border: 1px solid var(--gd-borde); border-radius: 12px; }\n.gym-dashboard .gd-tab { background: transparent !important; color: var(--gd-texto-2) !important; border: 0 !important;\n  box-shadow: none !important; border-radius: 9px !important; font-weight: 600 !important; min-height: 48px !important; }\n.gym-dashboard .gd-tab[aria-selected=\"true\"] { background: var(--gd-tarjeta) !important; color: var(--gd-texto) !important;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important; }\n.gym-dashboard .gd-tab[aria-selected=\"true\"] .gd-ico { color: var(--gd-acento); }\n.gym-dashboard .gd-tab:active, .gym-dashboard .gd-boton:active, .gym-dashboard .gd-sec-cab:active { transform: scale(0.985); }\n\n/* ─── Progresión ─── */\n.gym-dashboard .gd-prog-sube { border-left-color: var(--gd-acento) !important; }\n.gym-dashboard .gd-prog-sube .gd-num-s .gd-ico { color: var(--gd-acento); }\n.gym-dashboard .gd-proxima { background: var(--gd-tarjeta) !important; }\n\n/* ─── Anillos, barras y minigráficos ─── */\n.gym-dashboard { --gd-pista-anillo: var(--gd-pista); }\n.gym-dashboard .gd-anillos { gap: 16px 6px !important; }\n.gym-dashboard .gd-barra { height: 6px !important; background: var(--gd-pista) !important; }\n\n/* ─── Ligas: insignias con resplandor del color de su liga ─── */\n.gym-dashboard .gd-ins { position: relative; }\n.gym-dashboard .gd-ins::before { content: \"\"; position: absolute; inset: -22%; border-radius: 50%; z-index: 0; opacity: 0.55;\n  background: radial-gradient(closest-side, color-mix(in srgb, var(--liga) 55%, transparent), transparent); pointer-events: none; }\n.gym-dashboard .gd-ins > svg { position: relative; z-index: 1; }\n.gym-dashboard .gd-ins-mini::before, .gym-dashboard .gd-esc .gd-ins::before { display: none; }\n.gym-dashboard .gd-liga-general, .gym-dashboard .gd-liga-tarjeta {\n  border-color: color-mix(in srgb, var(--liga, var(--gd-borde)) 45%, var(--gd-borde)) !important;\n  background: linear-gradient(160deg, color-mix(in srgb, var(--liga, transparent) 12%, var(--gd-tarjeta-2)), var(--gd-tarjeta-2) 55%) !important;\n}\n.gym-dashboard .gd-escalera { background: var(--gd-tarjeta) !important; }\n.gym-dashboard .gd-esc-tuya { outline-color: var(--gd-acento) !important; background: color-mix(in srgb, var(--gd-acento) 18%, transparent); }\n\n/* ─── Callouts dentro del dashboard ─── */\n.gym-dashboard .callout { border-radius: var(--gd-radio-s); }\n\n/* ─── Móvil ─── */\n@media (max-width: 480px) {\n  .gym-dashboard .gd-sec-cab { gap: 8px; padding: 0 12px !important; }\n  .gym-dashboard .gd-sec-cuerpo { padding: 0 10px 10px !important; }\n}\n";
}
// ▲▲▲ CSS · gym-dashboard.css
// Registro de entrenamientos: pantalla de sesión, historial y edición. Escribe el mismo formato
// que LiftOff (frontmatter de Workouts/*.md), así el dashboard lo lee sin cambios.
import { S, save } from "./store.js";
import { h, toast, hoja, confirmar, iso, hhmm, canon, num, numTxt, fmt, kg, haptic, icono, pantalla, grupo, fila, cabeceraHoja, alCambiarViewport, tecladoAbierto, deslizable, reducido } from "./ui.js";
import { ejecutarDashboard } from "./dvshim.js";
import { estadoCopia, textoAviso, exportar } from "./copia.js";
import { objetivoDe, textoObjetivo, editarObjetivo } from "./editores.js";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const CFG = { grupos: "Gym/Config/grupos-musculares.md", unil: "Gym/Config/unilaterales.md", horario: "Gym/Config/horario-semanal.md", peso: "Gym/Config/peso-corporal.md", objetivos: "Gym/Config/objetivos.md" };
const TIPOS = ["", "warmup", "failure", "drop"], ETQ = { "": "·", warmup: "W", failure: "F", drop: "D" }, CL = { "": "", warmup: "w", failure: "f", drop: "d" };
const NOMBRE_TIPO = { warmup: "Calentamiento", failure: "Al fallo", drop: "Drop set" };
const fFecha = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" });
const fMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const deISO = (d) => new Date(d + "T12:00:00");
const fechaCorta = (d) => fFecha.format(deISO(d)).replace(/\./g, "");

let navegar = () => {};
let raiz = null;
let ed = null;            // sesión en curso en memoria (S.draft es su copia persistente)
let descanso = null;      // { fin, total, avisado } con timestamps absolutos
let tick = null, wake = null;

// ───────── análisis en segundo plano (para «Próxima vez») ─────────
let corriendo = false;
export async function refrescarAnalisis() {
  if (corriendo) return; corriendo = true;
  try { const c = document.createElement("div"); c.style.display = "none"; document.body.append(c); await ejecutarDashboard(c); c.remove(); }
  catch (e) { console.warn("análisis:", e); }
  corriendo = false;
}

// ───────── utilidades de datos ─────────
const grupoDe = (n) => { try { return window.__gym ? window.__gym.grupoDe(n) : ""; } catch (e) { return ""; } };
const esUnilateral = (n) => { try { return !!(window.__gym && window.__gym.UNILATERALES && window.__gym.UNILATERALES.set.has(canon(n))); } catch (e) { return false; } };
const ordenadas = () => S.sessions.slice().sort((a, b) => (b.fm.date + (b.fm.start || "")).localeCompare(a.fm.date + (a.fm.start || "")));
function ultimaDe(nombre, excluir) {
  const k = canon(nombre);
  for (const s of ordenadas()) {
    if (excluir && s.path === excluir) continue;
    const ex = (s.fm.exercises || []).find((e) => canon(e.name) === k);
    if (ex && ex.sets && ex.sets.length) return { s, ex };
  }
  return null;
}
export function gruposEnUso() {
  const set = new Set(); const t = S.configs[CFG.grupos] || "";
  for (const l of t.split("\n")) { const m = l.match(/^[^:\n>`]+::\s*(.+)$/); if (m) set.add(m[1].trim()); }
  return Array.from(set);
}
export function lineaConfig(clave, linea) {
  S.configs[clave] = (S.configs[clave] || "").replace(/\s*$/, "") + "\n" + linea + "\n";
  return save("configs");
}
// Una línea por día: si ya hay una de hoy se reemplaza (y se quitan duplicados de hoy).
export async function apuntarPeso(x, dia = iso()) {
  const linea = dia + ":: " + numTxt(x) + " kg";
  const lineas = (S.configs[CFG.peso] || "").split("\n");
  const esHoy = (l) => l.startsWith(dia + "::");
  if (!lineas.some(esHoy)) { await lineaConfig(CFG.peso, linea); return false; }
  let puesta = false;
  const res = [];
  for (const l of lineas) { if (!esHoy(l)) res.push(l); else if (!puesta) { res.push(linea); puesta = true; } }
  S.configs[CFG.peso] = res.join("\n"); await save("configs");
  return true;
}
const horarioHoy = () => {
  const t = S.configs[CFG.horario] || ""; const d = DIAS[new Date().getDay()];
  const m = t.match(new RegExp("^" + d + "::[ \\t]*(.+)$", "mi")); return m ? m[1].trim() : null;
};
const series = (fm) => (fm.exercises || []).reduce((a, e) => a + e.sets.length, 0);

// ───────── sesión ─────────
function crearSesion(plantilla) {
  const t = S.templates.find((x) => x.fm.name === plantilla);
  const w = { template: plantilla || "Workout", date: iso(), start: Date.now(), editPath: null, exercises: [] };
  for (const e of (t ? t.fm.exercises : [])) w.exercises.push(nuevoEj(e.name, e.targetSets || 3));
  return w;
}
function nuevoEj(name, n) {
  const prev = ultimaDe(name);
  const sets = [];
  const base = prev ? prev.ex.sets.filter((s) => !s.setType || s.setType === "working") : [];
  for (let i = 0; i < n; i++) {
    const p = base[Math.min(i, base.length - 1)];
    sets.push({ weight: p ? numTxt(p.weight) : "", reps: p ? String(p.reps) : "", setType: "", done: false });
  }
  return { name, target: n, sets };
}
const persistir = () => { S.draft = ed && !ed.editPath ? ed : null; return save("draft"); };

function aFm(w) {
  const fin = new Date();
  const exs = w.exercises.map((e) => ({ name: e.name, sets: e.sets.filter((s) => s.done && num(s.reps) > 0).map((s) => {
    const o = { weight: num(s.weight), reps: Math.round(num(s.reps)), unit: "kg" }; if (s.setType) o.setType = s.setType; return o; }) })).filter((e) => e.sets.length);
  return { exs, fin };
}

async function terminar() {
  const sinMarcar = ed.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.done && (s.weight !== "" || s.reps !== "")).length, 0);
  const { exs, fin } = aFm(ed);
  if (!exs.length) { if (await confirmar("No hay ninguna serie marcada. ¿Descartar la sesión?", "Descartar sesión", true)) { ed = null; await persistir(); apagarTimers(); pintar(); } return; }
  if (sinMarcar && !(await confirmar(sinMarcar + (sinMarcar === 1 ? " serie sin marcar se descartará." : " series sin marcar se descartarán."), ed.editPath ? "Guardar" : "Terminar sesión"))) return;
  const w = ed;
  let fm, path;
  if (w.editPath) {
    const s = S.sessions.find((x) => x.path === w.editPath); path = s.path;
    fm = Object.assign({}, s.fm, { exercises: exs }); s.fm = fm;
  } else {
    const ini = new Date(w.start);
    fm = { type: "workout", template: w.template, date: iso(ini), start: hhmm(ini), end: hhmm(fin), duration: Math.max(1, Math.round((fin - ini) / 60000)), exercises: exs };
    path = "Workouts/" + fm.date + " " + w.template + ".md"; let n = 2;
    while (S.sessions.some((x) => x.path === path)) path = "Workouts/" + fm.date + " " + w.template + " " + n++ + ".md";
    S.sessions.push({ path, fm });
  }
  ed = null; apagarTimers();
  await save("sessions"); await persistir();
  haptic();
  refrescarAnalisis();
  resumen(fm, w.editPath ? () => navegar("historial") : () => navegar("dashboard"), !!w.editPath);
  pintar();
}

function resumen(fm, abrirDash, editada) {
  let nSeries = 0, vol = 0;
  for (const e of fm.exercises) for (const s of e.sets) { if (s.setType === "warmup" || s.setType === "drop") continue; nSeries++; vol += s.weight * s.reps * (esUnilateral(e.name) ? 2 : 1); }
  hoja((c) => h("div", { class: "resumen" },
    h("h1", { class: "t" }, editada ? "Sesión actualizada" : "Sesión guardada"),
    h("p", { class: "sub-t" }, (fm.template || "Workout") + " · " + fechaCorta(fm.date)),
    h("div", { class: "resumen-kpis" },
      h("div", null, h("b", null, fm.duration + " min"), h("span", null, "duración")),
      h("div", null, h("b", null, nSeries), h("span", null, "series")),
      h("div", null, h("b", null, fmt(vol)), h("span", null, "kg de volumen"))),
    h("div", { class: "botones" },
      h("button", { class: "btn pri blk", onclick: () => { c(); abrirDash(); } }, editada ? "Ver el historial" : "Ver el dashboard"),
      h("button", { class: "btn blk", onclick: () => c() }, "Cerrar"))), { clase: "resumen-hoja" });
}

// ───────── descanso ─────────
function apagarTimers() { clearInterval(tick); tick = null; descanso = null; document.querySelector(".descanso")?.remove(); document.body.classList.remove("con-descanso"); soltarPantalla(); }

// Wake Lock: iOS lo suelta al bloquear o salir de la app; se vuelve a pedir al volver.
async function pantallaActiva() {
  if (!navigator.wakeLock || wake || S.settings.keepScreenAwake === false || document.visibilityState !== "visible") return;
  try {
    const w = await navigator.wakeLock.request("screen");
    if (!ed) { w.release().catch(() => {}); return; }
    wake = w; w.addEventListener("release", () => { if (wake === w) wake = null; });
  } catch (e) {}
}
function soltarPantalla() { const w = wake; wake = null; try { w && w.release().catch(() => {}); } catch (e) {} }

// Audio: iOS solo deja sonar un AudioContext creado o reanudado dentro de un gesto. Se crea uno
// en el primer toque, se reanuda en cada toque si iOS lo ha suspendido y se reutiliza siempre.
let actx = null;
function desbloquearAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!actx) {
      actx = new AC();
      const b = actx.createBuffer(1, 1, 22050), src = actx.createBufferSource();   // sonido vacío: desbloquea en iOS
      src.buffer = b; src.connect(actx.destination); src.start(0);
    }
    if (actx.state !== "running") actx.resume().catch(() => {});
  } catch (e) {}
}
for (const t of ["pointerdown", "touchend", "keydown"]) document.addEventListener(t, desbloquearAudio, { capture: true, passive: true });
function tono(f, t, d) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = "sine"; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.03);
}
function pitido() {
  try {
    if (actx) {
      const sonar = () => { const t = actx.currentTime + 0.02; tono(880, t, 0.22); tono(1175, t + 0.28, 0.3); };
      if (actx.state === "running") sonar(); else actx.resume().then(sonar).catch(() => {});
    }
  } catch (e) {}
  haptic();
}

// Al volver a la app (desbloquear, cambiar de app): el descanso se recalcula con timestamps
// absolutos, se reanuda el audio, se vuelve a pedir el Wake Lock y se guarda el borrador al salir.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (ed) { pintarReloj(); pantallaActiva(); }
    if (actx && actx.state !== "running") actx.resume().catch(() => {});
  } else if (ed) persistir();
});
addEventListener("pagehide", () => { if (ed) persistir(); });

function iniciarDescanso(seg) {
  descanso = { fin: Date.now() + seg * 1000, total: seg, avisado: false };
  guardarDescanso();
  arrancarTick();
  pintarReloj();
}
function arrancarTick() { clearInterval(tick); tick = setInterval(pintarReloj, descanso ? 250 : 1000); }
// El descanso va en el borrador para sobrevivir a que iOS cierre la app.
function guardarDescanso() { if (ed && !ed.editPath) { ed.rest = descanso ? { fin: descanso.fin, total: descanso.total, avisado: descanso.avisado } : null; persistir(); } }
const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
function pintarReloj() {
  const r = document.querySelector("[data-reloj]"); if (r && ed && !ed.editPath) r.textContent = mmss((Date.now() - ed.start) / 1000);
  let d = document.querySelector(".descanso");
  const info = document.querySelector(".bt-info");
  if (!descanso || !ed) {
    if (d) { d.remove(); document.body.classList.remove("con-descanso"); arrancarTick(); }
    if (info) pintarInfoTeclado(info);
    return;
  }
  const resto = (descanso.fin - Date.now()) / 1000;
  if (resto <= 0 && !descanso.avisado) { descanso.avisado = true; guardarDescanso(); if (resto > -8) pitido(); }
  if (resto <= -8) { descanso = null; guardarDescanso(); pintarReloj(); return; }
  if (!d) {
    d = h("div", { class: "descanso", role: "timer" },
      h("div", { class: "t" }, h("small", null, "Descanso"), h("span", { "data-t": 1 })),
      h("div", { class: "row sp", style: { justifyContent: "flex-end", gap: "6px" } },
        h("button", { class: "btn", "aria-label": "Quitar 15 segundos", onclick: () => { descanso.fin -= 15000; guardarDescanso(); pintarReloj(); } }, "−15"),
        h("button", { class: "btn", "aria-label": "Añadir 15 segundos", onclick: () => { descanso.fin += 15000; descanso.total += 15; descanso.avisado = false; guardarDescanso(); pintarReloj(); } }, "+15"),
        h("button", { class: "btn", onclick: () => { descanso = null; guardarDescanso(); pintarReloj(); } }, "Saltar")),
      h("div", { class: "barra", "data-b": 1 }));
    document.body.append(d); document.body.classList.add("con-descanso");
  }
  d.classList.toggle("ya", resto <= 0);
  d.querySelector("[data-t]").textContent = resto > 0 ? mmss(resto) : "¡Ya!";
  d.querySelector("[data-b]").style.width = Math.max(0, Math.min(100, (resto / descanso.total) * 100)) + "%";
  if (info) pintarInfoTeclado(info);
}

// ───────── barra sobre el teclado: − / + · Siguiente · ✓ ─────────
const campos = new WeakMap();   // input → { e, s, campo, marcar }
let barra = null, campoActivo = null;
const pasoDe = (campo) => campo === "weight" ? (num(S.settings.weightStep) || 2.5) : 1;
function pintarInfoTeclado(info) {
  if (descanso) { const r = (descanso.fin - Date.now()) / 1000; info.replaceChildren(h("b", null, r > 0 ? mmss(r) : "¡Ya!"), "descanso"); return; }
  const c = campoActivo && campos.get(campoActivo);
  info.replaceChildren(c ? (c.campo === "weight" ? "kg · paso " + kg(pasoDe("weight")) : "repeticiones") : "");
}
function crearBarraTeclado() {
  if (barra) return barra;
  const sinFoco = (b) => { b.addEventListener("pointerdown", (e) => e.preventDefault()); b.addEventListener("mousedown", (e) => e.preventDefault()); return b; };
  const ajustar = (signo) => {
    const inp = campoActivo, c = inp && campos.get(inp); if (!c) return;
    const v = Math.max(0, num(inp.value) + signo * pasoDe(c.campo));
    inp.value = c.campo === "reps" ? String(Math.round(v)) : numTxt(v);
    inp.dispatchEvent(new Event("input")); haptic();
  };
  barra = h("div", { class: "barra-teclado", role: "toolbar", "aria-label": "Ajustes de la serie" },
    sinFoco(h("button", { "aria-label": "Restar", onclick: () => ajustar(-1) }, icono("menos"))),
    sinFoco(h("button", { "aria-label": "Sumar", onclick: () => ajustar(1) }, icono("mas"))),
    h("div", { class: "bt-info" }),
    sinFoco(h("button", { "aria-label": "Marcar serie hecha", onclick: () => { const c = campoActivo && campos.get(campoActivo); if (c) { const inp = campoActivo; c.marcar(true); siguienteFila(inp); } } }, icono("check"))),
    sinFoco(h("button", { class: "bt-sig", onclick: () => siguiente(campoActivo) }, "Siguiente", icono("siguiente"))));
  document.body.append(barra);
  return barra;
}
const camposSesion = () => raiz ? Array.from(raiz.querySelectorAll(".serie input")) : [];
function siguiente(inp) {
  const l = camposSesion(), i = l.indexOf(inp);
  if (i >= 0 && i < l.length - 1) enfocar(l[i + 1]); else inp && inp.blur();
}
function siguienteFila(inp) {
  const l = camposSesion(), i = l.indexOf(inp); if (i < 0) return;
  const c = campos.get(inp);
  const j = l.findIndex((x, k) => k > i && campos.get(x).campo === "weight" && campos.get(x).s !== c.s && !campos.get(x).s.done);
  if (j >= 0) enfocar(l[j]); else inp.blur();
}
function enfocar(inp) { inp.focus({ preventScroll: true }); try { inp.select(); } catch (e) {} asegurarVisible(); }
// Mantiene la fila activa entre la cabecera y el teclado (o la barra de pestañas).
function asegurarVisible() {
  const a = campoActivo; if (!a || !a.isConnected) return;
  const f = a.closest(".serie-wrap"); if (!f) return;
  const vv = window.visualViewport, r = f.getBoundingClientRect();
  const nav = document.querySelector(".nav"); const navB = nav ? nav.getBoundingClientRect().bottom : 0;
  const arriba = Math.max(navB, vv ? vv.offsetTop : 0) + 8;
  const abajoVis = vv ? vv.offsetTop + vv.height : innerHeight;
  const tapa = tecladoAbierto() ? 52 : Math.max(52, (document.querySelector("#tabs")?.offsetHeight || 0) + (document.querySelector(".descanso")?.offsetHeight || 0) + 16);
  const abajo = abajoVis - tapa - 8;
  const b = reducido() ? "auto" : "smooth";
  if (r.bottom > abajo) window.scrollBy({ top: r.bottom - abajo, behavior: b });
  else if (r.top < arriba) window.scrollBy({ top: r.top - arriba, behavior: b });
}
alCambiarViewport(() => { if (campoActivo) { clearTimeout(asegurarVisible.t); asegurarVisible.t = setTimeout(asegurarVisible, 60); } });
document.addEventListener("focusin", (e) => {
  if (!campos.has(e.target)) return;
  campoActivo = e.target; crearBarraTeclado().classList.add("activa");
  document.querySelectorAll(".serie.activa").forEach((x) => x.classList.remove("activa"));
  e.target.closest(".serie")?.classList.add("activa");
  pintarInfoTeclado(barra.querySelector(".bt-info"));
  setTimeout(asegurarVisible, 350);
});
document.addEventListener("focusout", (e) => {
  if (!campos.has(e.target)) return;
  setTimeout(() => { if (!campos.has(document.activeElement)) { campoActivo = null; barra && barra.classList.remove("activa"); document.querySelectorAll(".serie.activa").forEach((x) => x.classList.remove("activa")); } }, 0);
});

// ───────── pantalla de sesión ─────────
function pintar() { if (raiz) vistaEntrenar(raiz, navegar); }

function filaSerie(e, s, i, alBorrar) {
  const wrap = h("div", { class: "serie-wrap" });
  const fila = h("div", { class: "serie" + (s.done ? " hecha" : "") });
  const peso = h("input", { type: "text", inputmode: "decimal", enterkeyhint: "next", autocomplete: "off", value: s.weight, placeholder: "kg", "aria-label": "Peso, serie " + (i + 1) });
  const reps = h("input", { type: "text", inputmode: "numeric", enterkeyhint: "next", autocomplete: "off", value: s.reps, placeholder: "reps", "aria-label": "Repeticiones, serie " + (i + 1) });
  peso.addEventListener("input", () => { s.weight = peso.value; persistir(); });
  reps.addEventListener("input", () => { s.reps = reps.value; persistir(); });
  for (const inp of [peso, reps]) {
    inp.addEventListener("focus", () => { try { inp.select(); } catch (err) {} });
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); siguiente(inp); } });
  }
  const tp = h("button", { class: "tp " + CL[s.setType], type: "button", "aria-label": "Tipo de serie", onclick: () => {
    s.setType = TIPOS[(TIPOS.indexOf(s.setType) + 1) % TIPOS.length]; tp.textContent = ETQ[s.setType]; tp.className = "tp " + CL[s.setType]; persistir(); haptic();
    if (s.setType) toast(NOMBRE_TIPO[s.setType], 900);
  } }, ETQ[s.setType]);
  const marcar = (hecha) => {
    if (hecha === s.done) return;
    if (hecha && num(s.reps) <= 0) { enfocar(reps); return; }
    s.done = hecha; fila.classList.toggle("hecha", s.done); persistir(); pantallaActiva(); haptic();
    if (s.done && !ed.editPath) iniciarDescanso(S.settings.defaultRestDuration || 90);
    actualizarProgreso(e);
  };
  const ok = h("button", { class: "ok", type: "button", "aria-label": "Serie hecha", "aria-pressed": String(!!s.done), onclick: () => { marcar(!s.done); ok.setAttribute("aria-pressed", String(!!s.done)); } }, icono("check"));
  campos.set(peso, { e, s, campo: "weight", marcar }); campos.set(reps, { e, s, campo: "reps", marcar });
  fila.append(h("div", { class: "n" }, i + 1), peso, reps, tp, ok);
  wrap.append(h("button", { class: "serie-borrar", type: "button", tabindex: "-1", onclick: alBorrar }, icono("papelera"), "Borrar"), fila);
  deslizable(fila, alBorrar);
  return wrap;
}
const progresoEls = new Map();
function actualizarProgreso(e) {
  const el = progresoEls.get(e); if (!el) return;
  const n = e.sets.filter((s) => s.done).length, t = Math.max(e.target, e.sets.length);
  el.textContent = n + "/" + t; el.classList.toggle("completo", n > 0 && n >= e.sets.length);
}

function tarjetaEj(e) {
  const g = grupoDe(e.name), uni = esUnilateral(e.name);
  const prev = ultimaDe(e.name, ed.editPath);
  let prox = null;
  try { const p = window.__gym && window.__gym.progresionDe && window.__gym.progresionDe(e.name); if (p) prox = window.__gym.proximaVez(p); } catch (err) {}
  const obj = objetivoDe(e.name);
  const prog = h("span", { class: "ej-prog" });
  progresoEls.set(e, prog); actualizarProgreso(e);
  const lista = h("div");
  const pintarLista = () => { lista.replaceChildren(...e.sets.map((s, i) => filaSerie(e, s, i, () => borrarSerie(s)))); actualizarProgreso(e); };
  const borrarSerie = (s) => { const i = e.sets.indexOf(s); if (i < 0) return; e.sets.splice(i, 1); persistir(); pintarLista(); toast("Serie borrada", 1000); };
  pintarLista();
  return h("section", { class: "ej" },
    h("div", { class: "ej-cab" },
      h("div", { class: "ej-n" }, e.name, g && g !== "Sin categorizar" ? h("span", { class: "chip" }, g) : null, uni ? h("span", { class: "chip", style: { "--c": "var(--color-cyan)" } }, "por lado") : null),
      prog,
      h("button", { class: "ej-mas", type: "button", "aria-label": "Opciones de " + e.name, onclick: () => menuEj(e) }, icono("puntos"))),
    prev ? h("div", { class: "ant" }, "Anterior (" + prev.s.fm.date.slice(8) + "/" + prev.s.fm.date.slice(5, 7) + "): " + prev.ex.sets.map((s) => kg(s.weight) + "×" + s.reps + (s.setType ? ETQ[s.setType] : "")).join(" · ")) : h("div", { class: "ant" }, "Sin historial de este ejercicio"),
    prox || obj ? h("div", { class: "prox" }, prox ? "Próxima vez: " + prox : null,
      obj ? h("span", { class: "rango" }, (prox ? " · objetivo " : "Objetivo: ") + textoObjetivo(obj)) : null) : null,
    h("div", { class: "cols", "aria-hidden": "true" }, h("div", null, "#"), h("div", null, "kg"), h("div", null, "reps"), h("div", null, "tipo"), h("div", null, "")),
    lista,
    h("div", { class: "ej-pie" },
      h("button", { class: "btn", type: "button", onclick: () => {
        const u = e.sets[e.sets.length - 1]; e.sets.push({ weight: u ? u.weight : "", reps: u ? u.reps : "", setType: "", done: false }); persistir(); pintarLista(); haptic();
      } }, icono("mas"), "Serie")));
}

function menuEj(e) {
  const uni = esUnilateral(e.name);
  const i = ed.exercises.indexOf(e);
  hoja((c) => h("div", null,
    cabeceraHoja(e.name, null, h("button", { class: "nav-btn fuerte", onclick: () => c() }, "OK")),
    grupo(null, [
      i > 0 ? fila({ texto: "Subir", onclick: () => { c(); ed.exercises.splice(i, 1); ed.exercises.splice(i - 1, 0, e); persistir(); pintar(); }, sinChevron: true }) : null,
      i < ed.exercises.length - 1 ? fila({ texto: "Bajar", onclick: () => { c(); ed.exercises.splice(i, 1); ed.exercises.splice(i + 1, 0, e); persistir(); pintar(); }, sinChevron: true }) : null,
      fila({ texto: objetivoDe(e.name) ? "Objetivo: " + textoObjetivo(objetivoDe(e.name)) : "Fijar objetivo de repeticiones", sinChevron: true, onclick: () => { c(); editarObjetivo(e.name, async () => { await refrescarAnalisis(); pintar(); }); } }),
      fila({ texto: uni ? "Quitar «reps por lado»" : "Marcar como unilateral (reps por lado)", sinChevron: true, onclick: async () => {
        c();
        if (uni) { S.configs[CFG.unil] = S.configs[CFG.unil].split("\n").filter((l) => !(l.startsWith("unilateral::") && canon(l.slice(12)) === canon(e.name))).join("\n"); await save("configs"); }
        else await lineaConfig(CFG.unil, "unilateral:: " + e.name);
        await refrescarAnalisis(); pintar();
      } }),
    ]),
    grupo(null, [fila({ texto: "Quitar de la sesión", peligro: true, onclick: async () => { c(); if (await confirmar("¿Quitar «" + e.name + "» de esta sesión?", "Quitar", true)) { ed.exercises.splice(ed.exercises.indexOf(e), 1); persistir(); pintar(); } } })])));
}

// Hoja de búsqueda en la biblioteca. alElegir(nombre) recibe el ejercicio (existente o recién creado).
export function elegirEjercicio(alElegir, titulo = "Añadir ejercicio") {
  hoja((c) => {
    const q = h("input", { class: "campo", type: "search", placeholder: "Buscar o crear ejercicio", autocomplete: "off", enterkeyhint: "search", "aria-label": "Buscar ejercicio" });
    const cont = h("div");
    const pintarL = () => {
      const t = canon(q.value), filas = [];
      if (q.value.trim() && !S.library.some((x) => canon(x.name) === t))
        filas.push(fila({ texto: "Crear «" + q.value.trim() + "»", clase: "tinte", izq: icono("mas"), sinChevron: true, onclick: () => { c(); crearEjercicio(q.value.trim(), alElegir); } }));
      for (const l of S.library.filter((x) => canon(x.name).includes(t)).sort((a, b) => a.name.localeCompare(b.name, "es")).slice(0, 60))
        filas.push(fila({ texto: l.name, detalle: grupoDe(l.name) || "", sinChevron: true, onclick: () => { c(); alElegir(l.name); } }));
      cont.replaceChildren(filas.length ? grupo(null, filas) : h("div", { class: "vacio" }, "Escribe un nombre para crearlo."));
    };
    q.addEventListener("input", pintarL); pintarL();
    return h("div", null, cabeceraHoja(titulo, h("button", { class: "nav-btn", onclick: () => c() }, "Cancelar"), null),
      h("div", { class: "hoja-cuerpo", style: { paddingBottom: "16px" } }, q), cont);
  });
}
function anadirEjercicio() { elegirEjercicio((n) => { ed.exercises.push(nuevoEj(n, 3)); persistir(); pintar(); }); }

// Nuevo ejercicio: hay que elegir grupo muscular (no se preselecciona ninguno).
function crearEjercicio(nombre, alCrear) {
  const gs = gruposEnUso();
  let elegido = null;
  hoja((c) => {
    const btn = h("button", { class: "nav-btn fuerte", disabled: true, onclick: async () => {
      if (!elegido) return;
      c(); S.library.push({ name: nombre, exerciseType: "weight" }); await save("library");
      await lineaConfig(CFG.grupos, nombre + ":: " + elegido);
      await refrescarAnalisis();
      alCrear(nombre);
    } }, "Añadir");
    const filas = gs.map((g) => {
      const f = fila({ texto: g, sinChevron: true, der: icono("check", "ico marca"), onclick: () => {
        elegido = g; btn.disabled = false; haptic();
        f.parentElement.querySelectorAll(".celda").forEach((x) => x.classList.toggle("elegida", x === f));
      } });
      return f;
    });
    return h("div", { class: "elegir-grupo" }, cabeceraHoja("Grupo muscular", h("button", { class: "nav-btn", onclick: () => c() }, "Cancelar"), btn),
      h("p", { class: "pie", style: { margin: "0 32px 12px" } }, "¿A qué grupo muscular pertenece «" + nombre + "»?"),
      grupo(null, filas));
  });
}

function sesionActiva() {
  const editando = !!ed.editPath;
  const reloj = h("span", { "data-reloj": editando ? null : 1 }, editando ? fechaCorta(ed.date) : mmss((Date.now() - ed.start) / 1000));
  const { raiz: v, cuerpo, nav } = pantalla(editando ? "Editar · " + ed.template : ed.template, {
    grande: false, sub: reloj,
    izq: h("button", { class: "nav-btn peligro", onclick: async () => {
      if (await confirmar(editando ? "¿Salir sin guardar los cambios?" : "¿Descartar esta sesión? Se perderán las series.", editando ? "Salir sin guardar" : "Descartar sesión", true)) { ed = null; await persistir(); apagarTimers(); pintar(); } } }, editando ? "Cancelar" : "Descartar"),
    der: h("button", { class: "nav-btn pildora", onclick: terminar }, editando ? "Guardar" : "Terminar"),
  });
  nav.classList.add("sesion");
  progresoEls.clear();
  for (const e of ed.exercises) cuerpo.append(tarjetaEj(e));
  if (!ed.exercises.length) cuerpo.append(h("div", { class: "vacio" }, "Sesión vacía. Añade el primer ejercicio."));
  cuerpo.append(h("button", { class: "btn blk anadir-ej", onclick: anadirEjercicio }, icono("mas"), "Añadir ejercicio"));
  return v;
}

// ───────── inicio ─────────
function inicio() {
  const { raiz: v, cuerpo } = pantalla("Entrenar");
  const ec = estadoCopia();
  if (ec.avisar) cuerpo.append(h("div", { class: "aviso", role: "alert" }, icono("aviso"),
    h("div", { class: "sp" }, h("b", null, "Haz una copia de seguridad"), textoAviso(ec),
      h("button", { class: "btn sm pri", onclick: async () => { if (await exportar()) pintar(); } }, "Exportar ahora"))));
  const hoy = horarioHoy();
  const tpl = hoy && S.templates.find((t) => canon(t.fm.name) === canon(hoy));
  if (tpl) cuerpo.append(h("div", { class: "destacado" }, h("div", { class: "eti" }, "Hoy toca"), h("div", { class: "tit" }, tpl.fm.name),
    h("div", { class: "sub" }, tpl.fm.exercises.length + " ejercicios"),
    h("button", { class: "btn pri blk", onclick: () => empezar(tpl.fm.name) }, "Empezar")));
  else if (hoy) cuerpo.append(h("div", { class: "destacado" }, h("div", { class: "eti" }, "Hoy"), h("div", { class: "tit", style: { marginBottom: 0 } }, hoy)));

  cuerpo.append(grupo("Plantillas", [
    ...S.templates.map((t) => fila({ texto: t.fm.name, detalle: t.fm.exercises.length + " ej.", onclick: () => empezar(t.fm.name) })),
    fila({ texto: "Sesión vacía", clase: "tinte", onclick: () => empezar(null) }),
  ]));

  // Peso corporal
  const pi = h("input", { class: "inline", type: "text", inputmode: "decimal", enterkeyhint: "done", placeholder: "kg", "aria-label": "Peso de hoy en kg", style: { maxWidth: "90px" } });
  const apuntar = async () => {
    const x = num(pi.value); if (!x) { pi.focus(); return; }
    const cambiado = await apuntarPeso(x); pi.value = ""; pi.blur(); haptic(); toast(cambiado ? "Peso de hoy actualizado" : "Peso apuntado"); refrescarAnalisis();
  };
  pi.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); apuntar(); } });
  cuerpo.append(grupo("Peso corporal", [h("div", { class: "celda" }, h("div", { class: "celda-txt" }, "Hoy"), pi, h("button", { class: "btn sm pri", onclick: apuntar }, "Apuntar"))]));

  // Última sesión
  const u = ordenadas()[0];
  if (u) cuerpo.append(grupo("Última sesión", [fila({ texto: u.fm.template || "Workout", sub: fechaCorta(u.fm.date) + " · " + u.fm.duration + " min · " + series(u.fm) + " series", onclick: () => abrirSesion(u, () => pintar()) })]));
  return v;
}
function empezar(plantilla) {
  ed = crearSesion(plantilla); persistir(); pantallaActiva(); haptic(); pintar();
}

export function vistaEntrenar(cont, ir) {
  raiz = cont; navegar = ir;
  if (!ed && S.draft && !S.draft.editPath) {
    ed = S.draft;   // sesión recuperada tras cerrar o matar la app: start y descanso son timestamps absolutos
    if (ed.rest && !descanso && ed.rest.fin > Date.now() - 8000) descanso = { fin: ed.rest.fin, total: ed.rest.total, avisado: !!ed.rest.avisado };
  }
  cont.replaceChildren(ed ? sesionActiva() : inicio());
  if (ed) { arrancarTick(); pintarReloj(); pantallaActiva(); }
}
export const haySesion = () => !!ed;

// ───────── historial ─────────
export function abrirSesion(s, alCerrar) {
  hoja((c) => {
    const f = s.fm;
    return h("div", null,
      cabeceraHoja("", null, h("button", { class: "nav-btn fuerte", onclick: () => c() }, "OK")),
      h("h1", { class: "t" }, f.template || "Workout"),
      h("p", { class: "sub-t" }, fechaCorta(f.date) + (f.start ? " · " + f.start + "–" + f.end : "") + (f.duration ? " · " + f.duration + " min" : "")),
      ...(f.exercises || []).map((e) => grupo(e.name, e.sets.map((x, i) => fila({ texto: kg(x.weight) + " kg × " + x.reps, izq: h("span", { class: "celda-num" }, i + 1), detalle: x.setType ? NOMBRE_TIPO[x.setType] : null })))),
      grupo(null, [
        fila({ texto: "Editar sesión", clase: "tinte centro", sinChevron: true, onclick: () => { c(); editar(s); } }),
        fila({ texto: "Borrar sesión", peligro: true, onclick: async () => { if (await confirmar("¿Borrar esta sesión? No se puede deshacer.", "Borrar sesión", true)) { S.sessions.splice(S.sessions.indexOf(s), 1); await save("sessions"); c(); refrescarAnalisis(); toast("Sesión borrada"); alCerrar && alCerrar(); } } }),
      ]));
  });
}
function editar(s) {
  if (ed && !ed.editPath) { toast("Termina primero la sesión en curso"); return; }
  ed = { template: s.fm.template || "Workout", date: s.fm.date, start: Date.now(), editPath: s.path,
    exercises: (s.fm.exercises || []).map((e) => ({ name: e.name, target: e.sets.length, sets: e.sets.map((x) => ({ weight: numTxt(x.weight), reps: String(x.reps), setType: x.setType || "", done: true })) })) };
  navegar("entrenar");
}
export function vistaHistorial(cont) {
  const { raiz: v, cuerpo } = pantalla("Historial");
  const l = ordenadas();
  if (!l.length) cuerpo.append(h("div", { class: "vacio" }, "Aún no hay sesiones."));
  const meses = new Map();
  for (const s of l) { const k = s.fm.date.slice(0, 7); if (!meses.has(k)) meses.set(k, []); meses.get(k).push(s); }
  for (const [k, ss] of meses) {
    const t = fMes.format(deISO(k + "-01"));
    cuerpo.append(grupo(t, ss.map((s) => fila({ texto: s.fm.template || "Workout", sub: fechaCorta(s.fm.date) + (s.fm.duration ? " · " + s.fm.duration + " min" : "") + " · " + series(s.fm) + " series", onclick: () => abrirSesion(s, () => vistaHistorial(cont)) }))));
  }
  cont.replaceChildren(v);
}

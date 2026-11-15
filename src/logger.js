// Registro de entrenamientos: pantalla de sesión, historial y edición. Escribe el mismo formato
// que LiftOff (frontmatter de Workouts/*.md), así el dashboard lo lee sin cambios.
import { S, save } from "./store.js";
import { h, toast, hoja, confirmar, iso, hhmm, canon, num, fmt, kg } from "./ui.js";
import { ejecutarDashboard } from "./dvshim.js";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const CFG = { grupos: "Gym/Config/grupos-musculares.md", unil: "Gym/Config/unilaterales.md", horario: "Gym/Config/horario-semanal.md", peso: "Gym/Config/peso-corporal.md" };
const TIPOS = ["", "warmup", "failure", "drop"], ETQ = { "": "·", warmup: "W", failure: "F", drop: "D" }, CL = { "": "", warmup: "w", failure: "f", drop: "d" };

let navegar = () => {};
let raiz = null;
let ed = null;            // sesión en curso en memoria (S.draft es su copia persistente)
let descanso = null;      // { fin, total }
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
const esUnilateral = (n) => { try { return window.__gym && window.__gym.UNILATERALES && window.__gym.UNILATERALES.set.has(canon(n)); } catch (e) { return false; } };
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
function gruposEnUso() {
  const set = new Set(); const t = S.configs[CFG.grupos] || "";
  for (const l of t.split("\n")) { const m = l.match(/^[^:\n]+::\s*(.+)$/); if (m && !l.startsWith(">")) set.add(m[1].trim()); }
  return Array.from(set);
}
function lineaConfig(clave, linea) {
  S.configs[clave] = (S.configs[clave] || "").replace(/\s*$/, "") + "\n" + linea + "\n";
  return save("configs");
}
const horarioHoy = () => {
  const t = S.configs[CFG.horario] || ""; const d = DIAS[new Date().getDay()];
  const m = t.match(new RegExp("^" + d + "::[ \\t]*(.+)$", "mi")); return m ? m[1].trim() : null;
};

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
    sets.push({ weight: p ? String(p.weight).replace(".", ",") : "", reps: p ? String(p.reps) : "", setType: "", done: false });
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
  if (!exs.length) { if (await confirmar("No hay ninguna serie marcada. ¿Descartar la sesión?", "Descartar", true)) { ed = null; await persistir(); apagarTimers(); pintar(); } return; }
  if (sinMarcar && !(await confirmar(sinMarcar + (sinMarcar === 1 ? " serie sin marcar se descartará." : " series sin marcar se descartarán."), "Terminar"))) return;
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
  toast("Sesión guardada");
  refrescarAnalisis();
  resumen(fm, w.editPath ? () => navegar("historial") : () => navegar("dashboard"));
  pintar();
}

function resumen(fm, abrirDash) {
  let series = 0, vol = 0;
  for (const e of fm.exercises) for (const s of e.sets) { if (s.setType === "warmup" || s.setType === "drop") continue; series++; vol += s.weight * s.reps * (esUnilateral(e.name) ? 2 : 1); }
  hoja((c) => h("div", null,
    h("h1", { class: "t" }, "Sesión guardada"),
    h("div", { class: "card" }, h("div", { class: "row" },
      h("div", { class: "sp" }, h("div", { style: { fontSize: "26px", fontWeight: 700 } }, fm.duration + " min"), h("div", { class: "muted" }, "duración")),
      h("div", { class: "sp" }, h("div", { style: { fontSize: "26px", fontWeight: 700 } }, series), h("div", { class: "muted" }, "series")),
      h("div", { class: "sp" }, h("div", { style: { fontSize: "26px", fontWeight: 700 } }, fmt(vol)), h("div", { class: "muted" }, "kg de volumen")))),
    h("button", { class: "btn pri blk", onclick: () => { c(); abrirDash(); } }, "Ver el dashboard"),
    h("button", { class: "btn blk", style: { marginTop: "8px" }, onclick: c }, "Cerrar")));
}

// ───────── descanso ─────────
function apagarTimers() { clearInterval(tick); tick = null; descanso = null; document.querySelector(".descanso")?.remove(); try { wake && wake.release(); } catch (e) {} wake = null; }
async function pantallaActiva() { try { if (navigator.wakeLock && !wake && S.settings.keepScreenAwake !== false) wake = await navigator.wakeLock.request("screen"); } catch (e) {} }
function pitido() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = 0.2; o.start(); o.stop(a.currentTime + 0.25);
    setTimeout(() => { const o2 = a.createOscillator(); o2.connect(a.destination); o2.frequency.value = 1180; o2.start(); o2.stop(a.currentTime + 0.3); }, 300);
  } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
}
function iniciarDescanso(seg) {
  descanso = { fin: Date.now() + seg * 1000, total: seg, avisado: false };
  if (!tick) tick = setInterval(pintarReloj, 250);
  pintarReloj();
}
const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.max(0, Math.round(s % 60))).padStart(2, "0");
function pintarReloj() {
  const r = document.querySelector("[data-reloj]"); if (r && ed) r.textContent = mmss((Date.now() - ed.start) / 1000);
  let d = document.querySelector(".descanso");
  if (!descanso || !ed) { d && d.remove(); return; }
  const resto = (descanso.fin - Date.now()) / 1000;
  if (resto <= 0 && !descanso.avisado) { descanso.avisado = true; pitido(); }
  if (resto <= -8) { descanso = null; d && d.remove(); return; }
  if (!d) {
    d = h("div", { class: "descanso" },
      h("div", { class: "t", "data-t": 1 }),
      h("div", { class: "row sp", style: { justifyContent: "flex-end", flexWrap: "wrap" } },
        h("button", { class: "btn sm", onclick: () => { descanso.fin -= 15000; descanso.total = Math.max(descanso.total, 15); pintarReloj(); } }, "−15"),
        h("button", { class: "btn sm", onclick: () => { descanso.fin += 15000; descanso.total += 15; descanso.avisado = false; pintarReloj(); } }, "+15"),
        h("button", { class: "btn sm", onclick: () => { descanso = null; pintarReloj(); } }, "Saltar")),
      h("div", { class: "barra", "data-b": 1 }));
    d.style.bottom = "calc(env(safe-area-inset-bottom) + 78px)";
    document.body.append(d);
  }
  d.querySelector("[data-t]").textContent = resto > 0 ? mmss(resto) : "¡Ya!";
  d.querySelector("[data-b]").style.width = Math.max(0, Math.min(100, (resto / descanso.total) * 100)) + "%";
}

// ───────── pantalla de sesión ─────────
function pintar() { if (raiz) vistaEntrenar(raiz, navegar); }

function filaSerie(e, s, i) {
  const fila = h("div", { class: "serie" + (s.done ? " hecha" : "") });
  const peso = h("input", { type: "text", inputmode: "decimal", value: s.weight, placeholder: "kg", "aria-label": "Peso" });
  const reps = h("input", { type: "text", inputmode: "numeric", value: s.reps, placeholder: "reps", "aria-label": "Repeticiones" });
  peso.addEventListener("input", () => { s.weight = peso.value; persistir(); });
  reps.addEventListener("input", () => { s.reps = reps.value; persistir(); });
  for (const inp of [peso, reps]) inp.addEventListener("focus", () => inp.select());
  const tp = h("button", { class: "tp " + CL[s.setType], title: "Tipo de serie", onclick: () => {
    s.setType = TIPOS[(TIPOS.indexOf(s.setType) + 1) % TIPOS.length]; tp.textContent = ETQ[s.setType]; tp.className = "tp " + CL[s.setType]; persistir();
    if (s.setType) toast({ warmup: "Calentamiento", failure: "Al fallo", drop: "Drop set" }[s.setType], 900);
  } }, ETQ[s.setType]);
  const ok = h("button", { class: "ok", onclick: async () => {
    if (!s.done && (num(s.reps) <= 0)) { reps.focus(); return; }
    s.done = !s.done; fila.classList.toggle("hecha", s.done); persistir(); pantallaActiva();
    if (s.done && !ed.editPath) iniciarDescanso(S.settings.defaultRestDuration || 90);
    actualizarProgreso(e);
  } }, "✓");
  fila.append(h("div", { class: "n" }, i + 1), peso, reps, tp, ok);
  return fila;
}
const progresoEls = new Map();
function actualizarProgreso(e) { const el = progresoEls.get(e); if (el) el.textContent = e.sets.filter((s) => s.done).length + "/" + Math.max(e.target, e.sets.length); }

function tarjetaEj(e) {
  const g = grupoDe(e.name), uni = esUnilateral(e.name);
  const prev = ultimaDe(e.name, ed.editPath);
  let prox = null;
  try { const p = window.__gym && window.__gym.progresionDe && window.__gym.progresionDe(e.name); if (p) prox = window.__gym.proximaVez(p); } catch (err) {}
  const prog = h("span", { class: "muted", style: { marginLeft: "auto" } });
  progresoEls.set(e, prog); actualizarProgreso(e);
  const card = h("div", { class: "card ej" },
    h("div", { class: "row" }, h("div", { class: "ej-n" }, e.name, g && g !== "Sin categorizar" ? h("span", { class: "chip" }, g) : null, uni ? h("span", { class: "chip", style: { "--c": "var(--color-cyan)" } }, "reps por lado") : null),
      prog,
      h("button", { class: "btn sm", style: { padding: "4px 10px" }, "aria-label": "Más", onclick: () => menuEj(e) }, "⋯")),
    prev ? h("div", { class: "ant" }, "Anterior (" + prev.s.fm.date.slice(8) + "/" + prev.s.fm.date.slice(5, 7) + "): " + prev.ex.sets.map((s) => kg(s.weight) + "×" + s.reps + (s.setType ? ETQ[s.setType] : "")).join(" · ")) : h("div", { class: "ant" }, "Sin historial de este ejercicio"),
    prox ? h("div", { class: "prox" }, "Próxima vez: " + prox) : null,
    h("div", { class: "cols" }, h("div", null, "#"), h("div", null, "kg"), h("div", null, "reps"), h("div", null, "tipo"), h("div", null, "")));
  const lista = h("div");
  e.sets.forEach((s, i) => lista.append(filaSerie(e, s, i)));
  card.append(lista, h("div", { class: "row" },
    h("button", { class: "btn sm sp", onclick: () => { const u = e.sets[e.sets.length - 1]; e.sets.push({ weight: u ? u.weight : "", reps: u ? u.reps : "", setType: "", done: false }); persistir(); lista.append(filaSerie(e, e.sets[e.sets.length - 1], e.sets.length - 1)); actualizarProgreso(e); } }, "+ Serie"),
    h("button", { class: "btn sm", onclick: () => { if (e.sets.length > 1) { e.sets.pop(); lista.lastChild.remove(); persistir(); actualizarProgreso(e); } } }, "− Serie")));
  return card;
}

function menuEj(e) {
  const uni = esUnilateral(e.name);
  const cerrar = hoja((c) => h("div", { class: "lista-sel" },
    h("button", { onclick: async () => { c(); const i = ed.exercises.indexOf(e); if (i > 0) { ed.exercises.splice(i, 1); ed.exercises.splice(i - 1, 0, e); persistir(); pintar(); } } }, "Subir"),
    h("button", { onclick: async () => { c(); const i = ed.exercises.indexOf(e); if (i < ed.exercises.length - 1) { ed.exercises.splice(i, 1); ed.exercises.splice(i + 1, 0, e); persistir(); pintar(); } } }, "Bajar"),
    h("button", { onclick: async () => { c(); if (uni) { S.configs[CFG.unil] = S.configs[CFG.unil].split("\n").filter((l) => !(l.startsWith("unilateral::") && canon(l.slice(12)) === canon(e.name))).join("\n"); await save("configs"); } else await lineaConfig(CFG.unil, "unilateral:: " + e.name); await refrescarAnalisis(); pintar(); } }, uni ? "Quitar «reps por lado»" : "Marcar como unilateral (reps por lado)"),
    h("button", { style: { color: "var(--gd-mal)" }, onclick: async () => { c(); if (await confirmar("¿Quitar «" + e.name + "» de esta sesión?", "Quitar", true)) { ed.exercises.splice(ed.exercises.indexOf(e), 1); persistir(); pintar(); } } }, "Quitar de la sesión")));
}

function anadirEjercicio() {
  hoja((c) => {
    const q = h("input", { placeholder: "Buscar o crear ejercicio", autocomplete: "off" });
    const lista = h("div", { class: "lista-sel", style: { marginTop: "8px" } });
    const pintarL = () => {
      lista.replaceChildren();
      const t = canon(q.value);
      for (const l of S.library.filter((x) => canon(x.name).includes(t)).slice(0, 40))
        lista.append(h("button", { onclick: () => { c(); ed.exercises.push(nuevoEj(l.name, 3)); persistir(); pintar(); } }, l.name, h("span", { class: "muted" }, "  " + (grupoDe(l.name) || ""))));
      if (q.value.trim() && !S.library.some((x) => canon(x.name) === t))
        lista.append(h("button", { style: { color: "var(--gd-acento)" }, onclick: () => { c(); crearEjercicio(q.value.trim()); } }, "+ Crear «" + q.value.trim() + "»"));
    };
    q.addEventListener("input", pintarL); pintarL(); setTimeout(() => q.focus(), 50);
    return h("div", null, q, lista);
  });
}
function crearEjercicio(nombre) {
  const gs = gruposEnUso();
  hoja((c) => {
    const sel = h("select", null, ...gs.map((g) => h("option", { value: g }, g)));
    return h("div", null, h("p", { style: { margin: "0 0 10px" } }, "¿A qué grupo muscular pertenece «" + nombre + "»?"), sel,
      h("button", { class: "btn pri blk", style: { marginTop: "12px" }, onclick: async () => {
        c(); S.library.push({ name: nombre, exerciseType: "weight" }); await save("library");
        await lineaConfig(CFG.grupos, nombre + ":: " + sel.value);
        await refrescarAnalisis();
        ed.exercises.push(nuevoEj(nombre, 3)); persistir(); pintar();
      } }, "Añadir"));
  });
}

function sesionActiva() {
  const v = h("div");
  const titulo = ed.editPath ? "Editar · " + ed.template : ed.template;
  v.append(h("div", { class: "cab-ses" }, h("div", { class: "row" },
    h("div", { class: "sp" }, h("div", { class: "tit" }, titulo), ed.editPath ? h("div", { class: "reloj" }, ed.date) : h("div", { class: "reloj", "data-reloj": 1 }, mmss((Date.now() - ed.start) / 1000))),
    h("button", { class: "btn sm mal", onclick: async () => {
      if (await confirmar(ed.editPath ? "¿Salir sin guardar los cambios?" : "¿Descartar esta sesión? Se perderán las series.", "Descartar", true)) { ed = null; await persistir(); apagarTimers(); pintar(); } } }, ed.editPath ? "Salir" : "Descartar"),
    h("button", { class: "btn sm pri", onclick: terminar }, ed.editPath ? "Guardar" : "Terminar"))));
  progresoEls.clear();
  for (const e of ed.exercises) v.append(tarjetaEj(e));
  v.append(h("button", { class: "btn blk", onclick: anadirEjercicio }, "+ Añadir ejercicio"));
  return v;
}

// ───────── inicio ─────────
function inicio() {
  const v = h("div");
  v.append(h("h1", { class: "t" }, "Entrenar"));
  const hoy = horarioHoy();
  const tpl = hoy && S.templates.find((t) => canon(t.fm.name) === canon(hoy));
  if (tpl) v.append(h("div", { class: "card" }, h("div", { class: "muted" }, "Hoy toca"), h("div", { style: { fontSize: "22px", fontWeight: 700, margin: "2px 0 12px" } }, tpl.fm.name),
    h("button", { class: "btn pri blk", onclick: () => empezar(tpl.fm.name) }, "Empezar")));
  else if (hoy) v.append(h("div", { class: "card" }, h("div", { class: "muted" }, "Hoy"), h("div", { style: { fontSize: "22px", fontWeight: 700 } }, hoy)));
  v.append(h("h2", { class: "t" }, "Plantillas"));
  const l = h("div", { class: "card", style: { padding: "4px 14px" } });
  for (const t of S.templates) l.append(h("div", { class: "lista-sel" }, h("button", { onclick: () => empezar(t.fm.name) }, t.fm.name, h("span", { class: "muted" }, "  · " + t.fm.exercises.length + " ejercicios"))));
  l.append(h("div", { class: "lista-sel" }, h("button", { onclick: () => empezar(null) }, "Sesión vacía")));
  v.append(l);

  // Peso corporal
  const pi = h("input", { type: "text", inputmode: "decimal", placeholder: "Peso de hoy (kg)", style: { flex: 1 } });
  v.append(h("h2", { class: "t" }, "Peso corporal"));
  v.append(h("div", { class: "card row" }, pi, h("button", { class: "btn pri", onclick: async () => {
    const x = num(pi.value); if (!x) return;
    await lineaConfig(CFG.peso, iso() + ":: " + String(x).replace(".", ",") + " kg"); pi.value = ""; toast("Peso apuntado"); refrescarAnalisis();
  } }, "Apuntar")));

  // Última sesión
  const u = ordenadas()[0];
  if (u) {
    v.append(h("h2", { class: "t" }, "Última sesión"));
    v.append(h("div", { class: "card", onclick: () => abrirSesion(u, () => pintar()) }, h("b", null, u.fm.template), h("span", { class: "muted" }, "  " + u.fm.date.slice(8) + "/" + u.fm.date.slice(5, 7) + " · " + u.fm.duration + " min · " + (u.fm.exercises || []).reduce((a, e) => a + e.sets.length, 0) + " series")));
  }
  return v;
}
function empezar(plantilla) {
  ed = crearSesion(plantilla); persistir(); pantallaActiva(); pintar();
}

export function vistaEntrenar(cont, ir) {
  raiz = cont; navegar = ir;
  if (!ed && S.draft && !S.draft.editPath) { ed = S.draft; }
  document.body.classList.toggle("sin-tabs", false);
  cont.replaceChildren(ed ? sesionActiva() : inicio());
  if (ed) { pintarReloj(); if (!tick) tick = setInterval(pintarReloj, 1000); pantallaActiva(); }
}

// ───────── historial ─────────
export function abrirSesion(s, alCerrar) {
  hoja((c) => {
    const f = s.fm;
    return h("div", null,
      h("h1", { class: "t", style: { marginBottom: "2px" } }, f.template || "Workout"),
      h("div", { class: "muted", style: { marginBottom: "12px" } }, f.date + (f.start ? " · " + f.start + "–" + f.end : "") + (f.duration ? " · " + f.duration + " min" : "")),
      ...(f.exercises || []).map((e) => h("div", { class: "card", style: { padding: "10px 12px" } }, h("div", { style: { fontWeight: 700 } }, e.name),
        h("div", { class: "muted" }, e.sets.map((x) => kg(x.weight) + "×" + x.reps + (x.setType ? " " + ETQ[x.setType] : "")).join("  ·  ")))),
      h("div", { class: "row", style: { marginTop: "6px" } },
        h("button", { class: "btn sp", onclick: () => { c(); editar(s); } }, "Editar"),
        h("button", { class: "btn mal sp", onclick: async () => { if (await confirmar("¿Borrar esta sesión?", "Borrar", true)) { S.sessions.splice(S.sessions.indexOf(s), 1); await save("sessions"); c(); refrescarAnalisis(); toast("Sesión borrada"); alCerrar && alCerrar(); } } }, "Borrar")));
  });
}
function editar(s) {
  ed = { template: s.fm.template || "Workout", date: s.fm.date, start: Date.now(), editPath: s.path,
    exercises: (s.fm.exercises || []).map((e) => ({ name: e.name, target: e.sets.length, sets: e.sets.map((x) => ({ weight: String(x.weight).replace(".", ","), reps: String(x.reps), setType: x.setType || "", done: true })) })) };
  navegar("entrenar");
}
export function vistaHistorial(cont) {
  const v = h("div"); v.append(h("h1", { class: "t" }, "Historial"));
  const l = ordenadas();
  if (!l.length) v.append(h("div", { class: "vacio" }, "Aún no hay sesiones."));
  for (const s of l) v.append(h("div", { class: "card", onclick: () => abrirSesion(s, () => vistaHistorial(cont)) },
    h("div", { class: "row" }, h("b", { class: "sp" }, s.fm.template || "Workout"), h("span", { class: "muted" }, s.fm.date.slice(8) + "/" + s.fm.date.slice(5, 7) + "/" + s.fm.date.slice(2, 4))),
    h("div", { class: "muted" }, (s.fm.duration ? s.fm.duration + " min · " : "") + (s.fm.exercises || []).reduce((a, e) => a + e.sets.length, 0) + " series · " + (s.fm.exercises || []).length + " ejercicios")));
  cont.replaceChildren(v);
}

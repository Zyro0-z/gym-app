// Capa mínima de compatibilidad con la API de Dataview que usa el dashboard (README §8.1),
// más los ayudantes de DOM de Obsidian (createEl, createDiv…). El dashboard se ejecuta tal cual.
import { S } from "./store.js";

const DT = () => window.luxon.DateTime;

// ───────── ayudantes de DOM de Obsidian ─────────
function opts(o) { return typeof o === "string" ? { cls: o } : (o || {}); }
function aplicar(el, o) {
  if (o.cls) (Array.isArray(o.cls) ? o.cls : String(o.cls).split(/\s+/)).filter(Boolean).forEach((c) => el.classList.add(c));
  if (o.text != null) el.textContent = String(o.text);
  if (o.attr) for (const k of Object.keys(o.attr)) if (o.attr[k] != null) el.setAttribute(k, o.attr[k]);
  if (o.title != null) el.title = o.title;
  if (o.value != null) el.value = o.value;
  if (o.type != null) el.type = o.type;
  if (o.href != null) el.href = o.href;
  if (o.placeholder != null) el.placeholder = o.placeholder;
  return el;
}
const P = HTMLElement.prototype;
if (!P.createEl) {
  P.createEl = function (tag, o, cb) {
    const el = document.createElement(tag); aplicar(el, opts(o));
    const op = opts(o);
    if (op.prepend) this.insertBefore(el, this.firstChild); else this.appendChild(el);
    if (cb) cb(el); return el;
  };
  P.createDiv = function (o, cb) { return this.createEl("div", o, cb); };
  P.createSpan = function (o, cb) { return this.createEl("span", o, cb); };
  P.createSvg = function (tag, o, cb) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag); aplicar(el, opts(o));
    this.appendChild(el); if (cb) cb(el); return el;
  };
  P.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
  P.addClass = function (...c) { c.flat().forEach((x) => this.classList.add(x)); };
  P.addClasses = P.addClass;
  P.removeClass = function (...c) { c.flat().forEach((x) => this.classList.remove(x)); };
  P.toggleClass = function (c, on) { this.classList.toggle(c, on); };
  P.hasClass = function (c) { return this.classList.contains(c); };
  P.setText = function (t) { this.textContent = String(t); };
  P.setAttr = function (k, v) { this.setAttribute(k, v); };
  P.appendText = function (t) { this.appendChild(document.createTextNode(t)); };
  P.detach = function () { this.remove(); };
  P.find = function (s) { return this.querySelector(s); };
  P.findAll = function (s) { return Array.from(this.querySelectorAll(s)); };
}

// ───────── campos en línea de Dataview (clave:: valor) ─────────
const simple = (k) => k.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "");
function valor(raw) {
  const t = raw.trim();
  if (t === "") return null;
  const lit = (x) => {
    x = x.trim();
    if (/^-?\d+(\.\d+)?$/.test(x)) return { ok: true, v: Number(x) };
    if (/^(true|false)$/i.test(x)) return { ok: true, v: /^true$/i.test(x) };
    if (/^\d{4}-\d{2}-\d{2}$/.test(x)) { const d = DT().fromISO(x); if (d.isValid) return { ok: true, v: d }; }
    return { ok: false };
  };
  const u = lit(t);
  if (u.ok) return u.v;
  if (t.includes(",")) {
    const partes = t.split(",").map(lit);
    if (partes.every((p) => p.ok)) return partes.map((p) => p.v);
  }
  return t;
}
function parseConfig(path, texto) {
  const page = { file: { path, name: path.split("/").pop().replace(/\.md$/, ""), ext: "md" } };
  let cuerpo = texto;
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    cuerpo = texto.slice(m[0].length);
    for (const l of m[1].split("\n")) {
      const q = l.match(/^([^:\s][^:]*):\s*(.*)$/);
      if (q) page[q[1].trim()] = valor(q[2]) ?? q[2];
    }
  }
  const anadir = (k, v) => {
    if (v === null || k.includes("`")) return;   // ejemplos de la documentación, no campos
    for (const key of new Set([k, simple(k)])) {
      if (!key || key === "file") continue;
      if (key in page) page[key] = (Array.isArray(page[key]) ? page[key] : [page[key]]).concat(Array.isArray(v) ? [v] : [v]);
      else page[key] = v;
    }
  };
  for (const linea of cuerpo.split("\n")) {
    const r = linea.match(/^[\s>]*(?:[-*+]\s+)?(?:\*\*|__)?([^:\n]+?)(?:\*\*|__)?::[ \t]*(.*)$/);
    if (r) anadir(r[1].trim(), valor(r[2]));
  }
  return page;
}

// ───────── páginas ─────────
function paginaSesion(s) {
  const nombre = s.path.split("/").pop().replace(/\.md$/, "");
  const dia = /^\d{4}-\d{2}-\d{2}/.test(nombre) ? DT().fromISO(nombre.slice(0, 10)) : null;
  return Object.assign({}, JSON.parse(JSON.stringify(s.fm)), { file: { path: s.path, name: nombre, folder: "Workouts", day: dia, ext: "md" } });
}
function paginaPlantilla(s) {
  const nombre = s.path.split("/").pop().replace(/\.md$/, "");
  return Object.assign({}, JSON.parse(JSON.stringify(s.fm)), { file: { path: s.path, name: nombre, folder: "Workout Templates", ext: "md" } });
}

// ───────── Markdown (con callouts y wikilinks) ─────────
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function md(texto, inline) {
  let t = String(texto);
  t = t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, p, a) =>
    `<a class="internal-link" data-href="${esc(p)}" href="#">${esc(a || p.split("/").pop().replace(/\.md$/, ""))}</a>`);
  const html = inline ? window.marked.parseInline(t, { gfm: true, breaks: false }) : window.marked.parse(t, { gfm: true, breaks: false });
  const tpl = document.createElement("template"); tpl.innerHTML = html;
  tpl.content.querySelectorAll("blockquote").forEach((bq) => {
    const p = bq.querySelector("p");
    const m = p && p.innerHTML.match(/^\s*\[!([\w-]+)\]([+-]?)[ \t]*([^\n]*)\n?([\s\S]*)$/);
    if (!m) return;
    const d = document.createElement("div");
    d.className = "callout"; d.setAttribute("data-callout", m[1].toLowerCase());
    const cab = document.createElement("div"); cab.className = "callout-title";
    const ti = document.createElement("div"); ti.className = "callout-title-inner"; ti.innerHTML = m[3] || (m[1][0].toUpperCase() + m[1].slice(1));
    cab.appendChild(ti); d.appendChild(cab);
    const cont = document.createElement("div"); cont.className = "callout-content";
    if (m[4].trim()) { const pp = document.createElement("p"); pp.innerHTML = m[4]; cont.appendChild(pp); }
    Array.from(bq.children).slice(1).forEach((c) => cont.appendChild(c));
    if (cont.childNodes.length) d.appendChild(cont);
    if (m[2]) {
      d.classList.add("is-collapsible"); if (m[2] === "-") d.classList.add("is-collapsed");
      cab.addEventListener("click", () => d.classList.toggle("is-collapsed"));
    }
    bq.replaceWith(d);
  });
  return tpl.content;
}

// ───────── el objeto dv ─────────
export function crearDv(contenedor) {
  const dv = {
    container: contenedor,
    luxon: window.luxon,
    pages(fuente) {
      const f = String(fuente || "").replace(/^"|"$/g, "");
      const r = f === "Workouts" ? S.sessions.map(paginaSesion)
        : f === "Workout Templates" ? S.templates.map(paginaPlantilla) : [];
      r.array = () => r;
      return r;
    },
    page(ruta) {
      const p = String(ruta);
      const k = Object.keys(S.configs).find((x) => x === p || x === p + ".md" || x.replace(/\.md$/, "") === p);
      return k ? parseConfig(k, S.configs[k]) : undefined;
    },
    fileLink(ruta, embed, texto) {
      const o = { path: ruta, toString: () => "[[" + ruta + (texto ? "|" + texto : "") + "]]" };
      return o;
    },
    paragraph(texto, o) {
      const c = (o && o.container) || dv.container;
      const p = document.createElement("div"); p.className = "markdown-rendered";
      p.appendChild(md(String(texto)));
      c.appendChild(p); return p;
    },
    header(n, texto) { const h = document.createElement("h" + n); h.textContent = String(texto); dv.container.appendChild(h); return h; },
    el(tag, texto, o) {
      const c = (o && o.container) || dv.container;
      const e = document.createElement(tag); if (texto != null) e.textContent = String(texto); if (o && o.cls) e.className = o.cls;
      c.appendChild(e); return e;
    },
    table(cab, filas) {
      const t = document.createElement("table");
      const th = t.createTHead().insertRow();
      cab.forEach((h) => { const c = document.createElement("th"); c.textContent = h; th.appendChild(c); });
      const tb = t.createTBody();
      for (const f of filas) {
        const r = tb.insertRow();
        for (const v of f) { const c = r.insertCell(); c.appendChild(md(Array.isArray(v) ? v.join(", ") : String(v ?? ""), true)); }
      }
      dv.container.appendChild(t); return t;
    },
  };
  return dv;
}

// ───────── window.renderChart (Charts de Obsidian → Chart.js) ─────────
window.renderChart = function (cfg, el) {
  const c = document.createElement("canvas"); el.appendChild(c);
  return new window.Chart(c, cfg.chartOptions);
};

// ───────── ejecución del dashboard ─────────
let codigo = null;
export async function ejecutarDashboard(contenedor) {
  if (!codigo) codigo = await (await fetch("src/dashboard.js")).text();
  contenedor.innerHTML = "";
  contenedor.classList.add("gym-dashboard");
  const dv = crearDv(contenedor);
  const AF = Object.getPrototypeOf(async function () {}).constructor;
  // Se exponen las funciones de progresión para usarlas también desde el registro de series.
  const fn = new AF("dv", codigo + "\n;window.__gym = { progresionDe: typeof progresionDe === 'function' ? progresionDe : null, proximaVez: typeof proximaVez === 'function' ? proximaVez : null, canon: canon, grupoDe: grupoDe, UNILATERALES: typeof UNILATERALES !== 'undefined' ? UNILATERALES : null };");
  await fn(dv);
}

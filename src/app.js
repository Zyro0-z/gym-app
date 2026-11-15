import { S, load, save, exportJSON, importJSON, vacio } from "./store.js";
import { h, $, toast, hoja, confirmar, iso, canon } from "./ui.js";
import { ejecutarDashboard } from "./dvshim.js";
import { vistaEntrenar, vistaHistorial, abrirSesion, refrescarAnalisis } from "./logger.js";

const vista = $("#vista");
let actual = "entrenar";

function tema() {
  const pref = localStorage.getItem("gym-tema") || "auto";
  const oscuro = pref === "oscuro" || (pref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("theme-dark", oscuro);
  document.body.classList.toggle("theme-light", !oscuro);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = oscuro ? "#0B0C0F" : "#F3F4F6";
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", tema);


async function vistaDashboard() {
  const cont = h("div");
  vista.replaceChildren(cont);
  cont.append(h("div", { class: "vacio" }, "Calculando…"));
  await new Promise((r) => setTimeout(r, 30));
  const scroll = window.scrollY;
  try { await ejecutarDashboard(cont); }
  catch (e) {
    console.error(e);
    cont.replaceChildren(h("div", { class: "card" }, h("b", null, "No se pudo dibujar el dashboard"), h("p", { class: "muted" }, String(e && e.stack || e))));
  }
  window.scrollTo(0, scroll);
}

function editorTexto(titulo, texto, guardar, extra) {
  vista.replaceChildren();
  const ta = h("textarea", { spellcheck: "false", autocapitalize: "off" });
  ta.value = texto;
  vista.append(
    h("div", { class: "row", style: { marginBottom: "10px" } },
      h("button", { class: "btn sm", onclick: () => ir("ajustes") }, "‹ Atrás"),
      h("div", { class: "sp", style: { fontWeight: 700, textAlign: "center" } }, titulo),
      h("button", { class: "btn sm pri", onclick: async () => { await guardar(ta.value); toast("Guardado"); ir("ajustes"); } }, "Guardar")),
    extra || null, ta);
}

function plantillaATexto(t) { return t.fm.exercises.map((e) => e.name + " | " + (e.targetSets || 3)).join("\n"); }
function textoAPlantilla(t, txt) {
  t.fm.exercises = txt.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [n, s] = l.split("|"); return { name: n.trim(), targetSets: parseInt(s) || 3 };
  });
}

function vistaAjustes() {
  const v = h("div");
  v.append(h("h1", { class: "t" }, "Ajustes"));

  // Descanso
  const desc = h("input", { type: "number", inputmode: "numeric", value: S.settings.defaultRestDuration || 90, style: { width: "90px" } });
  desc.addEventListener("change", async () => { S.settings.defaultRestDuration = parseInt(desc.value) || 90; await save("settings"); });
  const sel = h("select", { style: { width: "auto" } }, ...[["auto", "Automático"], ["oscuro", "Oscuro"], ["claro", "Claro"]].map(([k, t]) => h("option", { value: k }, t)));
  sel.value = localStorage.getItem("gym-tema") || "auto";
  sel.addEventListener("change", () => { localStorage.setItem("gym-tema", sel.value); tema(); });
  v.append(h("div", { class: "card" },
    h("div", { class: "row" }, h("div", { class: "sp" }, "Descanso por defecto (s)"), desc),
    h("div", { class: "row", style: { marginTop: "10px" } }, h("div", { class: "sp" }, "Tema"), sel)));

  // Plantillas
  v.append(h("h2", { class: "t" }, "Plantillas"));
  const lp = h("div", { class: "card" });
  for (const t of S.templates) lp.append(h("div", { class: "lista-sel" }, h("button", { onclick: () => editorTexto("Plantilla · " + t.fm.name, plantillaATexto(t), async (txt) => { textoAPlantilla(t, txt); await save("templates"); },
    h("p", { class: "muted" }, "Una línea por ejercicio: «Nombre | series». El orden es el del entrenamiento.")) }, t.fm.name + " ", h("span", { class: "muted" }, "· " + t.fm.exercises.length + " ejercicios"))));
  lp.append(h("button", { class: "btn sm blk", style: { marginTop: "10px" }, onclick: () => {
    const n = prompt("Nombre de la plantilla"); if (!n) return;
    const t = { path: "Workout Templates/" + n + ".md", fm: { type: "workout-template", name: n, exercises: [] } };
    S.templates.push(t); save("templates"); vistaAjustes();
  } }, "+ Nueva plantilla"));
  v.append(lp);

  // Config
  v.append(h("h2", { class: "t" }, "Configuración del análisis"));
  v.append(h("p", { class: "muted", style: { margin: "0 4px 8px" } }, "Los mismos archivos que tenías en Gym/Config. Se editan como texto."));
  const lc = h("div", { class: "card" });
  for (const k of Object.keys(S.configs).sort()) {
    lc.append(h("div", { class: "lista-sel" }, h("button", { onclick: () => editorTexto(k.split("/").pop().replace(".md", ""), S.configs[k], async (t) => { S.configs[k] = t; await save("configs"); refrescarAnalisis(); }) }, k.split("/").pop().replace(".md", ""))));
  }
  v.append(lc);

  // Copia de seguridad
  v.append(h("h2", { class: "t" }, "Copia de seguridad"));
  const ultima = localStorage.getItem("gym-ultima-copia");
  const file = selectorImportar(true, () => ir("ajustes"));
  v.append(h("div", { class: "card" },
    h("p", { class: "muted", style: { margin: "0 0 10px" } }, "Los datos viven solo en este iPhone. Exporta de vez en cuando y guarda el archivo en iCloud Drive." + (ultima ? " Última copia: " + ultima + "." : " Aún no has hecho ninguna copia.")),
    h("div", { class: "row" },
      h("button", { class: "btn pri sp", onclick: exportar }, "Exportar"),
      h("button", { class: "btn sp", onclick: () => file.click() }, "Importar")), file));

  v.append(h("p", { class: "muted", style: { textAlign: "center", marginTop: "24px" } },
    "Diagrama muscular: body-muscles (licencia en ", h("a", { href: "assets/licencias/LICENSE-body-muscles.txt", style: { color: "inherit" } }, "assets/licencias"), ")."));
  vista.replaceChildren(v);
}

// <input type=file> oculto que importa una copia JSON. avisar: pide confirmación antes de reemplazar.
function selectorImportar(avisar, despues) {
  const file = h("input", { type: "file", accept: "application/json,.json", style: { display: "none" } });
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    if (avisar && !(await confirmar("Esto reemplaza todos los datos actuales por los del archivo.", "Importar", true))) return;
    try { await importJSON(await f.text()); refrescarAnalisis(); toast("Importado"); despues(); } catch (e) { alert("No se pudo importar: " + e.message); }
    file.value = "";
  });
  return file;
}

function vistaBienvenida() {
  const file = selectorImportar(false, () => ir("entrenar"));
  vista.replaceChildren(h("div", null,
    h("h1", { class: "t" }, "Bienvenido"),
    h("div", { class: "card" },
      h("p", { style: { marginTop: 0 } }, "Aún no hay datos en este dispositivo. Importa tu copia de seguridad (el archivo .json exportado desde la app, o seed.json) para traer sesiones, plantillas y configuración."),
      h("button", { class: "btn pri blk", onclick: () => file.click() }, "Importar copia"), file),
    h("p", { class: "muted", style: { textAlign: "center" } }, "Los datos se guardan solo en este dispositivo.")));
}

async function exportar() {
  const txt = exportJSON();
  const nombre = "gym-backup-" + iso() + ".json";
  const f = new File([txt], nombre, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nombre }); }
    else { const a = h("a", { href: URL.createObjectURL(f), download: nombre }); document.body.append(a); a.click(); a.remove(); }
    localStorage.setItem("gym-ultima-copia", iso()); toast("Copia exportada"); ir("ajustes");
  } catch (e) { if (e.name !== "AbortError") alert("No se pudo exportar: " + e.message); }
}

export async function ir(v) {
  actual = v;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
  window.scrollTo(0, 0);
  if (v === "entrenar") { if (vacio()) vistaBienvenida(); else vistaEntrenar(vista, ir); }
  else if (v === "dashboard") await vistaDashboard();
  else if (v === "historial") vistaHistorial(vista);
  else vistaAjustes();
}
document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => ir(b.dataset.v)));

// Enlaces internos del dashboard ([[Workouts/…]]) → detalle de la sesión
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a.internal-link");
  if (!a) return;
  e.preventDefault();
  const p = a.getAttribute("data-href");
  const s = S.sessions.find((x) => x.path === p || x.path === p + ".md");
  if (s) abrirSesion(s, () => ir(actual));
});

(async function arrancar() {
  tema();
  await load();
  await ir("entrenar");
  refrescarAnalisis();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();

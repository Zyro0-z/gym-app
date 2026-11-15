import { S, load, save, exportJSON, importJSON, vacio } from "./store.js";
import { h, $, toast, confirmar, alerta, pedirTexto, iso, pantalla, grupo, fila, stepper, interruptor, segmentado, icono, haptic, kg } from "./ui.js";
import { ejecutarDashboard } from "./dvshim.js";
import { vistaEntrenar, vistaHistorial, abrirSesion, refrescarAnalisis } from "./logger.js";

const vista = $("#vista");
let actual = "entrenar";

function tema() {
  let pref = "auto"; try { pref = localStorage.getItem("gym-tema") || "auto"; } catch (e) {}
  const oscuro = pref === "oscuro" || (pref === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const antes = document.body.classList.contains("theme-dark");
  document.body.classList.toggle("theme-dark", oscuro);
  document.body.classList.toggle("theme-light", !oscuro);
  document.querySelectorAll("meta[name=theme-color]").forEach((m) => { m.content = oscuro ? "#000000" : "#F2F2F7"; });
  return antes !== oscuro;
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (tema() && actual === "dashboard") ir("dashboard"); });

// Monta una pantalla con transición suave.
function montar(nodo) {
  vista.replaceChildren(nodo);
  nodo.classList.add("entra");
}

async function vistaDashboard() {
  const cont = h("div");
  const raiz = h("div", { class: "vista-dash" }, h("div", { class: "barra-estado" }), cont);
  montar(raiz);
  cont.append(h("div", { class: "vacio" }, "Calculando…"));
  await new Promise((r) => setTimeout(r, 30));
  try { await ejecutarDashboard(cont); }
  catch (e) {
    console.error(e);
    cont.replaceChildren(h("div", { class: "destacado" }, h("b", null, "No se pudo dibujar el dashboard"), h("p", { class: "muted seleccionable" }, String(e && e.stack || e))));
  }
}

function editorTexto(titulo, texto, guardar, ayuda) {
  const ta = h("textarea", { spellcheck: "false", autocapitalize: "off", autocorrect: "off", "aria-label": titulo });
  ta.value = texto;
  const { raiz, cuerpo } = pantalla(titulo, {
    grande: false,
    izq: h("button", { class: "nav-btn", onclick: () => ir("ajustes") }, icono("atras"), "Ajustes"),
    der: h("button", { class: "nav-btn fuerte", onclick: async () => { await guardar(ta.value); haptic(); toast("Guardado"); ir("ajustes"); } }, "Guardar"),
  });
  cuerpo.append(h("div", { class: "editor" }, ayuda ? h("p", { class: "pie", style: { margin: "0 4px 10px" } }, ayuda) : null, ta));
  window.scrollTo(0, 0);
  montar(raiz);
}

function plantillaATexto(t) { return t.fm.exercises.map((e) => e.name + " | " + (e.targetSets || 3)).join("\n"); }
function textoAPlantilla(t, txt) {
  t.fm.exercises = txt.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [n, s] = l.split("|"); return { name: n.trim(), targetSets: parseInt(s) || 3 };
  });
}

const PASOS = [0.5, 1, 1.25, 2, 2.5, 5];
function vistaAjustes() {
  const { raiz, cuerpo } = pantalla("Ajustes");
  const st = S.settings;
  const tPref = (() => { try { return localStorage.getItem("gym-tema") || "auto"; } catch (e) { return "auto"; } })();

  cuerpo.append(grupo("Entrenamiento", [
    fila({ texto: "Descanso", der: stepper({ valor: st.defaultRestDuration || 90, min: 15, max: 600, paso: 15, formato: (v) => Math.floor(v / 60) + ":" + String(v % 60).padStart(2, "0"), alCambiar: (v) => { st.defaultRestDuration = v; save("settings"); } }) }),
    fila({ texto: "Paso de peso", der: stepper({ valor: PASOS.indexOf(st.weightStep || 2.5) >= 0 ? PASOS.indexOf(st.weightStep || 2.5) : 4, min: 0, max: PASOS.length - 1, paso: 1, formato: (i) => kg(PASOS[i]) + " kg", alCambiar: (i) => { st.weightStep = PASOS[i]; save("settings"); } }) }),
    fila({ texto: "Pantalla siempre encendida", der: interruptor(st.keepScreenAwake !== false, (v) => { st.keepScreenAwake = v; save("settings"); }, "Pantalla siempre encendida") }),
  ], "El paso de peso es lo que suman y restan los botones − / + sobre el teclado."));

  cuerpo.append(grupo("Apariencia", [
    h("div", { class: "celda" }, segmentado([["auto", "Automático"], ["oscuro", "Oscuro"], ["claro", "Claro"]], tPref, (k) => { try { localStorage.setItem("gym-tema", k); } catch (e) {} tema(); })),
  ]));

  // Plantillas
  cuerpo.append(grupo("Plantillas", [
    ...S.templates.map((t) => fila({ texto: t.fm.name, detalle: t.fm.exercises.length + " ej.", onclick: () => editorTexto(t.fm.name, plantillaATexto(t), async (txt) => { textoAPlantilla(t, txt); await save("templates"); },
      "Una línea por ejercicio: «Nombre | series». El orden es el del entrenamiento.") })),
    fila({ texto: "Nueva plantilla", clase: "tinte", izq: icono("mas"), sinChevron: true, onclick: async () => {
      const n = await pedirTexto("Nueva plantilla", { placeholder: "Nombre", boton: "Crear" }); if (!n) return;
      if (S.templates.some((t) => t.fm.name.toLowerCase() === n.toLowerCase())) { await alerta("Ya existe", "Hay otra plantilla llamada «" + n + "»."); return; }
      S.templates.push({ path: "Workout Templates/" + n + ".md", fm: { type: "workout-template", name: n, exercises: [] } });
      await save("templates"); haptic(); vistaAjustes();
    } }),
  ]));

  // Config
  cuerpo.append(grupo("Configuración del análisis", Object.keys(S.configs).sort().map((k) => {
    const n = k.split("/").pop().replace(".md", "");
    return fila({ texto: n, onclick: () => editorTexto(n, S.configs[k], async (t) => { S.configs[k] = t; await save("configs"); refrescarAnalisis(); }) });
  }), "Los mismos archivos que tenías en Gym/Config. Se editan como texto."));

  // Copia de seguridad
  let ultima = null; try { ultima = localStorage.getItem("gym-ultima-copia"); } catch (e) {}
  const file = selectorImportar(true, () => ir("ajustes"));
  cuerpo.append(grupo("Copia de seguridad", [
    fila({ texto: "Exportar copia", clase: "tinte", sinChevron: true, onclick: exportar }),
    fila({ texto: "Importar copia", clase: "tinte", sinChevron: true, onclick: () => file.click() }),
  ], "Los datos viven solo en este iPhone. Exporta a menudo y guarda el archivo en iCloud Drive. " + (ultima ? "Última copia: " + ultima.split("-").reverse().join("/") + "." : "Aún no has hecho ninguna copia.")), file);

  cuerpo.append(h("p", { class: "pie", style: { textAlign: "center", margin: "0 32px 24px" } },
    "Diagrama muscular: body-muscles (licencia en ", h("a", { href: "assets/licencias/LICENSE-body-muscles.txt" }, "assets/licencias"), ")."));
  montar(raiz);
}

// <input type=file> oculto que importa una copia JSON. avisar: pide confirmación antes de reemplazar.
function selectorImportar(avisar, despues) {
  const file = h("input", { type: "file", accept: "application/json,.json", style: { display: "none" } });
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    if (avisar && !(await confirmar("Esto reemplaza todos los datos actuales por los del archivo.", "Importar y reemplazar", true))) { file.value = ""; return; }
    try { await importJSON(await f.text()); refrescarAnalisis(); haptic(); toast("Importado"); despues(); }
    catch (e) { await alerta("No se pudo importar", e.message); }
    file.value = "";
  });
  return file;
}

function vistaBienvenida() {
  const file = selectorImportar(false, () => ir("entrenar"));
  const { raiz, cuerpo } = pantalla("Bienvenido");
  cuerpo.append(h("div", { class: "destacado" },
    h("p", { style: { marginTop: 0 } }, "Aún no hay datos en este dispositivo. Importa tu copia de seguridad (el archivo .json exportado desde la app, o seed.json) para traer sesiones, plantillas y configuración."),
    h("button", { class: "btn pri blk", onclick: () => file.click() }, "Importar copia"), file),
    h("p", { class: "pie", style: { textAlign: "center" } }, "Los datos se guardan solo en este dispositivo."));
  montar(raiz);
}

async function exportar() {
  const txt = exportJSON();
  const nombre = "gym-backup-" + iso() + ".json";
  const f = new File([txt], nombre, { type: "application/json" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nombre }); }
    else { const a = h("a", { href: URL.createObjectURL(f), download: nombre }); document.body.append(a); a.click(); a.remove(); }
    try { localStorage.setItem("gym-ultima-copia", iso()); } catch (e) {}
    haptic(); toast("Copia exportada"); ir("ajustes");
  } catch (e) { if (e.name !== "AbortError") await alerta("No se pudo exportar", e.message); }
}

export async function ir(v) {
  const cambia = v !== actual;
  actual = v;
  document.querySelectorAll("#tabs button").forEach((b) => { b.classList.toggle("on", b.dataset.v === v); b.setAttribute("aria-current", b.dataset.v === v ? "page" : "false"); });
  document.body.classList.toggle("vista-dashboard", v === "dashboard");
  if (cambia || v !== "entrenar") window.scrollTo(0, 0);
  if (v === "entrenar") { if (vacio()) vistaBienvenida(); else { vistaEntrenar(vista, ir); vista.firstElementChild && cambia && vista.firstElementChild.classList.add("entra"); } }
  else if (v === "dashboard") await vistaDashboard();
  else if (v === "historial") { vistaHistorial(vista); vista.firstElementChild && vista.firstElementChild.classList.add("entra"); }
  else vistaAjustes();
}
document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => {
  if (b.dataset.v === actual) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  haptic(); ir(b.dataset.v);
}));

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

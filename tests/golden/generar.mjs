// Genera el golden master: ejecuta el dashboard ANTIGUO (src/dashboard.js de la versión 1,
// sin modificar en disco) con datos fijos y un reloj fijo, y vuelca sus resultados.
//
//   node tests/golden/generar.mjs
//
// · tests/golden/sintetico/<fecha>.json  ← tests/golden/fixture.mjs (sin datos personales; se publica)
// · tests/golden/seed/<fecha>.json       ← seed.json, si existe (datos personales: en .gitignore)
//
// El dashboard antiguo, su capa de compatibilidad y sus librerías se conservan en
// tests/golden/legacy/ para poder regenerar el golden aunque la app ya no los use.
import { chromium } from "playwright";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { servir } from "../serve.mjs";
import { parchear } from "./inyectar.mjs";
import { fixture } from "./fixture.mjs";

const AQUI = fileURLToPath(new URL(".", import.meta.url));
const RAIZ = fileURLToPath(new URL("../..", import.meta.url));
const LEGACY = AQUI + "legacy/";
const PUERTO = 8791;

export const FECHAS = {
  sintetico: ["2026-05-20", "2026-07-08", "2026-09-17", "2026-10-28", "2026-11-13", "2026-11-15", "2027-01-10"],
  seed: ["2026-09-12", "2026-09-17", "2026-09-24", "2026-09-27", "2026-10-28", "2026-11-15"],
};

const HTML = `<!doctype html><html><head><meta charset="utf-8">
<script src="/vendor/luxon.min.js"></script><script src="/vendor/marked.min.js"></script><script src="/vendor/chart.min.js"></script>
</head><body class="theme-dark"><div id="c"></div>
<script type="module">
import { S } from "/src/store.js";
import { ejecutarDashboard } from "/src/dvshim.js";
window.correr = async (datos) => { Object.assign(S, datos); await ejecutarDashboard(document.getElementById("c")); return window.__G; };
window.listo = true;
</script></body></html>`;

// dvshim importa S de store.js: aquí basta un almacén vacío en memoria
const STORE = "export const S = { sessions: [], templates: [], configs: {}, settings: {}, library: [], draft: null };";
const existe = (f) => access(f).then(() => true, () => false);

async function main() {
  const codigo = parchear(await readFile(LEGACY + "dashboard.js", "utf8"));
  const shim = await readFile(LEGACY + "dvshim.js", "utf8");
  const vendor = {};
  for (const v of ["luxon", "marked", "chart"]) vendor[v] = await readFile(LEGACY + v + ".min.js", "utf8");
  const conjuntos = { sintetico: fixture() };
  if (await existe(RAIZ + "seed.json")) conjuntos.seed = JSON.parse(await readFile(RAIZ + "seed.json", "utf8"));

  const srv = await servir(PUERTO);
  const nav = await chromium.launch();
  const errores = [];
  try {
    for (const [nombre, datos] of Object.entries(conjuntos)) {
      await mkdir(AQUI + nombre, { recursive: true });
      for (const fecha of FECHAS[nombre]) {
        const ctx = await nav.newContext({ timezoneId: "Europe/Madrid", locale: "es-ES" });
        const p = await ctx.newPage();
        p.on("pageerror", (e) => errores.push(nombre + " " + fecha + ": " + e.message));
        await p.clock.setFixedTime(new Date(fecha + "T12:00:00+01:00"));
        await p.route("**/__golden.html", (r) => r.fulfill({ contentType: "text/html", body: HTML }));
        await p.route("**/src/dashboard.js", (r) => r.fulfill({ contentType: "text/javascript", body: codigo }));
        await p.route("**/src/dvshim.js", (r) => r.fulfill({ contentType: "text/javascript", body: shim }));
        await p.route("**/src/store.js", (r) => r.fulfill({ contentType: "text/javascript", body: STORE }));
        for (const v of Object.keys(vendor)) await p.route("**/vendor/" + v + ".min.js", (r) => r.fulfill({ contentType: "text/javascript", body: vendor[v] }));
        await p.goto(`http://127.0.0.1:${PUERTO}/__golden.html`);
        await p.waitForFunction(() => window.listo);
        const G = await p.evaluate((d) => window.correr(d), datos);
        if (!G || !G.ejercicios) throw new Error("Sin volcado para " + nombre + " " + fecha);
        if (G.hoyISO !== fecha) throw new Error("Reloj mal fijado: " + G.hoyISO + " ≠ " + fecha);
        const sec = await p.evaluate(() => Array.from(document.querySelectorAll(".callout[data-callout=bug]")).map((x) => x.textContent));
        if (sec.length) errores.push(nombre + " " + fecha + ": sección rota " + sec.join(" | "));
        await writeFile(AQUI + nombre + "/" + fecha + ".json", JSON.stringify(G, null, 1) + "\n");
        console.log("✓", nombre, fecha, G.ejercicios.length, "ejercicios");
        await ctx.close();
      }
    }
  } finally { await nav.close(); srv.close(); }
  if (errores.length) { console.error(errores.join("\n")); process.exit(1); }
}
main().catch((e) => { console.error(e); process.exit(1); });

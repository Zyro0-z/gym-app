// Arranque como en GitHub Pages (sin seed.json): bienvenida → importar copia → dashboard sin errores.
import { chromium, webkit } from "playwright";
import { servir } from "./serve.mjs";
const nav = { chromium, webkit }[process.argv[2] || "chromium"];
const srv = await servir(8767, { sinSeed: true });
const b = await nav.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const err = []; p.on("pageerror", (e) => err.push(e.message)); p.on("console", (m) => m.type() === "error" && !/seed\.json$/.test(m.location().url) && err.push(m.text()));
await p.goto("http://127.0.0.1:8767/"); await p.waitForTimeout(800);
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) process.exitCode = 1; };
ok(await p.getByText("Importar copia").isVisible(), "bienvenida visible sin datos");
await p.locator('input[type=file]').setInputFiles(new URL("../seed.json", import.meta.url).pathname);
await p.waitForTimeout(1200);
ok(await p.getByText("Pierna").first().isVisible(), "plantillas importadas");
await p.locator("#tabs [data-v=dashboard]").click(); await p.waitForTimeout(2500);
const t = await p.locator("#vista").innerText();
ok(!/NaN|undefined|\[object/.test(t), "dashboard sin NaN/undefined/[object");
ok(!err.length, "consola limpia " + (err.length ? JSON.stringify(err) : ""));
await b.close(); srv.close();

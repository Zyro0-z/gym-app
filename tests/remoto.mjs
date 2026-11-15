// Comprueba la versión publicada: carga, service worker activo, manifest válido, offline. Uso: node remoto.mjs [url]
import { chromium } from "playwright";
const URL_ = process.argv[2] || "https://zyro0-z.github.io/gym-app/";
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
const err = []; p.on("pageerror", (e) => err.push(e.message)); p.on("console", (m) => m.type() === "error" && err.push(m.text()));
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) process.exitCode = 1; };
await p.goto(URL_); await p.waitForTimeout(1500);
ok(await p.evaluate(() => isSecureContext), "contexto seguro (HTTPS)");
const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.active && r.active.state; });
ok(sw === "activated", "service worker activo: " + sw);
const m = await p.evaluate(async () => { const l = document.querySelector("link[rel=manifest]"); const r = await fetch(l.href); return { ct: r.headers.get("content-type"), j: await r.json() }; });
ok(m.j.display === "standalone" && m.j.start_url && m.j.icons.some((i) => i.sizes === "512x512") && m.j.icons.some((i) => i.sizes === "192x192"), "manifest válido (" + m.ct + ")");
for (const i of m.j.icons) { const r = await p.request.get(new URL(i.src, URL_).href); ok(r.ok(), "icono " + i.src); }
ok(await p.getByText("Importar copia").isVisible(), "bienvenida (sin datos personales publicados)");
await p.reload(); await p.waitForTimeout(800);
await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1200);
ok(await p.locator("#tabs").isVisible(), "funciona sin conexión");
ok(!err.length, "consola limpia " + (err.length ? JSON.stringify(err) : ""));
await b.close();

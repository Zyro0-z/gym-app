// Servidor estático mínimo para las pruebas (raíz del repo). Uso: node serve.mjs [puerto]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain" };
export function servir(puerto = 8765, { sinSeed = false } = {}) {
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = normalize(join(RAIZ, p));
    if (!f.startsWith(RAIZ) || f.includes("/tests/") || (sinSeed && p === "/seed.json")) { res.writeHead(404); return res.end(); }
    try { const b = await readFile(f); res.writeHead(200, { "content-type": TIPOS[extname(f)] || "application/octet-stream", "cache-control": "no-store" }); res.end(b); }
    catch { res.writeHead(404); res.end(); }
  });
  return new Promise((ok) => srv.listen(puerto, "127.0.0.1", () => ok(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) servir(+process.argv[2] || 8765).then(() => console.log("http://127.0.0.1:" + (+process.argv[2] || 8765)));

#!/bin/sh
# Ejecuta una prueba de Playwright con WebKit dentro de un contenedor Ubuntu (WebKit no corre en Arch).
# Uso: tests/webkit.sh e2e/navegacion.mjs webkit      (las rutas son relativas a tests/)
set -e
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SHOTS="${SHOTS:-$RAIZ/../shots}"
mkdir -p "$SHOTS"
exec docker run --rm --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$RAIZ:/repo" -v "$SHOTS:/shots" -w /repo/tests \
  mcr.microsoft.com/playwright:v1.65.1-noble node "$@"

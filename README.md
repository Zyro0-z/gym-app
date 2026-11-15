# Gym (PWA)
Registro de entrenamientos + el dashboard completo de Obsidian, 100 % local en el iPhone.
Sin build: son ficheros estáticos publicados en GitHub Pages (rama `main`, carpeta raíz).
En Safari: Compartir → Añadir a pantalla de inicio.

## Estructura
- `src/dashboard.js`: el bloque dataviewjs original, **sin tocar**. `src/dvshim.js` le da la API de Dataview
  y captura en memoria `progresionDe`/`proximaVez` para el registro («Próxima vez»).
- `src/store.js`: IndexedDB (almacén `kv`) con esquema versionado (`schema`). Antes de migrar guarda una
  copia completa en `backup-esquema-v<n>`.
- `src/logger.js`: Entrenar (sesión, series, descanso, barra sobre el teclado) e Historial.
- `src/editores.js`: editor de plantillas y de objetivos de doble progresión (escribe en `objetivos.md`).
- `src/copia.js`: exportar copia y aviso (>7 días o >5 sesiones nuevas sin copia).
- `src/ui.js`: piezas iOS (hojas, listas agrupadas, steppers, háptica, viewport visual).
- `sw.js`: service worker; todo fichero nuevo va en `FICHEROS` y se sube la versión `V`.

## Datos
- `seed.json` **no se publica** (lleva datos personales; está en `.gitignore`). En local siembra la base de
  datos; en el iPhone la app pide «Importar copia» la primera vez: vale `seed.json` o cualquier copia exportada.
- Ajustes → Copia de seguridad para exportar/importar. El formato de las sesiones es el de LiftOff.

## Pruebas
```
cd tests && npm i && npx playwright install chromium webkit
node run.mjs [chromium,webkit] [--shots carpeta]   # extremo a extremo, claro y oscuro, 390×844 @2x
node fase3.mjs   # audio, bloqueo/desbloqueo, Wake Lock, app matada, peso, copia, migración
node fase4.mjs   # editores, rango en la tarjeta, dashboard a 375/390/430 y al girar
node sinseed.mjs # arranque como en Pages (sin seed)
node remoto.mjs  # la versión publicada: HTTPS, service worker, manifest, offline
```

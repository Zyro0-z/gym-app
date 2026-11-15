# Gym

App de registro de entrenamientos y análisis de progreso para iPhone. Es una PWA estática, sin build ni
dependencias en tiempo de ejecución, publicada en GitHub Pages. Funciona sin conexión y los datos viven
solo en el dispositivo (IndexedDB).

Instalar: en Safari, Compartir → Añadir a pantalla de inicio.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/core/` | Lógica de cálculo pura (progresión, estancamiento, ligas, peso, semanas, calidad). Sin DOM. |
| `src/data/` | Modelo de datos, IndexedDB, migraciones versionadas y copias de seguridad. |
| `src/ui/` | Sistema de diseño: tokens, iconos propios, navegación, hojas, listas, gráficas SVG. |
| `src/views/` | Pantallas. |
| `src/store.js` | Estado de la app con suscripciones; el análisis se calcula bajo demanda. |
| `docs/` | `DISENO.md` (decisiones de diseño) y `ARQUITECTURA.md` (módulos, modelo y migración). |
| `tests/` | Pruebas de núcleo (`node:test`), golden master y extremo a extremo (Playwright). |

`sw.js` cachea todos los ficheros: cada fichero nuevo va en `FICHEROS` y cada publicación sube `V`.

## Datos

- Las migraciones son atómicas y conservan siempre una copia íntegra de los datos anteriores.
- Ajustes › Datos exporta e importa la copia de seguridad (JSON). Importar guarda antes los datos actuales.
- `seed.json` es personal y no se publica (`.gitignore`).

## Pruebas

```
cd tests && npm i && npx playwright install chromium
npm run core                                   # núcleo y golden master
node e2e/migracion-idb.mjs                     # migración en IndexedDB real
node e2e/capturas.mjs <carpeta> [chromium|webkit]   # capturas 390×844 y 430×932, claro y oscuro
```

## Licencias

El diagrama corporal es [body-muscles](assets/licencias/NOTICE-body-muscles.txt) (Apache-2.0). El resto
del código, los iconos y las insignias son propios.

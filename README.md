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

## Actualizar sin perder datos

Los datos viven en IndexedDB, en el iPhone, separados de los ficheros de la app: publicar una versión
nueva no los toca.

1. Antes de publicar, exporta una copia desde Ajustes › Datos por si acaso.
2. Sube `V` en `sw.js` y publica.
3. Al abrir la app aparece «Actualización disponible · Recargar». Al pulsar Recargar se guarda el
   entrenamiento en curso y se carga la versión nueva. Si no pulsas, se aplica sola la próxima vez
   que cierres la app del todo.
4. Si la versión nueva cambia el modelo de datos, la migración es atómica y deja una copia íntegra
   de los datos anteriores.

## Pruebas

Solo hacen falta para desarrollar; la app no tiene build ni dependencias.

```
npm ci && npx playwright install chromium
npm test              # núcleo (node:test), golden master y lista del service worker
npm run bench         # análisis con 820 sesiones: falla si la mediana de 5 pasa del umbral
npm run test:e2e      # todas las e2e en Chromium (tests/e2e/todas.mjs)
npm run test:webkit   # todas las e2e en WebKit, en el contenedor de Playwright (docker)
npm run test:todo     # todo lo anterior
npm run golden        # regenera el golden master con el dashboard antiguo (solo si se decide)
npm run serve         # sirve la app en http://127.0.0.1:8765
node tests/e2e/capturas.mjs <carpeta> [chromium|webkit]   # todas las pantallas, 390×844 y 430×932, claro y oscuro
sh tests/webkit.sh e2e/entreno.mjs webkit                 # una sola prueba e2e con WebKit
```

Las e2e cubren la migración en IndexedDB real, el arranque con datos de la versión 1, la navegación,
un entrenamiento completo con recarga a mitad, editar y borrar sesiones, exportar e importar la copia,
el uso sin conexión y el aviso de versión nueva. Fallan con cualquier error de consola o con textos
«NaN», «undefined» o «[object».

`.github/workflows/ci.yml` ejecuta en cada push y PR el núcleo, el bench y las e2e en Chromium. En
`main`, si pasan, publica en GitHub Pages con la versión del service worker estampada
(`tools/estampar-version.mjs`). Las e2e en WebKit son un job manual (`workflow_dispatch`).

## Licencias

El diagrama corporal es [body-muscles](assets/licencias/NOTICE-body-muscles.txt) (Apache-2.0). El resto
del código, los iconos y las insignias son propios.

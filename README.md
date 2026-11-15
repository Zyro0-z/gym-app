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

```
cd tests && npm i && npx playwright install chromium
npm test                                       # todo: núcleo, golden master y e2e en Chromium
node e2e/capturas.mjs <carpeta> [chromium|webkit]   # todas las pantallas, 390×844 y 430×932, claro y oscuro
sh webkit.sh e2e/entreno.mjs webkit            # cualquier prueba e2e con WebKit (contenedor docker)
```

Las e2e cubren la migración en IndexedDB real, el arranque con datos de la versión 1, la navegación,
un entrenamiento completo con recarga a mitad, editar y borrar sesiones, exportar e importar la copia,
el uso sin conexión y el aviso de versión nueva. Fallan con cualquier error de consola o con textos
«NaN», «undefined» o «[object».

## Licencias

El diagrama corporal es [body-muscles](assets/licencias/NOTICE-body-muscles.txt) (Apache-2.0). El resto
del código, los iconos y las insignias son propios.

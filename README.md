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

`sw.js` precachea todos los ficheros de `FICHEROS` en una caché por versión y sirve siempre desde ella,
sin mezclar versiones. `V` vale `"dev"` en el repo: CI la estampa con el commit y una huella del
contenido. Todo fichero nuevo va en `FICHEROS` (un test sigue los imports desde `index.html` y lo comprueba).

## Datos

- Las migraciones son atómicas y conservan siempre una copia íntegra de los datos anteriores.
- **Copia en Archivos** (Ajustes › Datos › «Guardar copia en Archivos»): abre la hoja de Compartir con
  `gym-copia-AAAA-MM-DD.json`; desde ahí, «Guardar en Archivos». Si la última copia exportada tiene
  más de 7 días o hay más de 5 sesiones nuevas, Hoy lo recuerda (se puede posponer 3 días).
- **Copias internas**: la app guarda sola una copia en IndexedDB cada 5 sesiones nuevas (configurable)
  y siempre antes de importar o restaurar; conserva las 3 últimas y la de la última importación. Se
  pueden restaurar desde Ajustes › Datos. Viven en el mismo iPhone, así que no sustituyen a la copia
  en Archivos.
- **Importar** valida el archivo entero (tipos, rangos, fechas, ids repetidos) antes de tocar nada.
- `seed.json` es personal y no se publica (`.gitignore`).

**Límites de la plataforma.** En iPhone, una web no puede escribir sola en iCloud Drive ni en Archivos,
y sin servidor no hay sincronización entre dispositivos. La app no sincroniza: el camino soportado es
guardar la copia a mano y, si hace falta, importarla en otro dispositivo.

## Con la pantalla bloqueada

Un iPhone bloqueado congela el JavaScript de la app: ningún temporizador corre. Por eso:

- **El descanso guarda la hora de fin**, no un contador. Al volver a la app se recalcula y, si
  terminó mientras no mirabas, dice «Descanso terminado hace 40 s».
- **Pantalla encendida** (Ajustes › Entrenamiento, activado por defecto): pide al sistema que no
  bloquee la pantalla mientras entrenas, y lo vuelve a pedir al volver a la app.
- **Controles en la pantalla bloqueada** (experimental, desactivado): un audio en silencio hace que
  iOS muestre el reproductor del sistema con el descanso y botones (saltar, reiniciar, ±15 s). Pausa
  la música que estés escuchando y iOS puede retirarlo si pasa mucho rato en segundo plano.
- **Aviso al terminar el descanso** (opcional): una notificación aunque la pantalla esté bloqueada.
  Necesita desplegar el servidor de `servidor/` (Cloudflare Workers, plan gratuito; pasos en
  `servidor/README.md`) y tener la app instalada en la pantalla de inicio (iOS 16.4+).

## Actualizar sin perder datos

Los datos viven en IndexedDB, en el iPhone, separados de los ficheros de la app: publicar una versión
nueva no los toca.

1. Antes de publicar, guarda una copia en Archivos por si acaso.
2. Publica (push a `main`): CI pasa las pruebas, estampa la versión y despliega en Pages.
3. Al abrir la app aparece «Actualización disponible · Recargar». Al pulsar Recargar se guarda el
   entrenamiento en curso y se carga la versión nueva completa. Si no pulsas, se aplica sola la
   próxima vez que cierres la app del todo. Una versión instalada sin este aviso (la 1.x) necesita
   cerrar la app por completo y volver a abrirla.
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

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

- **Copia en la nube (opcional)**: Ajustes › Datos › «Copia en la nube» sube una copia **cifrada de
  extremo a extremo** a tu propio Worker de Cloudflare (`servidor/`, espacio KV `COPIAS`). La app cifra
  aquí (AES-256-GCM, clave derivada con PBKDF2-SHA256 de 600 000 iteraciones); el servidor solo guarda
  un bloque ilegible y el hash de un token. La clave se guarda en este iPhone, aparte de los datos, y
  no va dentro de las copias. **Si la pierdes, nadie puede recuperar la copia.** La subida automática
  espera 5 s tras guardar una sesión. No hay sincronización entre dispositivos: restaurar reemplaza los
  datos (con copia interna antes).

**Límites de la plataforma.** En iPhone, una web no puede escribir sola en iCloud Drive ni en Archivos.
La app no sincroniza entre dispositivos: el camino soportado es la copia a mano en Archivos y, si lo
configuras, la copia cifrada en tu servidor.

## Análisis y registros

- **Rendimiento** (Progreso › Más análisis): el rendimiento de cada sesión es el mejor e1RM de cada
  ejercicio frente a la mediana de sus 5 sesiones anteriores (hacen falta 3 y 2 ejercicios
  comparables; los días de descarga no cuentan). Se agrupa por sueño, estrés y energía, con intervalo
  del 95 % y **siempre el número de sesiones**. Una banda con menos de 5 sesiones sale en hueco; la
  correlación de Spearman solo se llama concluyente con n ≥ 12 y |t| ≥ 2. Es una asociación, no una
  causa.
- **Intensidad (RPE)** (Progreso › Fatiga): reparto de las series de trabajo por franja de RPE en 8
  semanas, con la cobertura (series con RPE anotado).
- **Molestias** (Progreso › Más análisis; también desde el menú de un ejercicio al entrenar):
  articulación, lado, nivel 1–5, ejercicio y nota. Resume 30 días y marca «persistente» con 3 o más
  anotaciones de nivel 3+ en 14 días. Solo recoge lo que anotas; no diagnostica.
- **Mesociclos** (Ajustes): N semanas con nombre y, si quieres, una última de descarga (se programa
  también como bloque de descarga). El detalle compara semanas: series, RPE, volumen y e1RM.
- **Tarjeta de sesión** (Historial y resumen): imagen PNG 1080 × 1350 con lo esencial, para compartir.

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

## Fatiga y descarga

Al entrenar puedes anotar, si quieres, cómo llegas (horas de sueño, estrés y energía de 1 a 5) y el
RPE de cada serie. Con eso y el e1RM, Progreso › Fatiga y descarga muestra las últimas 8 semanas
completas (hacen falta sesiones en al menos 4).

La propuesta de descarga (`src/core/descarga.js`) aparece en Hoy y en esa pantalla cuando:

1. han pasado al menos **6 semanas** desde la última descarga (o desde la primera sesión), y
2. al comparar las **2 últimas semanas completas** con las **2 anteriores** (sin contar días de
   descarga) aparece alguna señal:
   - el mejor e1RM baja un **3 %** o más en al menos **2** ejercicios hechos en los dos tramos;
   - el RPE medio sube **1** punto o más (con al menos 6 series con RPE en cada tramo);
   - la media de sueño queda por debajo de **7 h** (con al menos 2 anotaciones) y, si en las 2 semanas
     anteriores también hay anotaciones, además baja 0,75 h o más respecto a ellas: dormir poco de forma
     habitual no es una señal, bajar de tu normal sí.

Los números en negrita se cambian en la propia pantalla. «Programar descarga» crea un bloque de
descarga de lunes a domingo (esta semana si hoy es lunes; si no, la siguiente); «Ahora no» la calla
7 días y «Descartar», 14. Durante una descarga no se propone otra.

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
npm run a11y          # auditoría de accesibilidad (Chromium); con webkit: sh tests/webkit.sh ../tools/auditoria-a11y.mjs webkit
npm run golden        # regenera el golden master con el dashboard antiguo (solo si se decide)
npm run serve         # sirve la app en http://127.0.0.1:8765
node tests/e2e/capturas.mjs <carpeta> [chromium|webkit]   # todas las pantallas, 390×844 y 430×932, claro y oscuro
sh tests/webkit.sh e2e/entreno.mjs webkit                 # una sola prueba e2e con WebKit
```

Las e2e cubren las vistas de análisis, la tarjeta PNG y la copia en la nube con un servidor simulado, la migración en IndexedDB real, el arranque con datos de la versión 1, la navegación,
un entrenamiento completo con recarga a mitad, editar y borrar sesiones, exportar e importar la copia,
el uso sin conexión y el aviso de versión nueva. Fallan con cualquier error de consola o con textos
«NaN», «undefined» o «[object».

`.github/workflows/ci.yml` ejecuta en cada push y PR el núcleo, el bench, las e2e y la auditoría de accesibilidad en Chromium. En
`main`, si pasan, publica en GitHub Pages con la versión del service worker estampada
(`tools/estampar-version.mjs`). Las e2e en WebKit son un job manual (`workflow_dispatch`).

## Accesibilidad

`tools/auditoria-a11y.mjs` recorre todas las pantallas, hojas, alertas y el entrenamiento, en claro y
oscuro, con texto normal y con texto grande (28 px de base, como los tamaños de accesibilidad de iOS).
Mide con los colores ya resueltos:

- contraste de 4,5:1 en texto y 3:1 en controles y gráficos;
- objetivos táctiles de 44 × 44;
- que todo control tenga nombre accesible;
- orden de foco lógico y foco visible;
- `role` y `aria-live` en el temporizador y los avisos;
- cambios de diseño (CLS) al cargar;
- con texto grande, que nada se salga, se corte o se solape.

Sale con error si encuentra algo; los textos truncados con «…» son solo un aviso. Opciones:
`--solo normal|grande` y `--fotos <carpeta>`. El informe queda en `tests/salida/a11y-<motor>.json`.

Las gráficas llevan en su etiqueta un resumen textual (último valor, mínimo, máximo, tendencia) y el
mapa corporal, la lista de grupos de más a menos. Con `prefers-reduced-motion` no hay transiciones ni
animaciones. El tamaño del texto sigue al del sistema (`-apple-system-body`).

## Licencias

Las imágenes del diagrama corporal se generaron con Gemini ([aviso](assets/licencias/NOTICE-cuerpo-muscular.txt)). El resto
del código, los iconos y las insignias son propios.

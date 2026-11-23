# Arquitectura

## 1. Restricciones

- PWA estática: HTML, CSS y JS vanilla con módulos ES, sin build, sin dependencias en tiempo de
  ejecución, sin CDNs ni red, y sin analítica. Se publica en GitHub Pages desde `main`.
- Los datos viven solo en el dispositivo, en IndexedDB. Ninguna migración destruye datos: antes de
  cambiar de esquema se guarda una copia íntegra.
- La lógica de cálculo tiene que dar los mismos resultados que el dashboard anterior. Lo garantiza un
  *golden master* (§5).

## 2. Capas y módulos

### Capas

| Capa | Qué hace | Puede importar |
|---|---|---|
| `core/` | cálculo **puro**: recibe datos y `hoy`, devuelve datos. Sin DOM, sin almacenamiento | solo `core/` |
| `migracion/` | lectura del formato de la versión 1 y conversión al modelo (pura) | `core/` |
| `data/` | modelo, IndexedDB, migraciones de esquema, copias, validación | `core/`, `migracion/` |
| `worker/` | Web Worker de módulo que ejecuta el análisis | `core/` |
| `store.js` | estado en memoria, escrituras (primero IndexedDB), análisis vía Worker | `core/`, `data/` (y crea el Worker) |
| `ui/` | sistema de diseño: tokens, componentes, navegación, gráficas, insignias | `core/` (solo utilidades de formato y fechas) |
| `views/` | pantallas | todo lo anterior |
| `app.js` | arranque | todo |

Las reglas se comprueban leyendo los imports de cada fichero (`tests/core/capas.test.mjs`): `core` no
importa nada de `migracion` ni de ninguna capa superior; `ui` no conoce `views`, `data` ni el store;
ningún fichero pasa de ~350 líneas (excepción justificada: `ui/componentes.css`, la hoja de todos los
componentes; partirla añadiría peticiones sin ganar claridad).

### Flujo de datos

```
            ┌──────────── IndexedDB «gymapp» ────────────┐
            │  kv (catálogo, rutinas, ajustes, copias…)   │
            │  sesiones · medidas                         │
            └───────────────▲───────────────┬─────────────┘
                 escritura  │               │ lectura y migración (data/repos.js)
                            │               ▼
  vista ──acción──▶ store.guardarX() ──▶ estado en memoria ──▶ versión++ ──▶ avisar("sesiones"…)
    ▲                                       │
    │                                       │ foto del modelo (postMessage)
    │                                       ▼
    │                             worker/analisis.js: analizar() → aPlano()
    │                                       │ structuredClone
    │                                       ▼
    └──repinta◀── avisar("analisis") ◀── rehidratar() (contexto y funciones, en el hilo principal)
```

- Las vistas leen `store.estado` y `store.analisis()`; nunca recalculan por su cuenta.
- `store.analisis()` devuelve al momento el último análisis disponible (aunque sea del cambio
  anterior) y pide uno nuevo si los datos o el día cambiaron. Mientras no hay ninguno, la navegación
  pinta un esqueleto en las vistas marcadas con `vista.analisis = true`; mientras se recalcula, una
  línea fina bajo la barra lo indica.
- Solo hay una petición al Worker en curso; las que llegan mientras tanto se funden en una y una
  respuesta obsoleta se descarta. Si no hay Worker o falla, se calcula en el hilo principal.
- `aPlano` quita del análisis el contexto y las funciones; `rehidratar` los reconstruye con
  `crearContexto` y `funcionesLiga`. `tests/core/rehidratar.test.mjs` comprueba que el resultado es
  igual al de `analizar` (datos sintéticos y reales).

### Módulos

```
index.html            arranque mínimo: tema y acento antes del primer pintado, #app y la tab bar
sw.js                 service worker: precaché completa por versión, cache-first sin escrituras
src/
  app.js              arranque: apariencia, carga y migración, navegación, service worker
  store.js            estado persistido con suscripciones; análisis en el Worker, memoizado por versión
  core/               PURO
    fechas.js, formato.js, nombres.js, constantes.js
    contexto.js       contexto de cálculo: catálogo, grupos, objetivos, bloques, horario, ligas
    sesiones.js       normaliza sesiones: series que cuentan, volumen, e1RM, duración fiable
    estancamiento.js  semáforo, días sin PR descontando bloques, flecha de tendencia
    progresion.js     doble progresión, incrementos, «próxima vez»
    semanal.js        semanas, racha, hoy toca, series vs objetivo, volumen por grupo, balance
    peso.js           pesajes, medias, ritmo, tendencia por fase
    ligas.js          estándares, puntuación, divisiones con histéresis; funcionesLiga()
    calidad.js        avisos de calidad de los datos
    analisis.js       orquesta todo lo anterior → un objeto `Analisis` (no se toca: golden master)
    rehidratar.js     aPlano / rehidratar para el paso por el Worker
    presentacion.js   comparaciones periodo a periodo sin cifras engañosas
    rpe.js, sugerencia.js, discos.js   RPE/RIR y e1RM ajustado, carga sugerida, calculadora de discos
    fatiga.js         informe semana a semana (e1RM, RPE, sueño, estrés, energía), ≥ 4 semanas
    descarga.js       propuesta de semana de descarga (regla en README › Fatiga y descarga)
    comparar.js       dos periodos del mismo largo; % solo con base distinta de cero
    csv.js            CSV con BOM, «;» y coma decimal (series, pesajes, medidas)
    medidas.js        medidas corporales: validación, una por fecha, series para la gráfica
  migracion/          formato de la versión 1: claves.js, lineas.js, config*.js, conversion.js, index.js
  worker/analisis.js  analizar en un Worker de módulo
  data/
    db.js             IndexedDB versionada (onupgradeneeded) y transacciones
    modelo.js         modelo, ajustes por defecto, plan de migración, copias, copias internas
    esquema.js        validación de copias (docs/ESQUEMA.md)
    repos.js          cargar (migrando o rescatando), guardar, importar y restaurar con respaldo
    espejo.js         réplica en localStorage del borrador
  ui/
    tokens.css, base.css, componentes.css
    dom.js, iconos.js, navegacion.js, controles.js, calor.js
    capas.js          hojas, alertas y modales; foco atrapado, Escape y foco devuelto
    graficas.js       barras y líneas SVG con resumen textual (describirSerie) en la etiqueta
    cuerpo.js         mapa corporal monocromo: niveles, leyenda, valor al tocar, etiqueta textual
    instalar.js       tarjeta «Añadir a pantalla de inicio» (solo Safari de iPhone sin instalar, una vez)
    insignias.js      presentación; insignias/graficos.js (primitivas), registro.js (las 15 ligas),
                      montaje.js (composición y caché)
    tema.js, textos.js, teclado.js, haptica.js, sonido.js, version.js
  views/
    indice.js         pestañas, rutas y vistas que necesitan el análisis
    hoy.js, progreso.js, historial.js, ajustes.js, ejercicio.js, ligas.js, datos.js, …
    entreno.js        API del entrenamiento; las piezas, en entreno/:
      estado.js         estado compartido (E.app, E.M) y utilidades
      pantalla.js       modal a pantalla completa, barra minimizada, Wake Lock, guardado, cabecera
      ejercicios.js     bloques de ejercicio, referencias, menú, historia y notas
      serie.js          fila de serie (tipo, anterior, peso, reps, hecha)
      descanso.js       temporizador de descanso
      revision.js       terminar (revisión), descartar, guardar una edición
      resumen.js        resumen al terminar
    editores.js       API de los editores de Ajustes; uno por fichero en editores/:
      comun.js, rutinas.js, horario.js, ejercicios.js, grupos.js, objetivos.js, peso.js,
      bloques.js, entrenamiento.js, calidad.js, avanzado.js
tests/
  core/*.test.mjs     node:test: núcleo, golden master, migración, esquema, capas, service worker…
  golden/             generador y salida del dashboard anterior (sintético y, en local, seed)
  bench/              rendimiento del análisis con 820 sesiones
  e2e/*.mjs           Playwright (todas.mjs las lanza todas con un motor)
  webkit.sh           ejecuta una prueba con WebKit en un contenedor Ubuntu (docker)
tools/                estampar-version.mjs (CI), make-seed.mjs, fixture-v2.mjs
  auditoria-a11y.mjs  auditoría de accesibilidad con Playwright (npm run a11y; en CI)
  a11y-pagina.mjs     comprobaciones que se ejecutan dentro de la página (contraste, objetivos,
                      nombres, foco, texto grande)
docs/                 DISENO.md, ARQUITECTURA.md, ESQUEMA.md
```

**Otras reglas.**

- No hay variables globales (`window.*`): todo pasa por imports y por el store. La única excepción es
  `window.__gym`, que solo existe bajo Playwright (`navigator.webdriver`) para las pruebas.
- Todo fichero que cargue la app va en `FICHEROS` de `sw.js`; `tests/core/sw.test.mjs` sigue los
  imports desde `index.html` y lo comprueba.

## 3. Modelo de datos (esquema 3)

El detalle campo a campo, con el esquema 4 y la validación de copias, está en `docs/ESQUEMA.md`.

IndexedDB `gymapp`, versión de base de datos 2:

- un almacén `sesiones`, con clave `id`, que puede crecer a miles;
- un almacén `kv` con documentos pequeños, guardados como listas para conservar su orden.

| Dónde | Contenido |
|---|---|
| `sesiones` | `{id, rutina, fecha:"AAAA-MM-DD", inicio:"HH:MM", fin:"HH:MM", duracion, ejercicios:[{ejercicioId, nombre?, tipo?, series:[{peso, reps, segundos?, tipo:"normal"\|"fallo"\|"calentamiento"\|"descendente", hecha}]}], origen?}` |
| `kv.catalogo` | `[{id, nombre, grupo, unilateral, tipoAncla:"peso"\|"duracion"\|"temporizador", tipoMaterial, incremento, rangoReps:{min,max}, top, estandar:{slug, factor, revisado, aproximado, polea}\|{sin:true}}]` |
| `kv.rutinas` | `[{id, nombre, ejercicios:[{ejercicioId, series}]}]` |
| `kv.pesajes` | `[{fecha, kg}]` |
| `kv.ajustes` | JSON estructurado (abajo) |
| `kv.borrador` | el entrenamiento en curso, con una réplica en `localStorage` (`gym-espejo`) |
| `kv.schema` | `3` |
| `kv.legacy`, `kv.backup-esquema-v<n>` | copia íntegra del formato antiguo; no se borran nunca |
| `kv.respaldo-importacion` | los datos que había antes de la última importación |
| `kv.rescate-<t>` | lo que escribió una versión antigua después de migrar |

Las sesiones guardan el `ejercicioId`. Así, renombrar un ejercicio no rompe su historia. El id es el
`canon()` del nombre en el momento de crearlo, de modo que las variantes antiguas («Jalón al pecho
prono» y «jalon al pecho prono») se fusionan igual que antes.

El id de una sesión es `fecha-<marca de tiempo de inicio>-<azar>`; las migradas usan
`fecha-v1-<orden original>`. El análisis ordena por fecha y, dentro de un mismo día, por id, que es
el orden en que se guardaron las sesiones, igual que en la versión 1.

`ajustes`:

```js
{
  apariencia: { tema: "auto", acento: "azul", haptica: true },
  entreno: { descanso: 90, presets: [30, 60, 90, 120, 180], pasoPeso: 2.5, sonido: true, pantallaEncendida: true },
  horario: { 1: "Torso A", 2: "Descanso", ... 7: null },      // 1 = lunes
  bloques: [{ id, inicio, fin, tipo: "deload" | texto, grupos: [] }],
  umbrales: [{ rutina, maxDur, maxSerie }],
  objetivos: { seriesSemana: [{ grupo, min, max }], incrementos: [{ tipo, kg }] },
  cuerpo: { sexo: "h" | "m" | null, fases: [{ tipo: "bulk" | "cut" | "mantener", desde }] },
  grupos: [{ nombre, color: { oscuro, claro } | null, regiones: ["pecho-*"] }],   // «<músculo>-*»: ids de región de assets/cuerpo-muscular.svg (los tokens del mapa antiguo, como «chest-*», se traducen al abrir)
  ligas: { activa, escala: [{ nombre, desde, hasta, ndiv }], puntos, margen, semCarga, semSeries, correccionPolea },
  estandares: { [slug]: [{ pc, niveles: [5] }] },
  copia: { at, sesiones } | null,
  migracion: { fecha, desde, sesiones, errores, avisos } | null
}
```

## 4. Migración (esquema 1-2 → 3)

`src/data/repos.js › cargar()`:

1. Abre la base. La versión 2 añade el almacén `sesiones`; la versión de los datos va aparte, en
   `kv.schema`.
2. Si `schema < 3` y existe alguna clave antigua (`sessions`, `templates`, `configs`, `settings`,
   `library`, `draft`), calcula el plan con `planMigracion()`. Es puro y se prueba en node:
   - los textos de configuración se leen una sola vez con las mismas reglas que la versión 1
     (`src/migracion/`);
   - de ellos salen el catálogo, las rutinas, los pesajes y los ajustes estructurados;
   - `settings` y el tema de `localStorage` pasan a `ajustes.entreno` y `ajustes.apariencia`;
   - el borrador antiguo se convierte;
   - los errores y avisos de la configuración antigua quedan en `ajustes.migracion`.
3. Todo se escribe en **una sola transacción** sobre `kv` y `sesiones`:
   - `legacy` y `backup-esquema-v<n>` con el original íntegro;
   - el modelo nuevo y `schema = 3`;
   - las claves antiguas se retiran del uso (su contenido queda en `legacy`).

   Si algo falla, IndexedDB deshace la transacción y la base queda exactamente como estaba.
4. **Rescate.** Si después de migrar vuelve a aparecer `sessions` (lo escribió una pestaña con la
   versión antigua), se añaden las sesiones que falten por su ruta y se guarda todo en
   `rescate-<t>`.

Pruebas:

- `tests/core/migracion.test.mjs` (node), sobre el plan puro:
  - `legacy` contiene el original byte a byte;
  - el análisis tras migrar es igual al del golden master;
  - se conservan ajustes, tema y borrador;
  - instalación vacía;
  - copias v1, v2 y seed.json; las copias más nuevas se rechazan;
  - recordatorio de copia;
  - rescate.
- `tests/e2e/migracion-idb.mjs` (navegador), sobre IndexedDB real:
  - de una base v1 al modelo nuevo;
  - segunda apertura sin cambios;
  - rescate;
  - importar guardando antes lo que había.

**Copias.**

- Exportar crea `{app:"gym", version:2, esquema:3, exportado, sesiones, catalogo, rutinas, pesajes, ajustes}`.
- Importar acepta la versión 2, las copias antiguas (`version: 1`, que pasan por el mismo migrador) y
  `seed.json`.
- Una copia de una versión más nueva se rechaza con un motivo claro.
- Importar guarda antes los datos actuales en `respaldo-importacion`.

**Persistencia.**

- Al arrancar se llama a `navigator.storage.persist()`. Su estado y el espacio usado se muestran en
  Ajustes › Datos.
- El recordatorio de copia salta si han pasado más de 7 días o hay más de 5 sesiones nuevas desde la
  última.

## 5. Golden master

`tests/golden/generar.mjs` ejecuta en Chromium (Playwright) el dashboard de la versión 1, conservado
sin cambios en `tests/golden/legacy/` junto con su capa de compatibilidad y sus librerías:

- usa un reloj fijo (zona Europe/Madrid) y una lista de fechas por conjunto de datos;
- inyecta en memoria sentencias de volcado (`tests/golden/inyectar.mjs`); el fichero en disco no se
  toca;
- guarda un JSON por conjunto y fecha.

Hay dos conjuntos de datos:

| Conjunto | Origen | Se publica | Fechas |
|---|---|---|---|
| `sintetico` | `tests/golden/fixture.mjs` | sí, no tiene datos personales | 7, de mayo de 2026 a enero de 2027 |
| `seed` | `seed.json` | no (`.gitignore`) | 6, alrededor de los datos reales |

`sintetico` cubre lo que los datos reales aún no tienen: estancado, retroceso, inactivo, lb,
calentamiento/drop/fallo, duración y temporizador, suma de lados, erratas, duraciones raras,
bloques solapados, las tres fases de peso y líneas de configuración erróneas.

`tests/core/golden.test.mjs` convierte los datos antiguos al modelo nuevo (`desdeLegacy`), ejecuta
`analizar(modelo, fecha)` y compara campo a campo con una tolerancia relativa de 1e-9. Compara:

- sesiones, series, volumen, 1RM y PRs;
- el semáforo con su detalle, la tendencia y la doble progresión con el texto «próxima vez»;
- las ligas por ejercicio, grupo y general, con su línea semanal, lo que falta y los cambios;
- las semanas, el resumen, la racha, «hoy toca» y las series frente al objetivo con las previstas;
- el reparto por grupo, el balance por periodo, el peso con sus medias, ritmo y color, y su texto;
- la calidad de los datos.

Antes de dar el test por bueno se comprobó que falla al alterar un umbral o la fórmula de Epley.

Los textos que la versión 2 redacta de otra manera se comparan a través de un traductor explícito
dentro del test. Así cuenta la lógica y no la redacción. Son estos:

| Versión 1 | Versión 2 |
|---|---|
| estados con emoji («🟡 Estancado») | código (`estancado`) y etiqueta sin emoji |
| «⚠ Pocas series: 2 de 3» | «Pocas series: 2 de 3» |
| «sin plantilla «X»» | «sin rutina «X»» |
| «(sin incremento en objetivos)» | «(sin incremento definido)» |
| motivos de duración con nombres de campos | los mismos motivos, sin nombres de campos |
| errores de configuración con su motivo | solo se comparan el fichero y la línea rechazada |

Cuando el dashboard antiguo tiene un fallo, el núcleo nuevo lo reproduce y el fallo se anota en §8.
Solo se corrige cuando se decide explícitamente, y entonces se regenera el golden.

## 6. Decisiones

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Gráficas SVG propias | Chart.js | Estilo de iOS, sin 200 KB de dependencia y con control de la selección por arrastre. |
| `Intl` y aritmética de días UTC | luxon | Basta para es-ES y semanas ISO; una dependencia menos. |
| Router con History API y una pila por pestaña | rutas hash planas | El gesto de atrás del sistema y la pila de cada pestaña se comportan como en iOS. |
| Estado persistido separado del estado de UI | un único objeto | Las hojas, los toasts y los temporizadores no se guardan ni disparan recálculos. |
| `Analisis` memoizado por versión de datos | recalcular por vista | Una sola pasada sobre las sesiones (pocos ms) y vistas tontas. |
| Ajustes estructurados | archivos de texto `clave:: valor` | Se editan con controles nativos; se validan al guardar, no al leer. |
| Réplica en localStorage del borrador | solo IndexedDB | iOS puede expulsar el almacenamiento de una web; la réplica pequeña permite recuperar un entrenamiento a medias. |
| Banner de actualización | recarga silenciosa | No se recarga en mitad de un entrenamiento. |

## 7. Ideas tomadas de openGym (reescritas, sin copiar código)

openGym (AGPL-3.0) se estudió en una carpeta temporal fuera del repo. No se copia código, estilos,
iconos, textos ni medios. Ideas reinterpretadas:

1. Separar el estado persistido del estado efímero de la interfaz (hojas abiertas, toasts,
   temporizadores).
2. La lógica pura en su propio directorio, con tests a su lado.
3. Una réplica duradera del estado crítico, porque iOS puede borrar el almacenamiento de las webs. Aquí
   se aplica con IndexedDB y una réplica pequeña en localStorage del borrador y de la información de
   la copia.
4. El acento se aplica con un atributo en la raíz, con una variante más oscura para el texto en tema
   claro.
5. Convenciones de iconos: rejilla de 24, margen óptico, coordenadas en múltiplos de 0,5,
   `currentColor`, un solo grosor y sin emojis.
6. Un componente de estado vacío con una acción clara, y un mapa de calor de actividad.

## 8. Fallos y rarezas de la lógica original

El núcleo nuevo reproduce todos los casos de esta lista y no se ha corregido ninguno en silencio.
Ninguno cambia un resultado con los datos reales actuales.

1. **Datos con fecha posterior a «hoy».** El dashboard no filtra por fecha, así que con sesiones o
   pesajes posteriores a hoy:
   - la racha puede salir «cortada hace −18 semanas»;
   - el texto del peso mezcla la fase de hoy con el color del último pesaje, por ejemplo «Objetivo
     cut · ritmo +0,35 kg/semana (sube), a favor».

   *Antes:* esos textos. *Después:* igual. La versión 2 no permite guardar sesiones ni pesajes con
   fecha futura, así que el caso no puede darse. Solo aparece en el golden sintético, que evalúa
   fechas pasadas con todos los datos cargados.
2. **Grafía de un grupo según el orden de las sesiones.** Si el mapeo antiguo escribe el mismo grupo
   de dos formas («Hombro» y «hombro»), todos los ejercicios del grupo se muestran con la primera
   grafía que aparece al recorrer las sesiones de la más reciente a la más antigua.

   *Antes y después:* igual. La migración fija esa grafía una sola vez en `ajustes.grupos`, y desde
   entonces el grupo se elige de una lista, así que no puede volver a pasar.
3. **Dos sesiones el mismo día.** «Última sesión» es la primera que se guardó ese día, no la que
   empezó más tarde. Esto afecta a los récords de la última sesión y a la sesión que evalúa la doble
   progresión.

   *Antes y después:* igual. Las sesiones nuevas tienen un id con la fecha y la hora de inicio, así
   que el orden coincide con el de guardado.
4. **Grupos del objetivo semanal que no existen** (por ejemplo «Glúteo» si ningún ejercicio lo
   usa). Siempre tienen 0 series y salen como «no llegará».

   *Antes y después:* igual. En la versión 2 el objetivo semanal se elige de la lista de grupos, así
   que solo puede ocurrir con datos migrados, y Calidad de los datos lo avisa.

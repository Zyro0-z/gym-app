# Arquitectura

## 1. Restricciones

- PWA estática: HTML, CSS y JS vanilla con módulos ES, sin build, sin dependencias en tiempo de
  ejecución, sin CDNs ni red, y sin analítica. Se publica en GitHub Pages desde `main`.
- Los datos viven solo en el dispositivo, en IndexedDB. Ninguna migración destruye datos: antes de
  cambiar de esquema se guarda una copia íntegra.
- La lógica de cálculo tiene que dar los mismos resultados que el dashboard anterior. Lo garantiza un
  *golden master* (§5).

## 2. Módulos

```
index.html            arranque mínimo: tema antes del primer pintado, <main>, tab bar
sw.js                 service worker: precache versionado, cache-first, aviso de actualización
src/
  app.js              arranque, router (pestañas + pilas), tema y acento, banner de actualización
  store.js            almacén en memoria con suscripciones (estado persistido + estado efímero de UI)
  core/               PURO: sin DOM ni almacenamiento; recibe datos y `hoy`, devuelve datos
    fechas.js         día ISO, lunes de la semana, claves de semana/mes, numDia, días entre fechas
    nombres.js        canon(), Levenshtein, posibles variantes, nombre visible
    sesiones.js       normaliza sesiones: series que cuentan, volumen, e1RM, duración fiable
    rm.js             Epley, conversión lb→kg, fiabilidad, PRs por ejercicio
    estancamiento.js  semáforo, días sin PR descontando bloques, flecha de tendencia
    progresion.js     doble progresión, incrementos, texto «próxima vez»
    semanal.js        series y volumen por semana y grupo; series previstas; vs objetivo
    bloques.js        bloques (deload/especialización), grupos protegidos, días protegidos
    peso.js           pesajes, medias de 21 días, ritmo, tendencia por fase, «has ganado»
    ligas.js          estándares, percentiles, puntuación, divisiones con histéresis, grupos, general
    racha.js          racha de semanas ISO
    horario.js        hoy toca, previstas por día
    calidad.js        avisos de calidad de los datos, con el destino que los arregla
    analisis.js       orquesta todo lo anterior → un objeto `Analisis` memoizado por versión de datos
    formato.js        números en es-ES (coma decimal, punto de miles), fechas con Intl
  data/
    db.js             IndexedDB versionada (onupgradeneeded) y transacciones
    migraciones.js    del formato antiguo (kv con textos de config) al modelo nuevo
    repos.js          sesiones, catálogo, rutinas, ajustes, pesajes, borrador
    importar.js       seed.json, copias antiguas (version 1) y copias nuevas (version 2)
    exportar.js       copia con `version`, hoja de compartir, recordatorio de copia
    espejo.js         réplica compacta en localStorage del borrador y de la fecha de la copia
  ui/
    tokens.css        variables (§3 de DISENO.md)
    base.css          reset, tipografía y utilidades
    componentes.css   estilos de los componentes
    iconos.js         SVG propios
    haptica.js, sonido.js
    navstack.js, tabbar.js, navbar.js, sheet.js, list.js, segmented.js, stepper.js,
    chip.js, charts.js (barras/línea/área/sparkline), ring.js, heatmap.js,
    bodymap.js, insignias.js, emptystate.js, toast.js
  views/              una pantalla por fichero (hoy.js, entreno.js, resumen.js, progreso-*.js,
                      ejercicio.js, grupo.js, ligas.js, historial.js, sesion.js, ajustes-*.js, guia.js)
tests/
  core/*.test.mjs     node:test sobre src/core
  golden/*.json       salida del dashboard anterior con seed.json y fecha fija
  golden.test.mjs     el núcleo nuevo reproduce el golden master
  migracion.test.mjs  fixture del formato antiguo → modelo nuevo, sin pérdida
  e2e/*.mjs           Playwright (chromium y WebKit en contenedor)
docs/                 DISENO.md, ARQUITECTURA.md
```

**Reglas.**

- `core/` no importa nada de `data/`, `ui/` ni `views/`.
- Las vistas leen `Analisis` del store y nunca recalculan por su cuenta.
- No hay variables globales (`window.*`): todo pasa por imports y por el store.

## 3. Modelo de datos (esquema 3)

IndexedDB `gymapp`, versión de base de datos 2:

| Almacén | Clave | Contenido |
|---|---|---|
| `sesiones` | `id` | `{id, rutina, fecha:"YYYY-MM-DD", inicio:"HH:MM", fin:"HH:MM", duracion:min, notas?, ejercicios:[{ejercicioId, notas?, series:[{peso, reps, segundos?, tipo:"normal"\|"calentamiento"\|"fallo"\|"descendente", hecha}]}], origen?}` |
| `ejercicios` | `id` | `{id, nombre, grupo, unilateral, tipoMaterial, incremento?, rangoReps:{min,max}?, top, tipoAncla:"peso"\|"duracion"\|"temporizador", estandar?:{slug, factor, aproximado, polea}\|{sin:true}}` |
| `rutinas` | `id` | `{id, nombre, orden, ejercicios:[{ejercicioId, series}]}` |
| `pesajes` | `fecha` | `{fecha, kg}` |
| `kv` | clave | `ajustes`, `borrador`, `legacy`, `schema`, `backup-esquema-v<n>` |

`ajustes` es JSON estructurado y se edita desde la UI:

```js
{
  apariencia: { tema: "auto", acento: "azul", haptica: true },
  entreno: { descanso: 90, presets: [30, 60, 90, 120], pasoPeso: 2.5, sonido: true, pantallaEncendida: true },
  horario: { 1: "rutinaId" | null, ... 7: null },       // ISO: 1 = lunes
  bloques: [{ id, inicio, fin, tipo: "deload" | "especializacion", nombre, grupos: [] }],
  umbrales: { [rutinaId]: { duracion, porSerie } },
  objetivos: { seriesSemana: { Pecho: {min, max}, ... }, incrementos: [{ tipo, kg }] },
  cuerpo: { sexo: "hombre" | "mujer" | null, fases: [{ objetivo: "bulk" | "cut" | "mantener", desde }] },
  grupos: [{ nombre, color, regiones: ["chest-*"] }],
  ligas: { escala: [{ nombre, desde, hasta, ndiv }], puntos: 5, margen: 1, semCarga: 8, semSeries: 4, correccionPolea: 1.4 },
  estandares: { [slug]: [{ pc, niveles: [5] }] },
  copia: { at, sesiones }
}
```

Las sesiones guardan el `ejercicioId`, no el nombre, para que renombrar un ejercicio no rompa la
historia. El id es el `canon()` del nombre en el momento de crearlo, así que las variantes antiguas
(«Jalón al pecho prono» y «jalon al pecho prono») se fusionan igual que antes, por `canon`.

## 4. Migración (esquema 2 → 3)

1. Al abrir, si `kv.schema < 3`:
   - se escribe `kv["backup-esquema-v2"]` con todo el contenido antiguo (sessions, templates,
     configs, settings, library, draft);
   - se escribe `kv.legacy` con el mismo contenido, que no se borra nunca.
2. Los textos de configuración se parsean una sola vez, con las mismas reglas que el dashboard
   anterior (`src/core/legacy-config.js`, probado con el golden master):
   - grupos-musculares → `ejercicios[].grupo`;
   - unilaterales → `ejercicios[].unilateral`;
   - objetivos → `rangoReps`, `top`, `incremento`, `tipoMaterial`; los `incremento::` van a
     `ajustes.objetivos.incrementos`;
   - estandares → `ejercicios[].estandar` y `ajustes.estandares`;
   - horario-semanal → `ajustes.horario`, `ajustes.bloques` y `ajustes.umbrales`;
   - peso-corporal → `pesajes`, `ajustes.cuerpo`;
   - volumen-objetivo → `ajustes.objetivos.seriesSemana`;
   - colores-grupos y regiones-svg → `ajustes.grupos`;
   - ligas → `ajustes.ligas`.
3. Las sesiones se convierten así:
   - `fm.template` pasa a `rutina`; `date`, `start`, `end` y `duration` a sus equivalentes;
   - los sets pasan a series, con `peso` en kg (lb × 0,45359237) y el tipo traducido;
   - la clave `reps_por_lado` se conserva en `origen`.
4. Las plantillas pasan a ser rutinas, con `targetSets` como `series` (3 si falta). La biblioteca y
   todos los nombres vistos en sesiones o configs pasan al catálogo.
5. Un borrador de entrenamiento en curso se convierte al formato nuevo.
6. Todo se escribe en una sola transacción. Si algo falla, no se escribe nada, se queda el esquema 2
   y la app muestra el error con un botón para exportar la copia antigua.
7. Se prueba con `tests/migracion.test.mjs`, que usa seed.json y un fixture con casos límite:
   - lb;
   - warmup, drop y failure;
   - duración y temporizador;
   - nombres con variantes;
   - configs con líneas erróneas;
   - un borrador a medias.

   Comprobaciones:
   - el `Analisis` calculado sobre el modelo nuevo es igual al golden master;
   - `legacy` contiene el original byte a byte.

**Importar.** Se aceptan seed.json, las copias antiguas (`version: 1`, con configs de texto, que
pasan por el mismo migrador) y las nuevas (`version: 2`). Una copia de un esquema más nuevo que la
app se rechaza.

**Persistencia.**

- Al arrancar se llama a `navigator.storage.persist()`. Su estado y `storage.estimate()` se muestran
  en Ajustes › Datos.
- El recordatorio de copia salta si han pasado más de 7 días o hay más de 5 sesiones nuevas desde la
  última copia. Exportar usa la hoja de compartir (`navigator.share` con un fichero) y, si no está
  disponible, una descarga.

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

# Esquema de datos

Los datos viven en IndexedDB, en la base `gymapp`. La versión de la **base** (estructura de
almacenes) y la versión de los **datos** (`kv.schema`) van por separado:

| Base | Almacenes |
|---|---|
| 1 | `kv` |
| 2 | `kv`, `sesiones` (clave `id`) |

La versión 3.0 de la app **no** sube la versión de la base: las medidas corporales van en `kv`
(clave `medidas`). Así una pestaña o un service worker de la 2.0 que siga abierto puede abrir la
base sin error (`VersionError`) y nada se bloquea durante la actualización.

| Datos (`kv.schema`) | Qué cambia |
|---|---|
| 1-2 | formato antiguo (textos «clave:: valor»); ya no se convierte |
| 3 | modelo estructurado (versión 2.0 de la app) |
| 4 | campos opcionales nuevos (RPE, superseries, nota de sesión, recuperación, RPE objetivo), medidas corporales y ajustes nuevos (versión 3.0) |

`src/data/esquema.js` valida las copias contra lo descrito aquí antes de importar nada.

## Sesión (`sesiones`)

```js
{
  id: "2026-11-15-1763220000000-k3f9",  // texto único; fecha + marca de tiempo de inicio + azar
  rutina: "Torso A" | null,              // nombre de la rutina; null = entrenamiento libre
  fecha: "2026-11-15",                   // fecha real, AAAA-MM-DD
  inicio: "18:02" | null,                // HH:MM
  fin: "19:10" | null,
  duracion: 68 | null,                   // minutos
  ejercicios: [Ejercicio],
  origen: { ruta, ... },                 // opcional: solo en sesiones migradas de la versión 1
  // esquema 4 (opcionales)
  nota: "Hombro molesto en el press",    // nota de la sesión entera
  gimnasio: "principal",                 // opcional: id de ajustes.gimnasios donde se entrenó
  recuperacion: { sueno: 7.5, estres: 2, energia: 4 },   // sueño en horas (pasos de 0,5); estrés y energía de 1 a 5
}
```

**Ejercicio de una sesión**

```js
{
  ejercicioId: "pressbancabarra",   // id del catálogo (canon del nombre al crearlo)
  nombre: "Press banca barra",      // nombre en el momento de guardar
  tipo: "peso" | "duracion" | "temporizador" | "reps",
  series: [Serie],
  nota: "Agarre más cerrado",       // opcional
  grupoId: "g1"                     // esquema 4, opcional: ejercicios con el mismo grupoId forman una superserie
}
```

**Serie**

```js
{
  peso: 80,            // kg, número ≥ 0 (0 = sin peso)
  reps: 8,             // número ≥ 0
  segundos: 45,        // opcional: ejercicios de duración
  tipo: "normal" | "calentamiento" | "fallo" | "descendente",
  hecha: true,
  rpe: 8.5             // esquema 4, opcional: de 5 a 10 en pasos de 0,5; ausente o null = sin RPE
}
```

Cuentan para series, volumen y récords las de tipo `normal` y `fallo` (igual que en la versión 1).

## `kv`

| Clave | Contenido |
|---|---|
| `schema` | número de esquema de los datos (4) |
| `catalogo` | `[{id, nombre, grupo, unilateral, tipoAncla, tipoMaterial, incremento, rangoReps:{min,max}, top, estandar, modoCarga?, musculos?, notaFija?, descanso?}]` — `descanso`: segundos de descanso propios del ejercicio (0-1800; si falta, el de Ajustes); `modoCarga`: `"total"` (por defecto), `"lastre"` (carga = peso corporal + lo apuntado) o `"asistido"` (peso corporal − lo apuntado); `musculos`: `{p:[id], s:[id]}` con ids de `src/core/musculos.js` (principales y secundarios); `notaFija`: texto que sale en cada sesión |
| `rutinas` | `[{id, nombre, ejercicios:[{ejercicioId, series, rpe?}]}]`; `rpe` (esquema 4) es el RPE objetivo |
| `pesajes` | `[{fecha, kg}]` |
| `medidas` | `[{fecha, cintura, …}]` (esquema 4, ver abajo) |
| `ajustes` | ver abajo |
| `borrador` | entrenamiento en curso (con réplica en `localStorage`, clave `gym-espejo`) |
| `legacy`, `backup-esquema-v<n>` | copia íntegra de los datos antes de migrar del esquema `n`; no se borran nunca |
| `respaldo-auto-1..3` | copias internas rotativas: `{fecha, motivo, esquema, sesiones, bytes, datos}` |
| `respaldo-importacion` | los datos que había antes de la última importación o restauración |
| `respaldo-contador` | sesiones nuevas desde la última copia interna |
| `rescate-<t>` | lo que escribió una versión antigua después de migrar |

`motivo` de una copia interna: `sesiones` (cada N sesiones nuevas), `importar`, `restaurar`, `migrar`.

**`localStorage`** guarda solo preferencias de la interfaz de este dispositivo; no forman parte de los
datos ni de la copia, y perderlas no pierde nada: `gym-apariencia` (tema y acento, leída antes del primer
pintado), `gym-espejo` (réplica del
borrador), `gym-progreso` (segmento abierto), `gym-periodo-volumen`, `gym-periodo-musculos`,
`gym-rango-cuerpo` (periodos elegidos) y `gym-instalar-visto` (la tarjeta de instalación ya se vio).

## Medidas corporales (`kv.medidas`, esquema 4)

```js
{ fecha: "2026-11-15", cintura: 82.5, pecho: 101, brazo: 37, muslo: 58, cadera: 96, cuello: 38 }
```

Todas las medidas son opcionales, en cm (número > 0). Una entrada por fecha.

## Molestias (`kv.molestias`, esquema 4)

```js
{ id: "mo-2026-11-15-k3f9x", fecha: "2026-11-15", articulacion: "hombro", lado: "der", nivel: 3, ejercicioId: "pressbancabarra", nota: "al bajar" }
```

`articulacion` de una lista cerrada (cuello, hombro, codo, muneca, espalda-alta, espalda-baja, cadera,
rodilla, tobillo); `nivel` entero de 1 a 5; `lado` (`izq`, `der`, `ambos`), `ejercicioId` y `nota`
opcionales; `id` único. Campo opcional de la copia (`molestias`): una copia sin él se lee como `[]`.

## Ajustes

```js
{
  version: 2,
  apariencia: { tema: "auto" | "claro" | "oscuro", acento: "azul", haptica: true },
  entreno: {
    descanso: 90, presets: [30, 60, 90, 120, 180], pasoPeso: 2.5, sonido: true,
    pantallaEncendida: true,            // Wake Lock durante el entreno
    // esquema 4
    barra: 20, discos: [25, 20, 15, 10, 5, 2.5, 1.25, 0.5],   // calculadora de discos
    controlesBloqueo: false,            // Media Session (experimental)
    push: { activo: false, url: "" },   // aviso de fin de descanso por un servidor propio
  },
  horario: { 1: "Torso A", 2: "Descanso", ..., 7: null },   // 1 = lunes
  bloques: [{ id, inicio, fin, tipo: "deload" | texto, grupos: [] }],
  umbrales: [{ rutina, maxDur, maxSerie }],
  gimnasios: [{ id, nombre, barra, discos: [kg] }], gimnasioActivo: "id",   // vacío = un gimnasio implícito con entreno.barra/discos
  objetivos: { seriesSemana: [{ grupo, min, max }], incrementos: [{ tipo, kg }] },
  cuerpo: { sexo: "h" | "m" | null, fases: [{ tipo: "bulk" | "cut" | "mantener", desde }] },
  grupos: [{ nombre, color: { oscuro, claro } | null, regiones: ["pecho-*"] }],   // «<músculo>-*»: ids de región de assets/cuerpo-muscular.svg (los tokens del mapa antiguo, como «chest-*», se traducen al abrir)
  ligas: { activa, escala, puntos, margen, semCarga, semSeries, correccionPolea },
  estandares: { [slug]: [{ pc, niveles: [5 números] }] },
  copia: { at, sesiones } | null,       // última copia EXPORTADA (fecha ISO y nº de sesiones entonces)
  avisoCopia: { pospuestoHasta },       // la tarjeta de Hoy calla hasta esa fecha
  copiasInternas: { cada: 5 },
  // esquema 4
  descarga: { caidaPct: 3, ejercicios: 2, rpeSube: 1, sueno: 7, semanasMin: 6, pospuestaHasta: null, descartadaEn: null },
  csv: { separador: ";", decimal: "," },
}
```

`completarAjustes()` rellena las claves que falten con los valores por defecto, así que unos ajustes
de una versión anterior siempre se leen bien.

### Mesociclos y nube (`ajustes`, esquema 4, opcionales)

- `ajustes.mesociclos`: `[{ id, nombre, inicio (lunes), semanas (2–16), descarga }]`. Con `descarga`,
  la última semana se guarda también como bloque `meso-<id>` en `ajustes.bloques`.
- `ajustes.nube`: `{ activa, url, auto, ultima: { at, bytes, sesiones } | null }`. **La clave no está
  aquí**: vive en `kv.nube` (`{ frase }`), que no se exporta y no se borra al importar ni con «borrar
  todo».

## Copia cifrada en la nube (sobre)

El navegador sube `JSON.stringify` de este objeto; el servidor solo lo guarda y lo devuelve:

```js
{ v: 1, kdf: "PBKDF2-SHA256", it: 600000, sal: "<base64 16 B>", iv: "<base64 12 B>", gz: true, ct: "<base64>" }
```

`ct` es AES-256-GCM del texto de la copia (comprimido con gzip si `gz`), con la clave derivada de la
clave de la persona y `sal`. El AAD es `gym-nube-v1|gz=0|1`, así que alterar el sobre o el indicador
de compresión hace fallar el descifrado. El identificador de la copia (`id`, 32 hex) y el `token`
(64 hex) salen de la misma clave con una sal fija distinta, y no permiten derivar la clave de cifrado.

## Copia de seguridad (archivo)

```js
{ app: "gym", version: 3, esquema: 4, exportado: "2026-11-15T10:00:00.000Z",
  sesiones: [...], catalogo: [...], rutinas: [...], pesajes: [...], medidas: [...], molestias: [...], ajustes: {...} }
```

| Versión de copia | Esquema | Se acepta |
|---|---|---|
| 1 (y `seed.json`) | 1-2 | no: «versión muy antigua» |
| 2 | 3 | sí: los campos nuevos quedan vacíos |
| 3 | 4 | sí |
| > 3 | > 4 | no: «La copia es de una versión más nueva de la app» |

Reglas de validación (`validarCopia`): listas obligatorias (`sesiones`, `catalogo`, `rutinas`,
`pesajes`), ids no vacíos y sin repetir (sesiones, catálogo, rutinas), fechas reales, horas `H:MM`,
pesos de 0 a 2000, repeticiones de 0 a 1000, tipos de serie y de ejercicio conocidos, RPE de 5 a 10 en
pasos de 0,5, recuperación en rango, pesajes de 0 a 700 kg, medidas de 0 a 400 cm, molestias con articulación y nivel válidos e ids únicos, y mesociclos con id, nombre, inicio y semanas. Si algo falla, el
mensaje dice qué y dónde (por ejemplo, «sesión 3 (2026-02-30): fecha imposible o ausente») y no se
toca ningún dato.

## Migración 3 → 4

Una sola transacción sobre `kv` y `sesiones` (se leen y se escriben dentro de ella):

1. guarda la copia íntegra en `backup-esquema-v3` y en la rotación de copias internas (`motivo: "migrar"`);
2. completa los ajustes con las claves nuevas;
3. crea `medidas = []` si no existe;
4. escribe `schema = 4`.

Los campos nuevos son opcionales: las sesiones no se reescriben y los números no cambian (lo
comprueba el golden master sobre una base real de la versión 2.0). Volver a abrir no repite nada.

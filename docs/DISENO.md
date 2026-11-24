# Diseño

La app es un registro de entrenamientos y un análisis de progreso para iPhone, instalada como PWA.
Este documento fija el mapa de pantallas, el sistema de diseño (tokens y componentes), un boceto de
cada pantalla y el porqué de cada decisión. Las decisiones se toman con las Human Interface
Guidelines de Apple (HIG). Las referencias de uso son Salud, Fitness, Ajustes y Hevy.

## 1. Principios

1. **Neutra al 90 %.** Fondos, celdas y texto en grises del sistema. El color de acento se usa solo en
   lo que se toca, en la cifra clave de cada pantalla y en la barra activa de una gráfica (HIG · Color:
   el acento indica interactividad, no decora).
2. **Color con significado.** Verde, naranja y rojo indican solo estados (progresa, estancado,
   retrocede, va a llegar o no). El color de cada grupo muscular aparece solo como un punto o una barra
   fina, nunca como fondo. Ninguna pantalla lleva más de 3 colores cromáticos.
3. **Una pregunta por pantalla.**
   - Hoy: «¿qué hago ahora?».
   - Progreso: «¿voy bien?».
   - Historial: «¿qué hice?».
   - Ajustes: «¿cómo lo cambio?».

   La jerarquía se lee en dos segundos: título grande, una cifra y después el detalle.
4. **Nada depende del hover.** Todo funciona con el dedo, con objetivos táctiles de 44 pt como mínimo.
5. **Sin texto de relleno.** Ajustes no es un muro de texto. Las explicaciones van en pies de grupo de
   una línea o en una hoja «Cómo se calcula».

## 2. Mapa de pantallas

```
TabBar ─┬─ Hoy ──────────── (raíz)
        │    ├─ Entrenamiento activo (modal a pantalla completa; minimizable a barra)
        │    │     └─ Resumen al terminar (hoja)
        │    ├─ Elegir rutina (hoja media)
        │    └─ Apuntar peso (hoja media)
        ├─ Progreso ─────── (raíz, segmentado: Resumen · Ejercicios · Músculos · Cuerpo)
        │    ├─ Resumen
        │    │     └─ Ligas  (push)  ── Liga de un grupo / de un ejercicio (push)
        │    ├─ Ejercicios ─ Detalle de ejercicio (push)
        │    │                   └─ Cómo se calcula (hoja)
        │    ├─ Músculos ── Detalle de grupo (push)
        │    └─ Cuerpo ──── Añadir/editar pesaje (hoja media)
        ├─ Historial ────── (raíz: mapa de calor + lista por meses)
        │    └─ Sesión (push) ── Editar sesión (modal a pantalla completa)
        └─ Ajustes ──────── (raíz)
             ├─ Rutinas ─── Rutina (push) ── Añadir ejercicio (hoja)
             ├─ Ejercicios ─ Ejercicio (push)
             ├─ Objetivos ── Series por grupo · Peso objetivo
             ├─ Horario semanal (push)
             ├─ Bloques ── Bloque (push)
             ├─ Apariencia (push)
             ├─ Datos ── Calidad de los datos (push)
             └─ Avanzado ── Escala de ligas · Estándares (push)
#/guia   Página oculta con todos los componentes, en claro y en oscuro.
```

### 2.1 Dónde va cada una de las 16 secciones del dashboard anterior

| Sección anterior | Destino | Por qué |
|---|---|---|
| Hoy toca + anillo + «sube carga» | **Hoy**, tarjeta principal | Responde a «¿qué hago ahora?». |
| Cifras clave (series, racha, liga, peso) | Series y racha van a **Hoy**. El peso va a **Hoy** como acceso rápido y a **Cuerpo**. La liga va a **Progreso › Resumen** como una fila. | La liga no debe dominar Hoy. |
| Resumen + avisos de PR y semáforo | **Progreso › Resumen** | Son el estado general del progreso. |
| Series semanales vs objetivo | Resumen en anillo en **Hoy**; detalle por grupo en **Progreso › Resumen** | Hoy muestra el total; el detalle es análisis. |
| Ligas (escalera, por grupo y por ejercicio) | Pantalla **Ligas**, a la que se llega desde Progreso › Resumen, más una fila en cada detalle de ejercicio y de grupo | Es secundaria y no tiene pestaña propia. |
| Sesiones recientes | **Hoy** (solo la última) e **Historial** | No se duplica la lista. |
| Volumen semanal | **Progreso › Resumen** (barras de 8 semanas) | |
| Esta semana por grupo | **Progreso › Músculos** (periodo «Semana») | Es el mismo dato con un selector de periodo. |
| Volumen por grupo (8 semanas) | **Progreso › Músculos** | |
| Balance muscular (diagrama) | **Progreso › Músculos**, con un segmentado de periodo | |
| Peso corporal | **Progreso › Cuerpo** | |
| Consulta: Progresión, PRs, Gráficas, Estancamiento | **Detalle de ejercicio**, en una sola pantalla con secciones (un buscador con pestañas dentro de un desplegable no es un patrón de iOS) | HIG · Lists: «drill-in» con chevron. |
| Consulta por grupo | **Detalle de grupo** (desde Músculos) | |
| Calendario de 16 semanas | **Historial**, como mapa de calor mensual | |
| Calidad de los datos | **Ajustes › Datos › Calidad de los datos**, con avisos que llevan a la pantalla que lo arregla. Un punto rojo en la pestaña Ajustes indica que hay problemas. | Es mantenimiento, no análisis. |
| Bloques / deload | **Ajustes › Bloques**. El bloque activo aparece como etiqueta en Hoy. | |

## 3. Tokens

Todos los colores se definen como variables semánticas en `:root[data-theme]`. El tema «Automático»
sigue a `prefers-color-scheme`.

### 3.1 Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#000000` | fondo plano |
| `--bg-grouped` | `#F2F2F7` | `#000000` | fondo de listas agrupadas (raíz de cada pestaña) |
| `--cell` | `#FFFFFF` | `#1C1C1E` | celdas y tarjetas |
| `--cell-2` | `#F2F2F7` | `#2C2C2E` | elevación 2 (controles dentro de una celda, campos) |
| `--fill` | `rgba(120,120,128,.2)` | `rgba(120,120,128,.36)` | fondo de segmentados y steppers |
| `--label` | `#000000` | `#FFFFFF` | texto principal |
| `--label-2` | `rgba(60,60,67,.77)` | `rgba(235,235,245,.62)` | texto secundario (4,5:1, más oscuro que el de iOS) |
| `--label-icono` | `rgba(60,60,67,.57)` | `rgba(235,235,245,.4)` | iconos y marcas que informan (3:1) |
| `--label-3` | `rgba(60,60,67,.3)` | `rgba(235,235,245,.3)` | texto terciario, rejilla de gráficas |
| `--separator` | `rgba(60,60,67,.29)` | `rgba(84,84,88,.6)` | separadores de 0,5 px |
| `--accent` | según acento | según acento | interactivo, cifra clave, barra activa |
| `--accent-ink` | variante más oscura | variante más clara | texto y enlaces sobre el fondo (4,5:1) |
| `--ok` | `#2A9F47` | `#30D158` | progresa, en rango (gráficos e iconos, 3:1) |
| `--warn` | `#C97600` | `#FF9F0A` | estancado, por encima (gráficos e iconos) |
| `--bad` | `#FF3B30` | `#FF453A` | retrocede, no llega, borrar (relleno) |
| `--ok-ink` / `--warn-ink` / `--bad-ink` | `#1E7133` / `#915500` / `#BD2C24` | `#30D158` / `#FF9F0A` / `#FF7F77` | texto de estado (4,5:1) |
| `--yellow` | `#FFCC00` | `#FFD60A` | solo como valor de la paleta de acentos/grupos |

Elevación en oscuro por tono: fondo `#000` → celda `#1C1C1E` → control `#2C2C2E`. No se usan sombras
en oscuro. En claro, las hojas llevan una sombra suave y ningún borde. Nunca se combinan borde y
sombra.

**Acentos** (Ajustes › Apariencia). Se aplican con `data-accent` en la raíz.

Cada acento tiene dos valores por tema: `--accent` (rellenos con texto blanco a 4,5:1 y gráficos a
3:1) e `--accent-ink` (texto sobre el fondo a 4,5:1). Son algo más oscuros (claro) o más claros
(oscuro, solo el ink) que los del sistema; los valores de iOS no llegan a AA sobre `#F2F2F7`.

| Acento | Claro (relleno / texto) | Oscuro (relleno / texto) |
|---|---|---|
| Azul (por defecto) | `#0071ED` / `#0060C9` | `#0974E0` / `#56AAFF` |
| Índigo | `#5856D6` / `#5553D0` | `#5E5CE6` / `#9E9DF0` |
| Morado | `#A64ED3` / `#8C42B2` | `#A64ED3` / `#D188F6` |
| Rosa | `#E0284B` / `#BF2240` | `#DE3053` / `#FF7B95` |
| Rojo | `#DE332A` / `#BD2C24` | `#D93B31` / `#FF7F77` |
| Naranja | `#AD6500` / `#915500` | `#A66706` / `#FF9F0A` |
| Verde | `#23873D` / `#1E7133` | `#1F8839` / `#30D158` |
| Grafito | `#76767A` / `#636367` | `#757579` / `#A5A5AA` |

Si el acento elegido coincide con un color de estado (rojo, naranja o verde), los estados siguen
siendo legibles porque nunca dependen solo del color: siempre llevan un icono o un texto.

**Grupos musculares.** Cada grupo tiene un color (editable en Ajustes › Ejercicios › Grupos). Por
defecto se toman de la paleta del sistema en este orden: Pecho rosa, Espalda azul, Pierna verde,
Hombro naranja, Bíceps morado, Tríceps índigo, Core amarillo, Antebrazo cian. Se usan solo como un
punto de 8 pt, una barra de 3 pt o un relleno del diagrama corporal.

### 3.2 Tipografía

La fuente es `-apple-system` (SF Pro). Los tamaños están en `rem`, con el tamaño raíz tomado de
`-apple-system-body`, para que la app acompañe al tamaño de texto del sistema. Las cifras usan
`font-variant-numeric: tabular-nums`. No se usa la variante Light de ningún peso.

| Estilo | Tamaño/interlineado | Peso | Uso |
|---|---|---|---|
| Large Title | 34/41 | 700 | título de raíz de pestaña |
| Title 1 | 28/34 | 700 | cifra clave de una pantalla |
| Title 2 | 22/28 | 700 | cifra de tarjeta |
| Title 3 | 20/25 | 600 | nombre de ejercicio en el entrenamiento |
| Headline | 17/22 | 600 | títulos de celda destacados, título de barra |
| Body | 17/22 | 400 | texto de celdas |
| Callout | 16/21 | 400 | texto en tarjetas |
| Subhead | 15/20 | 400 | detalle de celda |
| Footnote | 13/18 | 400 | pies de grupo, cabeceras de sección |
| Caption 1 | 12/16 | 400 | ejes de gráficas, etiquetas |
| Caption 2 | 11/13 | 500 | mínimo absoluto (etiquetas de la tab bar) |

Las cabeceras de grupo van en Footnote, en mayúscula de oración y color `--label-2`. Nunca se usa
texto todo en mayúsculas. Ningún texto baja de 11 px. Las cifras clave no se truncan: si no caben,
baja el tamaño y nunca se cortan con «…».

### 3.3 Geometría

- Rejilla de 4/8 pt. Márgenes laterales de 16 pt, o 20 pt en pantallas de 430 pt o más.
- Radios: 10 pt en controles (botones, campos, segmentados), 12 pt en celdas y listas agrupadas,
  16 pt en tarjetas y 10 pt en hojas (esquinas superiores del sistema).
- Objetivos táctiles de 44×44 pt como mínimo. Celdas de 44 pt de alto como mínimo.
- Listas agrupadas con sangría (inset grouped). El separador empieza después del icono (en
  16 + 29 + 12 = 57 pt cuando hay icono) y llega al borde derecho.
- Nunca hay una tarjeta dentro de otra tarjeta. Dentro de una tarjeta, la jerarquía se marca con tipo
  y espacio.
- Zonas seguras: `env(safe-area-inset-*)` en la barra superior, la tab bar, las hojas y el teclado.

### 3.4 Materiales

- La barra de navegación y la tab bar son translúcidas: `backdrop-filter: saturate(180%) blur(20px)`
  sobre `--bar-bg` (en claro `rgba(249,249,249,.94)`, en oscuro `rgba(22,22,22,.94)`), con un
  separador de 0,5 px que aparece solo cuando hay contenido debajo.
- Las hojas tienen fondo `--bg-grouped` (en oscuro `#1C1C1E`), un tirador (grabber) de 36×5 pt,
  alturas media (≈ 50 %) y grande (≈ 92 %) y un velo `rgba(0,0,0,.4)` detrás.

### 3.5 Iconos

El juego de iconos es propio, en SVG y en línea:

- rejilla de 24 con 2 pt de margen óptico;
- trazo de 1,75, extremos y uniones redondeados, coordenadas en múltiplos de 0,5;
- `currentColor`, sin emojis en ninguna parte;
- variante rellena para la pestaña activa de la tab bar.

Iconos: hoy (anillo), progreso (gráfica), historial (calendario), ajustes (engranaje), más, menos,
check, cerrar, chevron, atrás, buscar, cronómetro, pesa, peso (báscula), trofeo, llama (racha), flecha
arriba/abajo/derecha, rueda de opciones, papelera, arrastrar, compartir, descargar, aviso, información,
lápiz, reloj, minimizar, play.

### 3.6 Movimiento

- Se usan resortes con `cubic-bezier(.32,.72,0,1)` (la curva de las hojas de iOS) y duraciones de
  250–350 ms.
- Push: la pantalla entra desde la derecha mientras la anterior se desplaza un 30 % y se oscurece.
  Pop: lo inverso.
- Gesto de volver desde el borde izquierdo (24 pt): arrastra la pantalla y suelta con inercia. Usa la
  History API (`history.back()`), así que también funciona el gesto de atrás del sistema.
- El título grande se colapsa al título de la barra con el scroll.
- Las duraciones salen de tokens (`--dur-1/2/3` = 150/250/380 ms, `--t-push`, `--t-fast`).
- Con `prefers-reduced-motion` todos esos tokens valen 0, la curva pasa a lineal, las animaciones
  duran 1 ms y una sola vez, y ningún control se desplaza ni escala al pulsarlo. Los esqueletos
  dejan de latir.
- El foco con teclado se ve siempre: contorno de 2 px en `--accent-ink`.

### 3.7 Háptica

Se usa el truco del `<input type="checkbox" switch>` en Safari 17.4+, con una degradación silenciosa
a `navigator.vibrate` y, si tampoco existe, a nada. Se puede desactivar en Ajustes › Apariencia.
Momentos:

- selección: cambiar un segmento, cada paso del stepper y del − / + de peso, y el arrastre por una
  gráfica al cambiar de punto;
- impacto: marcar una serie como hecha;
- éxito: terminar el entrenamiento, batir un PR y el fin del descanso (junto con el sonido).

## 4. Componentes (`src/ui/`)

| Componente | Descripción |
|---|---|
| `NavStack` | Pila de pantallas por pestaña. Cada pestaña conserva su pila y su scroll. Hace push/pop con la History API, el gesto de borde y la transición. |
| `TabBar` | 4 pestañas con icono y etiqueta, variante rellena en la activa y un punto de aviso. Tocar la pestaña activa vuelve a la raíz o hace scroll arriba. Se oculta en el modal de entrenamiento. |
| `NavBar` + `LargeTitle` | Botón atrás (chevron y título anterior, abreviado a «Atrás» si no cabe), título centrado al colapsar y como máximo 2 acciones a la derecha. |
| `Sheet` | Grabber, alturas media/grande, cerrar deslizando hacia abajo y confirmación si hay cambios sin guardar. Cancelar a la izquierda y la acción a la derecha. Solo hay una hoja a la vez. |
| `ActionSheet`, `Alert` | Confirmaciones destructivas en rojo y Cancelar separado. |
| `List` / `Cell` | Lista inset grouped con cabecera y pie. La celda lleva icono en cuadro de color opcional (29 pt, radio 7), título, subtítulo, valor a la derecha, chevron o check, interruptor o stepper. Puede deslizarse para borrar y reordenarse. |
| `Segmented` | Hasta 5 segmentos de igual ancho y fondo `--fill`; el segmento activo es una píldora `--cell` con sombra en claro. |
| `Stepper` | − valor +, con pulsación larga para repetir. |
| `Chip` | Etiqueta pequeña de estado: punto de color y texto, sin fondo saturado. |
| `Sparkline` | Línea de 2 pt sin ejes. |
| `Chart` (barras, línea, área) | SVG propio con barras redondeadas (radio 4 arriba), área con degradado suave, rejilla tenue de 3–4 líneas, eje Y a la derecha y ticks familiares. La selección por arrastre muestra un indicador vertical y una burbuja con el valor y la fecha arriba, con háptica al cambiar de punto. Incluye un título-resumen («Media 14 series/sem»). |
| `Ring` | Anillo de progreso con el fondo en `--fill` y la parte hecha en `--accent` (o en `--ok` si está en rango). |
| `Heatmap` | Mes en rejilla L–D, con intensidad en 5 niveles del acento. |
| `BodyMap` | `assets/cuerpo-muscular.svg` con regiones coloreadas por series. |
| `LeagueBadge` | Insignia de liga (generador propio de SVG) en tamaños de 20, 32 y 96 pt. |
| `EmptyState` | Icono de 48 pt en `--label-3`, título Headline, una línea de texto y un botón de acción. |
| `Toast` | Píldora sobre la tab bar que desaparece a los 2 s. |
| `UpdateBanner` | «Actualización disponible · Recargar». |

## 5. Pantallas

Los bocetos son para 390×844. Las cabeceras de grupo van en mayúscula de oración, nunca todo en mayúsculas. `[ ]` es un botón, `›` un chevron, `●` un punto de color de grupo o de
estado y `▮` una barra.

### 5.1 Hoy

```
┌──────────────────────────────────────┐
│ domingo, 15 de noviembre             │  Footnote, --label-2
│ Hoy                                  │  Large Title
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Hoy toca                         │ │  Subhead; tarjeta radio 16
│ │ Pierna                           │ │  Title 1
│ │ 6 ejercicios · 18 series · ~65 min│ │  Subhead --label-2
│ │ ↑ Sube carga en 2 ejercicios      │ │  Footnote --ok
│ │ [        Empezar         ]       │ │  botón relleno --accent, 50 pt
│ └──────────────────────────────────┘ │
│                                      │
│  L   M   X   J   V   S   D           │  tira de la semana
│  ●   ●   ·   ●   ○  (S)  ·           │  ● hecho  ○ previsto  · descanso
│                                      │
│ ┌───────────────┐ ┌────────────────┐ │
│ │  ◔ 62/96      │ │ (llama)        │ │  2 tarjetas; icono propio
│ │ series semana │ │ 3 semanas      │ │
│ │ objetivo 96   │ │ racha          │ │
│ └───────────────┘ └────────────────┘ │
│                                      │
│ Última sesión                        │
│ ┌──────────────────────────────────┐ │
│ │ Espalda-Bíceps B          vie  › │ │
│ │ 52 min · 22 series · 8.410 kg    │ │
│ ├──────────────────────────────────┤ │
│ │ ⚖ Peso corporal   80,9 kg  [ + ] │ │  apuntar peso rápido
│ ├──────────────────────────────────┤ │
│ │ ▤ Otra rutina                  › │ │  hoja con las rutinas
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  ◉Hoy   Progreso  Historial  Ajustes │  TabBar
└──────────────────────────────────────┘
```

- **Día de descanso:** la tarjeta dice «Descanso», con la siguiente rutina («Mañana: Pierna») y un
  botón secundario «Entrenar igualmente».
- **Hecho:** la tarjeta lleva un check verde «Hecho · 58 min» y la acción pasa a «Ver resumen».
- **Bloque activo:** chip «Deload hasta el 1 nov» bajo la fecha.
- **Entrenamiento en curso:** la tarjeta se sustituye por «Continuar · 23:41».
- **Vacío** (sin rutinas): EmptyState «Crea tu primera rutina» con el botón [Crear rutina] y un enlace
  «Importar copia».

### 5.2 Entrenamiento activo (modal a pantalla completa)

```
┌──────────────────────────────────────┐
│ [⌄]      Pierna · 23:41      [Terminar]│  ⌄ minimiza; Terminar en --accent
│──────────────────────────────────────│
│ Sentadilla barra              ⋯      │  Title 3
│ 6-8 reps · próxima vez: 82,5 kg      │  Footnote --label-2
│                                      │
│  Serie  Anterior    kg     Reps   ✓  │  Caption --label-2
│   1     80×8      [ 82,5 ] [  8 ] (✓)│  fila hecha: tinte --ok al 12 %
│   2     80×7      [ 82,5 ] [  7 ] (✓)│
│   3     80×6      [ 82,5 ] [    ] ( )│  ← activa
│ [ + Añadir serie ]                   │
│                                      │
│ Prensa                        ⋯      │
│ ...                                  │
│ [ + Añadir ejercicio ]               │
│                                      │
├──────────────────────────────────────┤
│ Descanso 1:12   ━━━━━━━━──   −15 +15 Saltar │  barra mínima de descanso
├──────────────────────────────────────┤
│ [ − ]  [ + ]               [ Siguiente ]│  sobre el teclado numérico
└──────────────────────────────────────┘
```

- El teclado es numérico (`inputmode=decimal` para el peso y `numeric` para las reps). Acepta coma y
  punto.
- Deslizar una fila hacia la izquierda la borra. El menú ⋯ permite cambiar el ejercicio, ver la
  historia, quitarlo o añadir una nota.
- «Anterior» muestra la serie n de la última sesión del mismo ejercicio, y «Próxima vez» la
  recomendación de la doble progresión.
- **Minimizado:** sobre la tab bar aparece una barra de 56 pt con «Pierna · 23:41 · Descanso 1:12».
  Tocarla vuelve al modal.
- **Recuperable:** el borrador se guarda en IndexedDB en cada cambio, con una réplica en
  `localStorage`. Al abrir la app con un borrador, se reabre el modal.
- **Terminar:** hoja de revisión (editar series, borrar vacías y hora de fin) y después el Resumen.

### 5.3 Resumen de sesión (hoja grande)

```
│            ━━━  (grabber)            │
│ Cancelar                    [Guardar]│
│ ✓ Pierna                             │  Title 1, icono --ok
│ 58 min · 18 series · 9.120 kg        │
│ ┌──────────────────────────────────┐ │
│ │ (trofeo) 2 récords nuevos        │ │
│ │ Sentadilla barra  e1RM 104,0 kg  │ │
│ │ Prensa            e1RM 210,0 kg  │ │
│ └──────────────────────────────────┘ │
│ Por ejercicio                        │
│ Sentadilla barra   3×8 · 82,5 kg   ↑ │
│ ...                                  │
```

### 5.4 Progreso (raíz, segmentado)

```
┌──────────────────────────────────────┐
│ Progreso                             │
│ [Resumen|Ejercicios|Músculos|Cuerpo] │  Segmented bajo el título
```

**Resumen**

```
│ Esta semana                          │
│ ┌──────────────────────────────────┐ │
│ │ 62 series        +12 % vs anterior│ │  Title 1 --accent + delta
│ │ 3 sesiones · 26.400 kg · 54 min   │ │
│ └──────────────────────────────────┘ │
│ Series por grupo · objetivo semanal  │
│ ┌──────────────────────────────────┐ │
│ │ ● Pecho     14 ▮▮▮▮▮▮▮░  12–16  ✓ │ │  barra fina; estado con icono
│ │ ● Espalda   10 ▮▮▮▮░░░░  14–18 −4 │ │
│ │ ...                               │ │
│ └──────────────────────────────────┘ │
│ Volumen · últimas 8 semanas          │
│ ┌──────────────────────────────────┐ │
│ │ Media 24.800 kg                  │ │  título-resumen
│ │  ▁ ▃ ▅ ▄ ▆ ▅ ▇ █   (barra actual │ │  barras redondeadas
│ │                    en --accent)  │ │
│ └──────────────────────────────────┘ │
│ Récords recientes                    │
│ Sentadilla barra   104,0 kg   12 nov │
│ Avisos                               │
│ ● Press militar máquina  Estancado › │  --warn
│ ● Curl martillo   Retrocede        › │  --bad
│ ┌──────────────────────────────────┐ │
│ │ [insignia 32] Liga  Esmeralda II › │ │  una sola fila → Ligas
│ └──────────────────────────────────┘ │
```

**Ejercicios**

```
│ [(lupa) Buscar ejercicio        ]    │
│ Pecho                                │
│ Press plano máquina   ↑  95,2 kg   › │  tendencia + e1RM
│ Aperturas polea       →  41,0 kg   › │
│ Espalda                              │
│ ...                                  │
```

**Detalle de ejercicio (push)**

```
│ ‹ Progreso                     ⓘ     │  ⓘ abre «Cómo se calcula»
│ Press plano máquina                  │  Large Title
│ ● Pecho · máquina · 6–10 reps        │
│ ┌──────────────────────────────────┐ │
│ │ e1RM 95,2 kg            ↑ 2,1 %   │ │  cifra clave --accent
│ │ [1M|3M|6M|Todo]                  │ │
│ │   área con degradado + puntos     │ │  arrastre: burbuja «92,0 kg · 12 oct»
│ └──────────────────────────────────┘ │
│ Próxima vez                          │
│ ┌──────────────────────────────────┐ │
│ │ ↑ Sube carga                     │ │
│ │ De 80 kg a 82,5 kg (+2,5 · máquina)│ │
│ │ y vuelve a 6 reps.               │ │
│ └──────────────────────────────────┘ │
│ Estado                               │
│ Semáforo           ● Progresando     │
│ Días sin récord    12                │
│ Liga               [ins] Oro II    › │
│ Récords                              │
│ e1RM               95,2 kg · 12 nov  │
│ Mejor serie        85 × 8            │
│ Volumen en sesión  2.040 kg          │
│ Sesiones                             │
│ 12 nov   85×8 · 85×7 · 85×6      95,2│
│ ...                                  │
```

**Músculos**

```
│ [Semana|4 sem|8 sem]                 │
│ ┌──────────────────────────────────┐ │
│ │  (diagrama frontal | dorsal)      │ │  BodyMap
│ └──────────────────────────────────┘ │
│ ● Pecho     14 series   6.200 kg   › │
│ ● Espalda   10 series   5.900 kg   › │
│ ...                                  │
│ Volumen por grupo · 8 semanas        │
│ (barras apiladas con colores de grupo│
│  como segmentos finos; leyenda abajo)│
```

El **detalle de grupo** muestra las series por semana frente a la banda objetivo, los ejercicios del
grupo con su tendencia y la liga del grupo en una fila.

**Cuerpo**

```
│ ┌──────────────────────────────────┐ │
│ │ 80,9 kg          media 21 d 80,4  │ │  Title 1 --accent
│ │ Volumen · +0,3 kg/sem   ● a favor │ │
│ │ [1M|3M|6M]                        │ │
│ │  puntos + línea de media          │ │
│ └──────────────────────────────────┘ │
│ Has ganado 2,1 kg desde el 14 sep    │
│ Pesajes                         [+]  │
│ 15 nov            80,9 kg          › │  deslizar para borrar
│ ...                                  │
```

### 5.5 Ligas (push desde Progreso › Resumen)

```
│ ‹ Progreso                           │
│ Ligas                                │
│ ┌──────────────────────────────────┐ │
│ │    [insignia 96]                 │ │
│ │    Esmeralda II                  │ │  Title 2
│ │    ◔ 2,4 puntos para Esmeralda I  │ │
│ └──────────────────────────────────┘ │
│ Escalera                             │
│ (15 insignias de 32, en scroll       │
│  horizontal, la tuya resaltada)      │
│ Por grupo                            │
│ ● Pecho     [ins] Oro I         ›    │
│ Por ejercicio                        │
│ Press plano máquina [ins] Oro II ›   │
│ Cambios esta SEMANA                  │
│ ↑ Pecho → Oro I                      │
```

### 5.6 Historial

```
│ Historial                            │
│ ┌──────────────────────────────────┐ │
│ │ ‹   noviembre 2026   ›           │ │
│ │ L  M  X  J  V  S  D               │ │  Heatmap: intensidad del acento
│ │ ▢  ▣  ▢  ▣  ▣  ■  ▢               │ │  borde discontinuo = deload
│ │ 12 sesiones · 4 semanas de racha  │ │
│ └──────────────────────────────────┘ │
│ Noviembre                            │
│ ┌──────────────────────────────────┐ │
│ │ ● Pierna            vie 13   ›   │ │
│ │   58 min · 18 series · 9.120 kg   │ │
│ ├──────────────────────────────────┤ │
│ ...                                  │
```

Tocar un día del mapa lleva a su sesión. **Detalle de sesión:** cabecera con fecha y duración, y
cada ejercicio con sus series y la comparación con la sesión anterior de la misma rutina
(«+2,5 kg», «+1 rep» en `--ok`, o en `--bad` si baja). Arriba a la derecha, «Editar»; abajo, «Borrar
sesión» en rojo con una confirmación.

### 5.7 Ajustes

```
│ Ajustes                              │
│ ┌──────────────────────────────────┐ │
│ │ ▣ Rutinas                   5  › │ │  icono en cuadro de color
│ │ ▣ Ejercicios               33  › │ │
│ │ ▣ Objetivos                    › │ │
│ │ ▣ Horario semanal              › │ │
│ │ ▣ Bloques             1 activo › │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ▣ Apariencia                   › │ │
│ │ ▣ Entrenamiento                › │ │  descanso, paso de peso, pantalla
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ ▣ Datos          ● 2 avisos   › │ │
│ │ ▣ Avanzado                     › │ │
│ └──────────────────────────────────┘ │
│ Versión 2.0 · Diagrama: MIT, ver README │  pie
```

- **Rutina:** lista reordenable con asa, un stepper de series objetivo en cada fila, deslizar para
  quitar, [+ Añadir ejercicio] y, en otro grupo, Renombrar y Borrar.
- **Ejercicio:** grupo (lista con check), interruptor «Unilateral (reps por lado)», rango de reps
  (dos steppers), «Serie top» (interruptor), material (máquina, polea, mancuerna, barra u otro), un
  incremento propio opcional y la referencia de liga (estándar y factor), estos dos últimos en
  Avanzado.
- **Objetivos:** series semanales por grupo (dos steppers mín–máx por grupo), fase del peso (bulk,
  cut o mantener, con fecha de inicio), sexo (para los coeficientes) e incrementos por material.
- **Horario semanal:** 7 filas L–D, cada una con un selector de rutina o Descanso.
- **Bloques:** lista de bloques (tipo, fechas y grupos) y el editor de cada uno.
- **Apariencia:** Tema (segmentado Automático/Claro/Oscuro), Acento (8 círculos con check) y
  Háptica (interruptor).
- **Entrenamiento:** descanso por defecto, presets de descanso, paso de peso, sonido al terminar el
  descanso y pantalla siempre encendida.
- **Datos:** estado del almacenamiento («Persistente» o «Puede borrarse», con espacio usado),
  Exportar copia (hoja de compartir), Importar copia, última copia y Calidad de los datos. La calidad
  muestra cada aviso como una celda que lleva al editor que lo arregla.
- **Avanzado:** escala de ligas (puntos sobre Elite, margen de descenso y semanas de carga y de
  series), corrección de polea, y las tablas de estándares (solo lectura, con su recuento).

### 5.8 Estados vacíos

| Pantalla | Título | Acción |
|---|---|---|
| Hoy sin rutinas | Crea tu primera rutina | [Crear rutina] · Importar copia |
| Progreso sin sesiones | Aún no hay datos | [Empezar entrenamiento] |
| Ejercicio con menos de 3 sesiones | Se necesitan 3 sesiones | (nada; la gráfica muestra los puntos que hay) |
| Cuerpo sin pesajes | Apunta tu peso | [Añadir pesaje] |
| Historial vacío | Sin entrenamientos | [Empezar] |
| Ligas sin estándares o sin peso | Las ligas necesitan tu peso | [Añadir pesaje] |

## 6. Lista de autocrítica (después de cada fase de UI)

1. ¿Hay un solo color cromático dominante y como mucho 3 en total?
2. ¿Hay texto truncado o de menos de 11 px?
3. ¿Hay alguna tarjeta dentro de otra?
4. ¿Todos los objetivos miden 44 pt o más?
5. ¿Parece iOS (barras, listas, hojas y tipografía)?
6. ¿Se entiende la jerarquía en 2 s?
7. ¿Funciona en claro, en oscuro y con texto grande?

## 7. Decisiones de implementación (fase 3)

| Decisión | Motivo |
|---|---|
| Barra de estado `default` en lugar de `black-translucent` | Con `black-translucent` el texto de la barra de estado es siempre blanco y desaparece en el tema claro. Con `default`, iOS la pinta según la apariencia del sistema y el contenido empieza debajo. |
| Cambiar de pestaña no deja entradas en el historial | En iOS el gesto de atrás nunca cruza pestañas. Al salir de una pestaña se rebobina su parte del historial y al volver se reconstruye, así que su pila se conserva. |
| Las hojas no entran en el historial | Una hoja es modal y efímera (HIG · Sheets). Si llega un «atrás» del sistema con una hoja abierta, la hoja se cierra y la navegación vuelve con normalidad. |
| Botón atrás con el título anterior, o «Atrás» si pasa de 14 caracteres | Es la regla de UINavigationBar: el título anterior solo si cabe. |
| Gesto de borde de 24 pt, con umbral del 35 % del ancho o un lanzamiento rápido | Coincide con la sensación de UINavigationController. La velocidad se suaviza para que un arrastre lento y corto no cuente como lanzamiento. |
| Segmentado y stepper de 34 pt de alto, con el área táctil ampliada a 44 pt | El tamaño visual es el del sistema y el área táctil cumple el mínimo de 44 pt (HIG · Layout). |
| Etiquetas de la tab bar a 11 pt | iOS usa 10 pt, pero la regla de esta app fija 11 px como mínimo absoluto. |
| Colores de grupo del usuario si existen; si no, la paleta del sistema | Los colores migrados son datos del usuario. Siguen usándose solo como punto, barra fina o relleno del diagrama. |
| Animaciones con la Web Animations API y un temporizador de respaldo | Algunos WebKit no resuelven `finished` en animaciones recién creadas; sin respaldo, la pila quedaría con dos pantallas visibles. |
| Háptica: interruptor oculto en iOS, `navigator.vibrate` en el resto | Safari no tiene API de vibración. Un `<input switch>` da el toque háptico del sistema al cambiar. |
| Velo de alertas y hojas de acciones con `--veil` | Con un velo del 20 %, en oscuro el contenido de detrás competía con el texto de la alerta. |


## 8. Decisiones de implementación (fase 4)

| Decisión | Por qué |
|---|---|
| Ajustes guarda al momento, sin botón «Guardar» | Es el patrón de Ajustes de iOS. Solo las altas (rutina, grupo, fase, bloque) y los nombres usan una hoja o un botón explícito, porque crean algo nuevo. |
| Raíz de Ajustes en cuatro grupos (entrenar, planificar, aspecto, datos) | Las HIG piden listas agrupadas por tarea. Los avisos aparecen como chip rojo en la celda afectada («Copia pendiente», «N avisos»), no como insignia en otra parte. |
| Cambiar el nombre de un ejercicio o rutina reescribe las sesiones | El análisis agrupa por nombre canónico; sin reescribir, el historial quedaría partido en dos. Se pide confirmación con el número de sesiones afectadas. Si el nombre nuevo ya existe, se ofrece unirlos. |
| Un ejercicio con sesiones no se puede borrar | Borrarlo dejaría series huérfanas. El pie explica cómo unirlo con otro. |
| Reordenar con asa y arrastre; quitar deslizando | Igual que las listas editables de iOS. El asa ocupa 44 pt y tiene `touch-action: none` para que el desplazamiento de la página no interfiera. |
| Stepper compacto en el editor de rutina | Con el stepper normal, los nombres de ejercicio se partían en tres líneas a 390 pt. Las zonas táctiles siguen siendo de 44 pt de alto. |
| Valores de celda en una línea con puntos suspensivos | iOS nunca parte el valor de una celda; el título manda. |
| Calidad de los datos: cada aviso lleva a la pantalla que lo arregla | Un aviso que no se puede resolver con un toque es ruido. Los informativos (rutinas que ya no existen) no llevan chevron. |
| Liga «última conocida» cuando no hay series recientes | El cálculo no cambia: sin series en las últimas semanas no hay liga de hoy. La interfaz enseña la última, atenuada y con la fecha, en vez de un estado vacío que haría pensar que se perdieron los datos. |
| El entrenamiento se reabre como se dejó | Si se cerró la app con el entrenamiento minimizado, vuelve la barra; si estaba a pantalla completa, vuelve la pantalla completa. Se recuerda en el almacenamiento local, que no guarda datos de entrenamiento. |
| Sin barra de descanso mientras se escribe | En iPhone el teclado la tapa; con teclado físico o en pruebas, se ocultaba a medias bajo la barra del teclado. |
| Instalaciones nuevas con regiones del cuerpo por grupo | Así el mapa de Músculos funciona desde el primer día, con el mismo reparto que los datos migrados. |

## 9. Decisiones de la fase 5

| Decisión | Por qué |
|---|---|
| Aviso de versión nueva arriba, como píldora, con «Recargar» | No tapa la tab bar, la barra del entrenamiento ni la del descanso. Se oculta durante el entrenamiento a pantalla completa para no distraer. |
| La versión nueva espera a que el usuario pulse | Recargar solo sin preguntar podría cortar un entrenamiento. Antes de activarla se guarda el entrenamiento en curso. |
| Progreso del entrenamiento en la cabecera (hechas/total y una línea fina) | Visto en la comparación con openGym: saber cuánto queda sin tener que desplazarse. Es un patrón, no código suyo. |
| Músculos abre en el primer periodo con series | Con la semana vacía, el mapa salía gris. Si eliges un periodo, se respeta. |

## 10. Decisiones de la fase 6

| Decisión | Por qué |
|---|---|
| Hoy: un solo bloque principal (rutina, «Empezar», «Repetir última · fecha») y el resto en tarjetas compactas | Una pregunta por pantalla: lo primero que se ve es qué toca y cómo empezar. Avisos (copia, instalar, descarga) usan el mismo `avisoCompacto`, de un solo nivel de énfasis. |
| «Repetir última» copia pesos, reps, tipo y RPE de las series hechas de la última sesión de esa rutina, sin marcarlas | Ahorra escribir; marcar sigue siendo un gesto consciente. |
| Progreso › Resumen: una gráfica principal (volumen semanal) con 8 semanas / 6 meses / 1 año; Ligas pasa a «Más análisis» | Menos tarjetas y más aire sin quitar contenido. Sin preferencia guardada abre el primer periodo con datos. |
| Mapa corporal monocromo: acento en 4 niveles de opacidad, leyenda con rangos, valor al tocar y etiqueta textual de más a menos | El color de grupo en el mapa no se distinguía en oscuro ni para daltónicos; la intensidad sí. |
| Colores más oscuros (claro) / tintas más claras (oscuro) que los de iOS | La auditoría (`npm run a11y`) mide el contraste con colores resueltos; los del sistema no llegan a 4,5:1 en texto ni a 3:1 en gráficos. |
| Texto grande: el contenido crece sin límite; barras, cabeceras de hoja, segmentados y la cabecera de la tabla de series se limitan a ~20 px | Igual que iOS: las barras no escalan con los tamaños de accesibilidad y así nada se solapa. Los valores de celda pasan a otra línea en vez de cortarse. |
| Interruptor apagado en `--label-icono` (no el gris de iOS) | El gris del sistema se queda en 1,3:1 sobre la celda; un control necesita 3:1 para que se vea su estado. |
| «Anterior» en la tabla de series se trunca con «…» con texto muy grande | Es un atajo (copiar la serie anterior); su nombre accesible completo sigue disponible. Queda como aviso, no como fallo. |
| Hojas, alertas y el entrenamiento atrapan el foco; Escape cierra o minimiza y el foco vuelve al botón de origen | Uso con teclado externo y VoiceOver. |
| Temporizador de descanso con `role=timer` y un anuncio `polite` al empezar y a 10 s del final | Leer cada segundo sería ruido. |
| Tarjeta «Añadir a pantalla de inicio» solo en Safari de iPhone sin instalar, una vez | Sin atajos en el manifiesto (iOS no los muestra). |

## 11. Decisiones de las fases 4 y 5

| Decisión | Por qué |
|---|---|
| Hoy: anillo de 60 px con el % en el centro, racha al lado y miniatura del peso | Se lee la semana de un vistazo sin entrar en Progreso. |
| Progreso › Ejercicios: miniatura de tendencia por fila; Fatiga: 8 semanas en miniaturas con los mismos ejes | Comparar entre ejercicios y semanas sin abrir cada ficha. Un hueco es una semana sin dato, no un cero. |
| e1RM con banda de ruido personal (sd de las últimas sesiones) | Una subida dentro de la banda es ruido normal; evita celebrar o alarmarse por un día. |
| El punto máximo de una gráfica avisa con háptica de impacto al recorrerla | Se siente el récord del periodo sin mirar. |
| Rendimiento: franja del IC 95 %, punto hueco con n < 5 y veredicto «sin conclusión» salvo n ≥ 12 y |t| ≥ 2 | Con pocas sesiones, dormir bien o mal se parece al ruido de un día a otro: siempre se enseña n y nunca se afirma una causa. |
| Molestias: niveles 1–5 con texto, «persistente» a las 3 anotaciones de nivel 3+ en 14 días | Registrar y resumir; el diagnóstico es de un fisioterapeuta. |
| Mesociclo con descarga final crea el bloque de descarga | La propuesta de descarga y el análisis ya respetan los bloques; no hay una segunda fuente de verdad. |
| Tarjeta de sesión con paleta fija, no la del tema | Se ve igual donde se publique. Se comparte como archivo PNG (hoja de Compartir) o se descarga. |
| Copia en la nube cifrada en el dispositivo; clave aparte de los datos y fuera de las copias | El servidor no ve datos ni clave. Si se pierde la clave no hay recuperación: se avisa donde se muestra. |
| Sonido: se desbloquea en cualquier toque, se reanuda al volver a la app y la campana reintenta si el contexto estaba parado; guardado también en `pagehide`/`freeze` | iOS suspende el audio (llamadas, Siri, bloqueo) y a veces cierra la app sin `visibilitychange`. |

## 12. Pulido visual (noviembre 2026)

- Gráficas: barras al 90 % de opacidad (el contraste mínimo de 3:1 en oscuro lo impone), etiquetas del eje X a ≥48 px, línea e1RM sin punto por dato (solo último y máximo) y sin degradado cuando hay franja.
- La flecha de tendencia sigue al semáforo (`flechaEstado`): Progresa ↑ verde, Estancado → ámbar, Retrocede ↓ roja.
- Hoy: la cifra clave es la carga sugerida del primer ejercicio; el aviso de copia es una fila.
- Alertas con una etiqueta de más de 13 caracteres apilan los botones.
- Filas no pulsables de detalle: `estilo: "compacta"` (36 px). Las pulsables mantienen 44 pt.
- Iconos de Ajustes en neutro; título grande a 30 pt; borde de 0,5 px en tarjetas en modo oscuro.
- Insignias de liga rediseñadas: medallas con material propio (madera, cobre, hierro, bronce, plata, oro, platino), gemas facetadas (zafiro, esmeralda, rubí), diamante de talla brillante, medallón con laurel (Maestro) y medallones alados (Gran Maestro, Élite, Leyenda con anillo espectral). Bisel, brillo superior y glifo en relieve; versión simplificada hasta 48 px. Ninguna variante sale del lienzo de 128×128 (el recorte de Leyenda venía de sus rayos).
- Progreso › Cuerpo: gráfica de peso y, debajo, la gráfica de medidas con su selector; la lista completa de pesajes vive en «Todos los pesajes» (`pesajes`).
- Progreso › Músculos: selector «Grupos | Músculos». «Músculos» pinta el mapa por músculo concreto (semana, 4 u 8 semanas).
- Sin zoom por doble toque (`touch-action: manipulation` en `html`); el pellizco se conserva por accesibilidad.
- Copia en la nube: no pisa una copia del servidor más reciente que la última subida o restaurada de este dispositivo (`subirNube` lanza `conflicto`; «Subir ahora» pide confirmar). La derivación PBKDF2 de id y token se hace una vez por clave.
- Cambiar ejercicio en sala: arriba, «Mismo músculo principal» (`equivalentes` en `core/musculos.js`) con los del mismo músculo; al elegir se aplica el tipo del catálogo (peso o solo repeticiones).
- Descanso propio por ejercicio (`catalogo[].descanso`, en la ficha del ejercicio): sustituye al de Ajustes; con «No» en Ajustes no hay descanso automático.
- Mapa por músculos: cada ejercicio cuenta en su subgrupo (pecho superior frente a pecho medio e inferior): el press plano tiene como principal el esternal y el inclinado el clavicular; el otro entra como secundario (peso ajustable, 0 = asignación estricta). Los ejercicios sin músculos se rellenan con «Asignar músculos automáticamente» (`asignarMusculos` en `core/musculos.js`); `baseDe` entiende nombres con paréntesis («Press Plano (Manc)»).
- `npm run demo` genera `gym-demo.json` con la rutina real de Sergio (12 semanas, músculos asignados); `node tools/demo.mjs --sintetico` conserva el historial del modelo de pruebas.
- Catálogo base de ejercicios (`core/catalogo-base-datos.js`, ~120 ejercicios con grupo, material, modo de carga y músculos): se añade desde Ajustes › Ejercicios › «Añadir ejercicios comunes» sin tocar los existentes.

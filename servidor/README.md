# Servidor de avisos (opcional)

Envía un aviso al iPhone cuando termina el descanso aunque la pantalla esté bloqueada o la app en
segundo plano. **La app funciona sin él**; sin servidor, el descanso se recalcula al volver a la app
y avisa con «Descanso terminado hace X s».

- Cloudflare Workers + un Durable Object por dispositivo, con una alarma a la hora de fin del descanso.
- Web Push estándar (VAPID, cifrado `aes128gcm`), sin dependencias: `src/push.js`.
- Solo acepta peticiones con `Origin: https://zyro0-z.github.io` y solo envía a servicios de push
  conocidos (Apple, Google, Mozilla, Microsoft).
- Avisos: no guarda nada del entrenamiento, solo la suscripción del dispositivo, la hora y el texto del
  aviso («Descanso terminado», el ejercicio y la serie). Se borra al enviarlo o cancelarlo.
- Copia en la nube (opcional): guarda en KV un **sobre cifrado** que la app cifra antes de enviarlo (el
  servidor no tiene la clave) y el hash del token de acceso. Ver «Copia cifrada» más abajo.
- No se publica con la app (GitHub Pages solo copia `index.html`, `src/`, `assets/`…).

## Coste

Cabe en el **plan gratuito** de Workers (comprobado en la página de precios de Durable Objects,
noviembre de 2026): los Durable Objects del plan gratuito tienen que usar almacenamiento SQLite (por
eso `new_sqlite_classes` en `wrangler.toml`); las alarmas cuentan como peticiones (100 000 al día) y
cada `setAlarm()` como una fila escrita (100 000 al día). Un entrenamiento con 20 descansos son
unas 60 operaciones.

## Copia cifrada (KV)

Necesita un espacio KV enlazado como `COPIAS` (sin él, `/v1/copia/*` responde 500 y los avisos siguen
funcionando). Una vez, antes de desplegar:

```sh
npx wrangler kv namespace create COPIAS
```

Descomenta el bloque `[[kv_namespaces]]` de `wrangler.toml` y pega el `id` que imprime en lugar de `PEGA_AQUI_EL_ID_DEL_KV`.

Cabe en el plan gratuito: KV permite 100 000 lecturas y 1 000 escrituras al día y 1 GB (valores de
hasta 25 MiB; aquí el máximo es 8 MB). Cada petición hace una lectura (comprobar el token) y, al subir,
una escritura; la app espera 5 s tras guardar una sesión, así que son pocas al día. KV es de
consistencia eventual: tras subir, otra ubicación puede tardar hasta ~1 minuto en ver la copia nueva.

## Desplegar (una vez)

Requisitos: cuenta gratuita de Cloudflare y node ≥ 20.

```sh
cd servidor
npm install                      # instala wrangler (solo para desplegar)
npx wrangler login               # abre el navegador para autorizar
npm run claves                   # genera VAPID_PUBLICA y VAPID_PRIVADA
npx wrangler secret put VAPID_PUBLICA     # pega el valor
npx wrangler secret put VAPID_PRIVADA     # pega el valor (no lo guardes en el repo)
npx wrangler secret put VAPID_SUJETO      # mailto:tu-correo o la URL de la app
npm run desplegar                # imprime la URL, p. ej. https://gym-avisos.<tu-cuenta>.workers.dev
```

Si la app se publica en otro sitio, cambia `ORIGEN` en `wrangler.toml` antes de desplegar.

## Activarlo en el iPhone

1. La app tiene que estar **instalada** en la pantalla de inicio (iOS 16.4 o posterior): Safari solo
   permite Web Push a las apps instaladas.
2. Ajustes › Entrenamiento › Avisos con la pantalla bloqueada: pega la URL del servidor y activa
   «Avisar al terminar el descanso». iOS pide permiso para las notificaciones.
3. Pulsa «Enviar aviso de prueba» y bloquea el iPhone: debe llegar en unos segundos.

Si cambias las claves VAPID, desactiva y vuelve a activar los avisos en la app (la suscripción va
ligada a la clave pública).

## API

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/v1/clave` | — | `{ clave }` (pública VAPID) |
| POST | `/v1/programar` | `{ id, suscripcion, en, titulo?, cuerpo? }` | `{ ok }` · `en` en ms, como mucho dentro de 1 h |
| POST | `/v1/cancelar` | `{ id }` | `{ ok }` |
| POST | `/v1/probar` | `{ suscripcion }` | `{ estado }` del servicio de push |
| PUT | `/v1/copia/:id` | sobre cifrado (JSON) | `{ ok, at, bytes }` · `Authorization: Bearer <token>`; la primera escritura fija el token |
| GET | `/v1/copia/:id` | — | el sobre · 404 si no hay copia |
| GET | `/v1/copia/:id/info` | — | `{ bytes, at }` |
| DELETE | `/v1/copia/:id` | — | `{ ok }` |

Errores de `/v1/copia`: 400 (id o sobre no válidos), 401 (sin token), 403 (token distinto del de la
copia), 413 (más de 8 MB), 500 (falta el KV). El `id` y el `token` los deriva la app de la clave de la
persona; no se puede deducir la clave de ellos.

`id` (en `/v1/programar`) identifica el dispositivo (lo genera la app; un aviso pendiente por dispositivo: programar otro
sustituye al anterior).

## Pruebas

```sh
cd servidor && npm test          # node:test, sin red: push simulado y Durable Object en memoria
```

Comprueban que el dispositivo descifra el mensaje (RFC 8291), la firma VAPID (RFC 8292), el CORS,
programar → alarma → envío, cancelar y el rechazo de datos no válidos. `copias.test.mjs` cubre las
rutas de la copia (token, límites, CORS) y el cliente real de la app contra el Worker con un KV en
memoria.

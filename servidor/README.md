# Servidor de avisos (opcional)

Envía un aviso al iPhone cuando termina el descanso aunque la pantalla esté bloqueada o la app en
segundo plano. **La app funciona sin él**; sin servidor, el descanso se recalcula al volver a la app
y avisa con «Descanso terminado hace X s».

- Cloudflare Workers + un Durable Object por dispositivo, con una alarma a la hora de fin del descanso.
- Web Push estándar (VAPID, cifrado `aes128gcm`), sin dependencias: `src/push.js`.
- Solo acepta peticiones con `Origin: https://zyro0-z.github.io` y solo envía a servicios de push
  conocidos (Apple, Google, Mozilla, Microsoft).
- No guarda nada del entrenamiento: la suscripción del dispositivo, la hora y el texto del aviso
  («Descanso terminado», el ejercicio y la serie). Se borra al enviarlo o cancelarlo.
- No se publica con la app (GitHub Pages solo copia `index.html`, `src/`, `assets/`…).

## Coste

Cabe en el **plan gratuito** de Workers (comprobado en la página de precios de Durable Objects,
noviembre de 2026): los Durable Objects del plan gratuito tienen que usar almacenamiento SQLite (por
eso `new_sqlite_classes` en `wrangler.toml`); las alarmas cuentan como peticiones (100 000 al día) y
cada `setAlarm()` como una fila escrita (100 000 al día). Un entrenamiento con 20 descansos son
unas 60 operaciones.

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

`id` identifica el dispositivo (lo genera la app; un aviso pendiente por dispositivo: programar otro
sustituye al anterior).

## Pruebas

```sh
cd servidor && npm test          # node:test, sin red: push simulado y Durable Object en memoria
```

Comprueban que el dispositivo descifra el mensaje (RFC 8291), la firma VAPID (RFC 8292), el CORS,
programar → alarma → envío, cancelar y el rechazo de datos no válidos.

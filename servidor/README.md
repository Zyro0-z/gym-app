# Servidor de copias (opcional)

Guarda una copia de seguridad **cifrada** de la app fuera del iPhone. **La app funciona sin él.**

- Cloudflare Workers + un espacio KV (`COPIAS`).
- La app cifra la copia antes de enviarla (AES-GCM); el servidor guarda un sobre opaco y el hash del token de acceso, y no tiene la clave.
- Solo acepta peticiones con `Origin: https://zyro0-z.github.io`.
- No se publica con la app (GitHub Pages solo copia `index.html`, `src/`, `assets/`…).
- El worker sigue llamándose `gym-avisos` para no cambiar la URL ya desplegada. El push de fin de descanso se retiró: `wrangler.toml` lleva la migración que borra su Durable Object.

## Coste

Cabe en el plan gratuito: KV permite 100 000 lecturas y 1 000 escrituras al día y 1 GB (valores de
hasta 25 MiB; aquí el máximo es 8 MB). Cada petición hace una lectura (comprobar el token) y, al subir,
una escritura; la app espera 5 s tras guardar una sesión, así que son pocas al día. KV es de
consistencia eventual: tras subir, otra ubicación puede tardar hasta ~1 minuto en ver la copia nueva.

## Desplegar (una vez)

Requisitos: cuenta gratuita de Cloudflare y node ≥ 20.

```sh
cd servidor
npm install
npx wrangler login
npx wrangler kv namespace create COPIAS
```

Descomenta el bloque `[[kv_namespaces]]` de `wrangler.toml` y pega el `id` que imprime en lugar de `PEGA_AQUI_EL_ID_DEL_KV`. Después:

```sh
npm run desplegar
```

Imprime la URL, p. ej. `https://gym-avisos.<tu-cuenta>.workers.dev`; se pega en Ajustes › Datos › Copia en la nube.
Si la app se publica en otro sitio, cambia `ORIGEN` en `wrangler.toml` antes de desplegar.

## API

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| PUT | `/v1/copia/:id` | sobre cifrado (JSON) | `{ ok, at, bytes }` · `Authorization: Bearer <token>`; la primera escritura fija el token |
| GET | `/v1/copia/:id` | — | el sobre · 404 si no hay copia |
| GET | `/v1/copia/:id/info` | — | `{ bytes, at }` |
| DELETE | `/v1/copia/:id` | — | `{ ok }` |

Errores: 400 (id o sobre no válidos), 401 (sin token), 403 (token distinto del de la copia), 413 (más de 8 MB), 500 (falta el KV).
El `id` y el `token` los deriva la app de la clave de la persona; no se puede deducir la clave de ellos.

## Pruebas

```sh
cd servidor && npm test
```

`copias.test.mjs` cubre las rutas de la copia (token, límites, CORS) y el cliente real de la app contra el Worker con un KV en memoria.

// Copia cifrada en KV: rutas, token, límites, y el cliente real de la app contra el Worker.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import { MAX_BYTES, sobreValido } from "../src/copias.js";
import { crearNube } from "../../src/data/nube.js";
import { identidad } from "../../src/core/cifrado.js";

const ORIGEN = "https://zyro0-z.github.io", IT = 100000;
function kv() {
  const m = new Map();
  return { m, async getWithMetadata(k) { const x = m.get(k); return x ? { value: x.value, metadata: x.metadata } : { value: null, metadata: null }; },
    async put(k, value, o) { m.set(k, { value, metadata: o && o.metadata }); }, async delete(k) { m.delete(k); } };
}
const entorno = () => ({ ORIGEN, COPIAS: kv() });
const ID = "a".repeat(32), TOKEN = "b".repeat(64), OTRO = "c".repeat(64);
const SOBRE = { v: 1, kdf: "PBKDF2-SHA256", it: IT, sal: "c2Fs", iv: "aXY=", gz: false, ct: "Y3Q=" };
const pedir = (env, metodo, ruta, { token = TOKEN, cuerpo, origen = ORIGEN } = {}) => worker.fetch(new Request("https://avisos.example" + ruta,
  { method: metodo, headers: Object.assign({}, origen ? { Origin: origen } : {}, token ? { Authorization: "Bearer " + token } : {}, cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
    body: cuerpo === undefined ? undefined : typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) }), env);

test("copias: forma del sobre", () => {
  assert.equal(sobreValido(SOBRE), true);
  for (const m of [null, 1, {}, { ...SOBRE, v: 2 }, { ...SOBRE, ct: "" }, { ...SOBRE, it: 10 }, { ...SOBRE, it: "100000" }, { ...SOBRE, sal: 3 }]) assert.equal(sobreValido(m), false);
});
test("copias: guardar, leer, info, sobrescribir y borrar", async () => {
  const env = entorno();
  assert.equal((await pedir(env, "GET", "/v1/copia/" + ID)).status, 404);
  let r = await pedir(env, "PUT", "/v1/copia/" + ID, { cuerpo: SOBRE });
  assert.equal(r.status, 200); const g = await r.json(); assert.equal(g.ok, true); assert.equal(g.bytes, JSON.stringify(SOBRE).length);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGEN);
  r = await pedir(env, "GET", "/v1/copia/" + ID);
  assert.equal(r.status, 200); assert.equal(r.headers.get("Cache-Control"), "no-store"); assert.deepEqual(await r.json(), SOBRE);
  r = await pedir(env, "GET", "/v1/copia/" + ID + "/info");
  assert.deepEqual(Object.keys(await r.json()).sort(), ["at", "bytes"]);
  r = await pedir(env, "PUT", "/v1/copia/" + ID, { cuerpo: { ...SOBRE, ct: "bm9ldm8=" } });
  assert.equal(r.status, 200); assert.equal((await (await pedir(env, "GET", "/v1/copia/" + ID)).json()).ct, "bm9ldm8=");
  assert.equal((await pedir(env, "DELETE", "/v1/copia/" + ID)).status, 200);
  assert.equal((await pedir(env, "GET", "/v1/copia/" + ID)).status, 404);
  assert.equal((await pedir(env, "DELETE", "/v1/copia/" + ID)).status, 200, "borrar lo que no existe no falla");
});
test("copias: el servidor guarda solo el sobre y el hash del token, nunca el token", async () => {
  const env = entorno();
  await pedir(env, "PUT", "/v1/copia/" + ID, { cuerpo: SOBRE });
  const x = env.COPIAS.m.get("c:" + ID);
  assert.match(x.metadata.h, /^[0-9a-f]{64}$/); assert.notEqual(x.metadata.h, TOKEN);
  assert.ok(!x.value.includes(TOKEN) && !JSON.stringify(x.metadata).includes(TOKEN));
});
test("copias: sin token 401, token ajeno 403 en cualquier operación, id mal formado 400", async () => {
  const env = entorno();
  await pedir(env, "PUT", "/v1/copia/" + ID, { cuerpo: SOBRE });
  assert.equal((await pedir(env, "GET", "/v1/copia/" + ID, { token: null })).status, 401);
  assert.equal((await pedir(env, "GET", "/v1/copia/" + ID, { token: "corto" })).status, 401);
  for (const [m, ruta, cuerpo] of [["GET", "", undefined], ["GET", "/info", undefined], ["PUT", "", SOBRE], ["DELETE", "", undefined]])
    assert.equal((await pedir(env, m, "/v1/copia/" + ID + ruta, { token: OTRO, cuerpo })).status, 403, m + ruta);
  assert.deepEqual((await (await pedir(env, "GET", "/v1/copia/" + ID)).json()), SOBRE, "tras los intentos ajenos, intacta");
  assert.equal((await pedir(env, "GET", "/v1/copia/NO-ES-HEX")).status, 400);
  assert.equal((await pedir(env, "GET", "/v1/copia/" + "A".repeat(32))).status, 400, "mayúsculas no válidas");
});
test("copias: cuerpos no válidos y demasiado grandes", async () => {
  const env = entorno();
  assert.equal((await pedir(env, "PUT", "/v1/copia/" + ID, { cuerpo: "no es json" })).status, 400);
  assert.equal((await pedir(env, "PUT", "/v1/copia/" + ID, { cuerpo: { v: 1 } })).status, 400);
  assert.equal((await pedir(env, "PUT", "/v1/copia/" + ID, { cuerpo: { ...SOBRE, ct: "x".repeat(MAX_BYTES) } })).status, 413);
  assert.equal(env.COPIAS.m.size, 0, "nada se guardó");
  assert.equal((await pedir(env, "POST", "/v1/copia/" + ID)).status, 405);
  assert.equal((await pedir(env, "PUT", "/v1/copia/" + ID + "/info", { cuerpo: SOBRE })).status, 405);
});
test("copias: sin KV configurado responde 500 legible, y CORS solo para el origen permitido", async () => {
  const r = await pedir({ ORIGEN }, "GET", "/v1/copia/" + ID);
  assert.equal(r.status, 500); assert.match((await r.json()).error, /COPIAS/);
  const env = entorno();
  const ajeno = await pedir(env, "GET", "/v1/copia/" + ID, { origen: "https://otra.example" });
  assert.equal(ajeno.headers.get("Access-Control-Allow-Origin"), null);
  const pre = await worker.fetch(new Request("https://avisos.example/v1/copia/" + ID, { method: "OPTIONS", headers: { Origin: ORIGEN, "Access-Control-Request-Method": "PUT" } }), env);
  assert.equal(pre.status, 204); assert.match(pre.headers.get("Access-Control-Allow-Methods"), /PUT/); assert.match(pre.headers.get("Access-Control-Allow-Headers"), /Authorization/);
});
test("integración: el cliente de la app sube, consulta, baja y borra contra el Worker", async () => {
  const env = entorno();
  const fetchFn = (url, init) => worker.fetch(new Request(url, { ...init, headers: { ...init.headers, Origin: ORIGEN } }), env);
  const nube = crearNube({ fetchFn, it: IT }), URL_ = "https://avisos.example", frase = "frase de prueba larga";
  assert.equal(await nube.info(URL_, frase), null);
  const copia = JSON.stringify({ app: "gym", sesiones: Array.from({ length: 300 }, (_, i) => ({ id: "s" + i, nota: "ñandú ✓" })) });
  const r = await nube.subir(URL_, frase, copia);
  assert.ok(r.bytes > 0 && r.at > 0);
  assert.equal((await nube.info(URL_, frase)).bytes, r.bytes);
  assert.equal(await nube.bajar(URL_, frase), copia);
  const { id } = await identidad(frase, IT);
  assert.ok(env.COPIAS.m.has("c:" + id));
  await assert.rejects(nube.bajar(URL_, "una frase distinta pero larga"), /No hay ninguna copia|no coincide|clave/i, "otra clave es otra copia");
  await nube.borrar(URL_, frase);
  assert.equal(await nube.info(URL_, frase), null);
});

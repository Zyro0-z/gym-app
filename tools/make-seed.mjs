// Genera seed.json a partir del vault de Obsidian (solo lectura): sesiones, plantillas,
// archivos de configuración (texto tal cual) y ajustes/biblioteca de LiftOff.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as yaml from "js-yaml";

const V = process.argv[2];
const out = { sessions: [], templates: [], configs: {}, settings: {}, library: [] };

const fm = (txt) => {
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  return m ? yaml.load(m[1], { schema: yaml.JSON_SCHEMA }) : null;
};
const clean = (v) => JSON.parse(JSON.stringify(v));

for (const f of readdirSync(join(V, "Workouts")).filter((n) => n.endsWith(".md")).sort()) {
  const d = fm(readFileSync(join(V, "Workouts", f), "utf8"));
  if (d && String(d.type).trim() === "workout") out.sessions.push({ path: "Workouts/" + f, fm: clean(d) });
}
for (const f of readdirSync(join(V, "Workout Templates")).filter((n) => n.endsWith(".md")).sort()) {
  const d = fm(readFileSync(join(V, "Workout Templates", f), "utf8"));
  if (d) out.templates.push({ path: "Workout Templates/" + f, fm: clean(d) });
}
for (const f of readdirSync(join(V, "Gym/Config")).filter((n) => n.endsWith(".md")).sort())
  out.configs["Gym/Config/" + f] = readFileSync(join(V, "Gym/Config", f), "utf8");

const lo = JSON.parse(readFileSync(join(V, ".obsidian/plugins/liftoff/data.json"), "utf8"));
out.library = lo.settings.exerciseLibrary || [];
out.settings = {
  restTimerPresets: lo.settings.restTimerPresets, defaultRestDuration: lo.settings.defaultRestDuration,
  weightUnit: lo.settings.weightUnit, keepScreenAwake: lo.settings.keepScreenAwake,
};
writeFileSync("seed.json", JSON.stringify(out));
console.log(out.sessions.length, "sesiones", out.templates.length, "plantillas", Object.keys(out.configs).length, "configs", out.library.length, "ejercicios");

// Rendimiento del análisis: 820 sesiones (la fixture sintética ×10). Falla si la mediana de 5
// ejecuciones supera el umbral. Uso: node tests/bench/analisis.bench.mjs [umbral_ms]
import { analizar } from "../../src/core/analisis.js";
import { modeloGrande, HOY } from "./datos.mjs";

// Medido en local (Node 26): ≈ 60 ms tras quitar las pasadas cuadráticas (antes ≈ 460 ms).
// Los runners de CI son 2-3 veces más lentos; el umbral deja margen y aun así detecta que vuelva
// una pasada cuadrática.
const UMBRAL = Number(process.argv[2]) || 250;
const m = modeloGrande(10);
analizar(m, HOY); analizar(m, HOY);          // calentar el JIT
const t = [];
for (let i = 0; i < 5; i++) { const a = performance.now(); analizar(m, HOY); t.push(performance.now() - a); }
t.sort((a, b) => a - b);
const mediana = t[2];
console.log(`analizar · ${m.sesiones.length} sesiones · mediana ${mediana.toFixed(1)} ms (umbral ${UMBRAL} ms) · [${t.map((x) => x.toFixed(0)).join(", ")}]`);
if (mediana > UMBRAL) { console.error("Demasiado lento"); process.exit(1); }

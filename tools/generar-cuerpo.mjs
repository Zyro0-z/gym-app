// Genera assets/cuerpo-muscular.svg a partir de la geometría de react-muscle-highlighter /
// @mjcdev/react-body-highlighter (MIT; ver assets/licencias). Uso:
//   node tools/generar-cuerpo.mjs <bodyFront.ts|js> <bodyBack.ts|js> [salida.svg]
// Los ficheros de entrada salen de `npm pack @mjcdev/react-body-highlighter` (assets/bodyFront.ts y bodyBack.ts).
// Cada pieza de la librería se asigna a un músculo de src/core/musculos.js; unas pocas se parten con un recorte
// (pectoral clavicular/esternal, deltoides anterior/lateral, braquial, romboides) porque la fuente no las separa.
import { readFileSync, writeFileSync } from "node:fs";

function leer(fichero) {
  const t = readFileSync(fichero, "utf8");
  const out = [];
  const re = /slug:\s*["']([a-z-]+)["']([\s\S]*?)(?=\n\s*\{\s*\n?\s*slug:|\n\];|\n\]\s*;?\s*$)/g;
  let m;
  while ((m = re.exec(t))) {
    for (const lado of ["common", "left", "right"]) {
      const sec = m[2].match(new RegExp(lado + ":\\s*\\[([\\s\\S]*?)\\]"));
      if (!sec) continue;
      for (const d of sec[1].matchAll(/["'`]([^"'`]+)["'`]/g)) out.push({ slug: m[1], lado, d: d[1] });
    }
  }
  return out;
}

const [fFrente, fEspalda, salida = "assets/cuerpo-muscular.svg"] = process.argv.slice(2);
if (!fFrente || !fEspalda) { console.error("uso: node tools/generar-cuerpo.mjs bodyFront bodyBack [salida.svg]"); process.exit(1); }
const F = leer(fFrente), B = leer(fEspalda);
if (F.length !== 89 || B.length !== 70) throw new Error("La geometría de entrada no es la esperada: " + F.length + "/" + B.length);

const rango = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const asignar = (tabla) => { const m = new Map(); for (const [musculo, idx] of Object.entries(tabla)) for (const i of idx) m.set(i, musculo); return m; };
const FRENTE = asignar({
  serrato: [2, 3, 4, 5, 10, 11, 12, 13], oblicuos: [6, 7, 8, 9, 14, 15, 16, 17], "recto-abdominal": rango(18, 25),
  "triceps-lateral-medial": [28, 29], "trapecio-superior": [35, 36], aductores: rango(39, 44),
  "recto-femoral": [45, 48], vastos: [46, 47, 49, 50], soleo: [57, 59], gemelos: [58, 60], antebrazo: rango(61, 66),
});
const ESPALDA = asignar({
  "trapecio-superior": [0, 1], deltoide_posterior: [4, 5], manguito: [6, 9], dorsal: [7, 11], redondo: [8, 10],
  "triceps-lateral-medial": [12, 14, 15, 17], "triceps-largo": [13, 16], erectores: rango(18, 21), antebrazo: rango(22, 29),
  "gluteo-medio": [30, 32], "gluteo-mayor": [31, 33], aductores: [34, 35], isquiotibiales: rango(36, 43),
  gemelos: [44, 46, 48, 49], soleo: [45, 47, 50, 51],
});
for (const [k, v] of ESPALDA) if (v === "deltoide_posterior") ESPALDA.set(k, "deltoide-posterior");

// Piezas que se parten: índice → [{ musculo, clip: polígono "x,y x,y …" | { fuera: polígono } }], más la costura entre ambas.
// Coordenadas del lienzo de la librería (frente 0-724, espalda 724-1448); el eje de simetría del frente es x = 727.
const esp = (x) => 727 - x;
const poly = (pts) => pts.map((p) => p.join(",")).join(" ");
const espejo = (pts) => pts.map(([x, y]) => [esp(x), y]);
const FR_CORTES = {
  0: { partes: [["pecho-clavicular", [[245, 300], [366, 300], [366, 356], [245, 378]]], ["pecho-esternal", [[245, 378], [366, 356], [366, 450], [245, 450]]]], costura: [[250, 377], [362, 356]] },
  1: { partes: [["pecho-clavicular", espejo([[245, 300], [366, 300], [366, 356], [245, 378]])], ["pecho-esternal", espejo([[245, 378], [366, 356], [366, 450], [245, 450]])]], costura: espejo([[250, 377], [362, 356]]) },
  26: { partes: [["biceps", [[170, 395], [235, 395], [235, 456], [170, 468]]], ["braquial", [[170, 468], [235, 456], [235, 505], [170, 505]]]], costura: [[178, 468], [226, 457]] },
  27: { partes: [["biceps", espejo([[170, 395], [235, 395], [235, 456], [170, 468]])], ["braquial", espejo([[170, 468], [235, 456], [235, 505], [170, 505]])]], costura: espejo([[178, 468], [226, 457]]) },
  37: { partes: [["deltoide-lateral", [[185, 290], [238, 290], [224, 405], [185, 405]]], ["deltoide-anterior", [[238, 290], [290, 290], [290, 405], [224, 405]]]], costura: [[238, 300], [224, 396]] },
  38: { partes: [["deltoide-lateral", espejo([[185, 290], [238, 290], [224, 405], [185, 405]])], ["deltoide-anterior", espejo([[238, 290], [290, 290], [290, 405], [224, 405]])]], costura: espejo([[238, 300], [224, 396]]) },
};
// Romboides: franja interna del trapecio medio (queda debajo del trapecio, junto a la columna). El trapecio medio es el resto.
const ROMBO_I = [[1012, 372], [1082, 350], [1082, 440], [1034, 452]];
const ROMBO_D = [[2167 - 1012, 372], [2167 - 1082, 350], [2167 - 1082, 440], [2167 - 1034, 452]];
const ES_CORTES = {
  2: { partes: [["romboides", ROMBO_I], ["trapecio-medio", { fuera: ROMBO_I }]], costura: [[1082, 350], [1012, 372], [1034, 452], [1082, 440]] },
  3: { partes: [["romboides", ROMBO_D], ["trapecio-medio", { fuera: ROMBO_D }]], costura: [[2167 - 1082, 350], [2167 - 1012, 372], [2167 - 1034, 452], [2167 - 1082, 440]] },
};

const contador = new Map();
const idDe = (musculo, lado) => { const k = musculo + "-" + lado; const n = (contador.get(k) || 0) + 1; contador.set(k, n); return "m-" + k + "-" + n; };
const ladoDe = (p) => (p.lado === "left" ? "i" : p.lado === "right" ? "d" : "c");
const defs = [], decor = [], mus = [], costuras = [];
let nClip = 0;
const clipDe = (c) => {
  const id = "cp" + ++nClip;
  const trazo = Array.isArray(c) ? "M" + c.map((p) => p.join(",")).join("L") + "Z" : "M0,0H1448V1448H0ZM" + c.fuera.map((p) => p.join(",")).join("L") + "Z";
  defs.push(`<clipPath id="${id}"><path clip-rule="evenodd" d="${trazo}"/></clipPath>`);
  return id;
};
const procesar = (lista, tabla, cortes, vista) => lista.forEach((p, i) => {
  const lado = ladoDe(p);
  if (cortes[i]) {
    for (const [musculo, clip] of cortes[i].partes) mus.push(`<path id="${idDe(musculo, lado)}" data-v="${vista}" clip-path="url(#${clipDe(clip)})" d="${p.d}"/>`);
    const contorno = "cp" + ++nClip;
    defs.push(`<clipPath id="${contorno}"><path d="${p.d}"/></clipPath>`);
    costuras.push(`<path class="costura" clip-path="url(#${contorno})" d="M${cortes[i].costura.map((q) => q.join(",")).join("L")}"/>`);
    return;
  }
  const musculo = tabla.get(i);
  if (musculo) mus.push(`<path id="${idDe(musculo, lado)}" data-v="${vista}" d="${p.d}"/>`);
  else decor.push(`<path d="${p.d}"/>`);
});
procesar(F, FRENTE, FR_CORTES, "f");
procesar(B, ESPALDA, ES_CORTES, "e");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="38 84 1376 1272" role="img" aria-label="Mapa muscular: vista frontal y trasera">
  <!--
    Cuerpo muscular · vista frontal (izquierda) y trasera (derecha). Generado por tools/generar-cuerpo.mjs.
    Geometría: react-muscle-highlighter (Copyright 2024 My Muscle Contributors) y @mjcdev/react-body-highlighter
    (Copyright 2022 ELABBASSI Hicham), ambas MIT, derivadas de react-native-body-highlighter. Ver assets/licencias.
    Las piezas se reasignan a los músculos de la app; el pectoral, el deltoides, el braquial y los romboides se
    obtienen recortando una pieza de la fuente. Cada <path id="m-<músculo>-<lado>-<n>" data-v="f|e"> se colorea por separado.
  -->
  <defs>${defs.join("")}</defs>
  <g class="decor">${decor.join("")}</g>
  <g class="musculos">${mus.join("\n")}</g>
  <g class="costuras">${costuras.join("")}</g>
</svg>
`;
writeFileSync(salida, svg);
console.log("regiones:", mus.length, "decorado:", decor.length, "cortes:", nClip, "bytes:", svg.length);

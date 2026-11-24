"""Genera el mapa corporal de la app a partir de dos imágenes hechas con Gemini (ver fuentes/):
  fuentes/imagen.png     la figura (frente y espalda) en grises sobre fondo negro
  fuentes/segmentos.png  la misma figura con cada zona en un color plano
Salida: assets/cuerpo-frente.webp, assets/cuerpo-espalda.webp y assets/cuerpo-muscular.svg (una región por trozo de
músculo, ids «m-<músculo>-<lado>-<n>», lado i = izquierda de la imagen, d = derecha).
Uso (desde la raíz del repositorio): python3 tools/cuerpo/generar.py
Necesita numpy, opencv-python, scikit-learn, scipy y pillow. Los números de región dependen del orden de los clústeres,
por eso el script comprueba el total y se detiene si cambia.
"""
import json, sys
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
from sklearn.cluster import KMeans

AQUI = "tools/cuerpo/fuentes/"
B = cv2.cvtColor(cv2.imread(AQUI + "segmentos.png"), cv2.COLOR_BGR2RGB)
H, W = B.shape[:2]

# 1. regiones: color → componentes conexas; el contorno negro entre ellas se reparte entre las vecinas
hsv = cv2.cvtColor(B, cv2.COLOR_RGB2HSV)
fg = B.max(2) > 70
sat = (hsv[..., 1] > 90) & fg
gris = fg & ~sat & (B.max(2) > 90)
km = KMeans(16, n_init=3, random_state=0).fit(B[sat][::7])
L = np.full((H, W), -1, np.int32); L[sat] = km.predict(B[sat]); L[gris] = 99
R = np.zeros((H, W), np.int32); n = 0
for c in list(range(16)) + [99]:
    m = cv2.morphologyEx((L == c).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    k, lab, st, _ = cv2.connectedComponentsWithStats(m, connectivity=4)
    for i in range(1, k):
        if st[i, 4] >= 120: n += 1; R[lab == i] = n
if n != 169: sys.exit(f"se esperaban 169 regiones y hay {n}: los ids de ETIQ ya no valen")
fgc = cv2.morphologyEx((B.max(2) > 45).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
idx = ndi.distance_transform_edt(R == 0, return_distances=False, return_indices=True)
R2 = R[idx[0], idx[1]]; R2[~fgc] = 0
R2[(R == 0) & (ndi.distance_transform_edt(R == 0) > 6)] = 0

# 2. etiquetas de la mitad izquierda de cada figura (la derecha se deduce por simetría)
FRENTE = {95: "pecho", 55: "deltoide-anterior", 96: "deltoide-lateral", 57: "biceps", 40: "braquial", 17: "triceps-lateral-medial",
  1: "antebrazo", 67: "antebrazo", 3: "antebrazo", 77: "antebrazo", 80: "antebrazo", 132: "antebrazo", 65: "serrato", 87: "oblicuos", 105: "oblicuos",
  139: "recto-abdominal", 20: "recto-abdominal", 23: "recto-abdominal", 46: "recto-abdominal", 85: "recto-abdominal", 88: "recto-abdominal",
  100: "trapecio-superior", 82: "recto-femoral", 98: "vastos", 34: "vastos", 118: "aductores", 31: "aductores", 115: "aductores",
  89: "aductores", 27: "gluteo-medio", 7: "gemelos"}
ESPALDA = {128: "trapecio", 102: "trapecio-superior", 60: "deltoide-posterior", 129: "deltoide-lateral", 13: "manguito", 15: "triceps-largo",
  63: "triceps-lateral-medial", 42: "triceps-lateral-medial", 72: "triceps-lateral-medial", 22: "triceps-lateral-medial", 111: "redondo",
  59: "dorsal", 103: "erectores", 113: "oblicuos", 6: "gluteo-mayor", 25: "gluteo-medio", 75: "antebrazo", 45: "antebrazo", 142: "antebrazo",
  79: "antebrazo", 32: "vastos", 91: "isquiotibiales", 48: "isquiotibiales", 108: "aductores", 120: "isquiotibiales", 135: "isquiotibiales",
  136: "isquiotibiales", 84: "isquiotibiales", 50: "gemelos", 52: "gemelos", 9: "soleo"}
# (clave, etiquetas, eje de simetría, columnas del recorte)
VISTAS = [("f", FRENTE, 692, 380, 1000, "frente"), ("e", ESPALDA, 1944, 1630, 2260, "espalda")]
ESCALA, Y0, Y1 = 0.75, 20, 1420
A = Image.open(AQUI + "imagen.png").convert("L")
Ag = np.array(A)

def espejo(m, eje):
    out = np.zeros_like(m); xs = np.arange(W); nx = 2 * eje - xs; ok = (nx >= 0) & (nx < W)
    out[:, xs[ok]] = m[:, nx[ok]]; return out
def erosion(m, r):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    e = cv2.erode(m.astype(np.uint8), k) > 0
    return e if e.sum() > 30 else m
def dilatar(m, r):
    return cv2.dilate(m.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))) > 0

salida = []; x_off = 0; cajas = {}; contador = {}
cols = np.arange(W)[None, :]
for v, etiq, eje, x0, x1, nombre in VISTAS:
    # 3. piezas de la mitad izquierda; la derecha es su espejo, así la figura es simétrica y no depende de cómo se coloreó
    sub = np.zeros_like(R2); sub[:, x0:x1] = R2[:, x0:x1]
    izq = cols < eje
    piezas = {}
    for i, m in etiq.items(): piezas.setdefault(m, np.zeros((H, W), bool))[:] |= (sub == i) & izq
    # 4. cuenca: las piezas (erosionadas) son las semillas y el borde final se ajusta a las líneas de la imagen
    nombres = sorted(piezas)
    marc = np.zeros((H, W), np.int32)
    fondo = (Ag < 12).astype(np.uint8); _, lab_f = cv2.connectedComponents(fondo, connectivity=4)
    marc[erosion(lab_f == lab_f[0, 0], 2)] = 1
    otras = (sub > 0) & izq
    for i, m in etiq.items(): otras &= sub != i
    for q in (erosion(otras, 2), erosion(espejo(otras, eje), 2)): marc[q & (marc == 0)] = 2
    nucleo = {}
    for k, nm in enumerate(nombres):
        iz = erosion(piezas[nm], 3); nucleo[nm] = iz | espejo(iz, eje)
        marc[nucleo[nm] & (marc <= 2)] = 3 + k
    ws = cv2.watershed(cv2.cvtColor(cv2.GaussianBlur(Ag, (0, 0), 0.8), cv2.COLOR_GRAY2BGR), marc.copy())
    idx2 = ndi.distance_transform_edt(ws <= 0, return_distances=False, return_indices=True); ws = ws[idx2[0], idx2[1]]
    w, h = int((x1 - x0) * ESCALA), int((Y1 - Y0) * ESCALA)
    A.crop((x0, Y0, x1, Y1)).resize((w, h), Image.LANCZOS).save(f"assets/cuerpo-{nombre}.webp", quality=88, method=6)
    cajas[v] = (x_off, w, h)
    for k, nm in enumerate(nombres):
        base = piezas[nm] | espejo(piezas[nm], eje)
        mk = (ws == 3 + k) & dilatar(base, 12)   # no se sale de donde estaba la pieza (ni invade manos, cabeza...)
        mk = cv2.GaussianBlur(mk.astype(np.float32), (0, 0), 1.2) > 0.5
        trozos = [(nm, mk)]
        if nm == "pecho":   # la fuente dibuja el pecho entero: la franja de arriba es la clavicular (el corte se hace con la forma ya ajustada)
            arriba = np.zeros_like(mk)
            for x in np.unique(np.nonzero(mk)[1]):
                c = np.nonzero(mk[:, x])[0]; arriba[c[c < c.min() + 0.40 * (c.max() - c.min())], x] = True
            trozos = [("pecho-clavicular", mk & arriba), ("pecho-esternal", mk & ~arriba)]
        elif nm == "trapecio":   # ídem: cuello y hombro / zona entre escápulas / parte baja
            ys = np.nonzero(mk)[0]; t, bb = ys.min(), ys.max(); fila = np.arange(H)[:, None]
            trozos = [(n2, mk & (fila >= t + a0 * (bb - t)) & (fila < t + z0 * (bb - t))) for n2, a0, z0 in (("trapecio-superior", 0, 0.28), ("romboides", 0.28, 0.55), ("trapecio-medio", 0.55, 1.01))]
        for nm, mk in trozos:
          for lado, lm in (("i", mk & (cols < eje)), ("d", mk & (cols >= eje))):
              pm = cv2.morphologyEx(lm.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
              if pm.sum() < 60: continue
              d = ""
              for c in cv2.findContours(pm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0]:
                  if cv2.contourArea(c) < 30: continue
                  c = cv2.approxPolyDP(c, 1.2, True)[:, 0, :].astype(float)
                  d += "M" + "L".join(f"{(px - x0) * ESCALA + x_off:.1f} {(py - Y0) * ESCALA:.1f}" for px, py in c) + "Z"
              if not d: continue
              n = contador[(nm, lado)] = contador.get((nm, lado), 0) + 1
              salida.append(f'<path id="m-{nm}-{lado}-{n}" data-v="{v}" d="{d}"/>')
    x_off += w

(fx, fw, h), (ex, ew, _) = cajas["f"], cajas["e"]
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fw + ew} {h}">\n'
  f'<!-- Mapa corporal: imagen de Gemini (frente y espalda) con una región tocable por músculo. Generado por tools/cuerpo/generar.py. -->\n'
  f'<image data-v="f" href="assets/cuerpo-frente.webp" x="0" y="0" width="{fw}" height="{h}"/>\n'
  f'<image data-v="e" href="assets/cuerpo-espalda.webp" x="{fw}" y="0" width="{ew}" height="{h}"/>\n'
  '<g class="musculos">\n' + "\n".join(salida) + "\n</g>\n</svg>\n")
open("assets/cuerpo-muscular.svg", "w").write(svg)
print(f"{len(salida)} regiones; viewBox 0 0 {fw + ew} {h}; frente 0..{fw}, espalda {fw}..{fw + ew}")

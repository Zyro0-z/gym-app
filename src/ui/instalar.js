// Tarjeta «Añade la app a la pantalla de inicio» (Fase 6.8): solo en Safari de iPhone/iPad sin
// instalar, hasta que se cierra. Los atajos (shortcuts) del manifiesto no existen en iOS: no hay.
const CLAVE = "gym-instalar-visto";

/** ¿iPhone, iPad o iPod? (el iPad moderno se presenta como Mac con pantalla táctil). */
export function esIOS({ ua = "", plataforma = "", toques = 0 } = {}) {
  return /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(plataforma) && toques > 1);
}

/** ¿Hay que enseñar la tarjeta? Función pura para poder probarla. */
export function debeMostrarse({ ua, plataforma, toques, standalone, modoStandalone, visto }) {
  if (visto || standalone === true || modoStandalone) return false;
  if (!esIOS({ ua, plataforma, toques })) return false;
  // Solo Safari: los otros navegadores de iOS no ofrecen «Añadir a pantalla de inicio» igual
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

const leerVisto = () => { try { return localStorage.getItem(CLAVE) === "1"; } catch (e) { return false; } };
export function marcarVisto() { try { localStorage.setItem(CLAVE, "1"); } catch (e) {} }

export function mostrarInstalar() {
  return debeMostrarse({
    ua: navigator.userAgent, plataforma: navigator.platform || "", toques: navigator.maxTouchPoints || 0,
    standalone: navigator.standalone, modoStandalone: matchMedia("(display-mode: standalone)").matches, visto: leerVisto(),
  });
}

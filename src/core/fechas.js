// Fechas como texto ISO «AAAA-MM-DD», sin zona horaria ni librerías.
// Todas las cuentas se hacen con el número de día absoluto (días desde 1970-01-01 en UTC),
// que es lo mismo que contar días naturales en el calendario local.

const DIA_MS = 864e5;

/** Número de día absoluto de una fecha ISO. */
export const numDia = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DIA_MS);

/** Fecha ISO de un número de día absoluto. */
export const deNum = (n) => new Date(n * DIA_MS).toISOString().slice(0, 10);

/** Suma (o resta) días a una fecha ISO. */
export const masDias = (iso, n) => deNum(numDia(iso) + n);

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export const diaSemana = (iso) => ((new Date(numDia(iso) * DIA_MS).getUTCDay() + 6) % 7) + 1;

/** Lunes de la semana ISO de la fecha (la clave de la semana). */
export const lunesDe = (iso) => masDias(iso, 1 - diaSemana(iso));
export const claveSemana = lunesDe;

/** «AAAA-MM» */
export const claveMes = (iso) => iso.slice(0, 7);

/** Resta meses como el calendario: el día se ajusta al último del mes si no existe (31-ago − 6 meses = 28-feb). */
export function menosMeses(iso, n) {
  let y = +iso.slice(0, 4), m = +iso.slice(5, 7) - n;
  const d = +iso.slice(8, 10);
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return y + "-" + String(m).padStart(2, "0") + "-" + String(Math.min(d, ultimo)).padStart(2, "0");
}

/** Último día del mes de la fecha. */
export const finDeMes = (iso) => {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7);
  return iso.slice(0, 8) + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0");
};

/** ¿Es una fecha ISO válida y real? Devuelve la fecha o null. */
export function fechaISO(s) {
  const t = String(s == null ? "" : s).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return deNum(numDia(t)) === t ? t : null;
}

/** Fecha ISO local de hoy (o de un Date). */
export function hoyISO(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** Minutos desde medianoche de «HH:MM» (o de un número de minutos). */
export function minutosDelDia(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && typeof v.hour === "number") return v.hour * 60 + (v.minute || 0);
  const m = String(v).match(/^(\d{1,2}):(\d{2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** «dd/MM» */
export const ddmm = (iso) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

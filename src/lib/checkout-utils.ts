/**
 * Utilidades del checkout sin dependencias de React: tarjetas (marca, Luhn, formato), caducidad,
 * códigos postales, fechas de tueste y entrega, código de descuento y paso en la URL.
 * Las usan las islas del checkout, la confirmación y los tests.
 */
import { intlLocale, queryParams, type Locale } from '@/i18n';
import type { ShippingMethod } from './pricing';
import type { CheckoutStep, Country } from '@/stores/checkout';

export const digitsOnly = (value: string): string => value.replace(/\D/g, '');

/* ---------- Tarjeta ---------- */

export type CardBrand = 'visa' | 'mastercard' | 'amex';

/** Nombres comerciales: no se traducen. */
export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
};

/** Texto del componente Card Brand de Figma (9:338). */
export const CARD_BRAND_SHORT: Record<CardBrand, string> = { visa: 'VISA', mastercard: 'MASTERCARD', amex: 'AMEX' };

export const CARD_BRANDS: readonly CardBrand[] = ['visa', 'mastercard', 'amex'];

/** Tarjeta de prueba que simula un pago rechazado. */
export const DECLINED_TEST_CARD = '4000000000000002';

export function detectCardBrand(value: string): CardBrand | null {
  const digits = digitsOnly(value);
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return 'mastercard';
  if (/^4/.test(digits)) return 'visa';
  return null;
}

/** Longitudes válidas por marca (sin espacios). */
export function cardLengths(brand: CardBrand | null): number[] {
  if (brand === 'amex') return [15];
  if (brand === 'visa') return [13, 16];
  return [16];
}

export function cardMaxLength(brand: CardBrand | null): number {
  return Math.max(...cardLengths(brand));
}

export function luhnCheck(value: string): boolean {
  const digits = digitsOnly(value);
  if (digits.length < 12) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Número de tarjeta aceptado: marca conocida, longitud de la marca y Luhn. */
export function isValidCardNumber(value: string): boolean {
  const digits = digitsOnly(value);
  const brand = detectCardBrand(digits);
  return brand !== null && cardLengths(brand).includes(digits.length) && luhnCheck(digits);
}

/** "4242424242424242" → "4242 4242 4242 4242"; Amex en grupos 4-6-5. */
export function formatCardNumber(value: string): string {
  const brand = detectCardBrand(value);
  const digits = digitsOnly(value).slice(0, cardMaxLength(brand));
  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }
  return parts.join(' ');
}

export function cvcLength(brand: CardBrand | null): 3 | 4 {
  return brand === 'amex' ? 4 : 3;
}

/** "0826" → "08 / 26". Un primer dígito mayor que 1 se completa con 0 ("4" → "04"). */
export function formatExpiry(value: string): string {
  let digits = digitsOnly(value).slice(0, 4);
  if (digits.length > 0 && Number(digits[0]) > 1) digits = `0${digits}`.slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

/** Acepta "MM / AA", "MM/AA" o "MMAA". Devuelve null si el formato no es válido. */
export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = /^\s*(\d{2})\s*\/?\s*(\d{2})\s*$/.exec(value);
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(match[2]) };
}

/** La tarjeta vale hasta el último día del mes de caducidad. */
export function isExpiryInFuture(expiry: { month: number; year: number }, now: Date = new Date()): boolean {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return expiry.year > currentYear || (expiry.year === currentYear && expiry.month >= currentMonth);
}

/**
 * Reformatea un campo con máscara conservando la posición del cursor (cuenta los dígitos que hay
 * antes del cursor). Si el usuario borra un separador, se borra el dígito anterior para que la
 * tecla de borrar no se quede "atascada".
 */
export function reformatWithCaret(
  previous: string,
  raw: string,
  caret: number,
  format: (value: string) => string,
): { value: string; caret: number } {
  let source = raw;
  let digitsBeforeCaret = digitsOnly(raw.slice(0, caret)).length;
  if (raw.length < previous.length && digitsOnly(raw) === digitsOnly(previous) && digitsBeforeCaret > 0) {
    const all = digitsOnly(raw);
    source = all.slice(0, digitsBeforeCaret - 1) + all.slice(digitsBeforeCaret);
    digitsBeforeCaret -= 1;
  }
  const value = format(source);
  let position = 0;
  let seen = 0;
  while (position < value.length && seen < digitsBeforeCaret) {
    if (/\d/.test(value[position]!)) seen++;
    position++;
  }
  return { value, caret: position };
}

/* ---------- Dirección ---------- */

/** Provincias españolas por prefijo de código postal (01–52). */
export const ES_PROVINCES: readonly { code: string; name: string }[] = [
  { code: '01', name: 'Álava' },
  { code: '02', name: 'Albacete' },
  { code: '03', name: 'Alicante' },
  { code: '04', name: 'Almería' },
  { code: '05', name: 'Ávila' },
  { code: '06', name: 'Badajoz' },
  { code: '07', name: 'Illes Balears' },
  { code: '08', name: 'Barcelona' },
  { code: '09', name: 'Burgos' },
  { code: '10', name: 'Cáceres' },
  { code: '11', name: 'Cádiz' },
  { code: '12', name: 'Castellón' },
  { code: '13', name: 'Ciudad Real' },
  { code: '14', name: 'Córdoba' },
  { code: '15', name: 'A Coruña' },
  { code: '16', name: 'Cuenca' },
  { code: '17', name: 'Girona' },
  { code: '18', name: 'Granada' },
  { code: '19', name: 'Guadalajara' },
  { code: '20', name: 'Gipuzkoa' },
  { code: '21', name: 'Huelva' },
  { code: '22', name: 'Huesca' },
  { code: '23', name: 'Jaén' },
  { code: '24', name: 'León' },
  { code: '25', name: 'Lleida' },
  { code: '26', name: 'La Rioja' },
  { code: '27', name: 'Lugo' },
  { code: '28', name: 'Madrid' },
  { code: '29', name: 'Málaga' },
  { code: '30', name: 'Murcia' },
  { code: '31', name: 'Navarra' },
  { code: '32', name: 'Ourense' },
  { code: '33', name: 'Asturias' },
  { code: '34', name: 'Palencia' },
  { code: '35', name: 'Las Palmas' },
  { code: '36', name: 'Pontevedra' },
  { code: '37', name: 'Salamanca' },
  { code: '38', name: 'Santa Cruz de Tenerife' },
  { code: '39', name: 'Cantabria' },
  { code: '40', name: 'Segovia' },
  { code: '41', name: 'Sevilla' },
  { code: '42', name: 'Soria' },
  { code: '43', name: 'Tarragona' },
  { code: '44', name: 'Teruel' },
  { code: '45', name: 'Toledo' },
  { code: '46', name: 'Valencia' },
  { code: '47', name: 'Valladolid' },
  { code: '48', name: 'Bizkaia' },
  { code: '49', name: 'Zamora' },
  { code: '50', name: 'Zaragoza' },
  { code: '51', name: 'Ceuta' },
  { code: '52', name: 'Melilla' },
];

/** Provincias ordenadas alfabéticamente para el desplegable. */
export const ES_PROVINCE_NAMES: readonly string[] = ES_PROVINCES.map((p) => p.name).sort((a, b) =>
  a.localeCompare(b, 'es'),
);

/** "40001" → "Segovia". Solo con un código postal español completo y válido. */
export function provinceFromPostcode(postcode: string): string | undefined {
  if (!/^\d{5}$/.test(postcode)) return undefined;
  return ES_PROVINCES.find((p) => p.code === postcode.slice(0, 2))?.name;
}

export function isValidPostcode(postcode: string, country: Country): boolean {
  if (country === 'PT') return /^\d{4}-\d{3}$/.test(postcode);
  return provinceFromPostcode(postcode) !== undefined;
}

/** ES: 5 cifras. PT: "0000-000" (el guion se añade solo). */
export function formatPostcode(value: string, country: Country): string {
  const digits = digitsOnly(value);
  if (country === 'ES') return digits.slice(0, 5);
  const pt = digits.slice(0, 7);
  return pt.length > 4 ? `${pt.slice(0, 4)}-${pt.slice(4)}` : pt;
}

/** Teléfono: se ignoran espacios, guiones, puntos y paréntesis. */
export function normalizePhone(value: string): string {
  return value.replace(/[\s\-.()]/g, '');
}

export function isValidPhone(value: string): boolean {
  return /^\d{9}$/.test(normalizePhone(value));
}

/* ---------- Fechas ---------- */

/** Fecha local en ISO sin hora: "2026-10-06". */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Próximo martes de tueste, siempre posterior a hoy (si hoy es martes, el de la semana que viene). */
export function nextRoastDate(from: Date = new Date()): Date {
  const TUESDAY = 2;
  const days = (TUESDAY - from.getDay() + 7) % 7 || 7;
  return addDays(from, days);
}

/** Ventana de entrega desde el día de tueste: estándar 48–72 h, express 24 h, recogida al día siguiente. */
export function deliveryWindow(roast: Date, method: ShippingMethod): { from: Date; to: Date } {
  if (method === 'standard') return { from: addDays(roast, 2), to: addDays(roast, 3) };
  return { from: addDays(roast, 1), to: addDays(roast, 1) };
}

const isoToDate = (iso: string): Date => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

function dateParts(iso: string, locale: Locale, weekday: 'short' | 'long') {
  const parts = new Intl.DateTimeFormat(intlLocale[locale], {
    weekday,
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).formatToParts(isoToDate(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const month = get('month').replace(/\.$/, '').replace(/^sept$/, 'sep');
  return { weekday: get('weekday').replace(/\.$/, ''), day: get('day'), month };
}

const capitalize = (text: string): string => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** "2026-10-06" → "Martes 6 oct" | "Tuesday 6 Oct" (línea temporal de la confirmación). */
export function formatWeekdayShort(iso: string, locale: Locale): string {
  const { weekday, day, month } = dateParts(iso, locale, 'long');
  return capitalize(`${weekday} ${day} ${month}`);
}

/** Rango de entrega: "Jue 8 – vie 9 oct" | "Thu 8 – Fri 9 Oct"; un solo día: "Mié 7 oct". */
export function formatDeliveryRange(fromIso: string, toIso: string, locale: Locale): string {
  const a = dateParts(fromIso, locale, 'short');
  if (fromIso.slice(0, 10) === toIso.slice(0, 10)) return capitalize(`${a.weekday} ${a.day} ${a.month}`);
  const b = dateParts(toIso, locale, 'short');
  const second = locale === 'en' ? capitalize(b.weekday) : b.weekday;
  const text =
    a.month === b.month
      ? `${a.weekday} ${a.day} – ${second} ${b.day} ${b.month}`
      : `${a.weekday} ${a.day} ${a.month} – ${second} ${b.day} ${b.month}`;
  return capitalize(text);
}

/* ---------- Pedido ---------- */

/** "TS-" + 5 cifras. */
export function generateOrderId(random: () => number = Math.random): string {
  return `TS-${10000 + Math.floor(random() * 90000)}`;
}

/** Códigos de descuento de la demo: porcentaje sobre el subtotal. */
const DISCOUNT_CODES: Record<string, number> = { TUESTE10: 10 };

export interface AppliedDiscount {
  code: string;
  pct: number;
}

export function findDiscount(input: string): AppliedDiscount | null {
  const code = input.trim().toUpperCase();
  const pct = DISCOUNT_CODES[code];
  return pct ? { code, pct } : null;
}

export function discountAmount(subtotal: number, pct: number): number {
  return Math.round((subtotal * pct) / 100);
}

/* ---------- Paso en la URL ---------- */


export function stepFromSearch(locale: Locale, search: string): CheckoutStep {
  const value = Number(new URLSearchParams(search).get(queryParams[locale].step));
  return value === 2 || value === 3 ? value : 1;
}

/** Escribe el paso en los parámetros (el 1 no lleva parámetro), conservando el resto. */
export function stepToSearch(locale: Locale, step: CheckoutStep, search = ''): string {
  const params = new URLSearchParams(search);
  const name = queryParams[locale].step;
  if (step === 1) params.delete(name);
  else params.set(name, String(step));
  const query = params.toString();
  return query ? `?${query}` : '';
}

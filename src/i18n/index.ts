import { en, es, type Entry, type UIKey } from './ui';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

/**
 * Locale de Intl para cada idioma, elegido para coincidir con Figma:
 * es-ES → "14,50 €", "29 sep"; en-US → "€14.50", "Sep 29", "Sep 12, 2026".
 */
export const intlLocale: Record<Locale, string> = { es: 'es-ES', en: 'en-US' };
export const htmlLang: Record<Locale, string> = { es: 'es', en: 'en' };

export type { UIKey };
type Params = Record<string, string | number>;

const dictionaries: Record<Locale, Record<UIKey, Entry>> = { es, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'es' ? 'en' : 'es';
}

const pluralRules = new Map<Locale, Intl.PluralRules>();
function plural(locale: Locale, count: number): 'one' | 'other' {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(intlLocale[locale]);
    pluralRules.set(locale, rules);
  }
  return rules.select(count) === 'one' ? 'one' : 'other';
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** `t('cart/count', { count: 2 })` → "2 productos". Las entradas plurales usan `count`. */
export function translate(locale: Locale, key: UIKey, params?: Params): string {
  const entry = dictionaries[locale][key] ?? dictionaries[defaultLocale][key];
  if (typeof entry === 'string') return interpolate(entry, params);
  const count = Number(params?.['count'] ?? 0);
  return interpolate(entry[plural(locale, count)], params);
}

export type Translator = (key: UIKey, params?: Params) => string;

export function useTranslations(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params);
}

/* ---------- Formato (Intl) ---------- */

const priceFormatters = new Map<string, Intl.NumberFormat>();

function priceFormatter(locale: Locale, digits: 0 | 2): Intl.NumberFormat {
  const key = `${locale}:${digits}`;
  let formatter = priceFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(intlLocale[locale], {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    priceFormatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Importes en céntimos → texto según idioma. 1450 → "14,50 €" | "€14.50".
 * `trimZeros` quita los decimales en importes redondos, como hace Figma en los umbrales: 3500 → "35 €".
 */
export function formatPrice(cents: number, locale: Locale, options: { trimZeros?: boolean } = {}): string {
  const whole = cents % 100 === 0;
  return priceFormatter(locale, options.trimZeros && whole ? 0 : 2).format(cents / 100);
}

/** 4.8 → "4,8" | "4.8" */
export function formatDecimal(value: number, locale: Locale, digits = 1): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

type DateStyle = 'day-month' | 'day-month-year' | 'weekday-day-month' | 'time';

const dateOptions: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  'day-month': { day: 'numeric', month: 'short' },
  'day-month-year': { day: 'numeric', month: 'short', year: 'numeric' },
  'weekday-day-month': { weekday: 'long', day: 'numeric', month: 'long' },
  time: { hour: 'numeric', minute: '2-digit' },
};

/**
 * Fechas con Intl. Las fechas ISO sin hora se interpretan en UTC para que no cambien de día
 * según la zona horaria del visitante. ICU abrevia septiembre como "sept"; Figma usa "sep".
 */
export function formatDate(value: string | Date, locale: Locale, style: DateStyle = 'day-month'): string {
  const date = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value) : value;
  const options: Intl.DateTimeFormatOptions =
    typeof value === 'string' && value.length === 10 ? { ...dateOptions[style], timeZone: 'UTC' } : dateOptions[style];
  const text = new Intl.DateTimeFormat(intlLocale[locale], options).format(date);
  return locale === 'es' ? text.replace(/\bsept\b/, 'sep').replace(/\.(?=\s|$)/g, '') : text;
}

/* ---------- Rutas ---------- */

/** Segmentos traducidos de las URLs. */
const segments = {
  es: { coffee: 'cafes', checkout: 'checkout', confirmation: 'pedido-confirmado', soon: 'proximamente' },
  en: { coffee: 'coffee', checkout: 'checkout', confirmation: 'order-confirmed', soon: 'coming-soon' },
} as const satisfies Record<Locale, Record<string, string>>;

export type Route =
  | { name: 'home' }
  | { name: 'listing' }
  | { name: 'product'; slug: string }
  | { name: 'checkout' }
  | { name: 'confirmation' }
  | { name: 'soon' };

export function routePath(locale: Locale, route: Route): string {
  const s = segments[locale];
  switch (route.name) {
    case 'home':
      return `/${locale}`;
    case 'listing':
      return `/${locale}/${s.coffee}`;
    case 'product':
      return `/${locale}/${s.coffee}/${route.slug}`;
    case 'checkout':
      return `/${locale}/${s.checkout}`;
    case 'confirmation':
      return `/${locale}/${s.confirmation}`;
    case 'soon':
      return `/${locale}/${s.soon}`;
  }
}

/** Nombres de los parámetros de URL por idioma: ?molienda=espresso&tamano=1kg | ?grind=espresso&size=1kg */
export const queryParams = {
  es: {
    grind: 'molienda',
    size: 'tamano',
    step: 'paso',
    grindValues: { beans: 'grano', espresso: 'espresso', filter: 'filtro' },
    sizeValues: { '250g': '250g', '1kg': '1kg' },
  },
  en: {
    grind: 'grind',
    size: 'size',
    step: 'step',
    grindValues: { beans: 'beans', espresso: 'espresso', filter: 'filter' },
    sizeValues: { '250g': '250g', '1kg': '1kg' },
  },
} as const;

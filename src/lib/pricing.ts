/**
 * Reglas de precio y envío. Todos los importes en céntimos con IVA incluido.
 * Valores de Figma: envío gratis desde 35 €, Express 6,90 €, recogida gratis, IVA 10 %,
 * suscripción −10 %. El envío estándar por debajo del umbral (3,90 €) no está en Figma.
 */

export type PurchaseMode = 'one-time' | 'subscription';
export type ShippingMethod = 'standard' | 'express' | 'pickup';

export const FREE_SHIPPING_THRESHOLD = 3500;
export const VAT_RATE_PCT = 10;
export const MAX_QTY_PER_LINE = 10;
export const LOW_STOCK_THRESHOLD = 20;

export const SHIPPING_METHODS: Record<ShippingMethod, { price: number; freeOverThreshold: boolean }> = {
  standard: { price: 390, freeOverThreshold: true },
  express: { price: 690, freeOverThreshold: false },
  pickup: { price: 0, freeOverThreshold: false },
};

export interface SubscriptionTerms {
  discountPct: number;
  intervalWeeks: number;
}

/** 1450 con −10 % → 1305 */
export function applyDiscount(price: number, pct: number): number {
  return Math.round((price * (100 - pct)) / 100);
}

export function unitPriceFor(price: number, mode: PurchaseMode, subscription: SubscriptionTerms | null): number {
  return mode === 'subscription' && subscription ? applyDiscount(price, subscription.discountPct) : price;
}

/** Precio por kilo: 1450 / 250 g → 5800 (58,00 €/kg) */
export function pricePerKg(price: number, grams: number): number {
  return Math.round((price * 1000) / grams);
}

/** IVA contenido en un total con IVA incluido: 4100 → 373 (3,73 €) */
export function vatIncluded(total: number, ratePct = VAT_RATE_PCT): number {
  return total - Math.round(total / (1 + ratePct / 100));
}

export function shippingCost(method: ShippingMethod, subtotal: number): number {
  const rule = SHIPPING_METHODS[method];
  if (rule.freeOverThreshold && subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return rule.price;
}

export interface FreeShippingProgress {
  /** Céntimos que faltan para el envío gratis (0 si ya se ha conseguido). */
  remaining: number;
  /** De 0 a 1. */
  progress: number;
  unlocked: boolean;
}

export function freeShippingProgress(subtotal: number, threshold = FREE_SHIPPING_THRESHOLD): FreeShippingProgress {
  const remaining = Math.max(0, threshold - subtotal);
  return { remaining, progress: Math.min(1, subtotal / threshold), unlocked: remaining === 0 };
}

export function maxQtyFor(stock: number): number {
  return Math.max(0, Math.min(stock, MAX_QTY_PER_LINE));
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  vat: number;
  total: number;
}

export function orderTotals(subtotal: number, shipping: number): OrderTotals {
  const total = subtotal + shipping;
  return { subtotal, shipping, vat: vatIncluded(total), total };
}

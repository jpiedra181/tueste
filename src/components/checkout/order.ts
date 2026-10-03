/**
 * Código de descuento del checkout: se recuerda en sessionStorage (no es un dato sensible) y se
 * lee del pedido confirmado con `discountOf`.
 */
import type { AppliedDiscount } from '@/lib/checkout-utils';
import { findDiscount } from '@/lib/checkout-utils';
import type { Order, OrderDiscount } from '@/stores/checkout';

export function discountOf(order: Order): OrderDiscount | null {
  const discount = order.discount;
  return discount && typeof discount.amount === 'number' && typeof discount.code === 'string' ? discount : null;
}

const DISCOUNT_KEY = 'tueste:checkout-discount:v1';

function session(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function loadStoredDiscount(): AppliedDiscount | null {
  try {
    const code = session()?.getItem(DISCOUNT_KEY);
    return code ? findDiscount(code) : null;
  } catch {
    return null;
  }
}

export function storeDiscount(discount: AppliedDiscount): void {
  try {
    session()?.setItem(DISCOUNT_KEY, discount.code);
  } catch {
    /* sin almacenamiento: el descuento sigue en memoria */
  }
}

export function clearStoredDiscount(): void {
  try {
    session()?.removeItem(DISCOUNT_KEY);
  } catch {
    /* nada que limpiar */
  }
}

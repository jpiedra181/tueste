/**
 * Borrador del checkout en sessionStorage ('tueste:checkout:v1'): sobrevive a recargas y a ir
 * atrás y adelante entre pasos, y desaparece al cerrar la pestaña.
 * Nunca se guardan número de tarjeta, caducidad ni CVC: viven solo en el estado del formulario.
 */
import { atom } from 'nanostores';
import type { PurchaseMode, ShippingMethod, OrderTotals } from '@/lib/pricing';

export type Country = 'ES' | 'PT';
export type PaymentMethod = 'card' | 'bizum' | 'paypal';
export type CheckoutStep = 1 | 2 | 3;

export interface CheckoutDraft {
  contact: { email: string; newsletter: boolean };
  address: {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    postcode: string;
    city: string;
    province: string;
    country: Country;
    phone: string;
  };
  shipping: { method: ShippingMethod };
  payment: { method: PaymentMethod; billingSameAsShipping: boolean; acceptTerms: boolean };
  /** Último paso al que se ha llegado con datos válidos (para no saltarse pasos por URL). */
  reachedStep: CheckoutStep;
}

export const CHECKOUT_STORAGE_KEY = 'tueste:checkout:v1';
export const ORDER_STORAGE_KEY = 'tueste:last-order:v1';

export const emptyDraft = (): CheckoutDraft => ({
  contact: { email: '', newsletter: false },
  address: {
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    postcode: '',
    city: '',
    province: '',
    country: 'ES',
    phone: '',
  },
  shipping: { method: 'standard' },
  payment: { method: 'card', billingSameAsShipping: true, acceptTerms: false },
  reachedStep: 1,
});

function storage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function load(): CheckoutDraft {
  const fallback = emptyDraft();
  try {
    const raw = storage()?.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Partial<CheckoutDraft>;
    return {
      contact: { ...fallback.contact, ...data.contact },
      address: { ...fallback.address, ...data.address },
      shipping: { ...fallback.shipping, ...data.shipping },
      payment: { ...fallback.payment, ...data.payment },
      reachedStep: data.reachedStep === 2 || data.reachedStep === 3 ? data.reachedStep : 1,
    };
  } catch {
    return fallback;
  }
}

export const $checkout = atom<CheckoutDraft>(emptyDraft());

/** Llamar al montar la isla (en cliente) para recuperar el borrador y empezar a guardarlo. */
export function initCheckoutDraft(): void {
  $checkout.set(load());
  $checkout.listen((draft) => {
    try {
      storage()?.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* almacenamiento lleno o bloqueado: el borrador sigue en memoria */
    }
  });
}

export function updateDraft<K extends keyof CheckoutDraft>(section: K, value: Partial<CheckoutDraft[K]> | CheckoutDraft[K]): void {
  const draft = $checkout.get();
  const current = draft[section];
  const next = typeof current === 'object' && current !== null ? { ...current, ...(value as object) } : value;
  $checkout.set({ ...draft, [section]: next });
}

export function clearCheckoutDraft(): void {
  $checkout.set(emptyDraft());
  try {
    storage()?.removeItem(CHECKOUT_STORAGE_KEY);
  } catch {
    /* nada que limpiar */
  }
}

/* ---------- Pedido confirmado ---------- */

export interface OrderLine {
  sku: string;
  productId: string;
  name: string;
  grind: string;
  size: string;
  mode: PurchaseMode;
  qty: number;
  unitPrice: number;
}

export interface OrderDiscount {
  code: string;
  pct: number;
  /** Céntimos descontados del subtotal. */
  amount: number;
}

export interface Order {
  id: string;
  createdAt: string;
  locale: 'es' | 'en';
  firstName: string;
  email: string;
  lines: OrderLine[];
  shipping: { method: ShippingMethod; address: CheckoutDraft['address'] };
  payment: { method: PaymentMethod; last4?: string; brand?: string };
  totals: OrderTotals;
  /** Código de descuento aplicado (demo: TUESTE10). */
  discount?: OrderDiscount;
  /** Fecha del próximo tueste (martes) en ISO. */
  roastDate: string;
  /** Rango de entrega estimado en ISO. */
  delivery: { from: string; to: string };
}

export function saveOrder(order: Order): void {
  try {
    storage()?.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* si falla, la confirmación mostrará el aviso de pedido no encontrado */
  }
}

export function loadOrder(): Order | undefined {
  try {
    const raw = storage()?.getItem(ORDER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Order) : undefined;
  } catch {
    return undefined;
  }
}

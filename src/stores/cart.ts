/**
 * Cesta: líneas en localStorage ('tueste:cart:v1'), sincronizadas entre pestañas por
 * @nanostores/persistent. Solo se guardan ids y cantidades; precios y nombres salen siempre
 * del catálogo, así que nunca quedan datos viejos.
 */
import { persistentAtom } from '@nanostores/persistent';
import { atom, computed } from 'nanostores';
import type { CartCatalog, CatalogProduct, CatalogVariant } from '@/lib/catalog-types';
import {
  freeShippingProgress,
  maxQtyFor,
  unitPriceFor,
  type FreeShippingProgress,
  type PurchaseMode,
} from '@/lib/pricing';

export interface CartLine {
  sku: string;
  productId: string;
  mode: PurchaseMode;
  qty: number;
}

export const CART_STORAGE_KEY = 'tueste:cart:v1';

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== 'object') return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line['sku'] === 'string' &&
    typeof line['productId'] === 'string' &&
    (line['mode'] === 'one-time' || line['mode'] === 'subscription') &&
    typeof line['qty'] === 'number' &&
    Number.isInteger(line['qty']) &&
    line['qty'] > 0
  );
}

/** Tolerante a datos corruptos o de otra versión: lo que no encaja se descarta. */
export function decodeCart(raw: string): CartLine[] {
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isCartLine) : [];
  } catch {
    return [];
  }
}

export const $cartLines = persistentAtom<CartLine[]>(CART_STORAGE_KEY, [], {
  encode: JSON.stringify,
  decode: decodeCart,
});

export const lineKey = (line: Pick<CartLine, 'sku' | 'mode'>): string => `${line.sku}::${line.mode}`;

/** Catálogo de la página (lo aporta la primera isla que se monta; todas reciben el mismo). */
export const $catalog = atom<CartCatalog>({ variants: {}, products: [] });

export function provideCatalog(catalog: CartCatalog): void {
  if (Object.keys($catalog.get().variants).length === 0) $catalog.set(catalog);
}

export const $cartCount = computed($cartLines, (lines) => lines.reduce((sum, line) => sum + line.qty, 0));

export interface CartViewLine extends CartLine {
  key: string;
  variant: CatalogVariant | undefined;
  unitPrice: number;
  lineTotal: number;
  maxQty: number;
  /** Variante agotada o desaparecida del catálogo: no cuenta en el subtotal ni pasa al checkout. */
  unavailable: boolean;
}

export interface CartView {
  lines: CartViewLine[];
  count: number;
  subtotal: number;
  freeShipping: FreeShippingProgress;
  hasUnavailable: boolean;
  /** Sugerencia para "Completa tu pedido": un café que no está en la cesta. */
  upsell: CatalogProduct | undefined;
}

export const $cart = computed([$cartLines, $catalog], (lines, catalog): CartView => {
  const viewLines = lines.map((line): CartViewLine => {
    const variant = catalog.variants[line.sku];
    const unavailable = !variant || variant.stock <= 0;
    const unitPrice = variant ? unitPriceFor(variant.price, line.mode, variant.subscription) : 0;
    return {
      ...line,
      key: lineKey(line),
      variant,
      unitPrice,
      lineTotal: unavailable ? 0 : unitPrice * line.qty,
      maxQty: variant ? maxQtyFor(variant.stock) : 0,
      unavailable,
    };
  });
  const subtotal = viewLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const inCart = new Set(lines.map((line) => line.productId));
  return {
    lines: viewLines,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    subtotal,
    freeShipping: freeShippingProgress(subtotal),
    hasUnavailable: viewLines.some((line) => line.unavailable),
    upsell: catalog.products.find((product) => !inCart.has(product.id)),
  };
});

/* ---------- Acciones ---------- */

export interface AddInput {
  sku: string;
  productId: string;
  mode: PurchaseMode;
  qty: number;
  /** Máximo por línea (stock y límite por pedido). */
  max: number;
}

/** Añade o suma a una línea existente. Devuelve la clave de la línea afectada. */
export function addToCart({ sku, productId, mode, qty, max }: AddInput): string {
  const key = lineKey({ sku, mode });
  const lines = $cartLines.get();
  const existing = lines.find((line) => lineKey(line) === key);
  if (existing) {
    $cartLines.set(
      lines.map((line) => (lineKey(line) === key ? { ...line, qty: Math.min(max, line.qty + qty) } : line)),
    );
  } else {
    $cartLines.set([...lines, { sku, productId, mode, qty: Math.min(max, qty) }]);
  }
  return key;
}

export function setLineQty(key: string, qty: number, max: number): void {
  const clamped = Math.max(1, Math.min(max, Math.round(qty)));
  $cartLines.set($cartLines.get().map((line) => (lineKey(line) === key ? { ...line, qty: clamped } : line)));
}

export interface RemovedLine {
  line: CartLine;
  index: number;
}

export function removeLine(key: string): RemovedLine | undefined {
  const lines = $cartLines.get();
  const index = lines.findIndex((line) => lineKey(line) === key);
  if (index === -1) return undefined;
  const line = lines[index]!;
  $cartLines.set(lines.filter((_, i) => i !== index));
  return { line, index };
}

/** Deshacer una eliminación, en la misma posición. */
export function restoreLine({ line, index }: RemovedLine): void {
  const lines = [...$cartLines.get()];
  if (lines.some((l) => lineKey(l) === lineKey(line))) return;
  lines.splice(Math.min(index, lines.length), 0, line);
  $cartLines.set(lines);
}

export function clearCart(): void {
  $cartLines.set([]);
}

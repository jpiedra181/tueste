import { beforeEach, describe, expect, it } from 'vitest';
import type { CartCatalog } from '@/lib/catalog-types';
import {
  $cart,
  $cartCount,
  $cartLines,
  $catalog,
  addToCart,
  clearCart,
  decodeCart,
  lineKey,
  removeLine,
  restoreLine,
  setLineQty,
} from '@/stores/cart';

const variant = (sku: string, price: number, stock: number) => ({
  sku,
  productId: sku.startsWith('HAM') ? 'hambela' : 'santa-elena',
  name: sku.startsWith('HAM') ? 'Hambela' : 'Santa Elena',
  colorway: 'terracotta' as const,
  grind: 'beans' as const,
  size: '250g' as const,
  grams: 250,
  price,
  stock,
  subscription: { discountPct: 10, intervalWeeks: 4 },
  url: '/es/cafes/x',
});

const catalog: CartCatalog = {
  variants: {
    'HAM-BEA-250': variant('HAM-BEA-250', 1450, 14),
    'STE-BEA-250': variant('STE-BEA-250', 1200, 40),
    'HAM-FIL-1KG': variant('HAM-FIL-1KG', 4900, 0),
  },
  products: [
    { id: 'hambela', name: 'Hambela', colorway: 'terracotta', origin: '', notes: '', defaultSku: 'HAM-BEA-250', url: '' },
    { id: 'santa-elena', name: 'Santa Elena', colorway: 'sage', origin: '', notes: '', defaultSku: 'STE-BEA-250', url: '' },
  ],
};

beforeEach(() => {
  clearCart();
  $catalog.set(catalog);
});

describe('decodeCart', () => {
  it('descarta datos corruptos o con forma incorrecta', () => {
    expect(decodeCart('no es json')).toEqual([]);
    expect(decodeCart('{"a":1}')).toEqual([]);
    expect(
      decodeCart(
        JSON.stringify([
          { sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 2 },
          { sku: 'X', productId: 'x', mode: 'gratis', qty: 1 },
          { sku: 'Y', productId: 'y', mode: 'one-time', qty: 0 },
        ]),
      ),
    ).toEqual([{ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 2 }]);
  });
});

describe('acciones', () => {
  it('suma cantidades de la misma variante y modo, con tope', () => {
    addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 6, max: 10 });
    addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 6, max: 10 });
    expect($cartLines.get()).toEqual([{ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 10 }]);
  });

  it('compra única y suscripción son líneas distintas', () => {
    addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 1, max: 10 });
    addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'subscription', qty: 1, max: 10 });
    expect($cartLines.get()).toHaveLength(2);
    expect($cartCount.get()).toBe(2);
  });

  it('cambia la cantidad dentro de los límites', () => {
    const key = addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 1, max: 10 });
    setLineQty(key, 99, 10);
    expect($cartLines.get()[0]?.qty).toBe(10);
    setLineQty(key, 0, 10);
    expect($cartLines.get()[0]?.qty).toBe(1);
  });

  it('eliminar y deshacer devuelve la línea a su sitio', () => {
    addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 1, max: 10 });
    addToCart({ sku: 'STE-BEA-250', productId: 'santa-elena', mode: 'one-time', qty: 1, max: 10 });
    const removed = removeLine(lineKey({ sku: 'HAM-BEA-250', mode: 'one-time' }));
    expect($cartLines.get().map((l) => l.sku)).toEqual(['STE-BEA-250']);
    restoreLine(removed!);
    expect($cartLines.get().map((l) => l.sku)).toEqual(['HAM-BEA-250', 'STE-BEA-250']);
  });
});

describe('$cart (derivado)', () => {
  it('subtotal del diseño: Hambela + Santa Elena = 26,50 €, faltan 8,50 €', () => {
    addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'one-time', qty: 1, max: 10 });
    addToCart({ sku: 'STE-BEA-250', productId: 'santa-elena', mode: 'one-time', qty: 1, max: 10 });
    const cart = $cart.get();
    expect(cart.subtotal).toBe(2650);
    expect(cart.freeShipping.remaining).toBe(850);
    expect(cart.upsell).toBeUndefined();
  });

  it('suscripción con descuento y líneas agotadas fuera del subtotal', () => {
    addToCart({ sku: 'HAM-BEA-250', productId: 'hambela', mode: 'subscription', qty: 2, max: 10 });
    addToCart({ sku: 'HAM-FIL-1KG', productId: 'hambela', mode: 'one-time', qty: 1, max: 10 });
    const cart = $cart.get();
    expect(cart.subtotal).toBe(1305 * 2);
    expect(cart.hasUnavailable).toBe(true);
    expect(cart.lines[1]?.unavailable).toBe(true);
    expect(cart.upsell?.id).toBe('santa-elena');
  });
});

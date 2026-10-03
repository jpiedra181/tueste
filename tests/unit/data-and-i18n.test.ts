import { describe, expect, it } from 'vitest';
import products from '@/data/products.json';
import reviews from '@/data/reviews.json';
import { en, es } from '@/i18n/ui';
import { formatDate, formatDecimal, routePath, translate } from '@/i18n';
import { productSchema, reviewSchema } from '@/lib/schemas';

describe('catálogo', () => {
  const parsed = products.map((p) => productSchema.parse(p));
  const ids = new Set(parsed.map((p) => p.id));

  it('todos los productos cumplen el esquema', () => {
    expect(parsed).toHaveLength(5);
  });

  it('los relacionados existen y no se incluyen a sí mismos', () => {
    for (const product of parsed) {
      for (const id of product.related) {
        expect(ids.has(id), `${product.id} → ${id}`).toBe(true);
        expect(id).not.toBe(product.id);
      }
    }
  });

  it('cada reseña apunta a un producto y a una variante que existen', () => {
    for (const review of reviews.map((r) => reviewSchema.parse(r))) {
      const product = parsed.find((p) => p.id === review.productId);
      expect(product, review.id).toBeDefined();
      expect(product!.variants.some((v) => v.sku === review.sku), review.id).toBe(true);
    }
  });
});

describe('i18n', () => {
  it('ES y EN tienen las mismas claves', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('plurales y parámetros', () => {
    expect(translate('es', 'cart/count', { count: 1 })).toBe('1 producto');
    expect(translate('es', 'cart/count', { count: 3 })).toBe('3 productos');
    expect(translate('en', 'cart/count', { count: 2 })).toBe('2 items');
    expect(translate('es', 'checkout/step-of', { current: 2, total: 3 })).toBe('Paso 2 de 3');
  });

  it('fechas como en Figma', () => {
    expect(formatDate('2026-09-29', 'es')).toBe('29 sep');
    expect(formatDate('2026-09-29', 'en')).toBe('Sep 29');
    expect(formatDate('2026-09-12', 'es', 'day-month-year')).toBe('12 sep 2026');
    expect(formatDate('2026-09-12', 'en', 'day-month-year')).toBe('Sep 12, 2026');
    expect(formatDecimal(4.8, 'es')).toBe('4,8');
    expect(formatDecimal(4.8, 'en')).toBe('4.8');
  });

  it('rutas traducidas', () => {
    expect(routePath('es', { name: 'product', slug: 'hambela' })).toBe('/es/cafes/hambela');
    expect(routePath('en', { name: 'product', slug: 'hambela' })).toBe('/en/coffee/hambela');
    expect(routePath('en', { name: 'confirmation' })).toBe('/en/order-confirmed');
  });
});

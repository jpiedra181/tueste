import { describe, expect, it } from 'vitest';
import {
  applyDiscount,
  freeShippingProgress,
  maxQtyFor,
  orderTotals,
  pricePerKg,
  shippingCost,
  unitPriceFor,
  vatIncluded,
} from '@/lib/pricing';
import { starFills } from '@/components/ui/RatingStars';

describe('precios (cifras de Figma)', () => {
  it('suscripción −10 %: 14,50 → 13,05 y 49,00 → 44,10', () => {
    expect(applyDiscount(1450, 10)).toBe(1305);
    expect(applyDiscount(4900, 10)).toBe(4410);
    expect(unitPriceFor(1450, 'subscription', { discountPct: 10, intervalWeeks: 4 })).toBe(1305);
    expect(unitPriceFor(1450, 'one-time', { discountPct: 10, intervalWeeks: 4 })).toBe(1450);
    expect(unitPriceFor(1450, 'subscription', null)).toBe(1450);
  });

  it('precio por kilo: 58,00 €/kg y 52,20 €/kg', () => {
    expect(pricePerKg(1450, 250)).toBe(5800);
    expect(pricePerKg(1305, 250)).toBe(5220);
    expect(pricePerKg(4900, 1000)).toBe(4900);
  });

  it('IVA incluido del 10 %: 41,00 € → 3,73 €', () => {
    expect(vatIncluded(4100)).toBe(373);
  });
});

describe('envío', () => {
  it('faltan 8,50 € con un subtotal de 26,50 €', () => {
    expect(freeShippingProgress(2650)).toEqual({ remaining: 850, progress: 2650 / 3500, unlocked: false });
  });

  it('desbloqueado a partir de 35 €', () => {
    expect(freeShippingProgress(4100)).toEqual({ remaining: 0, progress: 1, unlocked: true });
    expect(freeShippingProgress(3500).unlocked).toBe(true);
  });

  it('estándar gratis desde el umbral; express siempre de pago; recogida gratis', () => {
    expect(shippingCost('standard', 4100)).toBe(0);
    expect(shippingCost('standard', 2650)).toBe(390);
    expect(shippingCost('express', 4100)).toBe(690);
    expect(shippingCost('pickup', 1000)).toBe(0);
  });

  it('totales del pedido', () => {
    expect(orderTotals(4100, 0)).toEqual({ subtotal: 4100, shipping: 0, vat: 373, total: 4100 });
    expect(orderTotals(2650, 690).total).toBe(3340);
  });
});

describe('cantidades', () => {
  it('máximo por línea: stock y 10 como tope', () => {
    expect(maxQtyFor(14)).toBe(10);
    expect(maxQtyFor(6)).toBe(6);
    expect(maxQtyFor(0)).toBe(0);
  });
});

describe('estrellas', () => {
  it('4,8 → 4 y media (como en Figma); 4,9 → 5', () => {
    expect(starFills(4.8)).toEqual(['full', 'full', 'full', 'full', 'half']);
    expect(starFills(4.9)).toEqual(['full', 'full', 'full', 'full', 'full']);
    expect(starFills(4)).toEqual(['full', 'full', 'full', 'full', 'empty']);
    expect(starFills(0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
  });
});

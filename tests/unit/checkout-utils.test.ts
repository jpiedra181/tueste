import { describe, expect, it } from 'vitest';
import {
  cvcLength,
  deliveryWindow,
  detectCardBrand,
  discountAmount,
  findDiscount,
  formatCardNumber,
  formatDeliveryRange,
  formatExpiry,
  formatPostcode,
  formatWeekdayShort,
  generateOrderId,
  isExpiryInFuture,
  isValidCardNumber,
  isValidPhone,
  isValidPostcode,
  luhnCheck,
  nextRoastDate,
  parseExpiry,
  provinceFromPostcode,
  reformatWithCaret,
  stepFromSearch,
  stepToSearch,
  toISODate,
} from '@/lib/checkout-utils';

describe('tarjeta', () => {
  it('Luhn', () => {
    expect(luhnCheck('4242 4242 4242 4242')).toBe(true);
    expect(luhnCheck('4000000000000002')).toBe(true);
    expect(luhnCheck('378282246310005')).toBe(true);
    expect(luhnCheck('4242424242424241')).toBe(false);
    expect(luhnCheck('4242')).toBe(false);
  });

  it('detecta la marca', () => {
    expect(detectCardBrand('4242')).toBe('visa');
    expect(detectCardBrand('5555 5555')).toBe('mastercard');
    expect(detectCardBrand('2221 0000')).toBe('mastercard');
    expect(detectCardBrand('3782')).toBe('amex');
    expect(detectCardBrand('3412')).toBe('amex');
    expect(detectCardBrand('6011')).toBeNull();
  });

  it('número válido: marca aceptada, longitud y Luhn', () => {
    expect(isValidCardNumber('4242424242424242')).toBe(true);
    expect(isValidCardNumber('5555555555554444')).toBe(true);
    expect(isValidCardNumber('378282246310005')).toBe(true);
    expect(isValidCardNumber('6011111111111117')).toBe(false); // Discover: no aceptada
    expect(isValidCardNumber('424242424242')).toBe(false);
  });

  it('formatea por grupos (Amex 4-6-5)', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('42424')).toBe('4242 4');
    expect(formatCardNumber('4242 4242 4242 4242 999')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    expect(formatCardNumber('')).toBe('');
  });

  it('CVC de 3 cifras, 4 en Amex', () => {
    expect(cvcLength('visa')).toBe(3);
    expect(cvcLength('mastercard')).toBe(3);
    expect(cvcLength('amex')).toBe(4);
    expect(cvcLength(null)).toBe(3);
  });

  it('caducidad MM / AA', () => {
    expect(formatExpiry('0826')).toBe('08 / 26');
    expect(formatExpiry('08')).toBe('08');
    expect(formatExpiry('4')).toBe('04');
    expect(formatExpiry('12/3')).toBe('12 / 3');
    expect(parseExpiry('08 / 26')).toEqual({ month: 8, year: 2026 });
    expect(parseExpiry('0826')).toEqual({ month: 8, year: 2026 });
    expect(parseExpiry('13 / 26')).toBeNull();
    expect(parseExpiry('8/26')).toBeNull();
  });

  it('caducidad futura: vale hasta el final del mes', () => {
    const now = new Date(2026, 9, 3); // 3 oct 2026
    expect(isExpiryInFuture({ month: 10, year: 2026 }, now)).toBe(true);
    expect(isExpiryInFuture({ month: 9, year: 2026 }, now)).toBe(false);
    expect(isExpiryInFuture({ month: 1, year: 2027 }, now)).toBe(true);
    expect(isExpiryInFuture({ month: 12, year: 2025 }, now)).toBe(false);
  });

  it('reformatea conservando el cursor', () => {
    // Escribir el quinto dígito salta el espacio.
    expect(reformatWithCaret('4242', '42424', 5, formatCardNumber)).toEqual({ value: '4242 4', caret: 6 });
    // Borrar el espacio borra el dígito anterior.
    expect(reformatWithCaret('4242 4', '42424', 4, formatCardNumber)).toEqual({ value: '4244', caret: 3 });
    expect(reformatWithCaret('08 / 2', '08 /2', 4, formatExpiry)).toEqual({ value: '02', caret: 1 });
    // Editar en medio mantiene la posición.
    expect(reformatWithCaret('4242 4242', '42142 4242', 3, formatCardNumber)).toEqual({ value: '4214 2424 2', caret: 3 });
  });
});

describe('dirección', () => {
  it('código postal español: 5 cifras y provincia existente', () => {
    expect(isValidPostcode('40001', 'ES')).toBe(true);
    expect(isValidPostcode('4000', 'ES')).toBe(false);
    expect(isValidPostcode('99001', 'ES')).toBe(false);
    expect(isValidPostcode('00001', 'ES')).toBe(false);
  });

  it('código postal portugués 0000-000', () => {
    expect(isValidPostcode('1000-123', 'PT')).toBe(true);
    expect(isValidPostcode('1000123', 'PT')).toBe(false);
    expect(formatPostcode('1000123', 'PT')).toBe('1000-123');
    expect(formatPostcode('1000', 'PT')).toBe('1000');
    expect(formatPostcode('40001-9', 'ES')).toBe('40001');
  });

  it('provincia desde el código postal', () => {
    expect(provinceFromPostcode('40001')).toBe('Segovia');
    expect(provinceFromPostcode('28013')).toBe('Madrid');
    expect(provinceFromPostcode('08001')).toBe('Barcelona');
    expect(provinceFromPostcode('4000')).toBeUndefined();
    expect(provinceFromPostcode('53000')).toBeUndefined();
  });

  it('teléfono de 9 cifras (admite espacios)', () => {
    expect(isValidPhone('612 345 678')).toBe(true);
    expect(isValidPhone('612-345-678')).toBe(true);
    expect(isValidPhone('61234567')).toBe(false);
    expect(isValidPhone('+34612345678')).toBe(false);
  });
});

describe('fechas', () => {
  it('próximo martes de tueste, siempre después de hoy', () => {
    expect(toISODate(nextRoastDate(new Date(2026, 9, 3)))).toBe('2026-10-06'); // sábado
    expect(toISODate(nextRoastDate(new Date(2026, 9, 5)))).toBe('2026-10-06'); // lunes
    expect(toISODate(nextRoastDate(new Date(2026, 9, 6)))).toBe('2026-10-13'); // martes
    expect(toISODate(nextRoastDate(new Date(2026, 9, 7)))).toBe('2026-10-13'); // miércoles
    expect(toISODate(nextRoastDate(new Date(2026, 11, 30)))).toBe('2027-01-05'); // cambio de año
  });

  it('ventana de entrega', () => {
    const roast = new Date(2026, 9, 6);
    const standard = deliveryWindow(roast, 'standard');
    expect([toISODate(standard.from), toISODate(standard.to)]).toEqual(['2026-10-08', '2026-10-09']);
    const express = deliveryWindow(roast, 'express');
    expect([toISODate(express.from), toISODate(express.to)]).toEqual(['2026-10-07', '2026-10-07']);
  });

  it('formatos de la confirmación como en Figma', () => {
    expect(formatWeekdayShort('2026-10-06', 'es')).toBe('Martes 6 oct');
    expect(formatWeekdayShort('2026-10-06', 'en')).toBe('Tuesday 6 Oct');
    expect(formatDeliveryRange('2026-10-08', '2026-10-09', 'es')).toBe('Jue 8 – vie 9 oct');
    expect(formatDeliveryRange('2026-10-08', '2026-10-09', 'en')).toBe('Thu 8 – Fri 9 Oct');
    expect(formatDeliveryRange('2026-09-30', '2026-10-01', 'es')).toBe('Mié 30 sep – jue 1 oct');
    expect(formatDeliveryRange('2026-10-07', '2026-10-07', 'es')).toBe('Mié 7 oct');
  });
});

describe('pedido y descuento', () => {
  it('id TS- + 5 cifras', () => {
    expect(generateOrderId(() => 0)).toBe('TS-10000');
    expect(generateOrderId(() => 0.99999)).toBe('TS-99999');
    expect(generateOrderId()).toMatch(/^TS-\d{5}$/);
  });

  it('TUESTE10 aplica un 10 % al subtotal', () => {
    expect(findDiscount(' tueste10 ')).toEqual({ code: 'TUESTE10', pct: 10 });
    expect(findDiscount('OTRO')).toBeNull();
    expect(findDiscount('')).toBeNull();
    expect(discountAmount(4100, 10)).toBe(410);
    expect(discountAmount(1450, 10)).toBe(145);
  });
});

describe('paso en la URL', () => {
  it('lee y escribe el parámetro traducido', () => {
    expect(stepFromSearch('es', '?paso=2')).toBe(2);
    expect(stepFromSearch('en', '?step=3')).toBe(3);
    expect(stepFromSearch('es', '?step=3')).toBe(1);
    expect(stepFromSearch('es', '?paso=9')).toBe(1);
    expect(stepToSearch('es', 2)).toBe('?paso=2');
    expect(stepToSearch('en', 3, '?utm=x')).toBe('?utm=x&step=3');
    expect(stepToSearch('es', 1, '?paso=3')).toBe('');
  });
});

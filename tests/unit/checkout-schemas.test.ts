import { describe, expect, it } from 'vitest';
import {
  DETAILS_FIELDS,
  errorFields,
  validateDetails,
  validatePayment,
  type DetailsValues,
  type PaymentValues,
} from '@/lib/checkout-schemas';

const details: DetailsValues = {
  email: 'lucia.martin@correo.es',
  firstName: 'Lucía',
  lastName: 'Martín Sanz',
  address1: 'Calle Real, 14',
  address2: '',
  postcode: '40001',
  city: 'Segovia',
  province: 'Segovia',
  country: 'ES',
  phone: '612 345 678',
};

const payment: PaymentValues = {
  method: 'card',
  cardNumber: '4242 4242 4242 4242',
  cardExpiry: '08 / 28',
  cardCvc: '123',
  cardName: 'Lucía Martín Sanz',
  acceptTerms: true,
};

const now = new Date(2026, 9, 3);

describe('datos y envío', () => {
  it('acepta datos válidos (piso opcional)', () => {
    expect(validateDetails(details)).toEqual({});
  });

  it('obligatorios vacíos', () => {
    const errors = validateDetails({ ...details, email: '', firstName: '  ', city: '' });
    expect(errors.email).toEqual({ key: 'validation/required' });
    expect(errors.firstName).toEqual({ key: 'validation/required' });
    expect(errors.city).toEqual({ key: 'validation/required' });
    expect(errors.address2).toBeUndefined();
  });

  it('email', () => {
    expect(validateDetails({ ...details, email: 'lucia.martin@correo' }).email).toEqual({ key: 'validation/email' });
    expect(validateDetails({ ...details, email: 'lucia martin@correo.es' }).email).toEqual({ key: 'validation/email' });
  });

  it('código postal según país, junto a otros errores', () => {
    expect(validateDetails({ ...details, postcode: '4000' }).postcode).toEqual({ key: 'validation/postcode' });
    expect(validateDetails({ ...details, postcode: '99001' }).postcode).toEqual({ key: 'validation/postcode' });
    expect(validateDetails({ ...details, country: 'PT', postcode: '40001' }).postcode).toEqual({
      key: 'validation/postcode-pt',
    });
    expect(validateDetails({ ...details, country: 'PT', postcode: '1000-123' })).toEqual({});
    const many = validateDetails({ ...details, email: '', postcode: '123' });
    expect(Object.keys(many).sort()).toEqual(['email', 'postcode']);
  });

  it('teléfono de 9 cifras', () => {
    expect(validateDetails({ ...details, phone: '6123' }).phone).toEqual({ key: 'validation/phone' });
  });

  it('ordena los errores como en pantalla', () => {
    const errors = validateDetails({ ...details, phone: '', email: '', city: '' });
    expect(errorFields(errors, DETAILS_FIELDS)).toEqual(['email', 'city', 'phone']);
  });
});

describe('pago', () => {
  it('acepta una tarjeta válida', () => {
    expect(validatePayment(payment, now)).toEqual({});
  });

  it('Luhn y marca', () => {
    expect(validatePayment({ ...payment, cardNumber: '4242 4242 4242 4241' }, now).cardNumber).toEqual({
      key: 'validation/card-number',
    });
    expect(validatePayment({ ...payment, cardNumber: '' }, now).cardNumber).toEqual({ key: 'validation/required' });
  });

  it('caducidad: formato y fecha futura', () => {
    expect(validatePayment({ ...payment, cardExpiry: '08 / 26' }, now).cardExpiry).toEqual({ key: 'validation/expiry' });
    expect(validatePayment({ ...payment, cardExpiry: '10 / 26' }, now).cardExpiry).toBeUndefined();
    expect(validatePayment({ ...payment, cardExpiry: '13 / 30' }, now).cardExpiry).toEqual({
      key: 'validation/expiry-format',
    });
  });

  it('CVC según la marca', () => {
    expect(validatePayment({ ...payment, cardCvc: '12' }, now).cardCvc).toEqual({
      key: 'validation/cvc',
      params: { digits: 3 },
    });
    const amex = { ...payment, cardNumber: '3782 822463 10005' };
    expect(validatePayment({ ...amex, cardCvc: '123' }, now).cardCvc).toEqual({
      key: 'validation/cvc',
      params: { digits: 4 },
    });
    expect(validatePayment({ ...amex, cardCvc: '1234' }, now)).toEqual({});
  });

  it('condiciones obligatorias', () => {
    expect(validatePayment({ ...payment, acceptTerms: false }, now).acceptTerms).toEqual({ key: 'validation/terms' });
  });

  it('Bizum y PayPal no piden tarjeta', () => {
    const empty = { ...payment, cardNumber: '', cardExpiry: '', cardCvc: '', cardName: '' };
    expect(validatePayment({ ...empty, method: 'bizum' }, now)).toEqual({});
    expect(validatePayment({ ...empty, method: 'paypal', acceptTerms: false }, now)).toEqual({
      acceptTerms: { key: 'validation/terms' },
    });
  });
});

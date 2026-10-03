/**
 * Validación del checkout con Zod (zod/mini: la API funcional y modular de Zod 4, para que la isla
 * del checkout no cargue la versión completa). Los mensajes son claves de src/i18n/ui.ts (se traducen al
 * pintar); los que llevan datos ("El CVC tiene {digits} cifras") los pasan en `params`.
 */
import * as z from 'zod/mini';
import type { UIKey } from '@/i18n';
import {
  cvcLength,
  detectCardBrand,
  digitsOnly,
  isExpiryInFuture,
  isValidCardNumber,
  isValidPhone,
  isValidPostcode,
  parseExpiry,
} from './checkout-utils';

export interface FieldError {
  key: UIKey;
  params?: Record<string, string | number>;
}

export type FieldErrors<F extends string> = Partial<Record<F, FieldError>>;

/* ---------- Paso 1: contacto y dirección ---------- */

/** Orden de los campos en pantalla (también el del resumen de errores). */
export const DETAILS_FIELDS = [
  'email',
  'firstName',
  'lastName',
  'address1',
  'address2',
  'postcode',
  'city',
  'province',
  'country',
  'phone',
] as const;
export type DetailsField = (typeof DETAILS_FIELDS)[number];
export type DetailsValues = Record<Exclude<DetailsField, 'country'>, string> & { country: 'ES' | 'PT' };

// Pragmático (como el de los navegadores): algo@algo.dominio, sin espacios.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const requiredText = () => z.string().check(z.trim(), z.minLength(1, 'validation/required'));

export const detailsSchema = z
  .object({
    email: requiredText().check(z.regex(EMAIL_RE, 'validation/email')),
    firstName: requiredText(),
    lastName: requiredText(),
    address1: requiredText(),
    address2: z.string(),
    postcode: requiredText(),
    city: requiredText(),
    province: requiredText(),
    country: z.enum(['ES', 'PT']),
    phone: requiredText().check(z.refine(isValidPhone, 'validation/phone')),
  })
  .check(
    z.superRefine((values, ctx) => {
      const postcode = values.postcode.trim();
      if (postcode && !isValidPostcode(postcode, values.country)) {
        ctx.addIssue({
          code: 'custom',
          path: ['postcode'],
          message: values.country === 'PT' ? 'validation/postcode-pt' : 'validation/postcode',
        });
      }
    }),
  );

/* ---------- Paso 3: pago ---------- */

export const PAYMENT_FIELDS = ['cardNumber', 'cardExpiry', 'cardCvc', 'cardName', 'acceptTerms'] as const;
export type PaymentField = (typeof PAYMENT_FIELDS)[number];

export interface PaymentValues {
  method: 'card' | 'bizum' | 'paypal';
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  cardName: string;
  acceptTerms: boolean;
}

/** `now` se inyecta para poder probar la caducidad. */
export function paymentSchema(now: Date = new Date()) {
  return z
    .object({
      method: z.enum(['card', 'bizum', 'paypal']),
      cardNumber: z.string(),
      cardExpiry: z.string(),
      cardCvc: z.string(),
      cardName: z.string(),
      acceptTerms: z.boolean(),
    })
    .check(
      z.superRefine((values, ctx) => {
        const issue = (path: PaymentField, message: UIKey, params?: Record<string, number>) =>
          ctx.addIssue({ code: 'custom', path: [path], message, ...(params && { params }) });

        if (values.method === 'card') {
          const digits = digitsOnly(values.cardNumber);
          if (!digits) issue('cardNumber', 'validation/required');
          else if (!isValidCardNumber(digits)) issue('cardNumber', 'validation/card-number');

          const expiryText = values.cardExpiry.trim();
          const expiry = parseExpiry(expiryText);
          if (!expiryText) issue('cardExpiry', 'validation/required');
          else if (!expiry) issue('cardExpiry', 'validation/expiry-format');
          else if (!isExpiryInFuture(expiry, now)) issue('cardExpiry', 'validation/expiry');

          const cvc = values.cardCvc.trim();
          const length = cvcLength(detectCardBrand(digits));
          if (!cvc) issue('cardCvc', 'validation/required');
          else if (!/^\d+$/.test(cvc) || cvc.length !== length)
            issue('cardCvc', 'validation/cvc', { digits: length });

          if (!values.cardName.trim()) issue('cardName', 'validation/required');
        }
        if (!values.acceptTerms) issue('acceptTerms', 'validation/terms');
      }),
    );
}

/* ---------- Errores por campo ---------- */

function collect<F extends string>(
  issues: readonly z.core.$ZodIssue[],
  fields: readonly F[],
): FieldErrors<F> {
  const errors: FieldErrors<F> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || !(fields as readonly string[]).includes(field)) continue;
    const key = field as F;
    if (errors[key]) continue; // solo el primer error de cada campo
    const params =
      'params' in issue ? (issue.params as Record<string, string | number> | undefined) : undefined;
    errors[key] = { key: issue.message as UIKey, ...(params && { params }) };
  }
  return errors;
}

export function validateDetails(values: DetailsValues): FieldErrors<DetailsField> {
  const result = detailsSchema.safeParse(values);
  return result.success ? {} : collect(result.error.issues, DETAILS_FIELDS);
}

export function validatePayment(values: PaymentValues, now: Date = new Date()): FieldErrors<PaymentField> {
  const result = paymentSchema(now).safeParse(values);
  return result.success ? {} : collect(result.error.issues, PAYMENT_FIELDS);
}

/** Lista ordenada de los campos con error (para el banner de resumen). */
export function errorFields<F extends string>(errors: FieldErrors<F>, order: readonly F[]): F[] {
  return order.filter((field) => errors[field]);
}

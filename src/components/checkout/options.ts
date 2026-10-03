/** Métodos de envío y pago del checkout, con sus textos e iconos. */
import { formatDate, formatPrice, type Locale, type Translator, type UIKey } from '@/i18n';
import type { IconName } from '@/lib/icons';
import type { ShippingMethod } from '@/lib/pricing';
import type { PaymentMethod } from '@/stores/checkout';

export const SHIPPING_OPTIONS: readonly { method: ShippingMethod; icon: IconName; title: UIKey; description: UIKey }[] = [
  { method: 'standard', icon: 'truck', title: 'shipping/standard', description: 'shipping/standard-desc' },
  { method: 'express', icon: 'clock', title: 'shipping/express', description: 'shipping/express-desc' },
  { method: 'pickup', icon: 'store', title: 'shipping/pickup', description: 'shipping/pickup-desc' },
];

export const PAYMENT_OPTIONS: readonly { method: PaymentMethod; icon: IconName; title: UIKey; description: UIKey }[] = [
  { method: 'card', icon: 'credit-card', title: 'payment/card', description: 'payment/card-desc' },
  { method: 'bizum', icon: 'phone', title: 'payment/bizum', description: 'payment/bizum-desc' },
  { method: 'paypal', icon: 'wallet', title: 'payment/paypal', description: 'payment/paypal-desc' },
];

export function priceOrFree(cents: number, locale: Locale, t: Translator): string {
  return cents === 0 ? t('common/free') : formatPrice(cents, locale);
}

/** Fila "Método" del repaso: "Estándar · 48–72 h · Gratis". */
export function shippingSummary(method: ShippingMethod, cost: number, locale: Locale, t: Translator): string {
  const option = SHIPPING_OPTIONS.find((o) => o.method === method) ?? SHIPPING_OPTIONS[0]!;
  const parts = [t(option.title)];
  if (method === 'standard') parts.push(t('shipping/eta-standard'));
  parts.push(priceOrFree(cost, locale, t));
  return parts.join(' · ');
}

/** "martes 6 de octubre" | "Tuesday 6 October" (sin la coma que añade Intl en español). */
export function roastDateText(iso: string, locale: Locale): string {
  return formatDate(iso, locale, 'weekday-day-month').replace(',', '');
}

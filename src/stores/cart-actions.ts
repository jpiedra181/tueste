/**
 * Acción común de "añadir a la cesta" (ficha, añadido rápido de tarjetas, sugerencia de la cesta):
 * añade, abre la cesta resaltando la línea y lo anuncia a los lectores de pantalla.
 */
import { translate, type Locale } from '@/i18n';
import { announce } from '@/lib/announce';
import type { PurchaseMode } from '@/lib/pricing';
import { addToCart } from './cart';
import { openCart } from './ui';

export interface AddAndOpenInput {
  sku: string;
  productId: string;
  name: string;
  mode: PurchaseMode;
  qty: number;
  max: number;
  locale: Locale;
}

export function addAndOpenCart({ sku, productId, name, mode, qty, max, locale }: AddAndOpenInput): string {
  const key = addToCart({ sku, productId, mode, qty, max });
  openCart(key);
  announce(translate(locale, 'toast/added', { name }));
  return key;
}

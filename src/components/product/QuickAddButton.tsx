/**
 * Añadido rápido de la tarjeta de producto (Figma "Quick Add" en Product Card · Hover).
 * Isla mínima: añade una unidad de la variante ya resuelta en el servidor, abre la cesta y lo anuncia.
 */
import type { Locale } from '@/i18n';
import { Icon } from '@/components/ui/Icon';
import { iconButtonClasses, iconButtonIconSize } from '@/components/ui/button';
import { addAndOpenCart } from '@/stores/cart-actions';

interface QuickAddButtonProps {
  sku: string;
  productId: string;
  name: string;
  /** Máximo por línea (stock y límite por pedido). */
  max: number;
  locale: Locale;
  /** "Añadir a la cesta: Santa Elena, Grano · 250 g" */
  label: string;
}

export default function QuickAddButton({ sku, productId, name, max, locale, label }: QuickAddButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => addAndOpenCart({ sku, productId, name, mode: 'one-time', qty: 1, max, locale })}
      className={iconButtonClasses({ variant: 'primary', size: 'md' })}
    >
      <Icon name="plus" size={iconButtonIconSize.md} />
    </button>
  );
}

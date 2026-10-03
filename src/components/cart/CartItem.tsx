import { useEffect, useRef } from 'react';
import { Packshot } from '@/components/art/Packshot';
import { badgeClasses } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatPrice, queryParams, type Locale, type Translator } from '@/i18n';
import type { Colorway } from '@/lib/schemas';
import { setLineQty, type CartViewLine } from '@/stores/cart';

/**
 * Cart Item (Figma 19:662), layout Drawer, estados Default y Out of Stock.
 * La línea recién añadida se resalta un instante (fondo accent suave que se desvanece).
 */
interface CartItemProps {
  line: CartViewLine;
  /** Datos del café (vienen del catálogo; la variante puede haber desaparecido). */
  name: string;
  origin: string;
  colorway: Colorway;
  highlight: boolean;
  /** Muestra la línea divisoria de arriba (todas menos la primera). */
  divider: boolean;
  locale: Locale;
  t: Translator;
  onRemove: () => void;
}

export function CartItem({ line, name, origin, colorway, highlight, divider, locale, t, onRemove }: CartItemProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const { variant, unavailable } = line;

  useEffect(() => {
    const row = rowRef.current;
    if (!highlight || !row) return;
    // Un frame después: el diálogo se abre en el efecto del padre, que corre después de este.
    const frame = requestAnimationFrame(() => {
      row.scrollIntoView({ block: 'nearest' });
      // Cambio de color, no de posición: se mantiene también con movimiento reducido.
      const root = getComputedStyle(document.documentElement);
      const accent =
        root.getPropertyValue('--color-bg-accent-subtle').trim() ||
        root.getPropertyValue('--palette-terracotta-100').trim();
      row.animate(
        [
          { backgroundColor: accent },
          { backgroundColor: accent, offset: 0.35 },
          { backgroundColor: 'transparent' },
        ],
        { duration: 1800, easing: 'ease-out' },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [highlight]);

  let href: string | undefined;
  let variantText = '';
  if (variant) {
    // Enlace a la ficha con la misma molienda y tamaño seleccionados.
    const qp = queryParams[locale];
    href = `${variant.url}?${qp.grind}=${qp.grindValues[variant.grind]}&${qp.size}=${qp.sizeValues[variant.size]}`;
    variantText = `${t(`pdp/grind-${variant.grind}`)} · ${t(`pdp/size-${variant.size}`)}`;
  }
  const subscription = line.mode === 'subscription' ? variant?.subscription : null;
  // Agotada: no cuenta en el subtotal, pero se muestra su importe atenuado (como en Figma).
  const price = unavailable ? line.unitPrice * line.qty : line.lineTotal;
  const muted = unavailable ? 'text-text-tertiary' : 'text-text-primary';

  return (
    <li data-line-key={line.key}>
      {divider && <div aria-hidden="true" className="mb-5 h-px bg-border-subtle" />}
      <div ref={rowRef} className="-mx-3 -my-2 flex items-start gap-4 rounded-md px-3 py-2">
        <div
          aria-hidden="true"
          className={`h-[110px] w-[88px] shrink-0 overflow-hidden rounded-sm ${unavailable ? 'opacity-50' : ''}`}
        >
          <Packshot colorway={colorway} name={name} origin={origin} size="thumb" loading="lazy" className="size-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          {href ? (
            <a
              href={href}
              className={`rounded-xs type-heading-h4 break-words decoration-1 underline-offset-4 hover:underline ${muted}`}
            >
              {name}
            </a>
          ) : (
            <p className={`type-heading-h4 break-words ${muted}`}>{name}</p>
          )}
          {variantText && <p className="type-body-s text-text-tertiary">{variantText}</p>}
          {subscription && (
            <span className={badgeClasses('neutral')}>
              <Icon name="refresh" size={12} className="text-icon-secondary" />
              {t('cart/subscription-tag', { weeks: subscription.intervalWeeks })}
            </span>
          )}
          {unavailable && <p className="type-body-xs text-text-error">{t('cart/out-of-stock')}</p>}
          <div className="flex items-center gap-4 pt-2">
            <QuantityStepper
              size="sm"
              value={line.qty}
              max={Math.max(1, line.maxQty)}
              disabled={unavailable}
              onChange={(qty) => setLineQty(line.key, qty, line.maxQty)}
              label={t('a11y/quantity-of', { name })}
              decreaseLabel={t('a11y/decrease')}
              increaseLabel={t('a11y/increase')}
            />
            <button
              type="button"
              className="-m-1 rounded-sm p-1 type-label-s text-text-secondary underline underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:text-text-primary"
              aria-label={t('a11y/remove-item', { name })}
              onClick={onRemove}
            >
              {t('cart/remove')}
            </button>
          </div>
        </div>
        {variant && <p className={`shrink-0 type-price-m whitespace-nowrap ${muted}`}>{formatPrice(price, locale)}</p>}
      </div>
    </li>
  );
}

export default CartItem;

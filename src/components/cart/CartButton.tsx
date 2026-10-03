/**
 * Botón de la cesta de la cabecera (Figma Header 22:1552 → "Cart"): Icon Button ghost md con el
 * icono Bag y el contador. Isla `client:paint`; abre la cesta (openCart).
 * El contador va posicionado en absoluto (no mueve nada al hidratar), se oculta con 0 y da un
 * pequeño salto al aumentar. El número accesible va en el aria-label del botón.
 */
import { useStore } from '@nanostores/react';
import { useEffect, useRef, useState } from 'react';
import { easeOut, motionMs, prefersReducedMotion } from '@/lib/motion';
import { iconButtonClasses, iconButtonIconSize } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useTranslations, type Locale } from '@/i18n';
import { $cartCount } from '@/stores/cart';
import { openCart } from '@/stores/ui';

interface CartButtonProps {
  locale: Locale;
  /** Clases del botón (las pone la cabecera para encajar con el resto de iconos). */
  className?: string;
}

export default function CartButton({ locale, className = '' }: CartButtonProps) {
  const t = useTranslations(locale);
  const liveCount = useStore($cartCount);
  // El servidor no conoce la cesta (localStorage): hasta hidratar se pinta como vacía.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const count = hydrated ? liveCount : 0;

  const badgeRef = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const before = previous.current;
    previous.current = count;
    if (before === null || count <= before || prefersReducedMotion()) return;
    badgeRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: motionMs('slow'), easing: easeOut() },
    );
  }, [count, hydrated]);

  return (
    <button
      type="button"
      data-cart-button
      className={iconButtonClasses({ variant: 'ghost', size: 'md', className })}
      aria-label={t('a11y/open-cart', { count })}
      aria-haspopup="dialog"
      onClick={() => openCart()}
    >
      <Icon name="bag" size={iconButtonIconSize.md} />
      <span
        ref={badgeRef}
        aria-hidden="true"
        hidden={count === 0}
        className="absolute top-1 left-7 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-action-accent-hover px-1 type-label-s text-text-on-accent tabular-nums"
      >
        {count > 99 ? '99+' : count}
      </span>
    </button>
  );
}

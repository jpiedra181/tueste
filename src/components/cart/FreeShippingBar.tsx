import { useEffect, useRef } from 'react';
import { easeOut, motionMs, prefersReducedMotion } from '@/lib/motion';
import { Icon } from '@/components/ui/Icon';
import { formatPrice, type Locale, type Translator } from '@/i18n';
import { FREE_SHIPPING_THRESHOLD, type FreeShippingProgress } from '@/lib/pricing';

/**
 * Free Shipping Bar (Figma 17:589, In Progress | Unlocked) con Progress Bar (26:6721).
 * El relleno crece con transición; al conseguir el envío gratis el icono hace un pequeño "pop".
 * La barra es decorativa: el texto ya dice cuánto falta.
 */
interface FreeShippingBarProps {
  progress: FreeShippingProgress;
  locale: Locale;
  t: Translator;
}

export function FreeShippingBar({ progress: { remaining, progress, unlocked }, locale, t }: FreeShippingBarProps) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const wasUnlocked = useRef(unlocked);

  useEffect(() => {
    if (unlocked && !wasUnlocked.current && !prefersReducedMotion()) {
      iconRef.current?.animate(
        [
          { transform: 'scale(0.5)', opacity: 0 },
          { transform: 'scale(1.2)', opacity: 1, offset: 0.6 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: motionMs('slow'), easing: easeOut() },
      );
    }
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  return (
    <div
      className={
        'flex flex-col gap-3 rounded-md p-4 transition-colors duration-[var(--duration-slow)] ease-[var(--ease-out)] ' +
        (unlocked ? 'bg-bg-success-subtle' : 'bg-bg-subtle')
      }
    >
      <div className="flex items-center gap-2">
        <span ref={iconRef} className="flex shrink-0">
          <Icon
            name={unlocked ? 'check-circle' : 'truck'}
            size={20}
            className={unlocked ? 'text-icon-success' : 'text-icon-primary'}
          />
        </span>
        <p className={`min-w-0 flex-1 type-label-m ${unlocked ? 'text-text-success' : 'text-text-primary'}`}>
          {unlocked
            ? t('cart/free-shipping-unlocked')
            : t('cart/free-shipping-pending', { amount: formatPrice(remaining, locale) })}
        </p>
        <p className="shrink-0 type-mono-s whitespace-nowrap text-text-tertiary">
          {formatPrice(FREE_SHIPPING_THRESHOLD, locale, { trimZeros: true })}
        </p>
      </div>
      <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-bg-muted">
        <div
          className={
            'h-full rounded-[3px] transition-[width,background-color] duration-[var(--duration-slow)] ease-[var(--ease-out)] ' +
            (unlocked ? 'bg-icon-success' : 'bg-bg-accent')
          }
          style={{ width: `${Math.round(progress * 1000) / 10}%` }}
        />
      </div>
    </div>
  );
}

export default FreeShippingBar;

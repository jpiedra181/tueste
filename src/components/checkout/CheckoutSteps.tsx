/**
 * Checkout Steps (Figma 17:561) con Step (17:434). Lista ordenada con aria-current="step";
 * el estado completado se anuncia como texto oculto. En móvil las etiquetas se ocultan
 * visualmente (las lee el lector de pantalla) y el título del paso va debajo (h2 del paso).
 * La línea de progreso se rellena con una transición de transform (se anula con reduced motion).
 */
import { Icon } from '@/components/ui/Icon';
import type { Translator } from '@/i18n';
import type { CheckoutStep } from '@/stores/checkout';

export const STEP_KEYS = { 1: 'checkout/step-1', 2: 'checkout/step-2', 3: 'checkout/step-3' } as const;
const STEPS: CheckoutStep[] = [1, 2, 3];

interface CheckoutStepsProps {
  current: CheckoutStep;
  t: Translator;
}

export function CheckoutSteps({ current, t }: CheckoutStepsProps) {
  return (
    <ol aria-label={t('a11y/progress')} className="flex w-full items-center gap-3">
      {STEPS.map((step) => {
        const status = step < current ? 'completed' : step === current ? 'current' : 'upcoming';
        const last = step === STEPS.length;
        return (
          <li
            key={step}
            aria-current={status === 'current' ? 'step' : undefined}
            className={`flex items-center gap-3 ${last ? 'shrink-0' : 'min-w-0 flex-1'}`}
          >
            <span className="flex shrink-0 items-center gap-2">
              <span
                aria-hidden="true"
                className={
                  'flex size-7 items-center justify-center rounded-full type-label-s transition-colors duration-[var(--duration-base)] ' +
                  (status === 'completed'
                    ? 'bg-action-primary text-icon-inverse'
                    : status === 'current'
                      ? 'bg-action-accent-hover text-text-on-accent'
                      : 'border border-border-strong bg-bg-surface text-text-tertiary')
                }
              >
                {status === 'completed' ? <Icon name="check" size={14} /> : step}
              </span>
              <span
                className={
                  'sr-only whitespace-nowrap lg:not-sr-only ' +
                  (status === 'current'
                    ? 'type-label-m-strong text-text-primary'
                    : status === 'completed'
                      ? 'type-label-m text-text-primary'
                      : 'type-label-m text-text-tertiary')
                }
              >
                {t(STEP_KEYS[step])}
                {status === 'completed' && <span className="sr-only">, {t('a11y/step-completed')}</span>}
              </span>
            </span>
            {!last && (
              <span aria-hidden="true" className="relative h-px min-w-4 flex-1 overflow-hidden bg-border-default">
                <span
                  className="absolute inset-0 origin-left bg-border-selected transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)]"
                  style={{ transform: `scaleX(${step < current ? 1 : 0})` }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

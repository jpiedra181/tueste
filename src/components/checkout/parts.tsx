/**
 * Piezas compartidas por los pasos: banner de errores, filas de repaso con "Cambiar",
 * avisos, botones de navegación y ids de campo.
 */
import type { MouseEvent, ReactNode, Ref } from 'react';
import { Icon } from '@/components/ui/Icon';
import { buttonClasses } from '@/components/ui/button';
import type { Translator } from '@/i18n';
import type { IconName } from '@/lib/icons';

/** Id de cada campo del checkout (único en la página). */
export const fieldId = (field: string): string => `checkout-${field}`;

/** Enfoca un elemento por id y lo centra en pantalla. */
export function focusElement(id: string): void {
  const element = document.getElementById(id);
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'center' });
}

export interface ErrorItem {
  field: string;
  label: string;
  message: string;
}

interface ErrorSummaryProps {
  t: Translator;
  items: ErrorItem[];
  bannerRef: Ref<HTMLDivElement>;
}

/** Banner "Revisa N campos" (Notice de Figma) con enlaces que enfocan cada campo. */
export function ErrorSummary({ t, items, bannerRef }: ErrorSummaryProps) {
  if (items.length === 0) return null;
  const go = (event: MouseEvent<HTMLAnchorElement>, field: string) => {
    event.preventDefault();
    focusElement(fieldId(field));
  };
  return (
    <div ref={bannerRef} tabIndex={-1} role="alert" className="flex items-start gap-3 rounded-md bg-bg-error-subtle px-4 py-3">
      <Icon name="alert-circle" size={20} className="text-icon-error" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="type-body-s text-text-error">{t('checkout/errors-banner', { count: items.length })}</p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.field}>
              <a
                href={`#${fieldId(item.field)}`}
                onClick={(event) => go(event, item.field)}
                className="type-body-xs text-text-error underline underline-offset-2 hover:no-underline"
              >
                {item.label}: {item.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export interface ReviewRow {
  label: string;
  value: string;
  onChange: () => void;
}

/** Repaso de datos de pasos anteriores (Review de Figma). */
export function ReviewList({ t, rows }: { t: Translator; rows: ReviewRow[] }) {
  return (
    <ul className="rounded-md border border-border-default px-4 lg:px-5">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex items-start gap-3 border-b border-border-subtle py-3 last:border-b-0 lg:items-center lg:gap-4 lg:py-4"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:flex-row lg:items-center lg:gap-4">
            <span className="type-body-xs text-text-tertiary lg:w-[120px] lg:shrink-0 lg:type-body-s">{row.label}</span>
            <span className="min-w-0 flex-1 type-body-s break-words text-text-primary">{row.value}</span>
          </div>
          <button
            type="button"
            onClick={row.onChange}
            className="-my-1 inline-flex min-h-6 shrink-0 items-center rounded-xs px-1 type-label-s whitespace-nowrap text-text-secondary underline underline-offset-2 hover:text-text-primary"
          >
            {t('common/change')}
            <span className="sr-only">: {row.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Notice({ icon, children, tone = 'warning' }: { icon: IconName; children: ReactNode; tone?: 'warning' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md px-4 py-3 lg:items-center ${tone === 'warning' ? 'bg-bg-warning-subtle' : ''}`}
    >
      <Icon name={icon} size={20} className="text-icon-primary" />
      <p className="min-w-0 flex-1 type-body-s text-text-primary">{children}</p>
    </div>
  );
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="type-heading-h4 text-text-primary">
      {children}
    </h3>
  );
}

interface StepActionsProps {
  continueLabel: string;
  back: { label: string; href?: string; onClick?: () => void };
}

/** Continuar (primario) y volver (ghost). En móvil, apilados con el primario arriba. */
export function StepActions({ continueLabel, back }: StepActionsProps) {
  const backContent = (
    <>
      <Icon name="arrow-left" size={20} />
      {back.label}
    </>
  );
  const backClasses = buttonClasses({ variant: 'ghost', size: 'md' });
  return (
    <div className="flex flex-col items-center gap-2 lg:flex-row-reverse lg:justify-between lg:pt-2">
      <button type="submit" className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full lg:w-auto' })}>
        {continueLabel}
        <Icon name="arrow-right" size={20} />
      </button>
      {back.href ? (
        <a href={back.href} className={backClasses}>
          {backContent}
        </a>
      ) : (
        <button type="button" onClick={back.onClick} className={backClasses}>
          {backContent}
        </button>
      )}
    </div>
  );
}

/**
 * Order Summary (Figma 19:2187) con Cart Item · Summary (19:662).
 * - `collapsible`: checkout. En móvil, barra "Mostrar/Ocultar resumen" + total (aria-expanded,
 *   aria-controls) y panel plegable; desde lg, tarjeta fija en la columna lateral.
 * - Sin `collapsible`: tarjeta siempre visible (confirmación).
 * `loading` pinta marcadores del mismo tamaño mientras la isla no conoce la cesta (CLS 0).
 */
import { useId, useState, type SubmitEvent, type ReactNode } from 'react';
import { Packshot } from '@/components/art/Packshot';
import { Icon } from '@/components/ui/Icon';
import { buttonClasses } from '@/components/ui/button';
import { formatPrice, useTranslations, type Locale, type Translator } from '@/i18n';
import { VAT_RATE_PCT } from '@/lib/pricing';
import { findDiscount, type AppliedDiscount } from '@/lib/checkout-utils';
import type { Colorway } from '@/lib/schemas';
import { messageId } from './fields';

export interface SummaryLine {
  key: string;
  name: string;
  /** "Grano · 250 g" (+ suscripción). */
  variant: string;
  origin: string;
  colorway: Colorway;
  qty: number;
  total: number;
}

export interface SummaryTotals {
  subtotal: number;
  discount: { code: string; amount: number } | null;
  /** null = aún no elegido ("Siguiente paso"). */
  shipping: number | null;
  vat: number;
  total: number;
}

const Placeholder = ({ className }: { className: string }) => (
  <span aria-hidden="true" className={`inline-block rounded-xs bg-bg-muted ${className}`} />
);

function Lines({ lines, t, loading, locale }: { lines: SummaryLine[]; t: Translator; loading: boolean; locale: Locale }) {
  if (loading) {
    return (
      <div aria-hidden="true" className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-20 w-16 shrink-0 rounded-sm bg-illustration-backdrop" />
            <span className="flex flex-1 flex-col gap-1.5">
              <Placeholder className="h-3.5 w-24" />
              <Placeholder className="h-3 w-16" />
            </span>
            <Placeholder className="h-3.5 w-14" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {lines.map((line) => (
        <li key={line.key} className="flex items-center gap-3">
          <span className="relative shrink-0">
            <span className="block h-20 w-16 overflow-hidden rounded-sm">
              <Packshot colorway={line.colorway} name={line.name} origin={line.origin} size="mini" loading="lazy" />
            </span>
            <span
              aria-hidden="true"
              className="absolute -top-2 left-[50px] flex size-[22px] items-center justify-center rounded-full bg-bg-inverse type-label-s text-text-inverse"
            >
              {line.qty}
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate type-label-m-strong text-text-primary">{line.name}</span>
            <span className="type-body-xs text-text-tertiary">
              {line.variant}
              <span className="sr-only">
                {' · '}
                {t('common/qty')} {line.qty}
              </span>
            </span>
          </span>
          <span className="shrink-0 whitespace-nowrap type-price-s text-text-primary">{formatPrice(line.total, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

const Divider = () => <hr className="h-px w-full border-0 bg-border-subtle" />;

function Totals({ totals, t, loading, locale }: { totals: SummaryTotals; t: Translator; loading: boolean; locale: Locale }) {
  const value = (cents: number) => (loading ? <Placeholder className="h-3.5 w-14 align-middle" /> : formatPrice(cents, locale));
  return (
    <div className="flex w-full flex-col gap-5">
      <dl className="flex flex-col gap-2 type-body-s">
        <div className="flex gap-2">
          <dt className="min-w-0 flex-1 text-text-secondary">{t('cart/subtotal')}</dt>
          <dd className="whitespace-nowrap text-text-primary">{value(totals.subtotal)}</dd>
        </div>
        {totals.discount && !loading && (
          <div className="flex gap-2">
            <dt className="min-w-0 flex-1 text-text-secondary">{t('summary/discount', { code: totals.discount.code })}</dt>
            <dd className="whitespace-nowrap text-text-success">−{formatPrice(totals.discount.amount, locale)}</dd>
          </div>
        )}
        <div className="flex gap-2">
          <dt className="min-w-0 flex-1 text-text-secondary">{t('summary/shipping')}</dt>
          <dd className="whitespace-nowrap text-text-primary">
            {totals.shipping === null
              ? t('summary/shipping-next')
              : totals.shipping === 0
                ? t('common/free')
                : value(totals.shipping)}
          </dd>
        </div>
      </dl>
      <Divider />
      <dl className="flex items-end gap-2">
        <dt className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-label-l text-text-primary">{t('summary/total')}</span>
          <span className="type-body-xs text-text-tertiary">
            {t('summary/taxes', { pct: VAT_RATE_PCT })}
            {!loading && ` · ${formatPrice(totals.vat, locale)}`}
          </span>
        </dt>
        <dd className="whitespace-nowrap type-price-l text-text-primary">
          {loading ? <Placeholder className="h-8 w-28 align-middle" /> : formatPrice(totals.total, locale)}
        </dd>
      </dl>
    </div>
  );
}

interface DiscountFormProps {
  locale: Locale;
  idPrefix: string;
  applied: AppliedDiscount | null;
  onApply: (discount: AppliedDiscount | null) => void;
  disabled?: boolean;
}

/** Código de descuento (demo): TUESTE10 = −10 % sobre el subtotal; cualquier otro, error accesible. */
export function DiscountForm({ locale, idPrefix, applied, onApply, disabled = false }: DiscountFormProps) {
  const t = useTranslations(locale);
  const [code, setCode] = useState(applied?.code ?? '');
  const [invalid, setInvalid] = useState(false);
  const inputId = `${idPrefix}-discount`;
  const message = invalid ? t('summary/discount-invalid') : applied ? t('summary/discount-applied', { code: applied.code, pct: applied.pct }) : undefined;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (applied) {
      onApply(null);
      setCode('');
      return;
    }
    const discount = findDiscount(code);
    setInvalid(!discount);
    if (discount) {
      setCode(discount.code);
      onApply(discount);
    }
  };

  const shown = applied ? applied.code : code;
  return (
    <form noValidate onSubmit={submit} className="flex w-full flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t('form/discount')}
        </label>
        <div
          className={
            'flex h-12 min-w-0 flex-1 items-center rounded-sm border bg-bg-surface px-4 ' +
            'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ' +
            (invalid
              ? 'border-border-error shadow-[inset_0_0_0_1px_var(--color-border-error)] focus-within:shadow-[inset_0_0_0_1px_var(--color-border-error),0_0_0_3px_var(--palette-alpha-focus)]'
              : `${applied ? 'border-border-success' : 'border-border-input'} focus-within:border-border-focus focus-within:shadow-[inset_0_0_0_1px_var(--color-border-focus),0_0_0_3px_var(--palette-alpha-focus)]`)
          }
        >
          <input
            id={inputId}
            name="discount"
            value={shown}
            readOnly={!!applied}
            disabled={disabled}
            onChange={(event) => {
              setCode(event.target.value);
              if (invalid) setInvalid(false);
            }}
            placeholder={t('form/discount')}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            aria-describedby={message ? messageId(inputId) : undefined}
            className="h-full min-w-0 flex-1 bg-transparent type-body-m text-text-primary uppercase outline-none placeholder:normal-case placeholder:text-text-tertiary focus-visible:shadow-none focus-visible:outline-none"
          />
        </div>
        <button type="submit" disabled={disabled} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
          {applied ? t('summary/discount-remove') : t('summary/apply')}
        </button>
      </div>
      <p
        id={messageId(inputId)}
        aria-live="polite"
        className={`flex items-start gap-1.5 type-body-xs ${invalid ? 'text-text-error' : 'text-text-success'} ${message ? '' : 'sr-only'}`}
      >
        {message && (
          <>
            <Icon
              name={invalid ? 'alert-circle' : 'check-circle'}
              size={16}
              className={invalid ? 'text-icon-error' : 'text-icon-success'}
            />
            <span className="min-w-0 flex-1">{message}</span>
          </>
        )}
      </p>
    </form>
  );
}

interface OrderSummaryProps {
  locale: Locale;
  lines: SummaryLine[];
  totals: SummaryTotals;
  loading?: boolean;
  collapsible?: boolean;
  /** Formulario de descuento (solo en el checkout). */
  discount?: ReactNode;
  id?: string;
  className?: string;
}

export function OrderSummary({
  locale,
  lines,
  totals,
  loading = false,
  collapsible = false,
  discount,
  id,
  className = '',
}: OrderSummaryProps) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const titleId = `${uid}-title`;
  const panelId = `${uid}-panel`;
  const t = useTranslations(locale);

  const panelClasses = collapsible
    ? `${open ? 'flex' : 'hidden'} flex-col gap-5 px-5 pt-2 pb-6 md:px-10 lg:sticky lg:top-8 lg:flex lg:rounded-md lg:border lg:border-border-subtle lg:bg-bg-surface lg:p-8`
    : 'flex flex-col gap-5 rounded-md border border-border-subtle bg-bg-surface p-8';

  return (
    <section id={id} aria-labelledby={titleId} className={className}>
      {collapsible && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-5 py-4 text-left md:px-10 lg:hidden"
        >
          <Icon name="bag" size={20} className="text-icon-primary" />
          <span className="type-label-m text-text-primary underline underline-offset-2">
            {open ? t('summary/hide') : t('summary/show')}
          </span>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} className="text-icon-primary" />
          <span className="flex-1" />
          <span className="whitespace-nowrap type-price-m text-text-primary">
            {loading ? <Placeholder className="h-4 w-16 align-middle" /> : formatPrice(totals.total, locale)}
          </span>
        </button>
      )}
      <div id={panelId} className={panelClasses}>
        <h2 id={titleId} className={`type-heading-h4 text-text-primary ${collapsible ? 'sr-only lg:not-sr-only' : ''}`}>
          {t('summary/title')}
        </h2>
        <Lines lines={lines} t={t} loading={loading} locale={locale} />
        <Divider />
        {discount && (
          <>
            {discount}
            <Divider />
          </>
        )}
        <Totals totals={totals} t={t} loading={loading} locale={locale} />
      </div>
    </section>
  );
}

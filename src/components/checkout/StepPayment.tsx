/**
 * Paso 3 · Pago (Figma 27:7458 / 31:3834). Los datos de la tarjeta viven solo en el estado del
 * formulario (nunca en el borrador ni en storage).
 */
import type { ChangeEvent, SubmitEvent, Ref } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RadioCard } from '@/components/ui/RadioCard';
import { buttonClasses } from '@/components/ui/button';
import type { Locale, Translator } from '@/i18n';
import type { FieldError, FieldErrors, PaymentField } from '@/lib/checkout-schemas';
import {
  CARD_BRANDS,
  CARD_BRAND_SHORT,
  cvcLength,
  detectCardBrand,
  digitsOnly,
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  reformatWithCaret,
  type CardBrand,
} from '@/lib/checkout-utils';
import type { PaymentMethod } from '@/stores/checkout';
import { Checkbox, TextField } from './fields';
import { PAYMENT_OPTIONS } from './options';
import { ReviewList, SectionTitle, fieldId, type ReviewRow } from './parts';

export interface CardState {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export const PAYMENT_LABELS = {
  cardNumber: 'form/card-number',
  cardExpiry: 'form/card-expiry',
  cardCvc: 'form/card-cvc',
  cardName: 'form/card-name',
  acceptTerms: 'payment/terms',
} as const satisfies Record<PaymentField, string>;

const CARD_KEYS = { cardNumber: 'number', cardExpiry: 'expiry', cardCvc: 'cvc', cardName: 'name' } as const;
export type CardField = keyof typeof CARD_KEYS;
export const cardKey = (field: CardField): keyof CardState => CARD_KEYS[field];

/** Card Brand (Figma 9:338). */
function CardBrandChip({ brand, active = false }: { brand: CardBrand; active?: boolean }) {
  return (
    <span
      className={
        'inline-flex h-6 shrink-0 items-center rounded-xs border bg-bg-surface px-2 font-sans text-[0.5625rem] leading-none font-bold tracking-[0.04em] ' +
        (active ? 'border-border-selected text-text-primary' : 'border-border-default text-text-secondary')
      }
    >
      {CARD_BRAND_SHORT[brand]}
    </span>
  );
}

interface StepPaymentProps {
  locale: Locale;
  t: Translator;
  review: ReviewRow[];
  method: PaymentMethod;
  card: CardState;
  billingSame: boolean;
  acceptTerms: boolean;
  errors: FieldErrors<PaymentField>;
  amount: string;
  placing: boolean;
  payButtonRef: Ref<HTMLButtonElement>;
  onMethod: (method: PaymentMethod) => void;
  onCard: (field: CardField, value: string) => void;
  onBlur: (field: PaymentField) => void;
  onBillingSame: (checked: boolean) => void;
  onAcceptTerms: (checked: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function StepPayment({
  t,
  review,
  method,
  card,
  billingSame,
  acceptTerms,
  errors,
  amount,
  placing,
  payButtonRef,
  onMethod,
  onCard,
  onBlur,
  onBillingSame,
  onAcceptTerms,
  onSubmit,
  onBack,
}: StepPaymentProps) {
  const message = (error: FieldError | undefined) => (error ? t(error.key, error.params) : undefined);
  const brand = detectCardBrand(card.number);

  /** Campos con máscara: reformatea y deja el cursor donde estaba. */
  const masked =
    (field: 'cardNumber' | 'cardExpiry', format: (value: string) => string) =>
    (raw: string, event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const result = reformatWithCaret(card[cardKey(field)], raw, input.selectionStart ?? raw.length, format);
      onCard(field, result.value);
      requestAnimationFrame(() => {
        if (document.activeElement === input) input.setSelectionRange(result.caret, result.caret);
      });
    };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8 lg:gap-10">
      <ReviewList t={t} rows={review} />

      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="float-left w-full">
          <SectionTitle>{t('checkout/payment-title')}</SectionTitle>
        </legend>
        {PAYMENT_OPTIONS.map((option) => (
          <div key={option.method} className="contents">
            <RadioCard
              name="payment-method"
              value={option.method}
              checked={method === option.method}
              onChange={(value) => onMethod(value as PaymentMethod)}
              title={t(option.title)}
              description={t(option.description)}
              icon={<Icon name={option.icon} size={24} />}
            />
            {option.method === 'card' && method === 'card' && (
              <div className="flex flex-col gap-4 rounded-md border border-border-default bg-bg-surface p-4 lg:gap-5 lg:p-5">
                <ul aria-label={t('checkout/accepted-cards')} className="flex flex-wrap gap-2">
                  {CARD_BRANDS.map((item) => (
                    <li key={item}>
                      <CardBrandChip brand={item} active={brand === item} />
                    </li>
                  ))}
                </ul>
                <TextField
                  id={fieldId('cardNumber')}
                  name="cardnumber"
                  label={t(PAYMENT_LABELS.cardNumber)}
                  value={card.number}
                  onValueChange={masked('cardNumber', formatCardNumber)}
                  onBlur={() => onBlur('cardNumber')}
                  error={message(errors.cardNumber)}
                  success={isValidCardNumber(card.number) ? t('validation/card-ok') : undefined}
                  leadingIcon="credit-card"
                  trailing={brand ? <CardBrandChip brand={brand} active /> : undefined}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-required
                />
                <div className="grid grid-cols-2 items-start gap-3 lg:gap-4">
                  <TextField
                    id={fieldId('cardExpiry')}
                    name="cc-exp"
                    label={t(PAYMENT_LABELS.cardExpiry)}
                    value={card.expiry}
                    onValueChange={masked('cardExpiry', formatExpiry)}
                    onBlur={() => onBlur('cardExpiry')}
                    error={message(errors.cardExpiry)}
                    placeholder={t('form/card-expiry-placeholder')}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    maxLength={7}
                    aria-required
                  />
                  <TextField
                    id={fieldId('cardCvc')}
                    name="cvc"
                    label={t(PAYMENT_LABELS.cardCvc)}
                    value={card.cvc}
                    onValueChange={(raw) => onCard('cardCvc', digitsOnly(raw).slice(0, cvcLength(brand)))}
                    onBlur={() => onBlur('cardCvc')}
                    error={message(errors.cardCvc)}
                    leadingIcon="lock"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={cvcLength(brand)}
                    aria-required
                  />
                </div>
                <TextField
                  id={fieldId('cardName')}
                  name="ccname"
                  label={t(PAYMENT_LABELS.cardName)}
                  value={card.name}
                  onValueChange={(value) => onCard('cardName', value)}
                  onBlur={() => onBlur('cardName')}
                  error={message(errors.cardName)}
                  autoComplete="cc-name"
                  spellCheck={false}
                  aria-required
                />
              </div>
            )}
          </div>
        ))}
      </fieldset>

      <div className="flex flex-col gap-3">
        <Checkbox
          id={fieldId('billingSame')}
          name="billing-same"
          checked={billingSame}
          onChange={onBillingSame}
          label={t('payment/billing-same')}
        />
        <Checkbox
          id={fieldId('acceptTerms')}
          name="accept-terms"
          checked={acceptTerms}
          onChange={(checked) => {
            onAcceptTerms(checked);
          }}
          label={t('payment/terms')}
          error={message(errors.acceptTerms)}
          required
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          ref={payButtonRef}
          type="submit"
          aria-busy={placing || undefined}
          className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true })}
        >
          {placing ? (
            <>
              <span
                aria-hidden="true"
                className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
              {t('a11y/loading')}
            </>
          ) : (
            <>
              <Icon name="lock" size={20} />
              {t('checkout/pay', { amount })}
            </>
          )}
        </button>
        <p className="flex items-center gap-2 text-center type-body-xs text-text-tertiary">
          <Icon name="lock" size={14} className="hidden lg:inline-block" />
          {t('checkout/secure-note')}
        </p>
        <button
          type="button"
          onClick={onBack}
          className={buttonClasses({ variant: 'ghost', size: 'md', className: 'lg:mt-7 lg:self-start' })}
        >
          <Icon name="arrow-left" size={20} />
          {t('checkout/back-shipping')}
        </button>
      </div>
    </form>
  );
}

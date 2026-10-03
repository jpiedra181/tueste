/** Paso 2 · Método de envío (Figma 27:7159 / 31:3355). */
import type { SubmitEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RadioCard } from '@/components/ui/RadioCard';
import type { Locale, Translator } from '@/i18n';
import { shippingCost, type ShippingMethod } from '@/lib/pricing';
import { SHIPPING_OPTIONS, priceOrFree, roastDateText } from './options';
import { Notice, ReviewList, SectionTitle, StepActions, type ReviewRow } from './parts';

interface StepShippingProps {
  locale: Locale;
  t: Translator;
  review: ReviewRow[];
  method: ShippingMethod;
  subtotal: number;
  roastDate: string;
  onMethod: (method: ShippingMethod) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function StepShipping({ locale, t, review, method, subtotal, roastDate, onMethod, onSubmit, onBack }: StepShippingProps) {
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8 lg:gap-10">
      <ReviewList t={t} rows={review} />

      <fieldset className="flex min-w-0 flex-col gap-3 lg:gap-4">
        <legend className="float-left w-full">
          <SectionTitle>{t('checkout/shipping-title')}</SectionTitle>
        </legend>
        {SHIPPING_OPTIONS.map((option) => (
          <RadioCard
            key={option.method}
            name="shipping-method"
            value={option.method}
            checked={method === option.method}
            onChange={(value) => onMethod(value as ShippingMethod)}
            title={t(option.title)}
            description={t(option.description)}
            meta={priceOrFree(shippingCost(option.method, subtotal), locale, t)}
            icon={<Icon name={option.icon} size={24} />}
          />
        ))}
      </fieldset>

      <Notice icon="calendar">{t('shipping/note', { date: roastDateText(roastDate, locale) })}</Notice>

      <StepActions continueLabel={t('checkout/continue-payment')} back={{ label: t('checkout/back-details'), onClick: onBack }} />
    </form>
  );
}

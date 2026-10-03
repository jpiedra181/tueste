/** Paso 1 · Datos y envío (Figma 27:6622 / 31:3084): contacto y dirección. */
import type { SubmitEvent } from 'react';
import type { Locale, Translator } from '@/i18n';
import type { DetailsField, DetailsValues, FieldErrors, FieldError } from '@/lib/checkout-schemas';
import { ES_PROVINCE_NAMES } from '@/lib/checkout-utils';
import { Checkbox, SelectField, TextField } from './fields';
import { SectionTitle, StepActions, fieldId } from './parts';

/** Etiqueta de cada campo (también la usa el banner de errores). */
export const DETAILS_LABELS = {
  email: 'form/email',
  firstName: 'form/first-name',
  lastName: 'form/last-name',
  address1: 'form/address',
  address2: 'form/address2',
  postcode: 'form/postcode',
  city: 'form/city',
  province: 'form/province',
  country: 'form/country',
  phone: 'form/phone',
} as const satisfies Record<DetailsField, string>;

interface StepDetailsProps {
  locale: Locale;
  t: Translator;
  values: DetailsValues;
  newsletter: boolean;
  errors: FieldErrors<DetailsField>;
  postcodeOk: boolean;
  onChange: (field: DetailsField, value: string) => void;
  onBlur: (field: DetailsField) => void;
  onNewsletter: (checked: boolean) => void;
  onSubmit: () => void;
  backHref: string;
}

export function StepDetails({
  t,
  values,
  newsletter,
  errors,
  postcodeOk,
  onChange,
  onBlur,
  onNewsletter,
  onSubmit,
  backHref,
}: StepDetailsProps) {
  const message = (error: FieldError | undefined) => (error ? t(error.key, error.params) : undefined);
  const common = (field: Exclude<DetailsField, 'country' | 'province'>) => ({
    id: fieldId(field),
    name: field,
    label: t(DETAILS_LABELS[field]),
    value: values[field],
    onValueChange: (value: string) => onChange(field, value),
    onBlur: () => onBlur(field),
    error: message(errors[field]),
  });
  const required = { 'aria-required': true } as const;

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-8 lg:gap-10">
      <section className="flex flex-col gap-4">
        <SectionTitle>{t('checkout/contact')}</SectionTitle>
        <TextField
          {...common('email')}
          {...required}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t('form/email-placeholder')}
          leadingIcon="mail"
        />
        <Checkbox
          id={fieldId('newsletter')}
          name="newsletter"
          checked={newsletter}
          onChange={onNewsletter}
          label={t('form/newsletter')}
        />
      </section>

      <section className="flex flex-col gap-4 lg:gap-5">
        <SectionTitle>{t('checkout/address')}</SectionTitle>
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-4 lg:grid-cols-6 lg:gap-x-4 lg:gap-y-5">
          <TextField {...common('firstName')} {...required} autoComplete="given-name" className="col-span-2 lg:col-span-3" />
          <TextField {...common('lastName')} {...required} autoComplete="family-name" className="col-span-2 lg:col-span-3" />
          <TextField {...common('address1')} {...required} autoComplete="address-line1" className="col-span-2 lg:col-span-6" />
          <TextField
            {...common('address2')}
            autoComplete="address-line2"
            optionalText={t('common/optional')}
            className="col-span-2 lg:col-span-6"
          />
          <TextField
            {...common('postcode')}
            {...required}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={values.country === 'PT' ? 8 : 5}
            success={postcodeOk ? t('validation/postcode-ok') : undefined}
            className="col-span-1 lg:col-span-2"
          />
          <TextField {...common('city')} {...required} autoComplete="address-level2" className="col-span-1 lg:col-span-2" />
          {values.country === 'ES' ? (
            <SelectField
              id={fieldId('province')}
              name="province"
              label={t(DETAILS_LABELS.province)}
              value={values.province}
              placeholder={t('checkout/select-placeholder')}
              options={ES_PROVINCE_NAMES.map((name) => ({ value: name, label: name }))}
              onValueChange={(value) => onChange('province', value)}
              onBlur={() => onBlur('province')}
              error={message(errors.province)}
              autoComplete="address-level1"
              aria-required
              className="col-span-2 lg:col-span-2"
            />
          ) : (
            <TextField
              id={fieldId('province')}
              name="province"
              label={t(DETAILS_LABELS.province)}
              value={values.province}
              onValueChange={(value) => onChange('province', value)}
              onBlur={() => onBlur('province')}
              error={message(errors.province)}
              autoComplete="address-level1"
              aria-required
              className="col-span-2 lg:col-span-2"
            />
          )}
          <SelectField
            id={fieldId('country')}
            name="country"
            label={t(DETAILS_LABELS.country)}
            value={values.country}
            options={[
              { value: 'ES', label: t('form/country-es') },
              { value: 'PT', label: t('form/country-pt') },
            ]}
            onValueChange={(value) => onChange('country', value)}
            autoComplete="country"
            className="col-span-2 lg:col-span-3"
          />
          <TextField
            {...common('phone')}
            {...required}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('form/phone-placeholder')}
            help={t('form/phone-help')}
            className="col-span-2 lg:col-span-3"
          />
        </div>
      </section>

      <StepActions continueLabel={t('checkout/continue-shipping')} back={{ label: t('checkout/back-cart'), href: backHref }} />
    </form>
  );
}

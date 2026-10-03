/**
 * Isla del checkout: tres pasos con el paso en la URL (?paso=2 | ?step=2), historial del
 * navegador, borrador en sessionStorage, validación con Zod, resumen del pedido y pago simulado.
 *
 * En servidor (y en el primer render del cliente) se pinta el paso 1 vacío con el resumen en modo
 * "cargando": mismo tamaño que el estado inicial, así hidratar no mueve nada (CLS 0).
 */
import { useStore } from '@nanostores/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice, routePath, translate, type Locale, type Translator } from '@/i18n';
import { announce } from '@/lib/announce';
import { easeOut, motionMs, prefersReducedMotion } from '@/lib/motion';
import type { CartCatalog } from '@/lib/catalog-types';
import {
  DETAILS_FIELDS,
  PAYMENT_FIELDS,
  errorFields,
  validateDetails,
  validatePayment,
  type DetailsField,
  type DetailsValues,
  type FieldError,
  type FieldErrors,
  type PaymentField,
  type PaymentValues,
} from '@/lib/checkout-schemas';
import {
  DECLINED_TEST_CARD,
  deliveryWindow,
  detectCardBrand,
  digitsOnly,
  discountAmount,
  formatPostcode,
  generateOrderId,
  isValidPostcode,
  nextRoastDate,
  provinceFromPostcode,
  stepFromSearch,
  stepToSearch,
  toISODate,
  type AppliedDiscount,
} from '@/lib/checkout-utils';
import { orderTotals, shippingCost, type ShippingMethod } from '@/lib/pricing';
import { $cart, clearCart, provideCatalog } from '@/stores/cart';
import {
  $checkout,
  clearCheckoutDraft,
  initCheckoutDraft,
  saveOrder,
  updateDraft,
  type CheckoutDraft,
  type CheckoutStep,
  type Country,
  type Order,
  type OrderLine,
  type PaymentMethod,
} from '@/stores/checkout';
import { CART_HASH, pushToast } from '@/stores/ui';
import { CheckoutSteps, STEP_KEYS } from './CheckoutSteps';
import { DiscountForm, OrderSummary, type SummaryLine, type SummaryTotals } from './OrderSummary';
import { StepDetails, DETAILS_LABELS } from './StepDetails';
import { StepPayment, PAYMENT_LABELS, cardKey, type CardField, type CardState } from './StepPayment';
import { StepShipping } from './StepShipping';
import { clearStoredDiscount, loadStoredDiscount, storeDiscount } from './order';
import { shippingSummary } from './options';
import { ErrorSummary, fieldId, focusElement, type ErrorItem, type ReviewRow } from './parts';

interface CheckoutAppProps {
  locale: Locale;
  catalog: CartCatalog;
}

const PAYMENT_DELAY_MS = 1200;

/** Quita la clave si no hay error (exactOptionalPropertyTypes no admite `undefined`). */
function withError<F extends string>(
  errors: FieldErrors<F>,
  field: F,
  error: FieldError | undefined,
): FieldErrors<F> {
  const next = { ...errors };
  if (error) next[field] = error;
  else delete next[field];
  return next;
}

interface CheckoutView {
  summary: SummaryLine[];
  orderLines: OrderLine[];
  subtotal: number;
}

function detailsFrom(draft = $checkout.get()): DetailsValues {
  return { email: draft.contact.email, ...draft.address };
}

export default function CheckoutApp({ locale, catalog }: CheckoutAppProps) {
  const t = useMemo<Translator>(() => (key, params) => translate(locale, key, params), [locale]);
  const liveDraft = useStore($checkout);
  const cart = useStore($cart);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<CheckoutStep>(1);
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const [detailsErrors, setDetailsErrors] = useState<FieldErrors<DetailsField>>({});
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const [card, setCard] = useState<CardState>({ number: '', expiry: '', cvc: '', name: '' });
  const [paymentErrors, setPaymentErrors] = useState<FieldErrors<PaymentField>>({});
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [bannerFocus, setBannerFocus] = useState(0);
  // Al confirmar se vacían cesta y borrador antes de navegar: se sigue pintando lo último.
  const frozenDraft = useRef<CheckoutDraft | null>(null);
  const draft = completed && frozenDraft.current ? frozenDraft.current : liveDraft;
  const placingRef = useRef(false);
  // El "código postal válido" de un borrador recuperado no se pinta al hidratar (movería el
  // contenido): aparece al tocar el campo o tras navegar entre pasos.
  const [postcodeTouched, setPostcodeTouched] = useState(false);

  const stepRef = useRef<CheckoutStep>(1);
  const navigated = useRef(false);
  const direction = useRef<1 | -1>(1);
  const focusTarget = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);

  /* ---------- Montaje: catálogo, borrador, paso de la URL e historial ---------- */

  useEffect(() => {
    provideCatalog(catalog);
    initCheckoutDraft();
    setDiscount(loadStoredDiscount());

    // No se puede pasar de reachedStep, ni del paso 1 si sus datos ya no son válidos.
    const allowed = (requested: CheckoutStep): CheckoutStep => {
      let max = $checkout.get().reachedStep;
      if (max > 1 && errorFields(validateDetails(detailsFrom()), DETAILS_FIELDS).length > 0) max = 1;
      return Math.min(requested, max) as CheckoutStep;
    };
    const urlFor = (target: CheckoutStep) =>
      `${window.location.pathname}${stepToSearch(locale, target, window.location.search)}`;

    const requested = stepFromSearch(locale, window.location.search);
    const initial = allowed(requested);
    window.history.replaceState({ ...window.history.state, checkoutStep: initial }, '', urlFor(initial));
    stepRef.current = initial;
    setStep(initial);
    setMounted(true);

    // Atrás/adelante del navegador: se mueve entre pasos sin saltarse los no alcanzados.
    const onPopState = () => {
      const wanted = stepFromSearch(locale, window.location.search);
      const next = allowed(wanted);
      if (next !== wanted) window.history.replaceState({ checkoutStep: next }, '', urlFor(next));
      if (next === stepRef.current) return;
      direction.current = next > stepRef.current ? 1 : -1;
      navigated.current = true;
      focusTarget.current = null;
      stepRef.current = next;
      setPostcodeTouched(true);
      setStep(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [catalog, locale]);

  /* ---------- Cambio de paso: título, foco al h2 y transición ---------- */

  useEffect(() => {
    if (!mounted) return;
    document.title = `${t(STEP_KEYS[step])} (${t('checkout/step-of', { current: step, total: 3 })}) · ${t('cart/checkout')} · ${t('common/brand')}`;
    if (!navigated.current) return;
    navigated.current = false;

    const reduced = prefersReducedMotion();
    window.scrollTo({ top: 0 });
    const target = focusTarget.current;
    focusTarget.current = null;
    if (target) focusElement(target);
    else headingRef.current?.focus({ preventScroll: true });

    contentRef.current?.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translateX(${direction.current * 12}px)` },
            { opacity: 1, transform: 'translateX(0)' },
          ],
      // Con movimiento reducido queda un fundido breve, sin desplazamiento.
      { duration: reduced ? 120 : motionMs('base'), easing: easeOut() },
    );
  }, [step, mounted]);

  useEffect(() => {
    if (bannerFocus > 0) bannerRef.current?.focus();
  }, [bannerFocus]);

  /** Navega a un paso (pushState). `focusId`: elemento que recibe el foco en vez del h2. */
  function go(next: CheckoutStep, focusId?: string) {
    if (next > draft.reachedStep) updateDraft('reachedStep', next);
    direction.current = next > stepRef.current ? 1 : -1;
    navigated.current = true;
    focusTarget.current = focusId ?? null;
    stepRef.current = next;
    setPostcodeTouched(true);
    window.history.pushState(
      { checkoutStep: next },
      '',
      `${window.location.pathname}${stepToSearch(locale, next, window.location.search)}`,
    );
    setStep(next);
  }

  /* ---------- Cesta → líneas del resumen y del pedido ---------- */

  const frozen = useRef<CheckoutView | null>(null);
  const liveView = useMemo((): CheckoutView => {
    const lines = cart.lines.filter((line) => !line.unavailable && line.variant);
    const products = new Map(catalog.products.map((product) => [product.id, product]));
    const summary: SummaryLine[] = lines.map((line) => {
      const variant = line.variant!;
      const subscription =
        line.mode === 'subscription' && variant.subscription
          ? ` · ${t('cart/subscription-tag', { weeks: variant.subscription.intervalWeeks })}`
          : '';
      return {
        key: line.key,
        name: variant.name,
        variant: `${t(`pdp/grind-${variant.grind}`)} · ${t(`pdp/size-${variant.size}`)}${subscription}`,
        origin: products.get(line.productId)?.origin ?? '',
        colorway: variant.colorway,
        qty: line.qty,
        total: line.lineTotal,
      };
    });
    const orderLines: OrderLine[] = lines.map((line) => ({
      sku: line.sku,
      productId: line.productId,
      name: line.variant!.name,
      grind: line.variant!.grind,
      size: line.variant!.size,
      mode: line.mode,
      qty: line.qty,
      unitPrice: line.unitPrice,
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    return { summary, orderLines, subtotal };
  }, [cart, catalog, t]);
  const view = completed && frozen.current ? frozen.current : liveView;

  const loading = !mounted;
  const empty = mounted && !completed && view.orderLines.length === 0;

  // El aviso de cesta vacía es HTML estático de CheckoutPage.astro y se muestra con html[data-cart-empty]:
  // un script en <head> lo decide antes del primer pintado; aquí se corrige si la cesta cambia después
  // (otra pestaña, líneas que ya no existen en el catálogo…).
  useEffect(() => {
    if (mounted) document.documentElement.toggleAttribute('data-cart-empty', empty);
  }, [mounted, empty]);

  const method = draft.shipping.method;
  const shipping = shippingCost(method, view.subtotal);
  const discountCents = discount ? discountAmount(view.subtotal, discount.pct) : 0;
  const shippingKnown = step >= 2;
  const totals = orderTotals(view.subtotal - discountCents, shippingKnown ? shipping : 0);
  const summaryTotals: SummaryTotals = {
    subtotal: view.subtotal,
    discount: discount ? { code: discount.code, amount: discountCents } : null,
    shipping: shippingKnown ? shipping : null,
    vat: totals.vat,
    total: totals.total,
  };
  const roastDate = useMemo(() => toISODate(nextRoastDate()), []);

  const applyDiscount = (value: AppliedDiscount | null) => {
    setDiscount(value);
    // El mensaje del formulario (aria-live) anuncia el resultado.
    if (value) storeDiscount(value);
    else clearStoredDiscount();
  };

  /* ---------- Paso 1 ---------- */

  const details = detailsFrom(draft);
  const postcodeOk =
    postcodeTouched && isValidPostcode(details.postcode, details.country) && !detailsErrors.postcode;

  function changeDetail(field: DetailsField, raw: string) {
    if (field === 'postcode' || field === 'country') setPostcodeTouched(true);
    if (field === 'email') updateDraft('contact', { email: raw });
    else if (field === 'country') {
      const country = raw as Country;
      updateDraft('address', {
        country,
        postcode: formatPostcode($checkout.get().address.postcode, country),
        province: '',
      });
    } else if (field === 'postcode') {
      const country = $checkout.get().address.country;
      const postcode = formatPostcode(raw, country);
      const province = country === 'ES' ? provinceFromPostcode(postcode) : undefined;
      updateDraft('address', province ? { postcode, province } : { postcode });
    } else updateDraft('address', { [field]: raw } as Partial<CheckoutDraft['address']>);

    // Desde que un campo muestra error, se revalida en cada cambio (y los que dependen de él).
    const errors = validateDetails(detailsFrom());
    setDetailsErrors((shown) => {
      let next = shown;
      const related: DetailsField[] =
        field === 'country'
          ? ['country', 'postcode', 'province']
          : field === 'postcode'
            ? ['postcode', 'province']
            : [field];
      for (const name of related) if (shown[name]) next = withError(next, name, errors[name]);
      return next;
    });
  }

  function blurDetail(field: DetailsField) {
    if (field === 'postcode') setPostcodeTouched(true);
    const error = validateDetails(detailsFrom())[field];
    setDetailsErrors((shown) => withError(shown, field, error));
  }

  function submitDetails() {
    const errors = validateDetails(detailsFrom());
    setDetailsErrors(errors);
    if (errorFields(errors, DETAILS_FIELDS).length > 0) {
      setDetailsSubmitted(true);
      setBannerFocus((n) => n + 1);
      return;
    }
    setDetailsSubmitted(false);
    go(2);
  }

  /* ---------- Paso 3 ---------- */

  const paymentValues = (cardState: CardState = card, d = $checkout.get()): PaymentValues => ({
    method: d.payment.method,
    cardNumber: cardState.number,
    cardExpiry: cardState.expiry,
    cardCvc: cardState.cvc,
    cardName: cardState.name,
    acceptTerms: d.payment.acceptTerms,
  });

  function revalidatePayment(fields: PaymentField[], cardState: CardState = card) {
    const errors = validatePayment(paymentValues(cardState));
    setPaymentErrors((shown) => {
      let next = shown;
      for (const name of fields) if (shown[name]) next = withError(next, name, errors[name]);
      return next;
    });
  }

  function changeCard(field: CardField, value: string) {
    const next = { ...card, [cardKey(field)]: value };
    setCard(next);
    revalidatePayment(field === 'cardNumber' ? ['cardNumber', 'cardCvc'] : [field], next);
  }

  function blurPayment(field: PaymentField) {
    const error = validatePayment(paymentValues())[field];
    setPaymentErrors((shown) => withError(shown, field, error));
  }

  // El titular se propone a partir del nombre de envío al llegar al pago.
  useEffect(() => {
    if (step === 3 && !card.name) {
      const name = `${draft.address.firstName} ${draft.address.lastName}`.trim();
      if (name) setCard((current) => ({ ...current, name }));
    }
  }, [step]);

  const payRef = useRef<() => void>(() => {});
  async function pay() {
    if (placingRef.current) return;
    const values = paymentValues();
    const errors = validatePayment(values);
    setPaymentErrors(errors);
    if (errorFields(errors, PAYMENT_FIELDS).length > 0) {
      setPaymentSubmitted(true);
      setBannerFocus((n) => n + 1);
      return;
    }
    setPaymentSubmitted(false);
    placingRef.current = true;
    setPlacing(true);
    announce(t('a11y/loading'));
    await new Promise((resolve) => setTimeout(resolve, PAYMENT_DELAY_MS));

    const d = $checkout.get();
    const digits = digitsOnly(card.number);
    if (d.payment.method === 'card' && digits === DECLINED_TEST_CARD) {
      placingRef.current = false;
      setPlacing(false);
      pushToast({
        type: 'error',
        message: t('toast/error'),
        action: { label: t('toast/retry'), onAction: () => payRef.current() },
      });
      requestAnimationFrame(() => payButtonRef.current?.focus());
      return;
    }

    const roast = nextRoastDate();
    const delivery = deliveryWindow(roast, d.shipping.method);
    const brand = detectCardBrand(digits);
    const order: Order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      locale,
      firstName: d.address.firstName.trim(),
      email: d.contact.email.trim(),
      lines: view.orderLines,
      shipping: { method: d.shipping.method, address: d.address },
      payment:
        d.payment.method === 'card' && brand
          ? { method: 'card', brand, last4: digits.slice(-4) }
          : { method: d.payment.method },
      totals: { ...orderTotals(view.subtotal - discountCents, shipping), subtotal: view.subtotal },
      roastDate: toISODate(roast),
      delivery: { from: toISODate(delivery.from), to: toISODate(delivery.to) },
      ...(discount && { discount: { code: discount.code, pct: discount.pct, amount: discountCents } }),
    };
    frozen.current = liveView;
    frozenDraft.current = d;
    setCompleted(true);
    saveOrder(order);
    clearCart();
    clearCheckoutDraft();
    clearStoredDiscount();
    window.location.assign(routePath(locale, { name: 'confirmation' }));
  }
  payRef.current = () => void pay();

  /* ---------- Repaso ---------- */

  const shipTo = [
    [draft.address.address1, draft.address.address2].filter(Boolean).join(', '),
    `${draft.address.postcode} ${draft.address.city}`.trim(),
  ]
    .filter(Boolean)
    .join(' · ');
  const reviewBase: ReviewRow[] = [
    {
      label: t('checkout/review-contact'),
      value: draft.contact.email,
      onChange: () => go(1, fieldId('email')),
    },
    { label: t('checkout/review-ship-to'), value: shipTo, onChange: () => go(1, fieldId('address1')) },
  ];
  const reviewPayment: ReviewRow[] = [
    ...reviewBase,
    {
      label: t('checkout/review-method'),
      value: shippingSummary(method, shipping, locale, t),
      onChange: () => go(2, `shipping-method-${method}`),
    },
  ];

  /* ---------- Banner de errores ---------- */

  const message = (error: FieldError) => t(error.key, error.params);
  let errorItems: ErrorItem[] = [];
  if (step === 1 && detailsSubmitted) {
    errorItems = errorFields(detailsErrors, DETAILS_FIELDS).map((field) => ({
      field,
      label: t(DETAILS_LABELS[field]),
      message: message(detailsErrors[field]!),
    }));
  } else if (step === 3 && paymentSubmitted) {
    errorItems = errorFields(paymentErrors, PAYMENT_FIELDS).map((field) => ({
      field,
      label: t(PAYMENT_LABELS[field]),
      message: message(paymentErrors[field]!),
    }));
  }

  /* ---------- Render ---------- */

  const listingHref = routePath(locale, { name: 'listing' });
  const amount = formatPrice(summaryTotals.total, locale);

  return (
    <div className="mx-auto w-full max-w-[90rem] lg:grid lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <OrderSummary
        locale={locale}
        lines={view.summary}
        totals={summaryTotals}
        loading={loading}
        collapsible
        discount={
          <DiscountForm
            key={mounted ? 'ready' : 'ssr'}
            locale={locale}
            idPrefix="checkout"
            applied={discount}
            onApply={applyDiscount}
            disabled={placing}
          />
        }
        className={
          'border-b border-border-default bg-bg-subtle lg:col-start-2 lg:row-start-1 lg:border-b-0 ' +
          'lg:px-8 lg:pt-12 lg:pb-20 xl:pr-20 xl:pl-16 ' +
          // El fondo de la columna llega hasta el borde derecho de la ventana.
          'lg:shadow-[0_0_0_100vmax_var(--color-bg-subtle)] lg:[clip-path:inset(0_-100vmax_0_0)]'
        }
      />

      <div className="min-w-0 px-5 pt-6 pb-12 md:px-10 lg:col-start-1 lg:row-start-1 lg:pt-12 lg:pb-20 xl:pr-16 xl:pl-20">
        <div className="flex flex-col gap-8 lg:gap-10">
          <div className="flex flex-col gap-2">
            <CheckoutSteps current={step} t={t} />
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="flex flex-wrap items-baseline gap-1 rounded-xs lg:sr-only"
            >
              <span className="type-overline-s text-text-tertiary">
                {t('checkout/step-of', { current: step, total: 3 })}
              </span>
              <span aria-hidden="true" className="type-overline-s text-text-tertiary">
                ·
              </span>
              <span className="type-label-m-strong text-text-primary">{t(STEP_KEYS[step])}</span>
            </h2>
          </div>

          <ErrorSummary t={t} items={errorItems} bannerRef={bannerRef} />

          <div ref={contentRef}>
            {step === 1 && (
              <StepDetails
                locale={locale}
                t={t}
                values={details}
                newsletter={draft.contact.newsletter}
                errors={detailsErrors}
                postcodeOk={postcodeOk}
                onChange={changeDetail}
                onBlur={blurDetail}
                onNewsletter={(newsletter) => updateDraft('contact', { newsletter })}
                onSubmit={submitDetails}
                backHref={`${listingHref}#${CART_HASH}`}
              />
            )}
            {step === 2 && (
              <StepShipping
                locale={locale}
                t={t}
                review={reviewBase}
                method={method}
                subtotal={view.subtotal}
                roastDate={roastDate}
                onMethod={(value: ShippingMethod) => updateDraft('shipping', { method: value })}
                onSubmit={() => go(3)}
                onBack={() => go(1)}
              />
            )}
            {step === 3 && (
              <StepPayment
                locale={locale}
                t={t}
                review={reviewPayment}
                method={draft.payment.method}
                card={card}
                billingSame={draft.payment.billingSameAsShipping}
                acceptTerms={draft.payment.acceptTerms}
                errors={paymentErrors}
                amount={amount}
                placing={placing}
                payButtonRef={payButtonRef}
                onMethod={(value: PaymentMethod) => {
                  updateDraft('payment', { method: value });
                  revalidatePayment([...PAYMENT_FIELDS]);
                }}
                onCard={changeCard}
                onBlur={blurPayment}
                onBillingSame={(checked) => updateDraft('payment', { billingSameAsShipping: checked })}
                onAcceptTerms={(checked) => {
                  updateDraft('payment', { acceptTerms: checked });
                  revalidatePayment(['acceptTerms']);
                }}
                onSubmit={() => void pay()}
                onBack={() => go(2)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

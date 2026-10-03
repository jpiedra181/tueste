/**
 * Confirmación del pedido (Figma 27:7845 / 31:4114). Lee el último pedido de sessionStorage.
 * En servidor y en el primer render pinta marcadores del mismo tamaño (CLS 0); sin pedido,
 * muestra el aviso `confirm/missing` con un enlace al listado.
 */
import { useEffect, useMemo, useState } from 'react';
import { ProductImage } from '@/components/art/ProductImage';
import { Icon } from '@/components/ui/Icon';
import { badgeClasses } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { formatDate, routePath, translate, type Locale, type Translator, type UIKey } from '@/i18n';
import type { ArtData } from '@/lib/art';
import { CARD_BRAND_LABEL, formatDeliveryRange, formatWeekdayShort, toISODate, type CardBrand } from '@/lib/checkout-utils';
import { grinds, sizes } from '@/lib/options';
import { loadOrder, type Order } from '@/stores/checkout';
import { OrderSummary, type SummaryLine, type SummaryTotals } from './OrderSummary';
import { discountOf } from './order';
import { Timeline, type TimelineEntry, type TimelineStatus } from './Timeline';

interface ConfirmationAppProps {
  locale: Locale;
  /** Datos de ilustración por id de producto (textos ya traducidos). */
  art: Record<string, ArtData>;
  /** Descuento de la suscripción para el bloque final. */
  subscriptionPct: number;
}

const Placeholder = ({ className }: { className: string }) => (
  <span aria-hidden="true" className={`block rounded-xs bg-bg-muted ${className}`} />
);

function paymentLabel(order: Order, t: Translator): string {
  const { method, brand, last4 } = order.payment;
  if (method === 'card') {
    return brand && brand in CARD_BRAND_LABEL ? `${CARD_BRAND_LABEL[brand as CardBrand]} ···· ${last4 ?? ''}` : t('payment/card');
  }
  return t(method === 'bizum' ? 'payment/bizum' : 'payment/paypal');
}

function variantText(grind: string, size: string, t: Translator): string {
  const parts: string[] = [];
  if ((grinds as readonly string[]).includes(grind)) parts.push(t(`pdp/grind-${grind}` as UIKey));
  if ((sizes as readonly string[]).includes(size)) parts.push(t(`pdp/size-${size}` as UIKey));
  return parts.join(' · ');
}

export default function ConfirmationApp({ locale, art, subscriptionPct }: ConfirmationAppProps) {
  const t = useMemo<Translator>(() => (key, params) => translate(locale, key, params), [locale]);
  // undefined = aún no leído (servidor y primer render); null = no hay pedido.
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    setOrder(loadOrder() ?? null);
  }, []);

  const listingHref = routePath(locale, { name: 'listing' });

  if (order === null) {
    return (
      // min-h-dvh: el pie no sube a la vista al sustituir el hueco reservado por este aviso (CLS 0).
      <div className="container-page flex min-h-dvh flex-col items-start gap-6 py-16 lg:py-24">
        <h1 className="max-w-2xl type-heading-h2 text-text-primary">{t('confirm/missing')}</h1>
        <a href={listingHref} className={buttonClasses({ variant: 'primary', size: 'lg' })}>
          {t('confirm/cta-primary')}
          <Icon name="arrow-right" size={20} />
        </a>
      </div>
    );
  }

  const firstArt = order ? art[order.lines[0]?.productId ?? ''] : undefined;
  const today = toISODate(new Date());
  const time = order ? formatDate(order.createdAt, locale, 'time') : '';
  const createdToday = order ? toISODate(new Date(order.createdAt)) === today : false;
  const deliveryText = order ? formatDeliveryRange(order.delivery.from, order.delivery.to, locale) : '';

  const details = order
    ? [
        { label: t('confirm/order-label'), value: order.id, mono: true },
        { label: t('confirm/date-label'), value: formatDate(order.createdAt, locale, 'day-month-year'), mono: false },
        { label: t('confirm/payment-label'), value: paymentLabel(order, t), mono: false },
        { label: t('confirm/delivery-label'), value: deliveryText, mono: false },
      ]
    : [];

  return (
    <>
      {/* Hero: en móvil la ilustración va entre el texto y los datos; en desktop, a la derecha. */}
      <section
        className={
          'container-page grid gap-6 pt-10 pb-8 lg:py-20 ' +
          "[grid-template-areas:'badge'_'title'_'lede'_'art'_'details'_'actions'] " +
          'lg:grid-cols-[minmax(0,1fr)_480px] lg:grid-rows-[1fr_auto_auto_auto_auto_auto_1fr] lg:gap-x-16 lg:gap-y-8 ' +
          "lg:[grid-template-areas:'._art'_'badge_art'_'title_art'_'lede_art'_'details_art'_'actions_art'_'._art']"
        }
      >
        <div className="[grid-area:badge]">
          {order ? (
            <span className={badgeClasses('success')}>
              <Icon name="check-circle" size={12} />
              {t('confirm/eyebrow')}
            </span>
          ) : (
            <Placeholder className="h-[22px] w-36 rounded-full" />
          )}
        </div>

        {order ? (
          <h1 className="[grid-area:title] type-heading-h1 text-text-primary lg:type-display-l">
            {t('confirm/title', { name: order.firstName })}
          </h1>
        ) : (
          <Placeholder className="[grid-area:title] h-[50px] w-3/4 lg:h-[74px]" />
        )}

        {order ? (
          <p className="[grid-area:lede] max-w-[600px] type-body-m text-text-secondary lg:type-body-l">
            {t('confirm/lede', { email: order.email })}
          </p>
        ) : (
          <div className="[grid-area:lede] flex max-w-[600px] flex-col gap-2">
            <Placeholder className="h-4 w-full lg:h-5" />
            <Placeholder className="h-4 w-2/3 lg:h-5" />
          </div>
        )}

        <div aria-hidden="true" className="[grid-area:art] w-full self-center overflow-hidden rounded-md lg:w-[480px]">
          {firstArt ? (
            <ProductImage art={firstArt} view="still-life" loading="eager" />
          ) : (
            <div className="aspect-[4/5] w-full bg-illustration-backdrop" />
          )}
        </div>

        {order ? (
          <dl className="[grid-area:details] grid grid-cols-2 overflow-hidden rounded-md border border-border-default lg:grid-cols-4">
            {details.map((item, index) => (
              <div
                key={item.label}
                className={
                  'flex min-w-0 flex-col gap-1 border-border-default p-4 lg:px-5 lg:py-4 ' +
                  (index % 2 === 0 ? 'border-r ' : 'lg:border-r ') +
                  (index < 2 ? 'border-b lg:border-b-0 ' : '') +
                  (index === 3 ? 'lg:border-r-0' : '')
                }
              >
                <dt className="type-overline-s text-text-tertiary">{item.label}</dt>
                <dd className={item.mono ? 'type-mono-s text-text-primary' : 'type-label-m-strong text-text-primary'}>
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <Placeholder className="[grid-area:details] h-[138px] w-full rounded-md lg:h-[70px]" />
        )}

        <div className="[grid-area:actions] flex flex-col gap-2 lg:flex-row lg:gap-3">
          {order ? (
            <>
              <a href={listingHref} className={buttonClasses({ variant: 'primary', size: 'lg', className: 'w-full lg:w-auto' })}>
                {t('confirm/cta-primary')}
                <Icon name="arrow-right" size={20} />
              </a>
              <a href="#order-summary" className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'w-full lg:w-auto' })}>
                {t('confirm/cta-secondary')}
              </a>
            </>
          ) : (
            <Placeholder className="h-[120px] w-full rounded-md lg:h-14 lg:w-96" />
          )}
        </div>
      </section>

      {order ? (
        <OrderProgress
          order={order}
          locale={locale}
          t={t}
          today={today}
          time={time}
          createdToday={createdToday}
          deliveryText={deliveryText}
          subscriptionPct={subscriptionPct}
          art={art}
        />
      ) : (
        <div aria-hidden="true" className="min-h-[1180px] lg:min-h-[700px]" />
      )}
    </>
  );
}

interface OrderProgressProps {
  order: Order;
  locale: Locale;
  t: Translator;
  today: string;
  time: string;
  createdToday: boolean;
  deliveryText: string;
  subscriptionPct: number;
  art: Record<string, ArtData>;
}

function OrderProgress({ order, locale, t, today, time, createdToday, deliveryText, subscriptionPct, art }: OrderProgressProps) {
  // Etapa según las fechas reales: 1 = esperando el tueste, 2 = en camino, 3 = entregado.
  const stage = today < order.roastDate ? 1 : today < order.delivery.from ? 2 : 3;
  const status = (index: number): TimelineStatus => (index < stage ? 'completed' : index === stage ? 'current' : 'upcoming');
  const entries: TimelineEntry[] = [
    {
      title: t('confirm/t1'),
      description: createdToday ? t('confirm/t1-desc', { time }) : `${formatDate(order.createdAt, locale, 'day-month')}, ${time}`,
      status: status(0),
    },
    { title: t('confirm/t2'), description: t('confirm/t2-desc', { date: formatWeekdayShort(order.roastDate, locale) }), status: status(1) },
    { title: t('confirm/t3'), description: t('confirm/t3-desc'), status: status(2) },
    { title: t('confirm/t4'), description: deliveryText, status: status(3) },
  ];

  const lines: SummaryLine[] = order.lines.map((line) => ({
    key: `${line.sku}::${line.mode}`,
    name: line.name,
    variant: variantText(line.grind, line.size, t),
    origin: art[line.productId]?.origin ?? '',
    colorway: art[line.productId]?.colorway ?? 'terracotta',
    qty: line.qty,
    total: line.unitPrice * line.qty,
  }));
  const discount = discountOf(order);
  const totals: SummaryTotals = {
    subtotal: order.totals.subtotal,
    discount: discount ? { code: discount.code, amount: discount.amount } : null,
    shipping: order.totals.shipping,
    vat: order.totals.vat,
    total: order.totals.total,
  };

  return (
    <div className="container-page flex flex-col gap-6 pb-16 lg:flex-row lg:items-start lg:gap-16 lg:pb-30">
      <section className="flex min-w-0 flex-1 flex-col gap-6 rounded-md border border-border-subtle bg-bg-surface p-6 lg:gap-8 lg:p-8">
        <h2 className="type-heading-h3 text-text-primary">{t('confirm/timeline-title')}</h2>
        <Timeline entries={entries} t={t} />
      </section>

      <div className="flex w-full shrink-0 flex-col gap-6 lg:w-[440px]">
        <OrderSummary id="order-summary" locale={locale} lines={lines} totals={totals} className="scroll-mt-24" />
        <section className="flex flex-col items-start gap-3 rounded-md bg-bg-accent-subtle p-6 lg:p-8">
          <Icon name="refresh" size={24} className="text-icon-accent" />
          <h2 className="type-heading-h3 text-text-primary">{t('confirm/sub-title')}</h2>
          <p className="type-body-s text-text-secondary">{t('confirm/sub-body', { pct: subscriptionPct })}</p>
          <a
            href={routePath(locale, { name: 'soon' })}
            className={buttonClasses({ variant: 'primary', size: 'md', className: 'w-full lg:w-auto' })}
          >
            {t('confirm/sub-cta')}
          </a>
        </section>
      </div>
    </div>
  );
}

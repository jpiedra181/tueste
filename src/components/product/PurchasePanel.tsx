import { useEffect, useRef, useState } from 'react';
import { formatDate, formatPrice, isLocale, otherLocale, useTranslations, type Locale } from '@/i18n';
import { announce } from '@/lib/announce';
import {
  applyDiscount,
  LOW_STOCK_THRESHOLD,
  maxQtyFor,
  pricePerKg,
  unitPriceFor,
  type PurchaseMode,
  type SubscriptionTerms,
} from '@/lib/pricing';
import type { Grind, Size } from '@/lib/schemas';
import {
  findVariant,
  isAvailable,
  isGrindAvailable,
  resolveSelection,
  selectGrind,
  selectionFromSearch,
  selectionToSearch,
  translateSearch,
  type Selection,
} from '@/lib/variants';
import { addAndOpenCart } from '@/stores/cart-actions';
import { buttonClasses } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { RadioCard } from '@/components/ui/RadioCard';
import { VariantGroup, VariantSelector } from './VariantSelector';
import { grindLabelKey, sizeLabelKey } from './pdp/labels';
import { fadeUp } from '@/lib/motion';

/**
 * Purchase Panel (Figma 24:7145). Isla `client:paint`: el HTML del servidor ya pinta la variante por
 * defecto, así que hidratar tras el primer pintado no se nota y deja la red libre para la imagen LCP.
 * Molienda y tamaño son grupos de radios nativos; la disponibilidad del tamaño depende de la
 * molienda (src/lib/variants.ts). La selección vive en la URL (?molienda=…&tamano=… | ?grind=…&size=…)
 * con history.replaceState. El HTML del servidor pinta la variante por defecto y mide lo mismo que
 * cualquier otra: precio en una línea de 40 px, filas de info con altura reservada.
 */

export interface PanelVariant {
  sku: string;
  grind: Grind;
  size: Size;
  grams: number;
  price: number;
  compareAtPrice?: number | undefined;
  stock: number;
}

/** Datos mínimos del café para la isla (sin textos de otros idiomas ni reseñas). */
export interface PanelProduct {
  id: string;
  name: string;
  options: { grind: Grind[]; size: Size[] };
  variants: PanelVariant[];
  defaultSku: string;
  subscription: SubscriptionTerms | null;
  roastedOn: string;
}

interface PurchasePanelProps {
  locale: Locale;
  product: PanelProduct;
}

const ADDED_FEEDBACK_MS = 1200;

/** Reescribe los enlaces de cambio de idioma de la cabecera con la variante traducida. */
function syncLanguageLinks(locale: Locale): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[data-lang-switch]');
  for (const link of links) {
    const wanted = link.dataset['langSwitch'];
    const target = isLocale(wanted) ? wanted : otherLocale(locale);
    if (target === locale) continue;
    const url = new URL(link.href, window.location.href);
    url.search = translateSearch(locale, target, window.location.search);
    link.href = `${url.pathname}${url.search}${url.hash}`;
  }
}

function writeSelectionToUrl(locale: Locale, selection: Selection): void {
  const { pathname, search, hash } = window.location;
  const next = selectionToSearch(locale, selection, search);
  window.history.replaceState(window.history.state, '', `${pathname}${next}${hash}`);
  syncLanguageLinks(locale);
}

export function PurchasePanel({ locale, product }: PurchasePanelProps) {
  const t = useTranslations(locale);
  const fmt = (cents: number) => formatPrice(cents, locale);
  const grindLabel = (grind: Grind) => t(grindLabelKey[grind]);
  const sizeLabel = (size: Size) => t(sizeLabelKey[size]);
  const { subscription } = product;

  // Igual en servidor y en la primera pasada del cliente: la URL se lee después de hidratar.
  const [initial] = useState(() => resolveSelection(product, {}).selection);
  const [selection, setSelection] = useState<Selection>(initial);
  const [mode, setMode] = useState<PurchaseMode>('one-time');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const priceRef = useRef<HTMLSpanElement>(null);
  const unitRef = useRef<HTMLSpanElement>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Variante + modo de la última pintura: el precio se anima solo cuando el usuario cambia algo. */
  const priceKey = useRef<string | null>(null);

  const variant = findVariant(product, selection);
  const available = isAvailable(variant);
  const stock = variant?.stock ?? 0;
  const maxQty = Math.max(1, maxQtyFor(stock));
  const priceFor = (v: PanelVariant | undefined, m: PurchaseMode = mode) =>
    v ? unitPriceFor(v.price, m, subscription) : 0;

  const unitPrice = priceFor(variant);
  const compareAt =
    variant && (mode === 'subscription' && subscription ? (variant.compareAtPrice ?? variant.price) : variant.compareAtPrice);
  const showCompareAt = compareAt !== undefined && compareAt > unitPrice;
  const perKg = variant ? pricePerKg(unitPrice, variant.grams) : 0;
  const lowStock = available && stock <= LOW_STOCK_THRESHOLD;

  /* ---------- Microinteracción del precio (declarado antes que la lectura de la URL) ---------- */
  const currentKey = `${variant?.sku ?? ''}|${mode}`;
  useEffect(() => {
    if (priceKey.current !== null && priceKey.current !== currentKey) {
      fadeUp(priceRef.current);
      fadeUp(unitRef.current, 4);
    }
    priceKey.current = currentKey;
  }, [currentKey]);

  /* ---------- URL → selección (al hidratar) ---------- */
  useEffect(() => {
    const requested = selectionFromSearch(locale, window.location.search);
    if (requested.grind || requested.size) {
      const { selection: resolved, adjusted } = resolveSelection(product, requested);
      setSelection(resolved);
      setQty(1);
      // La corrección inicial desde la URL no se anima.
      priceKey.current = `${findVariant(product, resolved)?.sku ?? ''}|one-time`;
      if (adjusted) {
        writeSelectionToUrl(locale, resolved);
        const grind = requested.grind ?? initial.grind;
        const size = requested.size ?? initial.size;
        const fallback =
          resolved.grind === grind ? sizeLabel(resolved.size) : `${grindLabel(resolved.grind)} · ${sizeLabel(resolved.size)}`;
        announce(t('a11y/variant-switched', { size: sizeLabel(size), grind: grindLabel(grind), fallback }));
      }
    }
    syncLanguageLinks(locale);
    return () => clearTimeout(addedTimer.current);
    // Solo al montar: la URL inicial manda una vez; después manda el estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function variantMessage(next: Selection, nextMode: PurchaseMode = mode): string {
    const v = findVariant(product, next);
    const params = { grind: grindLabel(next.grind), size: sizeLabel(next.size) };
    return isAvailable(v)
      ? t('a11y/variant-announce', { ...params, price: fmt(priceFor(v, nextMode)) })
      : t('a11y/variant-announce-sold-out', params);
  }

  function commit(next: Selection, message: string) {
    setSelection(next);
    const nextMax = Math.max(1, maxQtyFor(findVariant(product, next)?.stock ?? 0));
    setQty((current) => Math.min(current, nextMax));
    writeSelectionToUrl(locale, next);
    announce(message);
  }

  function onGrind(value: string) {
    const grind = value as Grind;
    if (grind === selection.grind) return;
    const { selection: next, adjusted } = selectGrind(product, selection, grind);
    const message = adjusted
      ? t('a11y/variant-switched', { size: sizeLabel(selection.size), grind: grindLabel(grind), fallback: sizeLabel(next.size) })
      : variantMessage(next);
    commit(next, message);
  }

  function onSize(value: string) {
    const size = value as Size;
    if (size === selection.size) return;
    const next = { grind: selection.grind, size };
    commit(next, variantMessage(next));
  }

  function onMode(value: string) {
    const next = value as PurchaseMode;
    if (next === mode) return;
    setMode(next);
    announce(variantMessage(selection, next));
  }

  function onAdd() {
    if (!variant || !available) return;
    addAndOpenCart({
      sku: variant.sku,
      productId: product.id,
      name: product.name,
      mode,
      qty,
      max: maxQtyFor(variant.stock),
      locale,
    });
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), ADDED_FEEDBACK_MS);
  }

  const iconSwap = 'absolute inset-0 transition-[opacity,scale] duration-[var(--duration-base)] ease-[var(--ease-out)]';
  const textSwap = '[grid-area:1/1] transition-[opacity,translate] duration-[var(--duration-base)] ease-[var(--ease-out)]';

  return (
    <div className="flex flex-col gap-6">
      {/* Precio: una sola línea de altura fija (40 px) para cualquier variante y modo. */}
      <p className="flex h-10 items-baseline gap-3 overflow-hidden whitespace-nowrap">
        <span ref={priceRef} data-price className="inline-block type-price-l text-text-primary">
          {fmt(unitPrice)}
        </span>
        {showCompareAt && (
          <>
            <span className="sr-only">{t('pdp/was-price', { price: fmt(compareAt) })}</span>
            <s aria-hidden="true" className="type-body-m text-text-tertiary">
              {fmt(compareAt)}
            </s>
          </>
        )}
        <span ref={unitRef} className="inline-block type-mono-s text-text-tertiary">
          {t('pdp/unit-price', { price: fmt(perKg) })}
        </span>
      </p>

      <VariantGroup legend={t('pdp/grind-label')} current={grindLabel(selection.grind)}>
        {product.options.grind.map((grind) => {
          const soldOut = !isGrindAvailable(product, grind);
          return (
            <VariantSelector
              key={grind}
              name={`grind-${product.id}`}
              value={grind}
              label={grindLabel(grind)}
              caption={soldOut ? t('pdp/sold-out') : undefined}
              checked={selection.grind === grind}
              soldOut={soldOut}
              onSelect={onGrind}
            />
          );
        })}
      </VariantGroup>

      <VariantGroup legend={t('pdp/size-label')}>
        {product.options.size.map((size) => {
          const option = findVariant(product, { grind: selection.grind, size });
          const soldOut = !isAvailable(option);
          return (
            <VariantSelector
              key={size}
              name={`size-${product.id}`}
              value={size}
              label={sizeLabel(size)}
              caption={soldOut ? t('pdp/sold-out') : fmt(priceFor(option))}
              checked={selection.size === size}
              soldOut={soldOut}
              onSelect={onSize}
            />
          );
        })}
      </VariantGroup>

      {subscription && (
        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="mb-3 p-0 type-label-m-strong text-text-primary">{t('pdp/purchase-label')}</legend>
          <div className="flex flex-col gap-3">
            <RadioCard
              name={`mode-${product.id}`}
              value="one-time"
              checked={mode === 'one-time'}
              onChange={onMode}
              title={t('pdp/one-time')}
              description={t('pdp/one-time-desc')}
              meta={variant ? fmt(variant.price) : undefined}
            />
            <RadioCard
              name={`mode-${product.id}`}
              value="subscription"
              checked={mode === 'subscription'}
              onChange={onMode}
              title={t('pdp/subscribe')}
              description={t('pdp/subscribe-desc', { weeks: subscription.intervalWeeks })}
              meta={variant ? fmt(applyDiscount(variant.price, subscription.discountPct)) : undefined}
              badge={t('badge/save', { pct: subscription.discountPct })}
            />
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <QuantityStepper
          value={Math.min(qty, maxQty)}
          max={maxQty}
          onChange={setQty}
          disabled={!available}
          label={t('pdp/quantity')}
          decreaseLabel={t('a11y/decrease')}
          increaseLabel={t('a11y/increase')}
          className="shrink-0"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!available}
          className={buttonClasses({ variant: 'primary', size: 'lg', className: 'min-w-0 flex-1' })}
        >
          <span className="relative size-5 shrink-0">
            <Icon name="bag" size={20} className={`${iconSwap} ${added ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`} />
            <Icon name="check" size={20} className={`${iconSwap} ${added ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} />
          </span>
          {available ? (
            <span className="grid">
              <span aria-hidden={added || undefined} className={`${textSwap} ${added ? '-translate-y-1 opacity-0' : 'opacity-100'}`}>
                {t('pdp/add-to-cart')}
              </span>
              <span aria-hidden={!added || undefined} className={`${textSwap} ${added ? 'opacity-100' : 'translate-y-1 opacity-0'}`}>
                {t('pdp/added')}
              </span>
            </span>
          ) : (
            <span>{t('pdp/sold-out')}</span>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-2 type-body-s">
        <p className="flex items-center gap-2 text-text-secondary">
          <Icon name="flame" size={18} className="text-icon-secondary" />
          {t('pdp/roast-date', { date: formatDate(product.roastedOn, locale, 'day-month') })}
        </p>
        {/* Altura reservada: la fila de stock bajo aparece o desaparece sin mover nada. */}
        <p className="flex h-5 items-center gap-2 text-text-accent" aria-hidden={lowStock ? undefined : true}>
          {lowStock && (
            <>
              <Icon name="leaf" size={18} className="text-icon-accent" />
              {t('pdp/stock-low', { count: stock })}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default PurchasePanel;

/**
 * Cesta lateral (Figma "Drawer" 19:1780): panel de 440 px a la derecha sobre el scrim (desde sm)
 * o a pantalla completa en móvil. Isla `client:paint` montada por BaseLayout.
 *
 * Accesibilidad: <dialog> con showModal() (el resto de la página queda inerte), nombre por
 * aria-labelledby, Escape y clic en el scrim cierran, trampa de foco explícita, foco al botón
 * cerrar al abrir y vuelta al elemento de origen al cerrar. Mientras está abierta, las regiones
 * aria-live del layout se mueven dentro del diálogo para que announce() se siga oyendo.
 */
import { useStore } from '@nanostores/react';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import emptyBag from '@/assets/cart/empty-bag.svg?url';
import { Packshot } from '@/components/art/Packshot';
import { easeOut, motionMs, prefersReducedMotion } from '@/lib/motion';
import { $toastHost } from '@/components/feedback/toast-host';
import { ToastList } from '@/components/feedback/ToastList';
import { buttonClasses, iconButtonClasses, iconButtonIconSize } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { formatPrice, routePath, useTranslations, type Locale } from '@/i18n';
import { announce } from '@/lib/announce';
import type { CartCatalog } from '@/lib/catalog-types';
import { FREE_SHIPPING_THRESHOLD, maxQtyFor } from '@/lib/pricing';
import {
  $cart,
  $catalog,
  addToCart,
  provideCatalog,
  removeLine,
  restoreLine,
  type CartViewLine,
} from '@/stores/cart';
import { $cartOpen, $lastAddedKey, CART_HASH, closeCart, openCart, pushToast } from '@/stores/ui';
import { CartItem } from './CartItem';
import { FreeShippingBar } from './FreeShippingBar';

interface CartDrawerProps {
  locale: Locale;
  catalog: CartCatalog;
}

const FOCUSABLE =
  'a[href], [role="link"][tabindex], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const LIVE_REGION_IDS = ['live-polite', 'live-assertive'];

/** Adónde llevar el foco tras un cambio en las líneas (si el elemento con foco ha desaparecido). */
type PendingFocus = { key: string; force?: boolean } | { index: number; force?: boolean };

export default function CartDrawer({ locale, catalog }: CartDrawerProps) {
  const t = useTranslations(locale);
  const titleId = useId();
  const blockedId = useId();
  const upsellId = useId();
  const upsellNameId = useId();

  const open = useStore($cartOpen);
  const cart = useStore($cart);
  const { variants, products } = useStore($catalog);
  const lastAddedKey = useStore($lastAddedKey);
  // El servidor no conoce la cesta (localStorage): el contenido se pinta tras hidratar.
  const [hydrated, setHydrated] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const emptyTitleRef = useRef<HTMLHeadingElement>(null);
  const liveSlotRef = useRef<HTMLDivElement>(null);
  const isOpen = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const animations = useRef<Animation[]>([]);
  const savedScroll = useRef<{ overflow: string; paddingRight: string } | null>(null);
  const pendingFocus = useRef<PendingFocus | null>(null);

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  useEffect(() => {
    provideCatalog(catalog);
    setHydrated(true);
  }, [catalog]);

  // "#cart" en la URL abre la cesta al llegar (p. ej. "Volver a la cesta" desde el checkout).
  useEffect(() => {
    if (location.hash !== `#${CART_HASH}`) return;
    history.replaceState(history.state, '', location.pathname + location.search);
    openCart();
  }, []);

  /* ---------- Abrir / cerrar ---------- */

  function lockScroll() {
    if (savedScroll.current) return;
    const html = document.documentElement;
    const gap = window.innerWidth - html.clientWidth;
    savedScroll.current = { overflow: html.style.overflow, paddingRight: document.body.style.paddingRight };
    html.style.overflow = 'hidden';
    // Compensa la barra de desplazamiento para que la página no salte.
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
  }

  function unlockScroll() {
    const saved = savedScroll.current;
    if (!saved) return;
    document.documentElement.style.overflow = saved.overflow;
    document.body.style.paddingRight = saved.paddingRight;
    savedScroll.current = null;
  }

  /** Lo que queda fuera del diálogo modal es inerte también para los lectores de pantalla. */
  function moveLiveRegions(intoDialog: boolean) {
    const slot = liveSlotRef.current;
    if (!slot) return;
    for (const id of LIVE_REGION_IDS) {
      const region = document.getElementById(id);
      if (!region) continue;
      if (intoDialog && region.parentElement !== slot) slot.append(region);
      if (!intoDialog && region.parentElement === slot) document.body.append(region);
    }
  }

  function stopAnimations() {
    for (const animation of animations.current) animation.cancel();
    animations.current = [];
  }

  /** Panel desde la derecha y scrim en fundido. Con movimiento reducido, sin desplazamiento. */
  function animate(entering: boolean): Animation | undefined {
    const panel = panelRef.current;
    const scrim = scrimRef.current;
    if (!panel || !scrim) return undefined;
    stopAnimations();
    const slide: Keyframe[] = prefersReducedMotion()
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }];
    const fade: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
    const options: KeyframeAnimationOptions = {
      duration: motionMs('slow'),
      easing: easeOut(),
      fill: entering ? 'none' : 'forwards',
    };
    const panelAnimation = panel.animate(entering ? slide : [...slide].reverse(), options);
    const scrimAnimation = scrim.animate(entering ? fade : [...fade].reverse(), options);
    animations.current = [panelAnimation, scrimAnimation];
    return panelAnimation;
  }

  function show() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      const active = document.activeElement;
      returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
      lockScroll();
      dialog.showModal();
      isOpen.current = true;
      moveLiveRegions(true);
      $toastHost.set('drawer');
      closeRef.current?.focus({ preventScroll: true });
    }
    animate(true);
  }

  /** Limpieza común (cierre propio o del navegador). Idempotente. */
  function cleanup() {
    if (!isOpen.current) return;
    isOpen.current = false;
    stopAnimations();
    moveLiveRegions(false);
    unlockScroll();
    $toastHost.set('page');
    const target = returnFocus.current?.isConnected
      ? returnFocus.current
      : document.querySelector<HTMLElement>('[data-cart-button]');
    returnFocus.current = null;
    target?.focus({ preventScroll: true });
  }

  function hide() {
    const finish = () => {
      if ($cartOpen.get()) return; // se ha vuelto a abrir durante la salida
      moveLiveRegions(false);
      dialogRef.current?.close();
      cleanup();
    };
    const exit = animate(false);
    if (!exit) return finish();
    exit.finished.then(finish, () => {});
  }

  useEffect(() => {
    if (open) show();
    else if (dialogRef.current?.open) hide();
  }, [open]); // show/hide solo usan refs

  // Si la isla se desmonta con la cesta abierta, no deja la página bloqueada.
  useEffect(() => () => cleanup(), []);

  /** Escape: se cierra con animación a través del store. */
  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    closeCart();
  }

  /** Cierre que no hemos iniciado nosotros (p. ej. segundo Escape seguido): sincroniza el store. */
  function onClose() {
    if (!isOpen.current) return;
    cleanup();
    if ($cartOpen.get()) closeCart();
  }

  /** Trampa de foco: Tab y Mayús+Tab ciclan dentro del diálogo. */
  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.getClientRects().length > 0,
    );
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    const inside = active instanceof HTMLElement && dialog.contains(active);
    if (event.shiftKey) {
      // El título (tabindex -1) va antes del primer elemento enfocable.
      if (!inside || active === first || active === titleRef.current) {
        event.preventDefault();
        last.focus();
      }
    } else if (!inside || active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------- Acciones ---------- */

  // Tras cambiar las líneas, si el foco se ha perdido (botón eliminado, sugerencia agotada…),
  // se lleva a la línea correspondiente o al estado vacío.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const dialog = dialogRef.current;
    if (!dialog?.open) return;
    const active = document.activeElement;
    const lost = !active || active === document.body || !dialog.contains(active);
    if (!lost && !pending.force) return;
    const list = listRef.current;
    let target: HTMLElement | null | undefined;
    if (list && 'key' in pending) {
      target = list.querySelector<HTMLElement>(`[data-line-key="${CSS.escape(pending.key)}"] a, [data-line-key="${CSS.escape(pending.key)}"] button`);
    } else if (list && 'index' in pending) {
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-line-key]'));
      const row = rows[Math.min(pending.index, rows.length - 1)];
      target = row?.querySelector<HTMLElement>('a, button');
    }
    (target ?? emptyTitleRef.current ?? titleRef.current)?.focus();
  }, [cart]);

  function remove(line: CartViewLine, index: number, name: string) {
    pendingFocus.current = { index };
    const removed = removeLine(line.key);
    if (!removed) return;
    // El aviso se anuncia solo (role="status" dentro del diálogo): no se duplica con announce().
    pushToast({
      type: 'success',
      message: t('toast/removed', { name }),
      action: {
        label: t('toast/undo'),
        onAction: () => {
          pendingFocus.current = { key: line.key, force: true };
          restoreLine(removed);
        },
      },
    });
  }

  const upsell = cart.upsell;
  const upsellVariant = upsell ? variants[upsell.defaultSku] : undefined;
  const showUpsell = Boolean(upsell && upsellVariant && upsellVariant.stock > 0 && !cart.freeShipping.unlocked);

  function addUpsell() {
    if (!upsell || !upsellVariant) return;
    const key = addToCart({
      sku: upsellVariant.sku,
      productId: upsell.id,
      mode: 'one-time',
      qty: 1,
      max: maxQtyFor(upsellVariant.stock),
    });
    pendingFocus.current = { key };
    $lastAddedKey.set(key);
    announce(t('toast/added', { name: upsell.name }));
  }

  /* ---------- Vista ---------- */

  const hasLines = hydrated && cart.lines.length > 0;
  const blocked = cart.hasUnavailable;
  const pad = 'px-5 sm:px-6';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-text-primary"
      onCancel={onCancel}
      onClose={onClose}
      onKeyDown={onKeyDown}
    >
      <div ref={scrimRef} aria-hidden="true" className="absolute inset-0 bg-bg-scrim" onClick={() => closeCart()} />

      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-bg-page shadow-elevation-3 sm:w-[440px]"
      >
        {/* Cabecera */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border-default py-5 pr-3 pl-5 sm:pr-4 sm:pl-6">
          <h2
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className="type-heading-h3 text-text-primary focus-visible:shadow-none focus-visible:outline-none"
          >
            {t('cart/title')}
          </h2>
          {hasLines && <p className="type-mono-s whitespace-nowrap text-text-tertiary">{t('cart/count', { count: cart.count })}</p>}
          <button
            ref={closeRef}
            type="button"
            className={iconButtonClasses({ variant: 'ghost', size: 'md', className: 'ml-auto' })}
            aria-label={t('a11y/close-cart')}
            onClick={() => closeCart()}
          >
            <Icon name="close" size={iconButtonIconSize.md} />
          </button>
        </div>

        {hydrated && hasLines && (
          <>
            <div className={`shrink-0 pt-5 ${pad}`}>
              <FreeShippingBar progress={cart.freeShipping} locale={locale} t={t} />
            </div>

            {/* Líneas + sugerencia (zona con scroll) */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className={`flex flex-col gap-5 py-6 ${pad}`}>
                <ul ref={listRef} className="flex flex-col gap-5">
                  {cart.lines.map((line, index) => {
                    const product = productsById.get(line.productId);
                    const name = line.variant?.name ?? product?.name ?? line.sku;
                    return (
                      <CartItem
                        key={line.key}
                        line={line}
                        name={name}
                        origin={product?.origin ?? ''}
                        colorway={line.variant?.colorway ?? product?.colorway ?? 'ink'}
                        highlight={open && line.key === lastAddedKey}
                        divider={index > 0}
                        locale={locale}
                        t={t}
                        onRemove={() => remove(line, index, name)}
                      />
                    );
                  })}
                </ul>

                {showUpsell && upsell && upsellVariant && (
                  <section
                    aria-labelledby={upsellId}
                    className="flex flex-col gap-3 rounded-md border border-border-subtle bg-bg-surface p-4"
                  >
                    <h3 id={upsellId} className="type-overline-s text-text-tertiary">
                      {t('cart/upsell-title')}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div aria-hidden="true" className="h-[60px] w-12 shrink-0 overflow-hidden rounded-sm">
                        <Packshot
                          colorway={upsell.colorway}
                          name={upsell.name}
                          origin={upsell.origin}
                          size="micro"
                          loading="lazy"
                          className="size-full"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p id={upsellNameId} className="type-label-m-strong text-text-primary">
                          {upsell.name}
                        </p>
                        <p className="type-body-xs text-text-tertiary">{formatPrice(upsellVariant.price, locale)}</p>
                      </div>
                      <button
                        type="button"
                        className={buttonClasses({ variant: 'secondary', size: 'md' })}
                        aria-describedby={upsellNameId}
                        onClick={addUpsell}
                      >
                        {t('cart/add')}
                      </button>
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* Pie */}
            <div className={`flex shrink-0 flex-col gap-3 border-t border-border-default bg-bg-surface pt-5 pb-6 ${pad}`}>
              <div className="flex items-center gap-2 text-text-primary">
                <p className="min-w-0 flex-1 type-label-l">{t('cart/subtotal')}</p>
                <p className="type-price-l whitespace-nowrap">{formatPrice(cart.subtotal, locale)}</p>
              </div>
              <p className="type-body-xs text-text-tertiary">{t('cart/shipping-note')}</p>
              {blocked && (
                <p id={blockedId} className="type-body-xs text-text-error">
                  {t('cart/checkout-blocked')}
                </p>
              )}
              <a
                href={blocked ? undefined : routePath(locale, { name: 'checkout' })}
                role={blocked ? 'link' : undefined}
                tabIndex={blocked ? 0 : undefined}
                aria-disabled={blocked || undefined}
                aria-describedby={blocked ? blockedId : undefined}
                className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true })}
              >
                <Icon name="lock" size={20} />
                {t('cart/checkout')}
              </a>
              <button
                type="button"
                className={buttonClasses({ variant: 'ghost', size: 'md', fullWidth: true })}
                onClick={() => closeCart()}
              >
                {t('cart/continue')}
              </button>
            </div>
          </>
        )}

        {hydrated && !hasLines && (
          <>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className={`m-auto flex w-full flex-col items-center gap-4 py-10 text-center ${pad}`}>
                <div className="flex size-40 shrink-0 items-center justify-center rounded-full bg-bg-subtle">
                  <img src={emptyBag} alt="" width={56} height={56} className="block" />
                </div>
                <h3
                  ref={emptyTitleRef}
                  tabIndex={-1}
                  className="type-heading-h2 text-text-primary focus-visible:shadow-none focus-visible:outline-none"
                >
                  {t('cart/empty-title')}
                </h3>
                <p className="max-w-[300px] type-body-m text-text-secondary sm:max-w-[320px]">{t('cart/empty-body')}</p>
                <div className="flex w-full flex-col items-center gap-2 pt-4">
                  <a
                    href={routePath(locale, { name: 'listing' })}
                    className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true })}
                  >
                    {t('cart/empty-cta')}
                    <Icon name="arrow-right" size={20} />
                  </a>
                  <a href={routePath(locale, { name: 'soon' })} className={buttonClasses({ variant: 'ghost', size: 'md' })}>
                    {t('cart/empty-secondary')}
                  </a>
                </div>
              </div>
            </div>
            <div className={`shrink-0 bg-bg-subtle py-5 text-center ${pad}`}>
              <p className="type-body-xs text-text-secondary">
                {t('nav/announcement', { threshold: formatPrice(FREE_SHIPPING_THRESHOLD, locale, { trimZeros: true }) })}
              </p>
            </div>
          </>
        )}

        {/* Avisos mientras la cesta está abierta (la página de debajo es inerte). */}
        <ToastList locale={locale} placement="drawer" />
      </div>

      {/* Aquí se mueven las regiones aria-live del layout mientras el diálogo está abierto. */}
      <div ref={liveSlotRef} />
    </dialog>
  );
}

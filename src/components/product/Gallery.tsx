import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { useTranslations, type Locale } from '@/i18n';
import { announce } from '@/lib/announce';
import type { ArtData } from '@/lib/art';
import type { ImageView } from '@/lib/schemas';
import { ProductImage } from '@/components/art/ProductImage';
import { iconButtonClasses, iconButtonIconSize } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Lightbox } from './Lightbox';
import { imageAlt } from './pdp/labels';
import { prefersReducedMotion, scrollBehavior } from '@/lib/motion';

/**
 * Gallery (Figma 23:6444). Isla `client:paint`; el HTML del servidor ya pinta la imagen principal
 * y las miniaturas (las demás diapositivas se montan al hidratar, con su hueco reservado).
 * - Desktop (23:4611): miniaturas en columna, imagen 4:5, contador, flechas y "Ampliar".
 *   Zoom (23:5187): detalle 2× que sigue al puntero, minimapa y aviso; Escape lo cierra.
 * - Mobile (23:5813): imagen a sangre deslizable (scroll-snap), miniaturas en fila y "Ampliar",
 *   que abre el Lightbox (23:6377).
 * Teclado: ← → cambian de imagen cuando el foco está dentro de la galería.
 */
interface GalleryProps {
  locale: Locale;
  art: ArtData;
  images: ImageView[];
}

const ZOOM_SCALE = 2;
const HOVER_ZOOM_QUERY = '(min-width: 64rem) and (hover: hover) and (pointer: fine)';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function Gallery({ locale, art, images }: GalleryProps) {
  const t = useTranslations(locale);
  const total = images.length;
  const alts = images.map((view) => imageAlt(t, view, art));

  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const zoomImageRef = useRef<HTMLDivElement>(null);
  const zoomButtonRef = useRef<HTMLButtonElement>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lightboxTrigger = useRef<HTMLElement | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setHydrated(true);
    return () => clearTimeout(settleTimer.current);
  }, []);

  // Entrada del zoom (de 1× a 2× desde el punto de origen) y Escape para salir, esté donde esté el foco.
  useEffect(() => {
    if (!zoomed) return;
    const layer = zoomImageRef.current;
    if (layer && !prefersReducedMotion()) {
      layer.animate([{ scale: '1', opacity: 0.4 }, { scale: String(ZOOM_SCALE), opacity: 1 }], {
        duration: 220,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      });
    }
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const focusInside = frameRef.current?.contains(document.activeElement) ?? false;
      setZoomed(false);
      if (focusInside) zoomButtonRef.current?.focus();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [zoomed]);

  function goTo(next: number, options: { announce?: boolean; instant?: boolean } = {}) {
    const target = (next + total) % total;
    setIndex(target);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: target * track.clientWidth, behavior: options.instant ? 'auto' : scrollBehavior() });
    // En mobile la fila de miniaturas puede desbordar: que la activa quede a la vista.
    const thumb = thumbRefs.current[target];
    const list = thumb?.closest('ul');
    if (thumb && list && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: thumb.offsetLeft - list.clientWidth / 2 + thumb.offsetWidth / 2, behavior: scrollBehavior() });
    }
    if (options.announce) announce(`${t('a11y/image-n', { current: target + 1, total })}: ${alts[target] ?? ''}`);
  }

  /** El índice sigue al deslizamiento cuando el scroll se detiene (sin parpadeos intermedios). */
  function onTrackScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track || !track.clientWidth) return;
      const next = Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));
      setIndex(next);
    }, 90);
  }

  function setZoomOrigin(clientX: number, clientY: number) {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    frame.style.setProperty('--zx', `${clamp01((clientX - rect.left) / rect.width) * 100}%`);
    frame.style.setProperty('--zy', `${clamp01((clientY - rect.top) / rect.height) * 100}%`);
  }

  function startZoom() {
    setZoomed(true);
    announce(t('pdp/zoom-hint'));
  }

  function openLightbox(trigger: HTMLElement | null) {
    lightboxTrigger.current = trigger;
    setZoomed(false);
    setLightboxOpen(true);
  }

  function onZoomButton() {
    if (zoomed) {
      setZoomed(false);
      return;
    }
    if (window.matchMedia(HOVER_ZOOM_QUERY).matches) {
      frameRef.current?.style.setProperty('--zx', '50%');
      frameRef.current?.style.setProperty('--zy', '50%');
      startZoom();
    } else {
      openLightbox(zoomButtonRef.current);
    }
  }

  /** Clic o toque sobre la imagen: zoom en el sitio (ratón) o lightbox (táctil). */
  function onTrackClick(event: MouseEvent<HTMLDivElement>) {
    if (window.matchMedia(HOVER_ZOOM_QUERY).matches) {
      setZoomOrigin(event.clientX, event.clientY);
      startZoom();
    } else {
      openLightbox(event.currentTarget);
    }
  }

  function onZoomMove(event: PointerEvent<HTMLDivElement>) {
    setZoomOrigin(event.clientX, event.clientY);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (lightboxOpen) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + total) % total;
    goTo(next, { announce: true });
    if (event.target instanceof HTMLElement && event.target.dataset['thumb'] !== undefined) {
      thumbRefs.current[next]?.focus();
    }
  }

  const currentView = images[index] ?? images[0]!;
  const counter = t('pdp/image-count', { current: index + 1, total });

  return (
    <section
      aria-label={t('a11y/gallery', { name: art.name })}
      onKeyDown={onKeyDown}
      className="mx-auto flex w-full flex-col gap-3 md:max-w-[36rem] lg:max-w-none lg:flex-row-reverse lg:items-start lg:gap-4"
    >
      {/* Imagen principal */}
      <div
        ref={frameRef}
        className="relative overflow-hidden bg-illustration-backdrop md:rounded-md lg:min-w-0 lg:flex-1"
      >
        <div
          ref={trackRef}
          tabIndex={0}
          role="group"
          aria-label={t('a11y/image-n', { current: index + 1, total })}
          onScroll={onTrackScroll}
          onClick={onTrackClick}
          className="flex cursor-zoom-in snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] focus-visible:outline-offset-[-4px] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((view, i) => (
            <div key={view} className="w-full shrink-0 snap-start snap-always" aria-hidden={i === index ? undefined : true}>
              {hydrated || i === 0 ? (
                <ProductImage art={art} view={view} alt={alts[i]} loading={i === 0 ? 'eager' : 'lazy'} />
              ) : (
                <div className="aspect-[4/5] w-full" />
              )}
            </div>
          ))}
        </div>

        {zoomed && (
          <>
            <div
              onPointerMove={onZoomMove}
              onClick={() => setZoomed(false)}
              className="absolute inset-0 z-10 cursor-zoom-out overflow-hidden bg-illustration-backdrop"
              aria-hidden="true"
            >
              <div ref={zoomImageRef} className="size-full origin-[var(--zx,50%)_var(--zy,50%)] scale-200">
                <ProductImage art={art} view={currentView} loading="lazy" />
              </div>
            </div>
            {/* Minimapa: la imagen entera y el recuadro de la zona ampliada. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-4 z-20 w-24 overflow-hidden rounded-sm border border-border-default bg-illustration-backdrop shadow-elevation-2"
            >
              <ProductImage art={art} view={currentView} loading="lazy" />
              <span
                className="absolute size-1/2 border-2 border-border-accent"
                style={{ left: 'calc(var(--zx, 50%) * 0.5)', top: 'calc(var(--zy, 50%) * 0.5)' }}
              />
            </div>
          </>
        )}

        {/* Desktop: Ampliar / reducir (Icon Button secundario de 48 px). */}
        <div className="absolute top-4 right-4 z-20 hidden lg:block">
          <button
            ref={zoomButtonRef}
            type="button"
            onClick={onZoomButton}
            aria-label={t('pdp/zoom')}
            aria-pressed={zoomed}
            className={iconButtonClasses({ variant: 'secondary', size: 'md' })}
          >
            <Icon name={zoomed ? 'minus' : 'zoom-in'} size={iconButtonIconSize.md} />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3">
          <p aria-hidden="true" className="rounded-full bg-bg-surface px-3 py-1 type-mono-s whitespace-nowrap text-text-primary">
            {counter}
          </p>
          {zoomed && (
            <p className="hidden rounded-full bg-bg-inverse px-4 py-1.5 type-body-xs whitespace-nowrap text-text-inverse lg:block">
              {t('pdp/zoom-hint')}
            </p>
          )}
          <div className="pointer-events-auto hidden gap-2 lg:flex">
            <button
              type="button"
              onClick={() => goTo(index - 1, { announce: true })}
              aria-label={t('a11y/prev-image')}
              className={iconButtonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <Icon name="chevron-left" size={iconButtonIconSize.sm} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1, { announce: true })}
              aria-label={t('a11y/next-image')}
              className={iconButtonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <Icon name="chevron-right" size={iconButtonIconSize.sm} />
            </button>
          </div>
          {/* Mobile: Ampliar abre el lightbox (Icon Button secundario de 36 px). */}
          <button
            type="button"
            onClick={(event) => openLightbox(event.currentTarget)}
            aria-label={t('pdp/zoom')}
            aria-haspopup="dialog"
            className={iconButtonClasses({ variant: 'secondary', size: 'sm', className: 'pointer-events-auto lg:hidden' })}
          >
            <Icon name="expand" size={iconButtonIconSize.sm} />
          </button>
        </div>
      </div>

      {/* Miniaturas: fila en mobile (64 × 80), columna en desktop (80 × 100). */}
      <ul className="-my-2 flex shrink-0 gap-2 overflow-x-auto px-5 py-2 lg:my-0 lg:py-0 [scrollbar-width:none] md:px-0 lg:flex-col lg:gap-3 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {images.map((view, i) => {
          const selected = i === index;
          return (
            <li key={view} className="shrink-0">
              <button
                ref={(element) => {
                  thumbRefs.current[i] = element;
                }}
                type="button"
                data-thumb=""
                onClick={() => goTo(i)}
                aria-label={t('a11y/show-image', { current: i + 1, total, alt: alts[i] ?? '' })}
                aria-current={selected ? 'true' : undefined}
                className={
                  'relative block w-16 overflow-hidden rounded-sm bg-illustration-backdrop lg:w-20 ' +
                  'after:pointer-events-none after:absolute after:inset-0 after:rounded-sm after:transition-[border-color] after:duration-[var(--duration-fast)] ' +
                  (selected
                    ? 'after:border-2 after:border-border-selected'
                    : 'after:border after:border-border-subtle hover:after:border-border-strong')
                }
              >
                <ProductImage art={art} view={view} loading="lazy" />
              </button>
            </li>
          );
        })}
      </ul>

      <Lightbox
        open={lightboxOpen}
        locale={locale}
        art={art}
        images={images}
        alts={alts}
        index={index}
        onIndexChange={(next) => goTo(next, { instant: true })}
        onClose={() => {
          setLightboxOpen(false);
          lightboxTrigger.current?.focus();
        }}
      />
    </section>
  );
}

export default Gallery;

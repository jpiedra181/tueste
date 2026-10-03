import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { useTranslations, type Locale } from '@/i18n';
import type { ArtData } from '@/lib/art';
import type { ImageView } from '@/lib/schemas';
import { ProductImage } from '@/components/art/ProductImage';
import { iconButtonClasses, iconButtonIconSize } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { fadeIn, scrollBehavior } from '@/lib/motion';

/**
 * Gallery Lightbox (Figma 23:6377, "Gallery · Mobile · Zoom"). <dialog> modal a pantalla completa:
 * Escape cierra, el foco queda atrapado por el propio showModal() y vuelve al botón que lo abrió.
 * Deslizar cambia de imagen (scroll-snap). Pellizco nativo del navegador (touch-action: manipulation)
 * y doble toque para alternar 2× en el punto tocado; a 2× se recorre la imagen con scroll nativo.
 */
interface LightboxProps {
  open: boolean;
  locale: Locale;
  art: ArtData;
  images: ImageView[];
  alts: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP = 30;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function Lightbox({ open, locale, art, images, alts, index, onIndexChange, onClose }: LightboxProps) {
  const t = useTranslations(locale);
  const total = images.length;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [current, setCurrent] = useState(index);
  const [zoomed, setZoomed] = useState<number | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setCurrent(index);
      setZoomed(null);
      dialog.showModal();
      document.documentElement.style.overflow = 'hidden';
      const track = trackRef.current;
      if (track) track.scrollLeft = index * track.clientWidth;
      fadeIn(dialog);
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // `index` solo importa al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(
    () => () => {
      clearTimeout(settleTimer.current);
      document.documentElement.style.overflow = '';
    },
    [],
  );

  function handleClose() {
    document.documentElement.style.overflow = '';
    setZoomed(null);
    onClose();
  }

  function select(next: number) {
    setCurrent(next);
    onIndexChange(next);
  }

  function onTrackScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const track = trackRef.current;
      if (!track || !track.clientWidth) return;
      const next = Math.min(total - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth)));
      if (next !== current) select(next);
    }, 90);
  }

  function step(delta: number) {
    const track = trackRef.current;
    const next = (current + delta + total) % total;
    setZoomed(null);
    select(next);
    if (track) track.scrollTo({ left: next * track.clientWidth, behavior: scrollBehavior() });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('a11y/zoom-dialog')}
      onClose={handleClose}
      onKeyDown={onKeyDown}
      className="on-inverse fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-bg-inverse p-0 text-text-inverse open:flex open:flex-col"
    >
      {open && (
        <>
          <div className="flex shrink-0 items-center justify-between px-5 pt-12 pb-4">
            <p className="type-overline-m text-text-inverse">
              <span aria-hidden="true">{t('pdp/image-count', { current: current + 1, total })}</span>
              <span className="sr-only" aria-live="polite">
                {t('a11y/image-n', { current: current + 1, total })}
              </span>
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t('a11y/close')}
              className={iconButtonClasses({ variant: 'secondary', size: 'md' })}
            >
              <Icon name="close" size={iconButtonIconSize.md} />
            </button>
          </div>

          <div
            ref={trackRef}
            onScroll={onTrackScroll}
            className={
              'flex min-h-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ' +
              (zoomed === null ? 'overflow-x-auto overflow-y-hidden overscroll-x-contain' : 'overflow-hidden')
            }
          >
            {images.map((view, i) => (
              <ZoomSlide
                key={view}
                art={art}
                view={view}
                alt={alts[i] ?? ''}
                active={i === current}
                zoomed={zoomed === i}
                onToggle={() => setZoomed((value) => (value === i ? null : i))}
              />
            ))}
          </div>

          <div className="flex shrink-0 flex-col items-center gap-4 px-5 pt-4 pb-10">
            <p className="text-center type-body-xs text-text-inverse-muted">{t('pdp/zoom-hint-mobile')}</p>
            <div aria-hidden="true" className="flex h-2 items-center gap-2">
              {images.map((view, i) => (
                <span
                  key={view}
                  className={
                    'block rounded-full transition-[width,height,background-color,opacity] duration-[var(--duration-base)] ' +
                    (i === current ? 'size-2 bg-text-inverse' : 'size-1.5 bg-border-default opacity-50')
                  }
                />
              ))}
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}

interface ZoomSlideProps {
  art: ArtData;
  view: ImageView;
  alt: string;
  active: boolean;
  zoomed: boolean;
  onToggle: () => void;
}

/** Una imagen del lightbox: 1× encajada en el escenario; 2× desplazable con scroll nativo. */
function ZoomSlide({ art, view, alt, active, zoomed, onToggle }: ZoomSlideProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const focusPoint = useRef({ x: 0.5, y: 0.5 });
  const lastTap = useRef({ time: 0, x: 0, y: 0 });
  const lastPointerType = useRef('mouse');

  // Tras alternar, el punto tocado queda en el centro del escenario.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    if (zoomed) {
      scroller.scrollLeft = content.offsetLeft + focusPoint.current.x * content.offsetWidth - scroller.clientWidth / 2;
      scroller.scrollTop = content.offsetTop + focusPoint.current.y * content.offsetHeight - scroller.clientHeight / 2;
      fadeIn(content, { opacity: 0.6 });
    } else {
      scroller.scrollLeft = 0;
      scroller.scrollTop = 0;
    }
  }, [zoomed]);

  function toggleAt(clientX: number, clientY: number) {
    const content = contentRef.current;
    if (content) {
      const rect = content.getBoundingClientRect();
      focusPoint.current = {
        x: clamp01((clientX - rect.left) / rect.width),
        y: clamp01((clientY - rect.top) / rect.height),
      };
    }
    onToggle();
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    lastPointerType.current = event.pointerType;
    if (event.pointerType !== 'touch') return;
    const previous = lastTap.current;
    const isDouble =
      event.timeStamp - previous.time < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < DOUBLE_TAP_SLOP;
    if (isDouble) {
      lastTap.current = { time: 0, x: 0, y: 0 };
      toggleAt(event.clientX, event.clientY);
    } else {
      lastTap.current = { time: event.timeStamp, x: event.clientX, y: event.clientY };
    }
  }

  function onDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (lastPointerType.current === 'touch') return;
    toggleAt(event.clientX, event.clientY);
  }

  return (
    <div className="h-full w-full shrink-0 snap-center snap-always" aria-hidden={active ? undefined : true}>
      <div
        ref={scrollerRef}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        className={
          'flex size-full touch-manipulation [container-type:size] ' +
          (zoomed ? 'cursor-zoom-out overflow-auto overscroll-contain' : 'cursor-zoom-in overflow-hidden')
        }
      >
        <div
          ref={contentRef}
          className="m-auto shrink-0"
          style={{ width: zoomed ? 'calc(2 * min(100cqw, 80cqh))' : 'min(100cqw, 80cqh)' }}
        >
          <ProductImage art={art} view={view} alt={alt} loading="lazy" />
        </div>
      </div>
    </div>
  );
}

export default Lightbox;

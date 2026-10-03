import { useEffect, useRef, useState } from 'react';
import starEmpty from '@/assets/ui/star-empty.svg?url';
import starFull from '@/assets/ui/star-full.svg?url';
import { announce } from '@/lib/announce';
import { buttonClasses } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { RatingStars } from '@/components/ui/RatingStars';

/**
 * Isla de reseñas: filtros por estrellas, lista y "Ver más reseñas" (de 3 en 3).
 * Todos los textos llegan ya traducidos desde el servidor (sin diccionarios en el cliente).
 *
 * Devuelve un fragmento: <astro-island> es `display: contents`, así los filtros y la lista se colocan
 * directamente en la rejilla de Reviews.astro (filtros en la columna izquierda, lista en la derecha).
 * El HTML del servidor es el estado inicial (sin filtro, 3 reseñas): hidratar no mueve nada.
 */

export type Stars = 1 | 2 | 3 | 4 | 5;

export interface ReviewItem {
  id: string;
  rating: number;
  /** "5 de 5 estrellas" */
  ratingLabel: string;
  title: string;
  body: string;
  author: string;
  /** ISO (atributo datetime) y texto formateado. */
  date: string;
  dateText: string;
  verified: boolean;
  /** Variante comprada: "Filtro · 250 g". */
  detail: string;
}

export interface RatingFilterItem {
  stars: Stars;
  /** Recuento de la distribución (agregado de la plataforma de reseñas). */
  count: number;
  /** Ancho de la barra, 0–100. */
  percent: number;
  /** "5 estrellas, 98 reseñas" */
  label: string;
  /** "Mostrando 98 reseñas de 5 estrellas" */
  filtering: string;
}

export interface ReviewsListText {
  filterLabel: string;
  clear: string;
  sort: string;
  loadMore: string;
  verified: string;
  emptyFilter: string;
  cleared: string;
}

interface ReviewsListProps {
  reviews: ReviewItem[];
  filters: RatingFilterItem[];
  text: ReviewsListText;
  pageSize?: number;
}

const FILTER_LABEL_ID = 'reviews-filter-label';

export function ReviewsList({ reviews, filters, text, pageSize = 3 }: ReviewsListProps) {
  const [filter, setFilter] = useState<Stars | null>(null);
  const [visible, setVisible] = useState(pageSize);
  const filterRefs = useRef(new Map<Stars, HTMLButtonElement>());
  const itemRefs = useRef(new Map<number, HTMLElement>());
  const pendingFocus = useRef<number | null>(null);

  const filtered = filter === null ? reviews : reviews.filter((review) => review.rating === filter);
  const shown = filtered.slice(0, visible);
  const active = filter === null ? undefined : filters.find((item) => item.stars === filter);

  // "Ver más": el foco pasa a la primera reseña nueva.
  useEffect(() => {
    if (pendingFocus.current === null) return;
    itemRefs.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [visible]);

  function applyFilter(item: RatingFilterItem) {
    setVisible(pageSize);
    if (filter === item.stars) {
      // Pulsar el filtro activo lo quita (aria-pressed funciona como interruptor).
      setFilter(null);
      announce(text.cleared);
      return;
    }
    setFilter(item.stars);
    const matches = reviews.some((review) => review.rating === item.stars);
    announce(matches ? item.filtering : `${item.filtering}. ${text.emptyFilter}`);
  }

  function clearFilter() {
    const previous = filter;
    setFilter(null);
    setVisible(pageSize);
    announce(text.cleared);
    // El botón "Quitar filtro" desaparece: el foco vuelve al filtro que estaba activo.
    if (previous !== null) filterRefs.current.get(previous)?.focus();
  }

  function loadMore() {
    pendingFocus.current = visible;
    setVisible((count) => count + pageSize);
  }

  return (
    <>
      <div
        role="group"
        aria-labelledby={FILTER_LABEL_ID}
        className="flex flex-col gap-1 lg:col-start-1 lg:row-start-3"
      >
        <p id={FILTER_LABEL_ID} className="sr-only type-overline-s text-text-tertiary lg:not-sr-only">
          {text.filterLabel}
        </p>
        {filters.map((item) => (
          <RatingFilter
            key={item.stars}
            item={item}
            selected={filter === item.stars}
            onSelect={applyFilter}
            buttonRef={(el) => {
              if (el) filterRefs.current.set(item.stars, el);
              else filterRefs.current.delete(item.stars);
            }}
          />
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-span-5 lg:row-start-1 lg:gap-4">
        {/* Barra: filtro activo + "Quitar filtro" y, en desktop, el orden. Altura fija en desktop. */}
        <div
          className={`${active ? 'flex' : 'hidden lg:flex'} flex-wrap items-center gap-3 lg:min-h-12 lg:pb-4`}
        >
          {active && (
            <>
              <p className="inline-flex items-center gap-2 rounded-full bg-bg-subtle px-3 py-2 type-label-s text-text-primary lg:px-4">
                <Icon name="filter" size={14} className="text-icon-primary lg:size-4" />
                {active.filtering}
              </p>
              <button
                type="button"
                onClick={clearFilter}
                className="inline-flex min-h-6 items-center type-label-s text-text-secondary underline underline-offset-2 transition-colors duration-[var(--duration-fast)] hover:text-text-primary"
              >
                {text.clear}
              </button>
            </>
          )}
          <p className="ml-auto hidden items-center gap-1.5 type-label-m text-text-primary lg:flex">
            {text.sort}
            <Icon name="chevron-down" size={16} className="text-icon-primary" />
          </p>
        </div>

        {shown.length > 0 ? (
          <ul role="list" className="flex flex-col gap-6 lg:gap-4">
            {shown.map((review, index) => (
              <li key={review.id}>
                <ReviewCard
                  review={review}
                  verifiedText={text.verified}
                  articleRef={(el) => {
                    if (el) itemRefs.current.set(index, el);
                    else itemRefs.current.delete(index);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-border-subtle py-8 type-body-m text-text-secondary">
            {text.emptyFilter}
          </p>
        )}

        {filtered.length > visible && (
          <div className="flex justify-center lg:pt-4">
            <button
              type="button"
              onClick={loadMore}
              className={buttonClasses({ variant: 'secondary', size: 'md', className: 'w-full lg:w-auto' })}
            >
              {text.loadMore}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------- Rating Filter (Figma 22:1833): Default · Hover · Selected · Disabled ---------- */

interface RatingFilterProps {
  item: RatingFilterItem;
  selected: boolean;
  onSelect: (item: RatingFilterItem) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

function RatingFilter({ item, selected, onSelect, buttonRef }: RatingFilterProps) {
  const disabled = item.count === 0;
  // El borde seleccionado es una sombra interior: la fila no cambia de tamaño.
  const state = disabled
    ? 'cursor-not-allowed'
    : selected
      ? 'bg-bg-subtle shadow-[inset_0_0_0_1px_var(--color-border-selected)]'
      : 'hover:bg-bg-subtle';
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={selected}
      aria-label={item.label}
      disabled={disabled}
      onClick={() => onSelect(item)}
      className={`flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors duration-[var(--duration-fast)] ${state}`}
    >
      <span className="flex shrink-0 items-center gap-1">
        <span className={`type-label-m ${disabled ? 'text-text-disabled' : 'text-text-primary'}`}>
          {item.stars}
        </span>
        <img src={disabled ? starEmpty : starFull} alt="" width={14} height={14} className="block size-3.5" />
      </span>
      <span className="relative h-1.5 min-w-px flex-1 overflow-hidden rounded-[3px] bg-bg-muted">
        {!disabled && (
          <span
            className={`absolute inset-y-0 left-0 rounded-[3px] ${selected ? 'bg-action-primary' : 'bg-rating-filled'}`}
            style={{ width: `${item.percent}%` }}
          />
        )}
      </span>
      <span
        className={`w-7 shrink-0 text-right type-mono-s ${disabled ? 'text-text-disabled' : 'text-text-secondary'}`}
      >
        {item.count}
      </span>
    </button>
  );
}

/* ---------- Review Card (Figma 22:1769) ---------- */

interface ReviewCardProps {
  review: ReviewItem;
  verifiedText: string;
  articleRef: (el: HTMLElement | null) => void;
}

function ReviewCard({ review, verifiedText, articleRef }: ReviewCardProps) {
  const titleId = `review-${review.id}-title`;
  return (
    <article
      ref={articleRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="flex flex-col gap-3 border-t border-border-subtle py-8"
    >
      <div className="flex items-center gap-3">
        <RatingStars value={review.rating} size="md" label={review.ratingLabel} className="shrink-0" />
        <h3 id={titleId} className="min-w-0 flex-1 type-heading-h4 text-text-primary">
          {review.title}
        </h3>
      </div>
      <p className="type-body-m text-text-secondary">{review.body}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="type-label-m-strong text-text-primary">{review.author}</span>
        <time dateTime={review.date} className="type-body-xs text-text-tertiary">
          {review.dateText}
        </time>
        {review.verified && (
          <span className="inline-flex items-center gap-1 type-body-xs text-text-success">
            <Icon name="badge-check" size={16} className="text-icon-success" />
            {verifiedText}
          </span>
        )}
        {review.detail && <span className="type-mono-s text-text-tertiary">{review.detail}</span>}
      </div>
    </article>
  );
}

export default ReviewsList;

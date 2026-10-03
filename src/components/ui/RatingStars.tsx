import starEmpty from '@/assets/ui/star-empty.svg?url';
import starFull from '@/assets/ui/star-full.svg?url';
import starHalf from '@/assets/ui/star-half.svg?url';

/** Rating Stars (Figma 17:413). Large 24 px, Medium 18 px, Small 14 px. */
export type RatingSize = 'lg' | 'md' | 'sm';

const starSize: Record<RatingSize, number> = { lg: 24, md: 18, sm: 14 };

/**
 * Medias estrellas como en Figma: 4,8 se pinta con 4 y media; solo desde 4,9 se ven 5 llenas
 * (se redondea hacia abajo a la media, con un margen de 0,1).
 */
export function starFills(value: number): Array<'full' | 'half' | 'empty'> {
  const rounded = Math.floor(value * 2 + 0.2) / 2;
  return Array.from({ length: 5 }, (_, i) => (rounded >= i + 1 ? 'full' : rounded >= i + 0.5 ? 'half' : 'empty'));
}

const src = { full: starFull, half: starHalf, empty: starEmpty };

interface RatingStarsProps {
  value: number;
  size?: RatingSize;
  /** Texto accesible, p. ej. "4,8 de 5 estrellas". Sin él, las estrellas son decorativas. */
  label?: string;
  className?: string;
}

/** Sirve como componente estático en Astro (sin directiva client:) y dentro de las islas. */
export function RatingStars({ value, size = 'md', label, className = '' }: RatingStarsProps) {
  const px = starSize[size];
  return (
    <span
      className={`inline-flex items-center ${size === 'sm' ? 'gap-0' : 'gap-0.5'} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {starFills(value).map((fill, i) => (
        <img key={i} src={src[fill]} alt="" width={px} height={px} className="block shrink-0" draggable={false} />
      ))}
    </span>
  );
}

export default RatingStars;

/**
 * Imagen de producto (Figma "Product Image" 10:864): composiciones vectoriales de 560 × 700 con
 * cinco vistas — Front 10:368, Back 10:417, Beans 10:489, Still Life 10:684 y Origin 10:744.
 * Piezas SVG de Figma + textos vivos (traducidos) desde ArtData, así sirve para los cinco cafés.
 *
 * Ocupa el 100 % del ancho de su contenedor con proporción 4:5 y escala todo con él (cqw, base
 * 560). Sin JS: sirve en Astro (estático) y dentro de islas. Con `alt` es una imagen con nombre
 * (claves `art/alt-*`); sin él, decorativa.
 *
 * El arco del fondo toma el color del café, como en las variantes de Packshot (Hambela, el único
 * diseñado en Product Image, usa terracota).
 */
import type { ArtData } from '@/lib/art';
import type { ImageView } from '@/lib/schemas';
import { ARCH_SIZE, archArt, beanUrl, cupUrl, landscapeUrl } from './assets';
import { Bag } from './Bag';
import { cq, fraunces, imgRole, loadAttrs, track, type ArtLoading } from './units';

export interface ProductImageProps {
  art: ArtData;
  view: ImageView;
  /** La imagen principal (LCP) va con 'eager' y fetchpriority alta; el resto 'lazy'. */
  loading?: 'eager' | 'lazy';
  /** Texto alternativo (claves `art/alt-*`). Sin él la ilustración es decorativa. */
  alt?: string | undefined;
  className?: string;
}

const u = cq(560);

const background: Record<ImageView, string> = {
  front: 'bg-illustration-backdrop',
  back: 'bg-illustration-backdrop',
  beans: 'bg-bg-muted',
  'still-life': 'bg-illustration-map-land',
  origin: 'bg-illustration-backdrop',
};

/** [left, top, ancho, giro°] en px de Figma. Alto = ancho × 1,3; giro sobre el centro. */
type BeanSpot = readonly [number, number, number, number];

/** Granos sueltos al pie (grupo "Beans" de 560 × 140 en Front, Back y Still Life). */
const SCATTER: readonly BeanSpot[] = [
  [50.8, 80.34, 18.4, 112], [427.69, 76.23, 21.8, -174], [255.89, 68.63, 23.8, 79],
  [109.58, 73.01, 24.6, -148], [216.5, 58.73, 23.8, 78], [310.7, 84.83, 19.8, 172],
  [185.61, 97.05, 19.6, 4], [302.88, 92.05, 21, 5], [438.92, 81.28, 22.8, 35],
];

/** Campo de granos de la vista Beans (63 granos sobre 560 × 700). */
const FIELD: readonly BeanSpot[] = [
  [12.69, 23.32, 34.6, 96], [38.7, 116.56, 30.4, 51], [13.2, 198.42, 36.6, 54],
  [31.2, 250.07, 37, 58], [14.29, 329.85, 32.4, 54], [20.4, 406.78, 39.4, -84],
  [30.72, 506.15, 41.6, 99], [23.2, 572.41, 33.4, -97], [40.59, 648.54, 41.8, 75],
  [132.3, 20.53, 31.2, -10], [125.02, 126.29, 33.2, 60], [131.29, 174.12, 37.8, -38],
  [127.1, 259.5, 35.2, 108], [122.5, 359.6, 36, 28], [114.3, 436.76, 32.2, -98],
  [119.92, 503.62, 41.4, -162], [133.82, 587.7, 33.2, -73], [129.78, 658.12, 31.8, -179],
  [209.82, 37.09, 34.8, -148], [209.98, 94.05, 33.8, 102], [197.88, 184.97, 30.8, 17],
  [202.1, 284.58, 32.2, 75], [213.41, 349.95, 41, -108], [177.88, 427.94, 36.4, -82],
  [186.89, 509.57, 33, -69], [200.28, 582.54, 36.4, -50], [196.81, 678.32, 31.2, 147],
  [283.6, 28.35, 33, -48], [284.4, 113.26, 36.4, -45], [277.9, 193, 34.6, 52],
  [270.42, 281.54, 33, 3], [259.92, 330.09, 38.6, -67], [277, 441.21, 41.4, -122],
  [278, 491, 32, 57], [277.82, 584.01, 36.4, -86], [289.1, 681.57, 35.4, -119],
  [376.8, 14.13, 38.4, 153], [368, 102.23, 40.6, 141], [352.8, 187.6, 40.6, -15],
  [355.71, 285.46, 35, -49], [368.99, 342.91, 37.4, 60], [343.82, 435.34, 35.2, 101],
  [372.82, 494.62, 37.8, 142], [353.52, 589.21, 31.2, 77], [371.19, 663.81, 34.4, 126],
  [422.1, 18.53, 39.6, 154], [458.78, 110.58, 38.8, 14], [451.88, 189.76, 36.2, 149],
  [454.7, 265.59, 34.6, 96], [456.41, 362.77, 35.6, 114], [422.51, 408.02, 40.4, -14],
  [443.9, 520.91, 36.6, -140], [433.6, 575.25, 37.6, -97], [436.92, 656.93, 31.8, -141],
  [522.78, 14.9, 30.6, 81], [532.1, 111.94, 32.4, 140], [512.3, 188.81, 30.6, 1],
  [526.89, 275.28, 38, -145], [526.49, 339.65, 41.6, 126], [529.6, 419.69, 36.6, -19],
  [530.29, 500.04, 35, 145], [507.98, 592.23, 35.6, -1], [542.7, 684.49, 30, 1],
];

function Beans({ spots, offsetY = 0, loading, main = false }: { spots: readonly BeanSpot[]; offsetY?: number; loading: ArtLoading; main?: boolean }) {
  // Un solo SVG de grano para todos (misma URL = una petición); alto por proporción (20 × 26 = 1,3).
  return (
    <>
      {spots.map(([x, y, w, deg], i) => (
        <img
          key={i}
          src={beanUrl}
          alt=""
          width={20}
          height={26}
          {...loadAttrs(loading, main && i === 0)}
          className="absolute h-auto max-w-none"
          style={{ left: u(x), top: u(y + offsetY), width: u(w), transform: `rotate(${deg}deg)` }}
        />
      ))}
    </>
  );
}

/** Pieza SVG colocada en su caja de Figma: [left, top, ancho, alto] en px. */
function Piece({ src, size, box, loading, main = false, className = '' }: {
  src: string;
  size: { w: number; h: number };
  box: readonly [number, number, number, number];
  loading: ArtLoading;
  main?: boolean;
  className?: string;
}) {
  const [x, y, w, h] = box;
  return (
    <img
      src={src}
      alt=""
      width={size.w}
      height={size.h}
      {...loadAttrs(loading, main)}
      className={className ? `absolute max-w-none ${className}` : "absolute max-w-none"}
      style={{ left: u(x), top: u(y), width: u(w), height: u(h) }}
    />
  );
}

export function ProductImage({ art, view, loading = 'lazy', alt, className = '' }: ProductImageProps) {
  const arch = archArt[art.colorway];
  // Con 'eager' solo cargan de inmediato las piezas grandes (arco, bolsa, paisaje, grano de la vista
  // Beans); los granos sueltos y la taza son pequeños y van siempre en diferido.

  return (
    <div
      {...imgRole(alt)}
      data-view={view}
      className={`@container relative aspect-[4/5] w-full overflow-hidden select-none ${background[view]} ${className}`}
    >
      {(view === 'front' || view === 'back') && (
        <>
          <Piece src={arch} size={ARCH_SIZE} box={[90, 110, 380, 540]} loading={loading} main />
          <Bag
            colorway={art.colorway}
            side={view}
            name={art.name}
            origin={art.origin}
            footer={art.footer}
            left={u(125)}
            top={u(168.5)}
            width={u(310)}
            loading={loading}
            main
          />
          <Beans spots={SCATTER} offsetY={550} loading="lazy" />
        </>
      )}

      {view === 'still-life' && (
        <>
          {/* El arco va al 70 % sobre el verde, como en Figma */}
          <Piece src={arch} size={ARCH_SIZE} box={[90, 70, 380, 540]} loading={loading} main className="opacity-70" />
          <Bag
            colorway={art.colorway}
            side="front"
            name={art.name}
            origin={art.origin}
            footer={art.footer}
            left={u(52)}
            top={u(225)}
            width={u(250)}
            loading={loading}
            main
          />
          <Piece src={cupUrl} size={{ w: 230, h: 190 }} box={[278, 360, 230, 190]} loading="lazy" />
          <Beans spots={SCATTER} offsetY={530} loading="lazy" />
        </>
      )}

      {view === 'beans' && (
        <>
          <Beans spots={FIELD} loading={loading} main />
          {/* Sello central de 168 px */}
          <div
            className="absolute flex flex-col items-center justify-center overflow-hidden rounded-full bg-bg-surface whitespace-nowrap"
            style={{ left: u(196), top: u(266), width: u(168), height: u(168), gap: u(4) }}
          >
            <span className="font-mono font-medium text-text-accent uppercase" style={{ fontSize: u(11), lineHeight: u(14), ...track(0.2) }}>
              {art.lot}
            </span>
            <span className="font-display font-light text-text-primary italic" style={{ ...fraunces, fontSize: u(30), lineHeight: u(37) }}>
              {art.process}
            </span>
            <span className="font-mono font-normal text-text-secondary uppercase" style={{ fontSize: u(10), lineHeight: u(13), ...track(0.12) }}>
              {art.altitude}
            </span>
          </div>
        </>
      )}

      {view === 'origin' && (
        <>
          <Piece src={landscapeUrl} size={{ w: 560, h: 700 }} box={[0, 0, 560, 700]} loading={loading} main />
          <div className="absolute flex flex-col items-start whitespace-nowrap" style={{ left: u(40), top: u(40), gap: u(6) }}>
            <span className="font-mono font-medium text-text-primary uppercase" style={{ fontSize: u(12), lineHeight: u(16), letterSpacing: '0.16em' }}>
              {art.place}
            </span>
            <span className="font-display font-light text-text-primary italic" style={{ ...fraunces, fontSize: u(40), lineHeight: u(44) }}>
              {art.region}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductImage;

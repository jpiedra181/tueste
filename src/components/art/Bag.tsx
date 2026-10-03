/**
 * Bolsa ilustrada (Figma "Bag" 10:362: Colorway × Side, 200 × 260). Pieza interna de ProductImage
 * y Packshot: el padre la coloca con left/top/width en sus propias unidades cqw y la bolsa escala
 * su etiqueta respecto a su ancho (base 200 px). La cara trasera no lleva textos.
 */
import type { Colorway } from '@/lib/schemas';
import { bagArt, type BagSide } from './assets';
import { cq, fraunces, loadAttrs, track, type ArtLoading } from './units';

const u = cq(200);

/** Pie de la etiqueta frontal (igual en ES y EN). */
export const BAG_FOOTER = '250 g · Segovia';

interface BagProps {
  colorway: Colorway;
  side: BagSide;
  name?: string;
  origin?: string;
  footer?: string;
  /** Posición y ancho ya convertidos a las unidades del contenedor padre. */
  left: string;
  top: string;
  width: string;
  loading: ArtLoading;
  /** Pieza principal de la imagen (prioridad alta si es la LCP). */
  main?: boolean;
}

export function Bag({ colorway, side, name = '', origin = '', footer = BAG_FOOTER, left, top, width, loading, main = false }: BagProps) {
  return (
    <div className="@container absolute aspect-[200/260]" style={{ left, top, width }}>
      <img
        src={bagArt[colorway][side]}
        alt=""
        width={200}
        height={260}
        {...loadAttrs(loading, main)}
        className="absolute inset-0 size-full max-w-none"
      />
      {side === 'front' && (
        // Etiqueta: 108 × 122 en (46, 100); columna centrada, pie empujado abajo por el hueco flexible.
        <div
          className="absolute flex flex-col items-center overflow-hidden whitespace-nowrap"
          style={{ left: u(46), top: u(100), width: u(108), height: u(122), paddingTop: u(12), paddingBottom: u(10), gap: u(5) }}
        >
          <span className="font-mono font-medium text-text-primary" style={{ fontSize: u(7), lineHeight: u(9), ...track(0.28) }}>
            TUESTE
          </span>
          <span className="shrink-0 bg-border-strong" style={{ width: u(20), height: u(1) }} />
          <span
            className="text-center font-display font-light text-text-primary italic"
            style={{ ...fraunces, fontSize: u(21), lineHeight: u(24), ...track(-0.02) }}
          >
            {name}
          </span>
          <span
            className="text-center font-mono font-medium text-text-secondary uppercase"
            style={{ fontSize: u(6.5), lineHeight: u(9), ...track(0.1) }}
          >
            {origin}
          </span>
          <span className="flex-1" />
          <span className="font-mono font-normal text-text-tertiary uppercase" style={{ fontSize: u(6.5), lineHeight: u(8), ...track(0.16) }}>
            {footer}
          </span>
        </div>
      )}
    </div>
  );
}

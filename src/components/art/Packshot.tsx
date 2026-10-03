/**
 * Packshot (Figma "Packshot" 21:2091: Colorway × Size). Bolsa del color del café sobre su arco,
 * para tarjetas (card 296 × 370), miniaturas de cesta (thumb 88 × 110), resumen del pedido
 * (mini 64 × 80) y usos diminutos (micro 48 × 60). Todos los tamaños son 4:5.
 *
 * Figma lo construye "nativo por tamaño" (medidas redondeadas en cada uno), así que cada tamaño
 * tiene su geometría; dentro de ella todo va en cqw respecto a su ancho y ocupa el ancho del
 * contenedor. Decorativo salvo que se pase `alt` (en las tarjetas el nombre ya está al lado).
 */
import type { Colorway } from '@/lib/schemas';
import { ARCH_SIZE, archArt } from './assets';
import { Bag } from './Bag';
import { cq, imgRole, loadAttrs } from './units';

export type PackshotSize = 'card' | 'thumb' | 'mini' | 'micro';

export interface PackshotProps {
  colorway: Colorway;
  name: string;
  origin: string;
  size: PackshotSize;
  /** 'eager' para la imagen LCP (añade fetchpriority alta); por defecto 'lazy'. */
  loading?: 'eager' | 'lazy';
  /** Pie de la etiqueta; por defecto "250 g · Segovia". */
  footer?: string;
  alt?: string | undefined;
  className?: string;
}

interface Geometry {
  /** Ancho del frame en Figma (px). */
  base: number;
  /** Arco: [left, top, ancho, alto]. */
  arch: readonly [number, number, number, number];
  /** Bolsa: [left, top, ancho] (alto = ancho × 1,3), centrada con el padding superior de Figma. */
  bag: readonly [number, number, number];
}

const geometry: Record<PackshotSize, Geometry> = {
  card: { base: 296, arch: [47, 58, 201, 285], bag: [66.067, 88.9875, 163.866] },
  thumb: { base: 88, arch: [14, 17, 60, 85], bag: [19.6415, 26.334, 48.717] },
  mini: { base: 64, arch: [10, 13, 44, 62], bag: [14.285, 19.47, 35.43] },
  micro: { base: 48, arch: [8, 9, 33, 46], bag: [10.7135, 14.2275, 26.573] },
};

export function Packshot({ colorway, name, origin, size, loading = 'lazy', footer, alt, className = '' }: PackshotProps) {
  const { base, arch, bag } = geometry[size];
  const u = cq(base);
  const [ax, ay, aw, ah] = arch;
  const [bx, by, bw] = bag;

  return (
    <div
      {...imgRole(alt)}
      data-size={size}
      className={`@container relative aspect-[4/5] w-full overflow-hidden bg-illustration-backdrop select-none ${className}`}
    >
      <img
        src={archArt[colorway]}
        alt=""
        width={ARCH_SIZE.w}
        height={ARCH_SIZE.h}
        {...loadAttrs(loading, true)}
        className="absolute max-w-none"
        style={{ left: u(ax), top: u(ay), width: u(aw), height: u(ah) }}
      />
      <Bag
        colorway={colorway}
        side="front"
        name={name}
        origin={origin}
        {...(footer ? { footer } : {})}
        left={u(bx)}
        top={u(by)}
        width={u(bw)}
        loading={loading}
        main
      />
    </div>
  );
}

export default Packshot;

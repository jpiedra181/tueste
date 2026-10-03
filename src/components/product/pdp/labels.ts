/** Claves de i18n de las opciones de variante y de los textos alternativos de la galería. */
import type { UIKey } from '@/i18n';
import type { ArtData } from '@/lib/art';
import type { Grind, ImageView, Size } from '@/lib/schemas';

export const grindLabelKey: Record<Grind, UIKey> = {
  beans: 'pdp/grind-beans',
  espresso: 'pdp/grind-espresso',
  filter: 'pdp/grind-filter',
};

export const sizeLabelKey: Record<Size, UIKey> = {
  '250g': 'pdp/size-250g',
  '1kg': 'pdp/size-1kg',
};

const altKey: Record<ImageView, UIKey> = {
  front: 'art/alt-front',
  back: 'art/alt-back',
  beans: 'art/alt-beans',
  'still-life': 'art/alt-still-life',
  origin: 'art/alt-origin',
};

/** Texto alternativo de cada vista de la galería ("Bolsa de Hambela, Etiopía · Natural, vista frontal"). */
export function imageAlt(t: (key: UIKey, params?: Record<string, string | number>) => string, view: ImageView, art: ArtData): string {
  return t(altKey[view], { name: art.name, origin: art.origin, lot: art.lot, process: art.process, region: art.region });
}

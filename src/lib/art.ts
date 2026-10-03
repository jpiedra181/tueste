/** Datos que necesitan las ilustraciones de producto (textos ya traducidos). */
import type { Locale } from '@/i18n';
import type { Colorway, Product } from './schemas';

export interface ArtData {
  name: string;
  colorway: Colorway;
  /** Etiqueta frontal de la bolsa: "Etiopía · Natural" (se pinta en mayúsculas). */
  origin: string;
  /** Pie de la etiqueta frontal: "250 g · Segovia". */
  footer: string;
  /** Vista "Beans": "Lote 07", "Natural", "2.100 m · Guji". */
  lot: string;
  process: string;
  altitude: string;
  /** Vista "Origin": "Hambela Wamena · 2.100 m" y "Guji, Etiopía". */
  place: string;
  region: string;
}

export function artFor(product: Product, locale: Locale): ArtData {
  return {
    name: product.name,
    colorway: product.colorway,
    origin: product.card.origin[locale],
    footer: '250 g · Segovia',
    lot: product.art.lot[locale],
    process: product.art.process[locale],
    altitude: product.art.altitude[locale],
    place: product.art.place[locale],
    region: product.art.region[locale],
  };
}

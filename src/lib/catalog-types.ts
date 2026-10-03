/**
 * Tipos del catálogo que viajan a las islas (props serializadas). Sin textos de otros idiomas:
 * el servidor ya los entrega traducidos.
 */
import type { SubscriptionTerms } from './pricing';
import type { Colorway, Grind, Size } from './schemas';

export interface CatalogVariant {
  sku: string;
  productId: string;
  name: string;
  colorway: Colorway;
  grind: Grind;
  size: Size;
  grams: number;
  price: number;
  stock: number;
  subscription: SubscriptionTerms | null;
  /** URL de la ficha en el idioma actual, sin parámetros. */
  url: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  colorway: Colorway;
  origin: string;
  notes: string;
  defaultSku: string;
  url: string;
}

export interface CartCatalog {
  variants: Record<string, CatalogVariant>;
  products: CatalogProduct[];
}

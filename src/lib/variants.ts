/**
 * Selección de variantes: disponibilidad por combinación y sincronización con la URL.
 * Sin dependencias de Astro: lo usan la isla PurchasePanel y los tests.
 */
import { queryParams, type Locale } from '@/i18n';
import type { Grind, Size } from './schemas';

export interface VariantLike {
  sku: string;
  grind: Grind;
  size: Size;
  grams: number;
  price: number;
  stock: number;
}

export interface ProductLike<V extends VariantLike = VariantLike> {
  options: { grind: Grind[]; size: Size[] };
  variants: V[];
  defaultSku: string;
}

export interface Selection {
  grind: Grind;
  size: Size;
}

export const isAvailable = (variant: VariantLike | undefined): boolean => !!variant && variant.stock > 0;

export function findVariant<V extends VariantLike>(product: ProductLike<V>, selection: Selection): V | undefined {
  return product.variants.find((v) => v.grind === selection.grind && v.size === selection.size);
}

export function defaultSelection(product: ProductLike): Selection {
  const variant = product.variants.find((v) => v.sku === product.defaultSku) ?? product.variants[0]!;
  return { grind: variant.grind, size: variant.size };
}

/** Una molienda está disponible si alguno de sus tamaños tiene stock. */
export function isGrindAvailable(product: ProductLike, grind: Grind): boolean {
  return product.variants.some((v) => v.grind === grind && v.stock > 0);
}

/** Un tamaño depende de la molienda elegida. */
export function isSizeAvailable(product: ProductLike, grind: Grind, size: Size): boolean {
  return isAvailable(findVariant(product, { grind, size }));
}

export interface ResolvedSelection {
  selection: Selection;
  /** true si la selección pedida no era válida o estaba agotada y se ha corregido. */
  adjusted: boolean;
}

/**
 * Convierte una selección parcial (p. ej. la de la URL) en una válida y disponible:
 * 1. Valores desconocidos → los de la variante por defecto.
 * 2. Si la combinación está agotada, se mantiene la molienda y se busca el primer tamaño con stock.
 * 3. Si esa molienda está agotada entera, primera variante con stock en el orden de las opciones.
 */
export function resolveSelection(product: ProductLike, requested: Partial<Selection>): ResolvedSelection {
  const fallback = defaultSelection(product);
  const grind = requested.grind && product.options.grind.includes(requested.grind) ? requested.grind : fallback.grind;
  const size = requested.size && product.options.size.includes(requested.size) ? requested.size : fallback.size;
  let adjusted = grind !== requested.grind && requested.grind !== undefined;
  adjusted ||= size !== requested.size && requested.size !== undefined;

  if (isSizeAvailable(product, grind, size)) return { selection: { grind, size }, adjusted };

  const sameGrind = product.options.size.find((s) => isSizeAvailable(product, grind, s));
  if (sameGrind) return { selection: { grind, size: sameGrind }, adjusted: true };

  for (const g of product.options.grind) {
    for (const s of product.options.size) {
      if (isSizeAvailable(product, g, s)) return { selection: { grind: g, size: s }, adjusted: true };
    }
  }
  // Todo agotado: se muestra la combinación pedida, con el botón de compra deshabilitado.
  return { selection: { grind, size }, adjusted };
}

/** Al cambiar de molienda: si el tamaño actual queda agotado, salta al primero disponible. */
export function selectGrind(product: ProductLike, current: Selection, grind: Grind): ResolvedSelection {
  if (isSizeAvailable(product, grind, current.size)) return { selection: { grind, size: current.size }, adjusted: false };
  const size = product.options.size.find((s) => isSizeAvailable(product, grind, s));
  return size ? { selection: { grind, size }, adjusted: true } : { selection: { grind, size: current.size }, adjusted: false };
}

/* ---------- URL ---------- */

function reverseLookup<T extends string>(values: Record<T, string>, needle: string | null): T | undefined {
  if (!needle) return undefined;
  const lower = needle.toLowerCase();
  return (Object.keys(values) as T[]).find((key) => values[key] === lower);
}

/** ?molienda=espresso&tamano=1kg → { grind: 'espresso', size: '1kg' } */
export function selectionFromSearch(locale: Locale, search: URLSearchParams | string): Partial<Selection> {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const names = queryParams[locale];
  const grind = reverseLookup<Grind>(names.grindValues, params.get(names.grind));
  const size = reverseLookup<Size>(names.sizeValues, params.get(names.size));
  return { ...(grind && { grind }), ...(size && { size }) };
}

/** Escribe la selección en los parámetros, conservando el resto (utm, etc.). */
export function selectionToSearch(locale: Locale, selection: Selection, base?: URLSearchParams | string): string {
  const params = new URLSearchParams(base ?? '');
  const names = queryParams[locale];
  params.set(names.grind, names.grindValues[selection.grind]);
  params.set(names.size, names.sizeValues[selection.size]);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Traduce los parámetros de variante al cambiar de idioma: ?molienda=filtro → ?grind=filter */
export function translateSearch(from: Locale, to: Locale, search: string): string {
  const params = new URLSearchParams(search);
  const partial = selectionFromSearch(from, params);
  const names = queryParams[from];
  params.delete(names.grind);
  params.delete(names.size);
  if (!partial.grind && !partial.size) {
    const rest = params.toString();
    return rest ? `?${rest}` : '';
  }
  const target = queryParams[to];
  if (partial.grind) params.set(target.grind, target.grindValues[partial.grind]);
  if (partial.size) params.set(target.size, target.sizeValues[partial.size]);
  return `?${params.toString()}`;
}

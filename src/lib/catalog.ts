/** Acceso al catálogo en build (solo servidor). */
import { getCollection } from 'astro:content';
import { routePath, type Locale } from '@/i18n';
import type { CartCatalog } from './catalog-types';
import type { L10n, Product, Review } from './schemas';

export async function getProducts(): Promise<Product[]> {
  const entries = await getCollection('products');
  return entries.map((entry) => entry.data);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return (await getProducts()).find((product) => product.id === id);
}

export async function getReviews(productId: string): Promise<Review[]> {
  const entries = await getCollection('reviews');
  return entries
    .map((entry) => entry.data)
    .filter((review) => review.productId === productId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function localize(text: L10n, locale: Locale): string {
  return text[locale];
}

/** Índice ligero para la cesta y el checkout (se pasa como prop a las islas). */
export function buildCartCatalog(products: Product[], locale: Locale): CartCatalog {
  const variants: CartCatalog['variants'] = {};
  for (const product of products) {
    const url = routePath(locale, { name: 'product', slug: product.id });
    for (const variant of product.variants) {
      variants[variant.sku] = {
        sku: variant.sku,
        productId: product.id,
        name: product.name,
        colorway: product.colorway,
        grind: variant.grind,
        size: variant.size,
        grams: variant.grams,
        price: variant.price,
        stock: variant.stock,
        subscription: product.subscription,
        url,
      };
    }
  }
  return {
    variants,
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      colorway: product.colorway,
      origin: product.card.origin[locale],
      notes: product.card.notes[locale],
      defaultSku: product.defaultSku,
      url: routePath(locale, { name: 'product', slug: product.id }),
    })),
  };
}

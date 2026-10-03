/**
 * Esquemas del catálogo. Los usa content.config.ts para validar src/data/*.json en el build,
 * y los tests para comprobar la coherencia entre productos, variantes y reseñas.
 */
import { z } from 'zod';
import { badges, colorways, grinds, imageViews, roastLevels, sizes } from './options';

export * from './options';

export const l10n = z.object({ es: z.string().min(1), en: z.string().min(1) });
export type L10n = z.infer<typeof l10n>;

const level = z.number().int().min(1).max(5);
const cents = z.number().int().positive();

export const variantSchema = z.object({
  sku: z.string().regex(/^[A-Z]{3}-[A-Z]{3}-(250|1KG)$/),
  grind: z.enum(grinds),
  size: z.enum(sizes),
  grams: z.number().int().positive(),
  /** Precio en céntimos, IVA incluido. */
  price: cents,
  compareAtPrice: cents.optional(),
  /** Unidades disponibles. 0 = agotado. */
  stock: z.number().int().min(0),
});
export type Variant = z.infer<typeof variantSchema>;

export const tastingNoteSchema = z.object({
  id: z.string(),
  /** Ilustración del componente "Tasting Note" de Figma (solo existen estas tres). */
  illustration: z.enum(['blueberry', 'jasmine', 'bergamot']).optional(),
  /** Color del círculo cuando la nota no tiene ilustración propia. */
  tone: z.enum(colorways),
  name: l10n,
  description: l10n,
});

export const productSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    colorway: z.enum(colorways),
    badges: z.array(z.enum(badges)),
    eyebrow: l10n,
    subtitle: l10n,
    /** Textos cortos de la tarjeta de producto y de la etiqueta de la bolsa. */
    card: z.object({ origin: l10n, notes: l10n }),
    roastedOn: z.iso.date(),
    /** Textos de las ilustraciones (vista "Beans" y vista "Origin"). */
    art: z.object({ lot: l10n, process: l10n, altitude: l10n, place: l10n, region: l10n }),
    images: z.array(z.enum(imageViews)).min(1),
    tasting: z.object({
      lede: l10n,
      notes: z.array(tastingNoteSchema).length(3),
      acidity: level,
      sweetness: level,
      body: level,
      roast: z.enum(roastLevels),
    }),
    origin: z.object({
      lede: l10n,
      /** Solo Etiopía tiene mapa de puntos en Figma; sin mapa se muestra la ilustración "Origin". */
      map: z.object({ country: l10n, region: l10n, capital: l10n, coords: z.string() }).optional(),
      specs: z.object({
        region: l10n,
        producer: l10n,
        altitude: l10n,
        variety: l10n,
        process: l10n,
        harvest: l10n,
      }),
    }),
    brew: l10n,
    subscription: z
      .object({ discountPct: z.number().int().min(1).max(50), intervalWeeks: z.number().int().positive() })
      .nullable(),
    /** Agregado de la plataforma de reseñas (el JSON de reseñas solo trae las publicadas). */
    rating: z.object({
      average: z.number().min(0).max(5),
      count: z.number().int().min(0),
      distribution: z.object({ 5: z.number().int(), 4: z.number().int(), 3: z.number().int(), 2: z.number().int(), 1: z.number().int() }),
    }),
    options: z.object({ grind: z.array(z.enum(grinds)).min(1), size: z.array(z.enum(sizes)).min(1) }),
    variants: z.array(variantSchema).min(1),
    defaultSku: z.string(),
    related: z.array(z.string()),
  })
  .superRefine((product, ctx) => {
    const skus = new Set<string>();
    for (const variant of product.variants) {
      if (skus.has(variant.sku)) ctx.addIssue({ code: 'custom', message: `SKU duplicado: ${variant.sku}` });
      skus.add(variant.sku);
    }
    // Cada combinación de opciones existe exactamente una vez.
    for (const grind of product.options.grind) {
      for (const size of product.options.size) {
        const matches = product.variants.filter((v) => v.grind === grind && v.size === size);
        if (matches.length !== 1) {
          ctx.addIssue({ code: 'custom', message: `${product.id}: la combinación ${grind}/${size} aparece ${matches.length} veces` });
        }
      }
    }
    if (!skus.has(product.defaultSku)) {
      ctx.addIssue({ code: 'custom', message: `${product.id}: defaultSku ${product.defaultSku} no existe` });
    }
    const { distribution, count } = product.rating;
    const total = distribution[5] + distribution[4] + distribution[3] + distribution[2] + distribution[1];
    if (total !== count) {
      ctx.addIssue({ code: 'custom', message: `${product.id}: la distribución suma ${total} y count es ${count}` });
    }
  });
export type Product = z.infer<typeof productSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  author: z.string(),
  date: z.iso.date(),
  title: l10n,
  body: l10n,
  sku: z.string(),
  verified: z.boolean(),
});
export type Review = z.infer<typeof reviewSchema>;

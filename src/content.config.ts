import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { productSchema, reviewSchema } from './lib/schemas';

const products = defineCollection({
  loader: file('src/data/products.json'),
  schema: productSchema,
});

const reviews = defineCollection({
  loader: file('src/data/reviews.json'),
  schema: reviewSchema,
});

export const collections = { products, reviews };

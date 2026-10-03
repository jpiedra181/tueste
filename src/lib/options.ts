/**
 * Valores de las opciones del catálogo, sin dependencias: los pueden importar las islas sin
 * arrastrar Zod ni los esquemas del catálogo (src/lib/schemas.ts los reutiliza).
 */
export const grinds = ['beans', 'espresso', 'filter'] as const;
export const sizes = ['250g', '1kg'] as const;
export const colorways = ['terracotta', 'sage', 'ochre', 'blue', 'plum', 'ink'] as const;
export const imageViews = ['front', 'back', 'beans', 'still-life', 'origin'] as const;
export const roastLevels = ['light', 'light-medium', 'medium', 'medium-dark', 'dark'] as const;
export const badges = ['new', 'limited', 'bestseller'] as const;

export type Grind = (typeof grinds)[number];
export type Size = (typeof sizes)[number];
export type Colorway = (typeof colorways)[number];
export type ImageView = (typeof imageViews)[number];
export type RoastLevel = (typeof roastLevels)[number];
export type BadgeKind = (typeof badges)[number];

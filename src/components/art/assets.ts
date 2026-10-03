/**
 * Piezas SVG de las ilustraciones, descargadas de Figma sin modificar (src/assets/art).
 * Se reutiliza un fichero cuando Figma exporta la misma geometría varias veces:
 *  - Bolsa: las variantes base de "Bag" (10:362, 200 × 260); las instancias de Product Image y
 *    Packshot son esas mismas bolsas escaladas.
 *  - Arco: el de Packshot Card por color (201 × 285); Figma escala ese mismo arco a cada tamaño
 *    (Product Image 380 × 540, Thumb, Mini, Micro), así que se estira a la caja de cada uno.
 *    Plum comparte arco con Terracotta e Ink con Blue, como en Figma.
 *  - Grano: los 72 granos de las vistas son el mismo dibujo a distintos tamaños; uno solo.
 */
import type { Colorway } from '@/lib/schemas';

import archCream from '@/assets/art/arch/cream.svg?url';
import archOchre from '@/assets/art/arch/ochre.svg?url';
import archSage from '@/assets/art/arch/sage.svg?url';
import archTerracotta from '@/assets/art/arch/terracotta.svg?url';
import blueBack from '@/assets/art/bag/blue-back.svg?url';
import blueFront from '@/assets/art/bag/blue-front.svg?url';
import inkBack from '@/assets/art/bag/ink-back.svg?url';
import inkFront from '@/assets/art/bag/ink-front.svg?url';
import ochreBack from '@/assets/art/bag/ochre-back.svg?url';
import ochreFront from '@/assets/art/bag/ochre-front.svg?url';
import plumBack from '@/assets/art/bag/plum-back.svg?url';
import plumFront from '@/assets/art/bag/plum-front.svg?url';
import sageBack from '@/assets/art/bag/sage-back.svg?url';
import sageFront from '@/assets/art/bag/sage-front.svg?url';
import terracottaBack from '@/assets/art/bag/terracotta-back.svg?url';
import terracottaFront from '@/assets/art/bag/terracotta-front.svg?url';

export { default as beanUrl } from '@/assets/art/bean.svg?url';
export { default as cupUrl } from '@/assets/art/cup.svg?url';
export { default as landscapeUrl } from '@/assets/art/landscape.svg?url';
export { default as originMapUrl } from '@/assets/art/origin-map.svg?url';
export { default as blueberryUrl } from '@/assets/art/notes/blueberry.svg?url';
export { default as jasmineUrl } from '@/assets/art/notes/jasmine.svg?url';
export { default as bergamotUrl } from '@/assets/art/notes/bergamot.svg?url';

export type BagSide = 'front' | 'back';

export const bagArt: Record<Colorway, Record<BagSide, string>> = {
  terracotta: { front: terracottaFront, back: terracottaBack },
  sage: { front: sageFront, back: sageBack },
  ochre: { front: ochreFront, back: ochreBack },
  blue: { front: blueFront, back: blueBack },
  plum: { front: plumFront, back: plumBack },
  ink: { front: inkFront, back: inkBack },
};

/** Tamaño propio de los SVG (atributos width/height de las <img>). */
export const ARCH_SIZE = { w: 201, h: 285 } as const;

export const archArt: Record<Colorway, string> = {
  terracotta: archTerracotta,
  sage: archSage,
  ochre: archOchre,
  blue: archCream,
  plum: archTerracotta,
  ink: archCream,
};

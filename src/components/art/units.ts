/**
 * Utilidades comunes de las ilustraciones (composiciones vectoriales de Figma).
 *
 * Cada ilustración es un contenedor (`@container`, container-type: inline-size) y todas sus
 * medidas internas se expresan en `cqw` respecto al ancho del frame de Figma: 1 px del diseño =
 * 100/base cqw. Así la misma composición sirve a 720 px en la galería y a 48 px en una miniatura.
 * Ojo: los estilos del propio elemento contenedor no pueden usar cqw (se resolverían contra el
 * contenedor de fuera); solo sus descendientes.
 */
import type { CSSProperties } from 'react';

/** `cq(560)(125)` → "22.3214cqw". */
export function cq(base: number) {
  return (px: number): string => `${+((px * 100) / base).toFixed(4)}cqw`;
}

/** Ejes de Fraunces que usa el sistema en todos sus textos. */
export const fraunces: CSSProperties = { fontVariationSettings: "'SOFT' 0, 'WONK' 1" };

/**
 * Tracking en em. Figma no cuenta el espaciado tras la última letra y CSS sí: el margen negativo
 * lo descuenta para que el texto centrado quede donde en el diseño.
 */
export function track(em: number): CSSProperties {
  return { letterSpacing: `${em}em`, marginRight: `${-em}em` };
}

export type ArtLoading = 'eager' | 'lazy';

/** Atributos de carga de cada pieza SVG: la principal de una imagen LCP va con prioridad alta. */
export function loadAttrs(loading: ArtLoading, main = false) {
  return {
    loading,
    decoding: 'async' as const,
    ...(loading === 'eager' && main ? { fetchPriority: 'high' as const } : {}),
  };
}

/**
 * Raíz accesible: con `alt` es una imagen con nombre; sin él es decorativa y se oculta entera
 * (los textos de la etiqueta no deben leerse sueltos).
 */
export function imgRole(alt: string | undefined) {
  return alt ? { role: 'img' as const, 'aria-label': alt } : { 'aria-hidden': true as const };
}

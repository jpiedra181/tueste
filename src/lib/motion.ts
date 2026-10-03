/**
 * Microinteracciones con Web Animations (sin librerías). Duraciones y curva salen de los tokens de
 * movimiento de tokens.css (--duration-*, --ease-out), que valen 0 ms con prefers-reduced-motion.
 */

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Valor de --duration-<token> en ms (0 si no se puede leer). */
export function motionMs(token: 'instant' | 'fast' | 'base' | 'slow'): number {
  if (typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--duration-${token}`).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

/** Curva --ease-out como texto: WAAPI no resuelve var(). */
export function easeOut(): string {
  if (typeof document === 'undefined') return 'ease-out';
  return getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'ease-out';
}

export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/** Fundido corto con leve subida: precio y €/kg al cambiar de variante. */
export function fadeUp(element: Element | null, distance = 6): void {
  if (!element || prefersReducedMotion()) return;
  element.animate(
    [
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { duration: motionMs('base'), easing: easeOut() },
  );
}

/** Aparición de capas (zoom, lightbox). */
export function fadeIn(element: Element | null, from: Keyframe = {}): void {
  if (!element || prefersReducedMotion()) return;
  element.animate([{ opacity: 0, ...from }, { opacity: 1 }], { duration: motionMs('base'), easing: easeOut() });
}

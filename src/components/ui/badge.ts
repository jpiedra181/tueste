/** Badge (Figma 12:505): Overline/S en mayúsculas sobre fondo suave. */
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'error' | 'warning' | 'inverse';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-bg-subtle text-text-secondary',
  accent: 'bg-bg-accent-subtle text-text-accent',
  success: 'bg-bg-success-subtle text-text-success',
  error: 'bg-bg-error-subtle text-text-error',
  warning: 'bg-bg-warning-subtle text-text-primary',
  inverse: 'bg-bg-inverse text-text-inverse',
};

export function badgeClasses(tone: BadgeTone = 'neutral', className = ''): string {
  return `inline-flex items-center gap-1 rounded-full px-2 py-1 type-overline-s whitespace-nowrap ${tones[tone]} ${className}`.trim();
}

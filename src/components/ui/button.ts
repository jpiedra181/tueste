/**
 * Clases de Button / Icon Button (Figma 12:353 y 12:456). Las comparten Astro y React.
 * Estados: hover, active (pressed), focus-visible (global), disabled o aria-disabled.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'lg' | 'md';
export type IconButtonSize = 'md' | 'sm';

const base =
  'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full whitespace-nowrap select-none ' +
  'transition-[background-color,color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] ' +
  'active:scale-[0.98] disabled:active:scale-100 aria-disabled:active:scale-100 ' +
  'disabled:cursor-not-allowed aria-disabled:cursor-not-allowed';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-action-primary text-text-inverse hover:bg-action-primary-hover active:bg-action-primary-pressed ' +
    'disabled:bg-bg-disabled disabled:text-text-disabled aria-disabled:bg-bg-disabled aria-disabled:text-text-disabled',
  secondary:
    'border border-border-selected text-text-primary hover:bg-action-secondary-hover active:bg-action-secondary-pressed ' +
    'disabled:border-border-default disabled:text-text-disabled disabled:bg-transparent ' +
    'aria-disabled:border-border-default aria-disabled:text-text-disabled aria-disabled:bg-transparent',
  ghost:
    'text-text-primary hover:bg-action-secondary-hover active:bg-action-secondary-pressed ' +
    'disabled:text-text-disabled disabled:bg-transparent aria-disabled:text-text-disabled aria-disabled:bg-transparent',
};

const sizes: Record<ButtonSize, string> = {
  lg: 'h-14 px-8 type-label-l',
  md: 'h-12 px-6 type-label-m',
};

export function buttonClasses(
  options: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {},
): string {
  const { variant = 'primary', size = 'lg', fullWidth = false, className } = options;
  return [base, variants[variant], sizes[size], fullWidth ? 'w-full' : '', className ?? ''].filter(Boolean).join(' ');
}

const iconVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-action-primary text-icon-inverse hover:bg-action-primary-hover ' +
    'disabled:bg-bg-disabled disabled:text-icon-disabled aria-disabled:bg-bg-disabled aria-disabled:text-icon-disabled',
  secondary:
    'border border-border-default bg-bg-surface text-icon-primary hover:bg-action-secondary-hover ' +
    'disabled:border-border-subtle disabled:text-icon-disabled disabled:bg-bg-surface ' +
    'aria-disabled:border-border-subtle aria-disabled:text-icon-disabled aria-disabled:bg-bg-surface',
  ghost:
    'text-icon-primary hover:bg-action-secondary-hover ' +
    'disabled:text-icon-disabled disabled:bg-transparent aria-disabled:text-icon-disabled aria-disabled:bg-transparent',
};

const iconSizes: Record<IconButtonSize, string> = { md: 'size-12', sm: 'size-9' };

/** Tamaño del icono dentro de un Icon Button: md → 20 px, sm → 16 px. */
export const iconButtonIconSize: Record<IconButtonSize, number> = { md: 20, sm: 16 };

export function iconButtonClasses(
  options: { variant?: ButtonVariant; size?: IconButtonSize; className?: string } = {},
): string {
  const { variant = 'ghost', size = 'md', className } = options;
  return [base, 'gap-0 px-0', iconVariants[variant], iconSizes[size], className ?? ''].filter(Boolean).join(' ');
}

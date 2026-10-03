import { Icon } from './Icon';

/**
 * Quantity Stepper (Figma 14:203). Medium 48 px · Small 36 px.
 * Los botones en el límite usan aria-disabled en vez de disabled para no perder el foco
 * al llegar al mínimo o al máximo pulsando repetidamente.
 */
interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  size?: 'md' | 'sm';
  disabled?: boolean;
  /** Nombre del grupo: "Cantidad" o "Cantidad de Hambela". */
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = 'md',
  disabled = false,
  label,
  decreaseLabel,
  increaseLabel,
  className = '',
}: QuantityStepperProps) {
  const atMin = disabled || value <= min;
  const atMax = disabled || value >= max;
  const md = size === 'md';
  const buttonClass =
    `inline-flex items-center justify-center rounded-full text-icon-primary transition-colors duration-[var(--duration-fast)] ` +
    `hover:bg-action-secondary-hover aria-disabled:text-icon-disabled aria-disabled:hover:bg-transparent aria-disabled:cursor-not-allowed ` +
    (md ? 'size-10' : 'size-8');

  return (
    <div
      role="group"
      aria-label={label}
      className={
        `inline-flex items-center rounded-full border px-0.5 ` +
        (disabled ? 'border-border-subtle bg-bg-disabled ' : 'border-border-default bg-bg-surface ') +
        (md ? 'h-12 ' : 'h-9 ') +
        className
      }
    >
      <button
        type="button"
        className={buttonClass}
        aria-label={decreaseLabel}
        aria-disabled={atMin || undefined}
        onClick={() => !atMin && onChange(value - 1)}
      >
        <Icon name="minus" size={md ? 16 : 14} />
      </button>
      <span
        className={`text-center tabular-nums ${md ? 'w-8 type-label-l' : 'w-6 type-label-m'} ${disabled ? 'text-text-disabled' : 'text-text-primary'}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {value}
      </span>
      <button
        type="button"
        className={buttonClass}
        aria-label={increaseLabel}
        aria-disabled={atMax || undefined}
        onClick={() => !atMax && onChange(value + 1)}
      >
        <Icon name="plus" size={md ? 16 : 14} />
      </button>
    </div>
  );
}

export default QuantityStepper;

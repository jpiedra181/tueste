import type { ReactNode } from 'react';
import radioDefault from '@/assets/ui/radio-default.svg?url';
import radioDisabled from '@/assets/ui/radio-disabled.svg?url';
import radioSelected from '@/assets/ui/radio-selected.svg?url';
import { badgeClasses } from './badge';

/**
 * Radio Card (Figma 14:467): modo de compra, método de envío y de pago.
 * Radio nativo (oculto) dentro de un <label>: teclado con flechas, nombre accesible y estado gratis.
 * El borde seleccionado de 2 px se dibuja con una sombra interior para que el contenido no se mueva.
 */
interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  badge?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Contenido extra que se muestra debajo cuando está seleccionada (p. ej. datos de tarjeta). */
  children?: ReactNode;
  describedBy?: string;
  className?: string;
}

export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  meta,
  badge,
  icon,
  disabled = false,
  children,
  describedBy,
  className = '',
}: RadioCardProps) {
  const id = `${name}-${value}`;
  return (
    <div
      className={
        'rounded-md border transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ' +
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-border-focus ' +
        'has-[input:focus-visible]:shadow-[0_0_0_6px_var(--palette-alpha-focus)] ' +
        (disabled
          ? 'border-border-subtle bg-bg-disabled '
          : checked
            ? 'border-border-selected bg-bg-surface shadow-[inset_0_0_0_1px_var(--color-border-selected)] '
            : 'border-border-default bg-bg-surface hover:border-border-strong hover:bg-bg-subtle ') +
        className
      }
    >
      <label htmlFor={id} className={`flex items-start gap-4 p-5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={() => onChange(value)}
          aria-describedby={describedBy}
          className="peer sr-only"
        />
        <img
          src={disabled ? radioDisabled : checked ? radioSelected : radioDefault}
          alt=""
          width={20}
          height={20}
          className="mt-0 block shrink-0"
        />
        {icon && <span className={`shrink-0 ${disabled ? 'text-icon-disabled' : 'text-icon-primary'}`}>{icon}</span>}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={`type-label-l ${disabled ? 'text-text-disabled' : 'text-text-primary'}`}>{title}</span>
          {description && (
            <span className={`type-body-s ${disabled ? 'text-text-disabled' : 'text-text-secondary'}`}>{description}</span>
          )}
        </span>
        {(meta || badge) && (
          <span className="flex shrink-0 flex-col items-end gap-1">
            {meta && <span className={`type-price-m ${disabled ? 'text-text-disabled' : 'text-text-primary'}`}>{meta}</span>}
            {badge && <span className={badgeClasses('accent')}>{badge}</span>}
          </span>
        )}
      </label>
      {checked && children}
    </div>
  );
}

export default RadioCard;

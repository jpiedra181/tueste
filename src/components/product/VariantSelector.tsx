import type { ReactNode } from 'react';

/**
 * Variant Selector (Figma 12:527): chip de molienda o tamaño.
 * Es un radio nativo (oculto) dentro de un <label>: flechas del teclado, nombre accesible
 * ("1 kg 49,00 €", "1 kg Agotado") y estado deshabilitado sin ARIA extra.
 * Estados: Available · Hover · Selected · Focused · Sold Out (borde discontinuo + tachado).
 */
interface VariantSelectorProps {
  name: string;
  value: string;
  label: string;
  /** Segunda línea: precio del tamaño o "Agotado". Sin ella, el chip mide 44 px (molienda). */
  caption?: string | undefined;
  checked: boolean;
  soldOut?: boolean;
  onSelect: (value: string) => void;
}

export function VariantSelector({ name, value, label, caption, checked, soldOut = false, onSelect }: VariantSelectorProps) {
  const state = soldOut
    ? 'cursor-not-allowed border-dashed border-border-default bg-bg-subtle text-text-disabled'
    : checked
      ? 'cursor-pointer border-border-selected bg-action-primary text-text-inverse'
      : 'cursor-pointer border-border-default bg-bg-surface text-text-primary hover:border-border-strong hover:bg-bg-subtle';
  const captionTone = checked && !soldOut ? '' : 'text-text-tertiary';

  return (
    <label
      className={
        'relative flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-0.5 rounded-sm border px-4 py-3 text-center ' +
        'transition-[background-color,border-color,color] duration-[var(--duration-base)] ease-[var(--ease-out)] select-none ' +
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-border-focus ' +
        'has-[input:focus-visible]:shadow-[0_0_0_6px_var(--palette-alpha-focus)] ' +
        state
      }
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={soldOut}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span className={`type-label-m whitespace-nowrap ${soldOut ? 'line-through' : ''}`}>{label}</span>
      {caption && <span className={`type-body-xs whitespace-nowrap ${captionTone}`}>{caption}</span>}
    </label>
  );
}

interface VariantGroupProps {
  legend: string;
  /** Valor elegido junto a la leyenda ("Molienda  Grano"); es un duplicado visual del radio marcado. */
  current?: string | undefined;
  children: ReactNode;
}

/** Grupo de chips: fieldset + legend nativos (el lector anuncia "Molienda, grupo"). */
export function VariantGroup({ legend, current, children }: VariantGroupProps) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-3 flex w-full items-center gap-2 p-0">
        <span className="type-label-m-strong text-text-primary">{legend}</span>
        {current && (
          <span className="type-body-s text-text-tertiary" aria-hidden="true">
            {current}
          </span>
        )}
      </legend>
      <div className="flex items-stretch gap-2">{children}</div>
    </fieldset>
  );
}

export default VariantSelector;

/**
 * Campos del checkout: Input (Figma 14:351), desplegable con el mismo marco y Checkbox (14:250).
 * El marco muestra el foco (borde de 2 px + halo, como el estado Focus de Figma); el control
 * interior no dibuja su propio contorno. Errores y validaciones correctas llevan icono y texto,
 * enlazados al control con aria-describedby.
 */
import type { ChangeEvent, FocusEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/lib/icons';

export type FieldStatus = 'default' | 'error' | 'success';

export const messageId = (id: string): string => `${id}-message`;

function frameClasses(status: FieldStatus, disabled: boolean): string {
  const base =
    'relative flex h-12 w-full items-center gap-2 rounded-sm border px-4 ' +
    'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)] ';
  if (disabled) return base + 'border-border-subtle bg-bg-disabled';
  if (status === 'error') {
    return (
      base +
      'border-border-error bg-bg-surface shadow-[inset_0_0_0_1px_var(--color-border-error)] ' +
      'focus-within:shadow-[inset_0_0_0_1px_var(--color-border-error),0_0_0_3px_var(--palette-alpha-focus)]'
    );
  }
  return (
    base +
    (status === 'success' ? 'border-border-success ' : 'border-border-input ') +
    'bg-bg-surface focus-within:border-border-focus ' +
    'focus-within:shadow-[inset_0_0_0_1px_var(--color-border-focus),0_0_0_3px_var(--palette-alpha-focus)]'
  );
}

/** El contorno global se sustituye por el del marco (focus-within). */
const controlClasses =
  'h-full min-w-0 flex-1 bg-transparent type-body-m placeholder:text-text-tertiary ' +
  'outline-none focus-visible:outline-none focus-visible:shadow-none disabled:cursor-not-allowed disabled:text-text-disabled';

interface FieldShellProps {
  id: string;
  label: string;
  /** Texto "Opcional" junto a la etiqueta. */
  optionalText?: string | undefined;
  status: FieldStatus;
  /** Error, validación correcta o ayuda (según `status`). */
  message?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

function FieldShell({ id, label, optionalText, status, message, disabled = false, className = '', children }: FieldShellProps) {
  const messageColor =
    status === 'error' ? 'text-text-error' : status === 'success' ? 'text-text-success' : disabled ? 'text-text-disabled' : 'text-text-tertiary';
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="flex items-center gap-2">
        <span className={`min-w-0 flex-1 type-label-m ${disabled ? 'text-text-disabled' : 'text-text-primary'}`}>{label}</span>
        {optionalText && <span className="shrink-0 type-body-xs text-text-tertiary">{optionalText}</span>}
      </label>
      {children}
      {message && (
        <p id={messageId(id)} className={`flex items-start gap-1.5 type-body-xs ${messageColor}`}>
          {status === 'error' && <Icon name="alert-circle" size={16} className="text-icon-error" />}
          {status === 'success' && <Icon name="check-circle" size={16} className="text-icon-success" />}
          <span className="min-w-0 flex-1">{message}</span>
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: FieldStatus }) {
  if (status === 'error') return <Icon name="alert-circle" size={20} className="text-icon-error" />;
  if (status === 'success') return <Icon name="check-circle" size={20} className="text-icon-success" />;
  return null;
}

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'value' | 'onChange' | 'onBlur' | 'className' | 'children' | 'aria-invalid' | 'aria-describedby'
>;

export interface TextFieldProps extends NativeInputProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: ((event: FocusEvent<HTMLInputElement>) => void) | undefined;
  error?: string | undefined;
  success?: string | undefined;
  help?: string | undefined;
  optionalText?: string | undefined;
  leadingIcon?: IconName | undefined;
  /** Contenido al final del campo (p. ej. la marca de la tarjeta). */
  trailing?: ReactNode;
  inputRef?: ((element: HTMLInputElement | null) => void) | undefined;
  className?: string | undefined;
}

export function TextField({
  id,
  label,
  value,
  onValueChange,
  onBlur,
  error,
  success,
  help,
  optionalText,
  leadingIcon,
  trailing,
  inputRef,
  className,
  disabled,
  ...inputProps
}: TextFieldProps) {
  const status: FieldStatus = error ? 'error' : success ? 'success' : 'default';
  const message = error ?? success ?? help;
  return (
    <FieldShell
      id={id}
      label={label}
      optionalText={optionalText}
      status={status}
      message={message}
      disabled={disabled}
      className={className}
    >
      <div className={frameClasses(status, !!disabled)}>
        {leadingIcon && (
          <Icon name={leadingIcon} size={20} className={disabled ? 'text-icon-disabled' : 'text-icon-secondary'} />
        )}
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value, event)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId(id) : undefined}
          className={`${controlClasses} text-text-primary`}
        />
        {trailing}
        <StatusIcon status={status} />
      </div>
    </FieldShell>
  );
}

type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'value' | 'onChange' | 'onBlur' | 'className' | 'children' | 'aria-invalid' | 'aria-describedby'
>;

export interface SelectFieldProps extends NativeSelectProps {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  /** Opción vacía inicial (p. ej. "Selecciona"). */
  placeholder?: string | undefined;
  onValueChange: (value: string) => void;
  onBlur?: (() => void) | undefined;
  error?: string | undefined;
  className?: string | undefined;
}

export function SelectField({
  id,
  label,
  value,
  options,
  placeholder,
  onValueChange,
  onBlur,
  error,
  className,
  disabled,
  ...selectProps
}: SelectFieldProps) {
  const status: FieldStatus = error ? 'error' : 'default';
  return (
    <FieldShell id={id} label={label} status={status} message={error} disabled={disabled} className={className}>
      <div className={frameClasses(status, !!disabled)}>
        <select
          {...selectProps}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId(id) : undefined}
          className={`${controlClasses} absolute inset-0 cursor-pointer appearance-none rounded-sm px-4 ${error ? 'pr-20' : 'pr-11'} ${value ? 'text-text-primary' : 'text-text-tertiary'}`}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-text-primary">
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none ml-auto flex items-center gap-2">
          <StatusIcon status={status} />
          <Icon name="chevron-down" size={20} className={disabled ? 'text-icon-disabled' : 'text-icon-primary'} />
        </span>
      </div>
    </FieldShell>
  );
}

interface CheckboxProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  error?: string | undefined;
  inputRef?: ((element: HTMLInputElement | null) => void) | undefined;
  required?: boolean;
}

export function Checkbox({ id, name, checked, onChange, label, error, inputRef, required = false }: CheckboxProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="group flex min-h-6 cursor-pointer items-start gap-3 py-0.5">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId(id) : undefined}
          aria-required={required || undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={
            'flex size-5 shrink-0 items-center justify-center rounded-xs border transition-colors duration-[var(--duration-fast)] ' +
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-focus ' +
            'peer-focus-visible:shadow-[0_0_0_6px_var(--palette-alpha-focus)] ' +
            (checked
              ? 'border-border-selected bg-action-primary group-hover:bg-action-primary-hover'
              : error
                ? 'border-border-error bg-bg-surface shadow-[inset_0_0_0_1px_var(--color-border-error)]'
                : 'border-border-input bg-bg-surface group-hover:border-border-focus')
          }
        >
          {checked && <Icon name="check" size={14} className="text-icon-inverse" />}
        </span>
        <span className="min-w-0 flex-1 type-body-s text-text-primary">{label}</span>
      </label>
      {error && (
        <p id={messageId(id)} className="flex items-start gap-1.5 pl-8 type-body-xs text-text-error">
          <Icon name="alert-circle" size={16} className="text-icon-error" />
          <span className="min-w-0 flex-1">{error}</span>
        </p>
      )}
    </div>
  );
}

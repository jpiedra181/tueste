/**
 * Alta en el cuaderno de tueste (Figma Footer · "Email Field"). Sin backend: valida al enviar,
 * muestra el mensaje bajo el campo y lo anuncia por la región aria-live del layout.
 * Los textos llegan ya traducidos para no cargar el diccionario en la isla.
 * [a11y] El borde usa border/input (≥ 3:1 sobre espresso) y el foco se dibuja en la píldora entera.
 */
import { useId, useRef, useState, type SubmitEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { iconButtonClasses, iconButtonIconSize } from '@/components/ui/button';
import { announce } from '@/lib/announce';

interface NewsletterFormProps {
  labels: {
    email: string;
    placeholder: string;
    submit: string;
    required: string;
    invalid: string;
    thanks: string;
  };
}

type Status = { kind: 'idle' } | { kind: 'error'; message: string } | { kind: 'success' };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function NewsletterForm({ labels }: NewsletterFormProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inputId = `${id}-email`;
  const messageId = `${id}-message`;
  const invalid = status.kind === 'error';

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const value = input.value.trim();
    const error = value === '' ? labels.required : EMAIL.test(value) ? null : labels.invalid;
    if (error) {
      setStatus({ kind: 'error', message: error });
      announce(error, 'assertive');
      input.focus();
      return;
    }
    input.value = '';
    setStatus({ kind: 'success' });
    announce(labels.thanks);
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor={inputId} className="sr-only">
        {labels.email}
      </label>
      <div
        className={[
          'flex w-full items-center gap-2 rounded-full border bg-bg-inverse-subtle py-1 pr-1 pl-5',
          invalid ? 'border-[var(--palette-terracotta-300)]' : 'border-border-input',
          'has-[input:focus-visible]:shadow-[0_0_0_6px_var(--palette-alpha-focus)] has-[input:focus-visible]:outline-2',
          'has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-border-inverse',
        ].join(' ')}
      >
        <Icon name="mail" size={20} className="text-text-inverse-muted" />
        <input
          ref={inputRef}
          id={inputId}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder={labels.placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={status.kind === 'idle' ? undefined : messageId}
          onInput={() => {
            if (invalid) setStatus({ kind: 'idle' });
          }}
          className="h-12 min-w-0 flex-1 bg-transparent type-body-m text-text-inverse placeholder:text-text-inverse-muted focus-visible:shadow-none focus-visible:outline-none"
        />
        <button type="submit" aria-label={labels.submit} className={iconButtonClasses({ variant: 'secondary', size: 'md' })}>
          <Icon name="arrow-right" size={iconButtonIconSize.md} />
        </button>
      </div>
      {status.kind !== 'idle' && (
        <p id={messageId} className="flex items-start gap-2 pl-5 type-body-s text-text-inverse">
          <Icon
            name={status.kind === 'error' ? 'alert-circle' : 'check-circle'}
            size={20}
            className={status.kind === 'error' ? 'text-[var(--palette-terracotta-300)]' : 'text-[var(--palette-sage-300)]'}
          />
          <span>{status.kind === 'error' ? status.message : labels.thanks}</span>
        </p>
      )}
    </form>
  );
}

import { useCallback, useEffect, useRef, type FocusEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/lib/icons';
import { dismissToast, type Toast as ToastData, type ToastType } from '@/stores/ui';
import { easeOut, motionMs, prefersReducedMotion } from '@/lib/motion';

/**
 * Toast (Figma 17:630): superficie espresso con Elevation/2, estado, mensaje, acción y cerrar.
 * Se cierra solo tras `duration` ms (0 = nunca); el tiempo se pausa con el ratón encima o con
 * el foco dentro. Entrada y salida con fundido y un desplazamiento corto (sin él si se pide
 * movimiento reducido).
 */
const status: Record<ToastType, { icon: IconName; circle: string; color: string }> = {
  success: { icon: 'check', circle: 'bg-bg-success-subtle', color: 'text-icon-success' },
  error: { icon: 'alert-circle', circle: 'bg-bg-error-subtle', color: 'text-icon-error' },
  info: { icon: 'info', circle: 'bg-bg-warning-subtle', color: 'text-icon-primary' },
};

interface ToastProps {
  toast: ToastData;
  closeLabel: string;
  /** Media query en la que el aviso aparece abajo (entra desde abajo); fuera de ella, arriba. */
  bottomQuery: string;
}

export function Toast({ toast, closeLabel, bottomQuery }: ToastProps) {
  const { id, duration, type, message, action } = toast;
  const ref = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const frames = useCallback((): Keyframe[] => {
    if (prefersReducedMotion()) return [{ opacity: 0 }, { opacity: 1 }];
    const offset = window.matchMedia(bottomQuery).matches ? 8 : -8;
    return [
      { opacity: 0, transform: `translateY(${offset}px)` },
      { opacity: 1, transform: 'translateY(0)' },
    ];
  }, [bottomQuery]);

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    clearTimeout(timer.current);
    const el = ref.current;
    const finish = () => {
      // Si el foco estaba en el aviso, vuelve a donde estaba antes de entrar en él.
      if (el?.contains(document.activeElement) && returnFocus.current?.isConnected) {
        returnFocus.current.focus({ preventScroll: true });
      }
      dismissToast(id);
    };
    if (!el) return finish();
    const exit = el.animate([...frames()].reverse(), {
      duration: motionMs('fast'),
      easing: easeOut(),
      fill: 'forwards',
    });
    exit.finished.then(finish, finish);
  }, [id, frames]);

  const pause = useCallback(() => {
    if (timer.current === undefined) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    remaining.current -= Date.now() - startedAt.current;
  }, []);

  const resume = useCallback(() => {
    if (duration <= 0 || leaving.current || hovered.current || focused.current || timer.current !== undefined) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => {
      timer.current = undefined;
      leave();
    }, Math.max(0, remaining.current));
  }, [duration, leave]);

  // Entrada + temporizador.
  useEffect(() => {
    ref.current?.animate(frames(), { duration: motionMs('base'), easing: easeOut() });
    resume();
    return () => clearTimeout(timer.current);
  }, [frames, resume]);

  const onFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (focused.current) return;
    focused.current = true;
    returnFocus.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
    pause();
  };
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    focused.current = false;
    resume();
  };

  const s = status[type];
  return (
    <div
      ref={ref}
      className="on-inverse pointer-events-auto flex w-full items-center gap-3 rounded-md bg-bg-inverse py-3 pr-3 pl-4 shadow-elevation-2"
      onMouseEnter={() => {
        hovered.current = true;
        pause();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        resume();
      }}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${s.circle}`}>
        <Icon name={s.icon} size={16} className={s.color} />
      </span>
      <p className="min-w-0 flex-1 type-body-s text-text-inverse">{message}</p>
      {action && (
        <button
          type="button"
          className="-m-1 shrink-0 rounded-sm p-1 type-label-m-strong whitespace-nowrap text-text-inverse underline-offset-4 hover:underline"
          onClick={() => {
            action.onAction();
            leave();
          }}
        >
          {action.label}
        </button>
      )}
      <button
        type="button"
        aria-label={closeLabel}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-icon-inverse transition-colors duration-[var(--duration-fast)] hover:bg-bg-inverse-subtle"
        onClick={leave}
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

export default Toast;

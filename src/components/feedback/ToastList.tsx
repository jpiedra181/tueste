import { useStore } from '@nanostores/react';
import { useEffect, useState } from 'react';
import { useTranslations, type Locale } from '@/i18n';
import { $toasts } from '@/stores/ui';
import { Toast } from './Toast';
import { $toastHost, type ToastHost } from './toast-host';

/**
 * Pila de avisos. Hay dos: la de la página (Toaster) y la de dentro de la cesta, que se usa
 * mientras el diálogo modal está abierto. Las regiones vivas se pintan siempre (vacías) para
 * que los lectores de pantalla las conozcan antes de que llegue un aviso:
 * role="status" (educado) para éxito/información y role="alert" para errores.
 */
const placements: Record<ToastHost, { wrapper: string; bottomQuery: string }> = {
  // Móvil: arriba con 16 px de margen. Desktop: abajo a la derecha, alineado con el contenedor.
  page: {
    wrapper:
      'fixed inset-x-4 top-4 z-[70] lg:inset-x-auto lg:top-auto lg:right-20 lg:bottom-16 lg:w-[400px]',
    bottomQuery: '(min-width: 64rem)',
  },
  // Dentro del panel de la cesta: arriba en móvil (pantalla completa), abajo desde sm.
  drawer: {
    wrapper: 'absolute inset-x-4 top-4 z-10 sm:inset-x-5 sm:top-auto sm:bottom-6',
    bottomQuery: '(min-width: 40rem)',
  },
};

/** Avisos visibles a la vez (los más recientes). */
const MAX_VISIBLE = 3;

interface ToastListProps {
  locale: Locale;
  placement: ToastHost;
}

export function ToastList({ locale, placement }: ToastListProps) {
  const t = useTranslations(locale);
  const host = useStore($toastHost);
  const all = useStore($toasts);
  // Hasta hidratar se pinta igual que en el servidor (sin avisos).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const toasts = ready && host === placement ? all.slice(-MAX_VISIBLE) : [];
  const errors = toasts.filter((toast) => toast.type === 'error');
  const statuses = toasts.filter((toast) => toast.type !== 'error');
  const { wrapper, bottomQuery } = placements[placement];
  const closeLabel = t('a11y/close');

  return (
    <div className={`pointer-events-none flex flex-col ${wrapper}`}>
      <div role="alert" aria-atomic="false" className="flex flex-col gap-2">
        {errors.map((toast) => (
          <Toast key={toast.id} toast={toast} closeLabel={closeLabel} bottomQuery={bottomQuery} />
        ))}
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className={`flex flex-col gap-2 ${errors.length > 0 && statuses.length > 0 ? 'mt-2' : ''}`}
      >
        {statuses.map((toast) => (
          <Toast key={toast.id} toast={toast} closeLabel={closeLabel} bottomQuery={bottomQuery} />
        ))}
      </div>
    </div>
  );
}

export default ToastList;

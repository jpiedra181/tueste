/** Estado de interfaz compartido entre islas: cesta abierta, avisos (toasts). */
import { atom } from 'nanostores';

/** Ancla que abre la cesta al cargar la página (p. ej. "Volver a la cesta" desde el checkout). */
export const CART_HASH = 'cart';

export const $cartOpen = atom(false);
/** Clave de la última línea añadida, para resaltarla al abrir la cesta. */
export const $lastAddedKey = atom<string | null>(null);

export function openCart(highlightKey: string | null = null): void {
  $lastAddedKey.set(highlightKey);
  $cartOpen.set(true);
}

export function closeCart(): void {
  $cartOpen.set(false);
}

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  action?: { label: string; onAction: () => void };
  /** ms; 0 = no se cierra solo (errores). */
  duration: number;
}

export const $toasts = atom<Toast[]>([]);
let toastId = 0;

export function pushToast(toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }): number {
  const id = ++toastId;
  const duration = toast.duration ?? (toast.type === 'error' ? 0 : 6000);
  $toasts.set([...$toasts.get(), { ...toast, id, duration }]);
  return id;
}

export function dismissToast(id: number): void {
  $toasts.set($toasts.get().filter((toast) => toast.id !== id));
}

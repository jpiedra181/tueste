/**
 * Dónde se pintan los avisos. Con la cesta abierta (diálogo modal) el resto de la página queda
 * inerte y por debajo de la capa superior, así que los avisos se pintan dentro del diálogo.
 */
import { atom } from 'nanostores';

export type ToastHost = 'page' | 'drawer';

export const $toastHost = atom<ToastHost>('page');

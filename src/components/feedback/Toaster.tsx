/**
 * Avisos de la página (Figma "Toast" 17:630). Isla `client:paint` montada por BaseLayout.
 * Mientras la cesta está abierta los avisos se pintan dentro de su diálogo (ver toast-host.ts).
 */
import type { Locale } from '@/i18n';
import { ToastList } from './ToastList';

interface ToasterProps {
  locale: Locale;
}

export default function Toaster({ locale }: ToasterProps) {
  return <ToastList locale={locale} placement="page" />;
}

/**
 * Menú de navegación móvil (no está en Figma: se compone con piezas del sistema).
 * Isla mínima: solo abre y cierra un <dialog> modal. El contenido (enlaces, cuenta, idioma) llega
 * como slot de Astro ya renderizado en el servidor.
 * El diálogo nativo aporta el foco atrapado, el resto de la página inerte y Escape para cerrar;
 * aquí se mueve el foco al abrir, se devuelve al botón al cerrar y se bloquea el scroll del fondo.
 */
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { iconButtonClasses, iconButtonIconSize } from '@/components/ui/button';

interface MobileMenuProps {
  /** Nombre accesible del diálogo. */
  title: string;
  openLabel: string;
  closeLabel: string;
  children?: ReactNode;
}

const DIALOG_ID = 'mobile-menu';
const DESKTOP_QUERY = '(min-width: 64rem)';

export default function MobileMenu({ title, openLabel, closeLabel, children }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const show = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    setOpen(true);
    closeRef.current?.focus();
  };

  const hide = () => dialogRef.current?.close();

  // Escape, botón de cerrar o clic fuera: todos terminan en el evento `close`.
  const handleClose = () => {
    document.documentElement.style.overflow = '';
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Clic en el fondo (::backdrop): el destino es el propio <dialog>.
  const handleClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) hide();
  };

  // Si la ventana pasa a desktop con el menú abierto, se cierra (la navegación ya es visible).
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (query.matches) hide();
    };
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={openLabel}
        aria-expanded={open}
        aria-controls={DIALOG_ID}
        aria-haspopup="dialog"
        onClick={show}
        className={iconButtonClasses({ variant: 'ghost', size: 'md', className: 'lg:hidden' })}
      >
        <Icon name="menu" size={iconButtonIconSize.md} />
      </button>

      <dialog
        ref={dialogRef}
        id={DIALOG_ID}
        aria-label={title}
        onClose={handleClose}
        onClick={handleClick}
        className={[
          'fixed inset-y-0 right-auto left-0 m-0 h-dvh max-h-none w-[min(100%,24rem)] max-w-none overflow-y-auto',
          'border-0 bg-bg-page p-0 text-text-primary shadow-elevation-2 backdrop:bg-bg-scrim',
          '-translate-x-full open:translate-x-0 starting:open:-translate-x-full',
          'transition-[translate,display,overlay] transition-discrete duration-[var(--duration-slow)] ease-[var(--ease-out)]',
        ].join(' ')}
      >
        <div className="flex min-h-full flex-col px-5 pb-8">
          <div className="-mx-2 flex h-[4.5rem] shrink-0 items-center">
            <button
              ref={closeRef}
              type="button"
              aria-label={closeLabel}
              onClick={hide}
              className={iconButtonClasses({ variant: 'ghost', size: 'md' })}
            >
              <Icon name="close" size={iconButtonIconSize.md} />
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}

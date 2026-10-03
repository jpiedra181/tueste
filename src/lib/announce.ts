/**
 * Anuncios para lectores de pantalla. Las regiones aria-live existen desde la carga de la página
 * (BaseLayout), que es lo que las hace fiables; aquí solo se cambia su texto.
 *
 * Con un <dialog> modal abierto, lo que queda fuera es inerte también para los lectores de pantalla:
 * la región se lleva dentro del diálogo (y vuelve al body cuando ya no hay ninguno). La cesta las
 * mueve ella misma al abrirse; esto cubre el resto (zoom de la galería, menú móvil…).
 */
export type Politeness = 'polite' | 'assertive';

let clearTimer: ReturnType<typeof setTimeout> | undefined;

function topModal(): HTMLDialogElement | undefined {
  const modals = [...document.querySelectorAll('dialog')].filter((d) => d.open && d.matches(':modal'));
  return modals.at(-1);
}

export function announce(message: string, politeness: Politeness = 'polite'): void {
  if (typeof document === 'undefined') return;
  const region = document.getElementById(`live-${politeness}`);
  if (!region) return;

  const modal = topModal();
  // Sin modal, la región debe colgar del body (no de un diálogo ya cerrado, que la ocultaría).
  const misplaced = modal ? !modal.contains(region) : region.parentElement !== document.body;
  // Una región recién movida necesita un instante para que el lector de pantalla la registre.
  let delay = 0;
  if (misplaced) {
    (modal ?? document.body).append(region);
    delay = 150;
  }

  // Vaciar y reescribir después fuerza el anuncio aunque el texto se repita.
  region.textContent = '';
  setTimeout(() => {
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }, delay);
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    region.textContent = '';
  }, 7000);
}

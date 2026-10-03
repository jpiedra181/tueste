/**
 * Carrusel horizontal de mobile (notas de cata, cafés relacionados): scroll-snap nativo que sangra
 * hasta el borde de la pantalla y se convierte en rejilla desde lg. El contenedor es una región con
 * nombre y tabindex="0" para poder desplazarlo con las flechas del teclado.
 */
export const carouselRegionClasses =
  '-mx-5 overflow-x-auto overscroll-x-contain px-5 scroll-px-5 snap-x snap-mandatory ' +
  '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-offset-[-2px] ' +
  'md:-mx-10 md:px-10 md:scroll-px-10 lg:mx-0 lg:overflow-visible lg:px-0';

/** La lista mide lo que sus elementos en mobile; en lg pasa a rejilla del ancho del contenedor. */
export const carouselListClasses = 'flex w-max lg:grid lg:w-auto';

export const carouselItemClasses = 'shrink-0 snap-start lg:w-auto';

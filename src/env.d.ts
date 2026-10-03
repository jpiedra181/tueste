/// <reference types="vite/client" />

declare namespace Astro {
  interface ClientDirectives {
    /** Hidrata tras el primer pintado, cuando el navegador está libre (src/directives/paint.ts). */
    'client:paint'?: boolean;
  }
}

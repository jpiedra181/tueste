// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

/** @param {string} pkg @param {string} file */
const fontsource = (pkg, file) => `./node_modules/${pkg}/files/${file}`;

export default defineConfig({
  site: 'https://tueste.netlify.app',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    // CSS incrustado (≈11 KB gzip): sin petición que bloquee el render en redes lentas.
    inlineStylesheets: 'always',
  },
  // Sin i18n de Astro: las rutas tienen segmentos traducidos (/es/cafes, /en/coffee) y son ficheros
  // reales en src/pages/es y src/pages/en. Idiomas, rutas y formatos viven en src/i18n.
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  integrations: [
    react(),
    {
      // client:paint — hidratar tras el primer pintado (ver src/directives/paint.ts).
      name: 'tueste:client-paint',
      hooks: {
        'astro:config:setup': ({ addClientDirective }) => {
          addClientDirective({ name: 'paint', entrypoint: './src/directives/paint.ts' });
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Los SVG (iconos e ilustraciones) van como ficheros con hash y caché inmutable,
      // no incrustados: se reutilizan entre páginas y no engordan el HTML ni el JS.
      assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
    },
  },
  fonts: [
    {
      // Fraunces con los ejes wght + WONK: el diseño usa "WONK" 1 en titulares y precios.
      provider: fontProviders.local(),
      name: 'Fraunces',
      cssVariable: '--font-fraunces',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          {
            src: [fontsource('@fontsource-variable/fraunces', 'fraunces-latin-wonk-normal.woff2')],
            weight: '100 900',
            style: 'normal',
          },
          {
            src: [fontsource('@fontsource-variable/fraunces', 'fraunces-latin-wonk-italic.woff2')],
            weight: '100 900',
            style: 'italic',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument-sans',
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [
          {
            src: [fontsource('@fontsource-variable/instrument-sans', 'instrument-sans-latin-wght-normal.woff2')],
            weight: '400 700',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      fallbacks: ['Courier New', 'monospace'],
      options: {
        variants: [
          {
            src: [fontsource('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff2')],
            weight: 400,
            style: 'normal',
          },
          {
            src: [fontsource('@fontsource/ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2')],
            weight: 500,
            style: 'normal',
          },
        ],
      },
    },
  ],
});

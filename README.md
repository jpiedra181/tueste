# Tueste

Tienda de café de especialidad convertida a código desde el diseño de Figma
([Tueste · Design System v1.0](https://www.figma.com/design/VuLHodVYIdQFsnPdJ6G1ia/Tueste)).
Ficha de producto generada desde datos, cesta lateral persistente, checkout en 3 pasos y confirmación,
en español e inglés.

**Stack:** Astro 7 (salida estática) · islas de React 19 · Tailwind CSS 4 · TypeScript estricto ·
nanostores · Zod 4 · Vitest · Playwright + axe · Lighthouse CI.

## Puesta en marcha

Requisitos: Node 22.12 o superior (`.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:4321  →  /es
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos (`astro check`) y build estático en `dist/` |
| `npm run preview` | Sirve `dist/` como en producción |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E en móvil y desktop (Playwright + axe). Necesita `npm run build` antes y `npx playwright install chromium` la primera vez |
| `npm run lhci` | Lighthouse CI en móvil sobre el build (umbrales en `lighthouserc.json`) |
| `npm run format` | Prettier |

## Despliegue en Netlify

El sitio es 100 % estático: no necesita adaptador. `netlify.toml` ya define:

- Build `npm run build`, publicación `dist/`, Node 22.
- Redirección de `/` según el idioma del navegador (`/en` si prefiere inglés, `/es` en el resto).
  `dist/index.html` hace lo mismo con JavaScript por si se sirve fuera de Netlify.
- Caché inmutable para `/_astro/*` (ficheros con hash) y cabeceras de seguridad básicas.

Basta con conectar el repositorio en Netlify. Las URLs públicas no llevan `.html`
(`/es/cafes/hambela`), que Netlify resuelve solo. Antes de publicar, cambia `site` en
`astro.config.mjs` por el dominio definitivo (se usa en las URLs canónicas y `hreflang`).

## Rutas

| ES | EN | Página |
|---|---|---|
| `/es`, `/es/cafes` | `/en`, `/en/coffee` | Portada y listado de cafés |
| `/es/cafes/[id]` | `/en/coffee/[id]` | Ficha de producto (una por café del JSON) |
| `/es/checkout?paso=2` | `/en/checkout?step=2` | Checkout |
| `/es/pedido-confirmado` | `/en/order-confirmed` | Confirmación |
| `/es/proximamente` | `/en/coming-soon` | Secciones sin diseño (suscripciones, cuenta…) |

La variante elegida vive en la URL con parámetros traducidos: `?molienda=espresso&tamano=1kg` en
español y `?grind=espresso&size=1kg` en inglés. El selector de idioma conserva la variante.

## Estructura

```
src/
├── content.config.ts      colecciones products y reviews (validadas con Zod en el build)
├── data/                  products.json (productos y variantes) · reviews.json
├── i18n/                  ui.ts (textos ES/EN = colección Language de Figma) · index.ts (t, Intl, rutas)
├── lib/                   pricing · variants · catalog · checkout-schemas · checkout-utils · motion · announce…
├── stores/                cart (localStorage) · checkout (sessionStorage) · ui · cart-actions
├── directives/paint.ts    directiva client:paint (hidratar tras el primer pintado)
├── components/
│   ├── ui/                Button, Badge, Icon, RatingStars, QuantityStepper, RadioCard, Logo
│   ├── art/               ilustraciones de producto (ProductImage, Packshot, Bag, notas, mapa)
│   ├── layout/            Header, Footer, menú móvil, selector de idioma, newsletter
│   ├── product/           ficha: galería, panel de compra, secciones, tarjeta de producto
│   ├── cart/              cesta lateral, botón de cesta, barra de envío gratis
│   ├── feedback/          avisos (toasts)
│   └── checkout/          checkout y confirmación
├── layouts/BaseLayout.astro
├── views/ProductPage.astro
├── pages/                 es/… y en/… (envoltorios finos de las mismas vistas)
└── styles/                tokens.css (tokens de Figma) · global.css (Tailwind + estilos de texto)
tests/unit · tests/e2e     Vitest · Playwright
docs/figma/                capturas de referencia del diseño
```

## Datos

El catálogo es `src/data/products.json`: cada café con sus textos en ES/EN, imágenes, notas de cata,
origen, valoración y **variantes** (`grind` × `size`, precio en céntimos con IVA, stock). Las fichas,
el listado, la cesta y el checkout salen de ahí. El esquema (`src/lib/schemas.ts`) se valida en el build
y comprueba también que cada combinación de molienda y tamaño exista una sola vez, que `defaultSku`
exista y que la distribución de valoraciones sume el total.

**Añadir un café:** nuevo objeto en `products.json` (y sus reseñas en `reviews.json`). El color de la
bolsa (`colorway`) elige una de las 6 ilustraciones de Figma.

Contenido: Hambela usa los textos de Figma. Santa Elena, El Diviso, Kiambu y Acueducto llevan contenido
de **ejemplo** coherente (notas, origen, reseñas). Agotado de ejemplo: Hambela Filtro · 1 kg (también
El Diviso Espresso · 1 kg y Kiambu Espresso).

**Reglas de negocio** (`src/lib/pricing.ts`): suscripción −10 % · envío gratis desde 35 € · estándar
3,90 € por debajo del umbral (no está en Figma) · Express 6,90 € · recogida gratis · IVA 10 % incluido ·
máximo 10 unidades por línea.

## Del diseño al código

- **Tokens** (`src/styles/tokens.css`): colores, espaciado, radios, sombras y estilos de texto de Figma
  con los mismos nombres que Dev Mode (`text/primary` → `--color-text-primary` → `text-text-primary`).
  Los estilos de texto son utilidades `type-*` (`type-heading-h1`, `type-price-l`…).
- **Ilustraciones**: el diseño no tiene fotos, sino composiciones vectoriales. Se reconstruyen con las
  piezas SVG exportadas de Figma (sin modificar) y el **texto real** de la etiqueta. Así sirven para los 5
  cafés y los 2 idiomas, escalan con su contenedor (unidades `cqw`) y pesan ~1–2 KB comprimidas por vista.
  Excepción: el mapa de Etiopía (62 KB gzip, carga diferida).
- **Iconos**: los SVG de Figma se usan como máscara CSS y toman el color del token (`currentColor`).
- **Ajustes de accesibilidad respecto a Figma** (actualizar el diseño si se aceptan):

  | Token | Problema | Cambio |
  |---|---|---|
  | `text/tertiary` #7d6e62 | 4,40:1 sobre `bg/page` | #73655a (5,04:1) |
  | Texto sobre `action/accent` #c45a34 | 4,18:1 | relleno #a8472a (5,64:1) |
  | Foco (halo al 35 %) | 1,55:1 | contorno sólido 2 px `border/focus` + halo |
  | Borde de campos `border/default` | 1,66:1 | `border/input` #908174 (≥ 3:1) |

## Cesta y checkout

- **Cesta** (`src/stores/cart.ts`): nanostores con `@nanostores/persistent` en `localStorage`
  (`tueste:cart:v1`), sincronizada entre pestañas. Solo guarda `sku`, modo y cantidad: precios y nombres
  salen siempre del catálogo. Las líneas que dejan de existir o se agotan se marcan y no pasan al checkout.
- **Cesta lateral**: `<dialog>` modal con trampa de foco, cierre con Escape o clic fuera, foco devuelto al
  botón que la abrió, barra de envío gratis y "deshacer" al eliminar. Se abre al añadir un producto y
  también con `#cart` en la URL ("Volver a la cesta" del checkout).
- **Checkout**: 3 pasos con el paso en la URL (el botón Atrás del navegador funciona) y borrador en
  `sessionStorage`. **Los datos de la tarjeta nunca se guardan.** Validación con Zod (`zod/mini`) al salir
  de cada campo, en cada tecla una vez que hay error, y al enviar; errores enlazados con
  `aria-describedby` y resumen con `role="alert"` y enlaces a cada campo; el foco pasa al título de cada
  paso; `autocomplete` completo; el código postal español rellena la provincia.
- **Pago simulado** (no hay pasarela real):
  - `4242 4242 4242 4242` (o cualquier tarjeta válida) → pedido confirmado.
  - `4000 0000 0000 0002` → pago rechazado (aviso de error con "Reintentar").
  - Bizum y PayPal se simulan como correctos. Código de descuento de prueba: `TUESTE10` (−10 %).

## Calidad

- **Accesibilidad (WCAG 2.2 AA):** HTML semántico, radios nativos para las variantes (la agotada va
  `disabled` y "Agotado" forma parte de su nombre), anuncios `aria-live` (cambio de variante, añadido a la
  cesta, filtros de reseñas), objetivos táctiles ≥ 24 px, foco visible, `prefers-reduced-motion` en todas
  las animaciones y modo de alto contraste. Los tests E2E pasan axe (WCAG 2.2 A/AA) en las páginas clave.
- **Rendimiento:** HTML estático con islas mínimas. Las islas visibles al cargar usan `client:paint`
  (`src/directives/paint.ts`): hidratan tras el primer pintado, así React no compite con la imagen LCP.
  CSS incrustado, fuentes propias con fallbacks de métricas ajustadas (sin saltos), SVG con caché
  inmutable. Espacio reservado en todo lo que hidrata (CLS 0, también con la cesta vacía).
- **Lighthouse móvil** (medido en local sobre el build, simulación de red lenta):

  | Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | CLS |
  |---|---|---|---|---|---|
  | Ficha ES / EN | 97 | 100 | 100 | 100 | 0 |
  | Listado / portada | 98 | 100 | 100 | 100 | 0 |
  | Checkout | 95–96 | 100 | 100 | 66* | 0 |
  | Confirmación | 96 | 100 | 100 | 66* | 0 |

  \* Checkout y confirmación llevan `noindex` a propósito, y Lighthouse lo penaliza en SEO.

- **Microinteracciones** (Figma no define animaciones; son propuesta propia, solo Web Animations y CSS):
  - Añadir a la cesta: el botón pasa a "Añadido" con un check, el contador da un salto, la cesta entra
    desde la derecha y la línea nueva se ilumina.
  - Cambiar de variante: el precio hace un fundido con leve subida.
  - Avanzar de paso: la línea de progreso se rellena y el contenido entra con un desplazamiento lateral.

## Notas

- `npm audit` avisa de `http-cache-semantics` dentro de Astro (caché del servidor). No afecta a un sitio
  estático. El resto de avisos son de dependencias de desarrollo (Lighthouse CI).
- Funciona igual en cualquier hosting estático (p. ej. Vercel con `dist/` como salida). Las reglas de
  `netlify.toml` (redirección por idioma y cabeceras) habría que trasladarlas a ese proveedor.

/**
 * `client:paint` — hidrata cuando la página ya se ha pintado y el navegador está libre.
 *
 * Por qué: con `client:idle`, el runtime de React (~65 KB gzip) a veces empieza a descargarse antes
 * del primer pintado y compite con la imagen LCP en redes lentas. Todas las islas de la tienda
 * pintan en el servidor su estado inicial completo, así que esperar al primer pintado no se ve.
 *
 * Orden: primer pintado (Paint Timing) → requestIdleCallback (máx. 1,5 s) → hidratar.
 * Si el navegador no expone Paint Timing, se espera al evento load y a dos frames.
 */
import type { ClientDirective } from 'astro';

const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200);

function afterFirstPaint(fn: () => void): void {
  const painted = () => performance.getEntriesByName('first-contentful-paint').length > 0;
  if (painted()) return fn();
  if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes?.includes('paint')) {
    const observer = new PerformanceObserver(() => {
      if (!painted()) return;
      observer.disconnect();
      fn();
    });
    observer.observe({ type: 'paint', buffered: true });
    return;
  }
  const afterLoad = () => requestAnimationFrame(() => requestAnimationFrame(fn));
  if (document.readyState === 'complete') afterLoad();
  else addEventListener('load', afterLoad, { once: true });
}

const paintDirective: ClientDirective = (load) => {
  afterFirstPaint(() =>
    whenIdle(async () => {
      const hydrate = await load();
      await hydrate();
    }),
  );
};

export default paintDirective;

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const CART_KEY = 'tueste:cart:v1';

/** Precarga la cesta antes de que cargue la página. */
export async function seedCart(page: Page, lines: Array<{ sku: string; productId: string; mode?: string; qty?: number }>) {
  const value = JSON.stringify(lines.map((l) => ({ mode: 'one-time', qty: 1, ...l })));
  await page.addInitScript(
    ([key, data]) => {
      if (!sessionStorage.getItem('__seeded')) {
        localStorage.setItem(key!, data!);
        sessionStorage.setItem('__seeded', '1');
      }
    },
    [CART_KEY, value],
  );
}

/** Auditoría axe con las reglas WCAG 2.2 A/AA. */
export async function expectNoA11yViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const summary = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(summary, summary.join('\n')).toEqual([]);
}

/** Marca la ventana para comprobar después que no ha habido recarga. */
export async function markNoReload(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
}

export async function expectNoReload(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
}

/**
 * Espera a que estén hidratadas las islas que se cargan solas (client:paint/load/idle).
 * Las `client:visible` solo hidratan al entrar en pantalla, así que no se esperan aquí.
 */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => document.querySelectorAll('astro-island[ssr]:not([client="visible"])').length === 0,
  );
}

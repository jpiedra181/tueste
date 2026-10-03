import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, expectNoReload, markNoReload, waitForHydration } from './helpers';

test.describe('Ficha de producto', () => {
  test('cambiar de variante actualiza precio y URL sin recargar', async ({ page }) => {
    await page.goto('/es/cafes/hambela');
    await waitForHydration(page);
    await markNoReload(page);

    const price = page.locator('[data-price]');
    await expect(price).toHaveText(/14,50\s€/);

    await page.getByRole('radio', { name: /^1 kg/ }).check({ force: true });
    await expect(page).toHaveURL(/molienda=grano&tamano=1kg/);
    await expect(price).toHaveText(/49,00\s€/);

    await page.getByRole('radio', { name: /^Espresso/ }).check({ force: true });
    await expect(page).toHaveURL(/molienda=espresso&tamano=1kg/);
    await expectNoReload(page);
  });

  test('la variante agotada no se puede elegir y se anuncia', async ({ page }) => {
    await page.goto('/es/cafes/hambela?molienda=filtro&tamano=250g');
    await waitForHydration(page);
    const soldOut = page.getByRole('radio', { name: /1 kg.*Agotado/ });
    await expect(soldOut).toBeDisabled();
  });

  test('una URL con una combinación agotada se corrige', async ({ page }) => {
    await page.goto('/es/cafes/hambela?molienda=filtro&tamano=1kg');
    await waitForHydration(page);
    await expect(page).toHaveURL(/molienda=filtro&tamano=250g/);
    await expect(page.getByRole('radio', { name: /^250 g/ })).toBeChecked();
  });

  test('en inglés: parámetros y precios propios del idioma', async ({ page }) => {
    await page.goto('/en/coffee/hambela?grind=espresso&size=1kg');
    await waitForHydration(page);
    await expect(page.getByRole('radio', { name: /^1 kg/ })).toBeChecked();
    await expect(page.locator('[data-price]')).toHaveText('€49.00');
    // El selector de idioma conserva la variante.
    await expect(page.locator('[data-lang-switch]').first()).toHaveAttribute('href', /molienda=espresso&tamano=1kg/);
  });

  test('sin violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/es/cafes/hambela');
    await waitForHydration(page);
    await expectNoA11yViolations(page);
  });
});

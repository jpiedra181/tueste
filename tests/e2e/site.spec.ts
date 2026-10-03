import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, waitForHydration } from './helpers';

test.describe('Sitio', () => {
  for (const path of ['/es', '/en', '/es/cafes', '/en/coffee', '/es/proximamente']) {
    test(`${path}: sin violaciones de accesibilidad`, async ({ page }) => {
      await page.goto(path);
      await waitForHydration(page);
      await expect(page.locator('h1')).toHaveCount(1);
      await expectNoA11yViolations(page);
    });
  }

  test('el listado enlaza a las fichas generadas desde los datos', async ({ page }) => {
    await page.goto('/es/cafes');
    for (const name of ['Hambela', 'Santa Elena', 'El Diviso', 'Kiambu', 'Acueducto']) {
      await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible();
    }
    await page.getByRole('link', { name: /Kiambu/ }).first().click();
    await expect(page).toHaveURL(/\/es\/cafes\/kiambu/);
    await expect(page.getByRole('heading', { level: 1, name: 'Kiambu' })).toBeVisible();
  });

  test('el selector de idioma lleva a la misma página en el otro idioma', async ({ page }) => {
    await page.goto('/es/cafes/el-diviso');
    await waitForHydration(page);
    // En móvil el selector de idioma está dentro del menú.
    if ((await page.locator('[data-lang-switch]:visible').count()) === 0) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
    }
    await page.locator('[data-lang-switch]:visible').first().click();
    await expect(page).toHaveURL(/\/en\/coffee\/el-diviso/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('€16.90').first()).toBeVisible();
  });

  test('404', async ({ page }) => {
    const response = await page.goto('/es/cafes/no-existe');
    expect(response?.status()).toBe(404);
  });
});

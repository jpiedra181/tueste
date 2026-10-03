import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, seedCart, waitForHydration } from './helpers';

test.describe('Cesta lateral', () => {
  test('se abre al añadir, atrapa el foco y se cierra con Escape', async ({ page }) => {
    await page.goto('/es/cafes/hambela');
    await waitForHydration(page);
    const add = page.getByRole('button', { name: 'Añadir a la cesta', exact: true });
    await add.click();

    const drawer = page.getByRole('dialog', { name: 'Tu cesta' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Hambela').first()).toBeVisible();
    await expect(drawer.getByText(/Te faltan 20,50\s€ para el envío gratis/)).toBeVisible();

    // El foco no sale del panel.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(add).toBeFocused();
  });

  test('se mantiene al recargar', async ({ page }) => {
    await page.goto('/es/cafes/hambela');
    await waitForHydration(page);
    await page.getByRole('button', { name: 'Añadir a la cesta', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.reload();
    await waitForHydration(page);
    await page.getByRole('button', { name: /Abrir cesta, 1 producto/ }).click();
    await expect(page.getByRole('dialog', { name: 'Tu cesta' }).getByText('Hambela').first()).toBeVisible();
  });

  test('envío gratis desbloqueado y accesibilidad del panel', async ({ page }) => {
    await seedCart(page, [
      { sku: 'HAM-BEA-250', productId: 'hambela', qty: 2 },
      { sku: 'STE-BEA-250', productId: 'santa-elena' },
    ]);
    await page.goto('/es/cafes/hambela');
    await waitForHydration(page);
    await page.getByRole('button', { name: /Abrir cesta, 3 productos/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Tu cesta' });
    await expect(drawer.getByText('¡Tienes envío gratis!')).toBeVisible();
    await expect(drawer.getByText(/41,00\s€/).first()).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe('Movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('añadir a la cesta y abrirla no desplaza nada', async ({ page }) => {
    await page.goto('/es/cafes/hambela');
    await waitForHydration(page);
    await page.getByRole('button', { name: 'Añadir a la cesta', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Tu cesta' })).toBeVisible();
    const moving = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect instanceof KeyframeEffect)
        .filter((a) => JSON.stringify((a.effect as KeyframeEffect).getKeyframes()).match(/translate|scale/)).length,
    );
    expect(moving).toBe(0);
  });
});

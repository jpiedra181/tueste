import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, seedCart, waitForHydration } from './helpers';

async function fillDetails(page: Page) {
  await page.getByRole('textbox', { name: 'Email' }).fill('lucia.martin@correo.es');
  await page.getByLabel('Nombre', { exact: true }).fill('Lucía');
  await page.getByLabel('Apellidos').fill('Martín Sanz');
  await page.getByLabel('Dirección', { exact: true }).fill('Calle Real, 14');
  await page.getByLabel('Código postal').fill('40001');
  await page.getByLabel('Ciudad').fill('Segovia');
  await page.getByLabel('Teléfono').fill('612345678');
}

test.describe('Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await seedCart(page, [
      { sku: 'HAM-BEA-250', productId: 'hambela', qty: 2 },
      { sku: 'STE-BEA-250', productId: 'santa-elena' },
    ]);
  });

  test('errores enlazados y anunciados; el foco va al título de cada paso', async ({ page }) => {
    await page.goto('/es/checkout');
    await waitForHydration(page);

    await page.getByRole('button', { name: 'Continuar al envío' }).click();
    const banner = page.getByRole('alert').filter({ hasText: /Revisa \d+ campos? antes de continuar/ });
    await expect(banner).toBeVisible();
    const email = page.getByRole('textbox', { name: 'Email' });
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await email.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`[id="${describedBy!.split(' ')[0]}"]`)).toContainText('Este campo es obligatorio');

    // Formato: el mensaje cambia a medida que se escribe (el campo ya tenía error).
    await email.fill('lucia.martin@correo');
    await expect(page.locator(`[id="${describedBy!.split(' ')[0]}"]`)).toContainText('Introduce un email válido');

    // Validación en tiempo real: el error desaparece al corregirlo.
    await email.fill('lucia.martin@correo.es');
    await email.blur();
    await expect(email).not.toHaveAttribute('aria-invalid', 'true');

    await fillDetails(page);
    await expect(page.getByLabel('Provincia')).toHaveValue('Segovia');
    await page.getByRole('button', { name: 'Continuar al envío' }).click();
    await expect(page).toHaveURL(/paso=2/);
    await expect(page.getByRole('heading', { level: 2, name: /Paso 2 de 3/ })).toBeFocused();

    // Volver atrás no pierde datos.
    await page.goBack();
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('lucia.martin@correo.es');
  });

  test('pago con error y pago correcto hasta la confirmación', async ({ page }) => {
    await page.goto('/es/checkout');
    await waitForHydration(page);
    await fillDetails(page);
    await page.getByRole('button', { name: 'Continuar al envío' }).click();
    await page.getByRole('button', { name: 'Continuar al pago' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Paso 3 de 3/ })).toBeFocused();

    await page.getByLabel('Número de tarjeta').fill('4000 0000 0000 0002');
    await page.getByLabel('Caducidad').fill('08/30');
    await page.getByLabel('CVC').fill('123');
    await page.getByLabel('Titular de la tarjeta').fill('Lucía Martín Sanz');
    await page.getByLabel(/Acepto las condiciones/).check({ force: true });
    await page.getByRole('button', { name: /^Pagar/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'No hemos podido procesar el pago' })).toBeVisible();

    await page.getByLabel('Número de tarjeta').fill('4242 4242 4242 4242');
    await page.getByRole('button', { name: /^Pagar/ }).click();
    await expect(page).toHaveURL(/\/es\/pedido-confirmado/);
    await expect(page.getByRole('heading', { level: 1, name: 'Gracias, Lucía.' })).toBeVisible();
  });

  test('autocomplete correcto y sin violaciones de accesibilidad', async ({ page }) => {
    await page.goto('/es/checkout');
    await waitForHydration(page);
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveAttribute('autocomplete', 'email');
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveAttribute('autocomplete', 'given-name');
    await expect(page.getByLabel('Código postal')).toHaveAttribute('autocomplete', 'postal-code');
    await expect(page.getByLabel('Teléfono')).toHaveAttribute('autocomplete', 'tel');
    await expectNoA11yViolations(page);
  });
});

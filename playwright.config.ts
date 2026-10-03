import { defineConfig, devices } from '@playwright/test';

/**
 * E2E sobre el build de producción (`npm run build` antes). `astro preview` sirve dist/
 * resolviendo las rutas sin .html igual que Netlify. Astro 7 solo admite una vista previa a la vez:
 * en local se reutiliza la que esté abierta.
 */
const PORT = 4321;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx astro preview --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/es`,
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});

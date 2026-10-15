import { test, expect } from '@playwright/test'

// El widget de Turnstile carga y entrega token en el formulario de la landing de Recupera.
// Corre contra un servidor local construido con la site key de prueba de Cloudflare (siempre pasa):
//
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA yarn build
//   yarn start -p 39847
//   E2E_BASE_URL=http://localhost:39847 yarn playwright test tests/e2e/turnstile-form.spec.ts
const BASE = process.env.E2E_BASE_URL
test.skip(!BASE, 'sin E2E_BASE_URL')
test.use({ baseURL: BASE })

test('el widget de Turnstile carga y entrega token en la landing', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(
    () => !!document.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value,
    null,
    { timeout: 20_000 }
  )
})

test('si Cloudflare está bloqueado la página igual carga y el formulario existe', async ({ page }) => {
  await page.route('**/challenges.cloudflare.com/**', (route) => route.abort())
  await page.goto('/')
  await expect(page.locator('form').first()).toBeAttached()
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveCount(0)
})

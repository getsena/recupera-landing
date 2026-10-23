import { test, expect } from '@playwright/test'

test('el logo wall muestra los clientes vigentes', async ({ page }) => {
  await page.goto('/')

  const section = page.locator('#clientes')
  await expect(section).toBeVisible()
  await expect(section.getByRole('heading', { name: 'Empresas que ya cobran con Sena' })).toBeVisible()
  await expect(section.getByAltText("L'Oréal").first()).toBeAttached()
  await expect(section.getByAltText('Científica Andina').first()).toBeAttached()
  await expect(section.getByAltText('Recsa').first()).toBeAttached()
})

test('el logo wall no muestra clientes retirados', async ({ page }) => {
  await page.goto('/')

  const section = page.locator('#clientes')
  await expect(section.getByAltText('Proweld')).toHaveCount(0)
  await expect(section.getByAltText('Aquarius Consulting')).toHaveCount(0)
})

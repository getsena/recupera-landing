import { test, expect, type Page } from '@playwright/test'

// Landing de producto de Recupera: contenido del servidor y formulario de dos pasos.

const PROHIBIDO = [
  /40 años/i,
  /15 países/i,
  /colombia|méxico|argentina|brasil/i,
  /ROI garantizado/i,
  /Varía según volumen/i,
  /48-72h|48 ?h\b|en 2 semanas/i,
  /deudor/i,
  /proyecciones/i,
  /Sin compromiso/i,
  /Datos protegidos/i,
  /SENA SE/,
  /nos avalan/i,
]

test.describe('contenido renderizado en el servidor', () => {
  test('un solo H1, las secciones en orden y sin claims retirados', async ({ request }) => {
    const html = await (await request.get('/')).text()
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    expect(html).toContain('Cobranza B2B de cartera vencida en Chile y Perú')

    // header, hero, franja, pasos, precio, logos, casos, Ópera, FAQ, formulario, footer
    const orden = [
      '<header',
      'id="inicio"',
      'aria-label="Lo esencial"',
      'id="como"',
      'id="precio"',
      'id="clientes"',
      'id="casos"',
      'id="opera-titulo"',
      'id="faq"',
      'id="caso"',
      '<footer',
    ]
    const posiciones = orden.map((t) => html.indexOf(t))
    expect(posiciones.every((p) => p > 0)).toBe(true)
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones)

    const texto = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
    for (const p of PROHIBIDO) expect(texto, String(p)).not.toMatch(p)
  })

  test('metadata, canonical y JSON-LD de Service y FAQPage', async ({ request }) => {
    const html = await (await request.get('/')).text()
    expect(html).toContain('<title>Sena Recupera · Cobranza B2B de cartera vencida en Chile y Perú</title>')
    expect(html).toContain('<link rel="canonical" href="https://recupera.somossena.com"/>')
    expect(html).toContain('<meta property="og:site_name" content="Sena"/>')
    expect(html).not.toMatch(/<meta name="description" content="[^"]*DICOM/)

    const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
      (m) => JSON.parse(m[1])
    )
    const service = bloques.find((b) => b['@type'] === 'Service')
    expect(service.name).toBe('Sena Recupera')
    expect(service.areaServed.map((a: { identifier: string }) => a.identifier)).toEqual(['CL', 'PE'])
    expect(service.offers.priceSpecification.price).toBe(15)

    const faq = bloques.find((b) => b['@type'] === 'FAQPage')
    expect(faq.mainEntity).toHaveLength(8)
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toContain('¿Qué cartera toman?')
    // la FAQ visible es la misma del schema
    for (const q of faq.mainEntity) expect(html).toContain(q.acceptedAnswer.text)
  })

  test('el puente a Ópera enlaza a agente.somossena.com', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Conoce Ópera' })).toHaveAttribute(
      'href',
      'https://agente.somossena.com'
    )
  })

  test('la landing no publica la cifra de recuperación sin fuente (HTML ni JSON-LD)', async ({
    page,
  }) => {
    await page.goto('/')
    expect(await page.content()).not.toContain('85%')
  })

  test('llms.txt sin plazos de resultado ni gestión preventiva', async ({ request }) => {
    const txt = await (await request.get('/llms.txt')).text()
    expect(txt).toContain('15%')
    expect(txt).not.toContain('85%')
    expect(txt).toContain('más de 60 días')
    expect(txt).toContain('https://agente.somossena.com')
    expect(txt).not.toMatch(/preventiva|48-72h|2 semanas|LATAM/i)
  })
})

async function completarPaso1(page: Page) {
  await page.goto('/?utm_source=google&utm_medium=cpc&utm_campaign=test-e2e&gclid=test-gclid-123')
  const form = page.getByRole('form', { name: 'Evalúa tu cartera' })
  await expect(form.getByRole('button', { name: 'Empezar por Recupera' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(form.getByLabel(/Antigüedad principal de la deuda/)).toBeVisible()
  await form.getByRole('button', { name: 'Continuar' }).click()
  return form
}

test.describe('formulario de dos pasos', () => {
  test('envía el caso a /api/lead y muestra la gracias en el mismo formulario', async ({ page }) => {
    let enviado: Record<string, unknown> | undefined
    await page.route('**/api/lead', async (route) => {
      enviado = route.request().postDataJSON()
      await route.fulfill({ json: { ok: true } })
    })
    await page.route('**/users/send_contact_info/**', (route) => route.fulfill({ json: {} }))

    const form = await completarPaso1(page)
    await form.getByLabel('Nombre').fill('Ana Pérez')
    await form.getByLabel('Empresa').fill('Acme SpA')
    await form.getByLabel('Email de trabajo').fill('ana@acme.cl')
    await form.getByLabel('Teléfono').fill('911112222')
    await form.getByRole('button', { name: 'Enviar' }).click()

    await expect(form.getByRole('heading', { name: /Gracias. Recibimos tu caso/ })).toBeVisible()
    expect(page.url()).not.toContain('/thankyou')
    expect(enviado).toMatchObject({
      nombre: 'Ana',
      apellido: 'Pérez',
      telefono: '+56911112222',
      gclid: 'test-gclid-123',
      caso: { cotizar: 'recupera', necesidad: 'dificil', tipo_cartera: 'B2B' },
    })
  })

  test('sin datos de contacto muestra los errores y no envía', async ({ page }) => {
    let llamadas = 0
    await page.route('**/api/lead', (route) => {
      llamadas++
      return route.fulfill({ json: { ok: true } })
    })
    const form = await completarPaso1(page)
    await form.getByLabel('Email de trabajo').fill('no-es-email')
    await form.getByRole('button', { name: 'Enviar' }).click()

    await expect(form.getByText('Escribe tu nombre.')).toBeVisible()
    await expect(form.getByText('Escribe un email válido.')).toBeVisible()
    expect(llamadas).toBe(0)
  })
})

test('/thankyou muestra confirmación, embed HubSpot y botón WhatsApp', async ({ page }) => {
  await page.goto('/thankyou')

  await expect(page.getByText(/hemos recibido tus datos/i)).toBeVisible({ timeout: 15_000 })

  const embedContainer = page.locator('.meetings-iframe-container')
  await expect(embedContainer).toBeAttached()
  expect(await embedContainer.getAttribute('data-src')).toContain('meetings.hubspot.com/francisco502')

  await expect(page.getByRole('link', { name: /abrir calendario/i })).toBeVisible()
  await expect(page.getByText(/sin compromiso/i)).toHaveCount(0)
  const waHref = await page.getByRole('link', { name: /hablar por whatsapp/i }).getAttribute('href')
  expect(waHref).toContain('wa.me/56977290160')
})

test('móvil 375 px: CTA del hero y CTA fijo visibles, WhatsApp y sin scroll horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Evalúa tu cartera gratis' }).first()).toBeVisible()
  // CTA fijo de móvil: se oculta cuando el formulario está a la vista
  const fijo = page.locator('div.fixed a[href="#caso"]')
  await expect(fijo).toBeVisible()
  await page.locator('#caso').scrollIntoViewIfNeeded()
  await expect(fijo).toHaveCount(0)
  await expect(page.locator('.btn-floating-whatsapp')).toBeAttached()
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(ancho).toBeLessThanOrEqual(375)
})

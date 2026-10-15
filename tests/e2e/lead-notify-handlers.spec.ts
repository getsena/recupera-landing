import { NextRequest } from 'next/server'
import { test, expect } from '@playwright/test'

import { POST as postLead } from '@/app/api/lead/route'

type Call = { method: string; url: string; body: unknown }
type SendGridBody = {
  personalizations: { to: { email: string }[] }[]
  subject: string
  content: { value: string }[]
}

// Simula HubSpot y SendGrid (los servicios externos). `sendgrid`: 'ok', 'down' (la red falla) o un estado HTTP.
function mockServices(
  opts: {
    existing?: boolean
    openDeal?: boolean
    contactStatus?: number
    dealStatus?: number
    sendgrid?: 'ok' | 'down' | number
    sendgridDelayMs?: number
  } = {}
) {
  const calls: Call[] = []
  let sendgridDone = 0
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, url, body })
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.includes('api.sendgrid.com')) {
      if (opts.sendgrid === 'down') throw new Error('red caída')
      if (opts.sendgridDelayMs) await new Promise((r) => setTimeout(r, opts.sendgridDelayMs))
      sendgridDone++
      return new Response('', { status: typeof opts.sendgrid === 'number' ? opts.sendgrid : 202 })
    }
    if (url.includes('/contacts/search')) {
      return opts.existing
        ? json(200, { total: 1, results: [{ id: '77', properties: {} }] })
        : json(200, { total: 0, results: [] })
    }
    if (method === 'PATCH' && url.includes('/crm/v3/objects/contacts/')) return json(200, { id: '77' })
    if (method === 'POST' && url.endsWith('/crm/v3/objects/contacts')) {
      return opts.contactStatus && opts.contactStatus >= 400
        ? json(opts.contactStatus, {})
        : json(201, { id: '77' })
    }
    if (url.includes('/deals/search')) return json(200, { total: opts.openDeal ? 1 : 0 })
    if (url.endsWith('/crm/v3/objects/deals')) {
      return opts.dealStatus && opts.dealStatus >= 400 ? json(opts.dealStatus, {}) : json(201, { id: '88' })
    }
    return json(200, {})
  }) as typeof fetch
  const sendgridCalls = () => calls.filter((c) => c.url.includes('api.sendgrid.com'))
  return {
    calls,
    sendgridCalls,
    sendgridDone: () => sendgridDone,
    restore: () => (globalThis.fetch = original),
  }
}

const leadPayload = {
  nombre: 'Ana',
  apellido: 'Pérez',
  empresa: 'Acme SpA',
  email: 'ana@acme.cl',
  telefono: '+56911112222',
  facturas_pendientes: '10-50',
  alguien_cobrando: 'No',
  
  utmSource: 'google',
  utmMedium: 'cpc',
  utmCampaign: '23584417865',
  gclid: 'abc123',
}

const req = (path: string, payload: unknown) =>
  new NextRequest(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(payload) })

// El aviso del camino de éxito sale en segundo plano: se espera a que aparezca (o se agota el plazo).
async function until(cond: () => boolean, ms = 1500) {
  const fin = Date.now() + ms
  while (!cond() && Date.now() < fin) await new Promise((r) => setTimeout(r, 10))
}
const settle = () => new Promise((r) => setTimeout(r, 150))

const sgBody = (c: Call) => c.body as SendGridBody

test.beforeEach(() => {
  process.env.HUBSPOT_ACCESS_TOKEN = 'test-token'
  process.env.SENDGRID_API_KEY = 'SG.test-key-no-real'
  process.env.NOTIFY_LEAD_TO = 'hola@somossena.com, francisco@somossena.com'
  delete process.env.META_PIXEL_ID
  delete process.env.META_CAPI_TOKEN
})

test.describe('/api/lead: aviso por correo', () => {
  test('lead nuevo: responde 200 y avisa con el canal y el link al contacto', async () => {
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      await until(() => m.sendgridCalls().length > 0)
      expect(m.sendgridCalls()).toHaveLength(1)
      const mail = sgBody(m.sendgridCalls()[0])
      expect(mail.subject).toContain('Recupera')
      expect(mail.subject).not.toContain('FALLÓ')
      expect(mail.content[0].value).toContain('Canal: Ads / Google / google_search_recupera')
      expect(mail.content[0].value).toContain('Estado en HubSpot: guardado')
      expect(mail.content[0].value).toContain('record/0-1/77')
    } finally {
      m.restore()
    }
  })

  test('si HubSpot falla responde 502 y el aviso FALLÓ HUBSPOT ya salió con el lead completo', async () => {
    const m = mockServices({ contactStatus: 500, sendgridDelayMs: 120 })
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(502)
      // Sin esperar: en el camino de fallo el correo termina ANTES de responder (SendGrid tarda 120 ms).
      expect(m.sendgridDone()).toBe(1)
      expect(m.sendgridCalls()).toHaveLength(1)
      const mail = sgBody(m.sendgridCalls()[0])
      expect(mail.subject.startsWith('FALLÓ HUBSPOT')).toBe(true)
      for (const dato of ['"Ana Pérez"', '"Acme SpA"', '"ana@acme.cl"', '"+56911112222"', '"10-50"']) {
        expect(mail.content[0].value).toContain(dato)
      }
    } finally {
      m.restore()
    }
  })

  test('si el negocio falla después de guardar el contacto: 502, un solo aviso FALLÓ con el link al contacto y sin aviso ok', async () => {
    const m = mockServices({ dealStatus: 500 })
    const originalError = console.error
    console.error = () => {}
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(502)
      await settle()
      expect(m.sendgridCalls()).toHaveLength(1)
      const mail = sgBody(m.sendgridCalls()[0])
      expect(mail.subject.startsWith('FALLÓ HUBSPOT')).toBe(true)
      expect(mail.content[0].value).toContain('record/0-1/77')
      expect(mail.content[0].value).toContain('el contacto puede existir sin negocio')
    } finally {
      console.error = originalError
      m.restore()
    }
  })

  test('el reenvío de un lead conocido con negocio abierto no manda otro correo', async () => {
    const m = mockServices({ existing: true, openDeal: true })
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      await settle()
      expect(m.sendgridCalls()).toHaveLength(0)
    } finally {
      m.restore()
    }
  })

  test('un contacto conocido sin negocio abierto sí genera aviso', async () => {
    const m = mockServices({ existing: true, openDeal: false })
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      await until(() => m.sendgridCalls().length > 0)
      expect(m.sendgridCalls()).toHaveLength(1)
    } finally {
      m.restore()
    }
  })

  test('en el camino de éxito la respuesta no espera a SendGrid', async () => {
    const m = mockServices({ sendgridDelayMs: 300 })
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      // El correo sale en segundo plano: al responder todavía no terminó.
      expect(m.sendgridDone()).toBe(0)
      await until(() => m.sendgridDone() === 1)
      expect(m.sendgridDone()).toBe(1)
    } finally {
      m.restore()
    }
  })

  test('si SendGrid falla, el formulario igual responde 200', async () => {
    const m = mockServices({ sendgrid: 'down' })
    const originalError = console.error
    console.error = () => {}
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      await until(() => m.sendgridCalls().length > 0)
    } finally {
      console.error = originalError
      m.restore()
    }
  })

  test('si SendGrid falla con HubSpot caído, igual responde 502 con su mensaje normal', async () => {
    const m = mockServices({ contactStatus: 500, sendgrid: 'down' })
    const originalError = console.error
    console.error = () => {}
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(502)
      expect(await res.json()).toMatchObject({ ok: false })
    } finally {
      console.error = originalError
      m.restore()
    }
  })

  test('sin SENDGRID_API_KEY el formulario funciona y no llama a SendGrid', async () => {
    delete process.env.SENDGRID_API_KEY
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      await settle()
      expect(m.sendgridCalls()).toHaveLength(0)
    } finally {
      m.restore()
    }
  })

  test('un lead smoke avisa solo a hola@', async () => {
    const m = mockServices()
    try {
      const res = await postLead(
        req('/api/lead', { ...leadPayload, email: 'smoke+1730000000@somossena.com' })
      )
      expect(res.status).toBe(200)
      await until(() => m.sendgridCalls().length > 0)
      const to = sgBody(m.sendgridCalls()[0]).personalizations.flatMap((p) => p.to.map((t) => t.email))
      expect(to).toEqual(['hola@somossena.com'])
    } finally {
      m.restore()
    }
  })

  test('un payload inválido no genera aviso', async () => {
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', { ...leadPayload, email: 'no-es-email' }))
      expect(res.status).toBe(400)
      await settle()
      expect(m.sendgridCalls()).toHaveLength(0)
    } finally {
      m.restore()
    }
  })
})

import { NextRequest } from 'next/server'
import { test, expect } from '@playwright/test'

import { POST as postLead } from '@/app/api/lead/route'

type Call = { method: string; url: string; body: unknown }
type SendGridBody = { personalizations: { to: { email: string }[] }[]; subject: string }

// Simula HubSpot, SendGrid, Meta CAPI y Cloudflare. El token decide la respuesta de Cloudflare:
// 'bueno' verifica, 'malo' lo declara inválido y 'caido' hace fallar la red.
function mockServices() {
  const calls: Call[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const raw = init.body ? String(init.body) : undefined
    const isForm = typeof raw === 'string' && !raw.startsWith('{')
    calls.push({
      method,
      url,
      body: raw ? (isForm ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw)) : undefined,
    })
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.includes('challenges.cloudflare.com')) {
      const token = new URLSearchParams(raw).get('response')
      if (token === 'caido') throw new Error('sin red')
      if (token === 'bueno')
        return json(200, { success: true, hostname: 'www.somossena.com', action: 'lead' })
      return json(200, { success: false, 'error-codes': ['invalid-input-response'] })
    }
    if (url.includes('api.sendgrid.com')) return new Response('', { status: 202 })
    if (url.includes('graph.facebook.com')) return json(200, {})
    if (url.includes('/contacts/search')) return json(200, { total: 0, results: [] })
    if (method === 'POST' && url.endsWith('/crm/v3/objects/contacts')) return json(201, { id: '77' })
    if (url.endsWith('/crm/v3/objects/deals')) return json(201, { id: '88' })
    return json(200, {})
  }) as typeof fetch
  const to = (fragment: string) => calls.filter((c) => c.url.includes(fragment))
  return {
    calls,
    hubspot: () => to('api.hubapi.com'),
    sendgrid: () => to('api.sendgrid.com'),
    meta: () => to('graph.facebook.com'),
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

let ipSeq = 0
const nextIp = () => `198.51.100.${++ipSeq}`

function req(path: string, payload: unknown, ip = nextIp(), headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'x-real-ip': ip, ...headers },
  })
}

async function until(cond: () => boolean, ms = 1500) {
  const fin = Date.now() + ms
  while (!cond() && Date.now() < fin) await new Promise((r) => setTimeout(r, 10))
}
const settle = () => new Promise((r) => setTimeout(r, 150))
const subject = (m: ReturnType<typeof mockServices>) => (m.sendgrid()[0].body as SendGridBody).subject

test.beforeEach(() => {
  process.env.HUBSPOT_ACCESS_TOKEN = 'test-token'
  process.env.SENDGRID_API_KEY = 'SG.test-key-no-real'
  process.env.NOTIFY_LEAD_TO = 'hola@somossena.com, francisco@somossena.com'
  process.env.TURNSTILE_SECRET_KEY = 'secreto-de-prueba'
  process.env.META_PIXEL_ID = '123'
  process.env.META_CAPI_TOKEN = 'capi-test'
  delete process.env.TURNSTILE_ALLOWED_HOSTNAMES
})

test.describe('/api/lead: Turnstile', () => {
  test('token válido: procesa, avisa sin marca y sigue reportando a Meta', async () => {
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', { ...leadPayload, 'cf-turnstile-response': 'bueno' }))
      expect(res.status).toBe(200)
      await until(() => m.sendgrid().length > 0)
      expect(subject(m)).not.toContain('SIN VERIFICAR')
      expect(m.meta()).toHaveLength(1)
    } finally {
      m.restore()
    }
  })

  test('token inválido: 403 y no se toca HubSpot, el correo ni Meta', async () => {
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', { ...leadPayload, 'cf-turnstile-response': 'malo' }))
      expect(res.status).toBe(403)
      await settle()
      expect(m.hubspot()).toHaveLength(0)
      expect(m.sendgrid()).toHaveLength(0)
      expect(m.meta()).toHaveLength(0)
    } finally {
      m.restore()
    }
  })

  test('sin token: el lead se guarda, el aviso va marcado [SIN VERIFICAR] y NO se reporta a Meta', async () => {
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      expect(m.hubspot().length).toBeGreaterThan(0)
      await until(() => m.sendgrid().length > 0)
      expect(subject(m)).toContain('[SIN VERIFICAR]')
      expect(m.meta()).toHaveLength(0)
    } finally {
      m.restore()
    }
  })

  test('si Cloudflare está caído se comporta como sin token', async () => {
    const m = mockServices()
    const originalError = console.error
    console.error = () => {}
    try {
      const res = await postLead(req('/api/lead', { ...leadPayload, 'cf-turnstile-response': 'caido' }))
      expect(res.status).toBe(200)
      await until(() => m.sendgrid().length > 0)
      expect(subject(m)).toContain('[SIN VERIFICAR]')
      expect(m.meta()).toHaveLength(0)
    } finally {
      console.error = originalError
      m.restore()
    }
  })

  test('un token que no es texto se ignora y queda sin verificar', async () => {
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', { ...leadPayload, 'cf-turnstile-response': { x: 1 } }))
      expect(res.status).toBe(200)
      await until(() => m.sendgrid().length > 0)
      expect(subject(m)).toContain('[SIN VERIFICAR]')
    } finally {
      m.restore()
    }
  })

  test('sin TURNSTILE_SECRET_KEY la verificación está desactivada y todo funciona como antes', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const m = mockServices()
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(200)
      await until(() => m.sendgrid().length > 0)
      expect(subject(m)).not.toContain('SIN VERIFICAR')
      expect(m.meta()).toHaveLength(1)
      expect(m.calls.some((c) => c.url.includes('challenges.cloudflare.com'))).toBe(false)
    } finally {
      m.restore()
    }
  })

  test('con la verificación desactivada ningún lead cuenta para el tope por IP', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const m = mockServices()
    const ip = nextIp()
    try {
      for (let i = 0; i < 6; i++) {
        const res = await postLead(req('/api/lead', { ...leadPayload, email: `d${i}@acme.cl` }, ip))
        expect(res.status).toBe(200)
      }
    } finally {
      m.restore()
    }
  })

  test('un email smoke+ no se exime de Turnstile: sin token también queda marcado', async () => {
    const m = mockServices()
    try {
      const res = await postLead(
        req('/api/lead', { ...leadPayload, email: 'smoke+1730000000@somossena.com' })
      )
      expect(res.status).toBe(200)
      await until(() => m.sendgrid().length > 0)
      expect(subject(m)).toContain('[SIN VERIFICAR]')
      expect(subject(m)).toContain('[SMOKE]')
    } finally {
      m.restore()
    }
  })

  test('el cuarto lead sin verificar de la misma IP recibe 429 y no toca HubSpot', async () => {
    const m = mockServices()
    const ip = nextIp()
    try {
      for (let i = 0; i < 3; i++) {
        const ok = await postLead(req('/api/lead', { ...leadPayload, email: `ana${i}@acme.cl` }, ip))
        expect(ok.status).toBe(200)
      }
      const before = m.hubspot().length
      const res = await postLead(req('/api/lead', { ...leadPayload, email: 'ana9@acme.cl' }, ip))
      expect(res.status).toBe(429)
      expect(m.hubspot()).toHaveLength(before)
    } finally {
      m.restore()
    }
  })

  test('falsear x-forwarded-for no evade el tope por IP', async () => {
    const m = mockServices()
    const ip = nextIp()
    try {
      for (let i = 0; i < 3; i++) {
        await postLead(
          req('/api/lead', { ...leadPayload, email: `b${i}@acme.cl` }, ip, {
            'x-forwarded-for': `9.9.9.${i}`,
          })
        )
      }
      const res = await postLead(
        req('/api/lead', { ...leadPayload, email: 'b9@acme.cl' }, ip, { 'x-forwarded-for': '8.8.8.8' })
      )
      expect(res.status).toBe(429)
    } finally {
      m.restore()
    }
  })

  test('los leads verificados no cuentan para el tope de los no verificados', async () => {
    const m = mockServices()
    const ip = nextIp()
    try {
      for (let i = 0; i < 6; i++) {
        const res = await postLead(
          req('/api/lead', { ...leadPayload, email: `c${i}@acme.cl`, 'cf-turnstile-response': 'bueno' }, ip)
        )
        expect(res.status).toBe(200)
      }
    } finally {
      m.restore()
    }
  })

  test('el correo de FALLÓ HUBSPOT también lleva la marca de sin verificar', async () => {
    const m = mockServices()
    const original = globalThis.fetch
    globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
      if (String(url).endsWith('/crm/v3/objects/contacts') && init.method === 'POST') {
        return new Response('{}', { status: 500 })
      }
      return original(url, init)
    }) as typeof fetch
    try {
      const res = await postLead(req('/api/lead', leadPayload))
      expect(res.status).toBe(502)
      expect(m.sendgrid()).toHaveLength(1)
      expect(subject(m)).toContain('FALLÓ HUBSPOT')
      expect(subject(m)).toContain('[SIN VERIFICAR]')
    } finally {
      globalThis.fetch = original
      m.restore()
    }
  })
})

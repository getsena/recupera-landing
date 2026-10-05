import { NextRequest } from 'next/server'
import { test, expect } from '@playwright/test'

import { POST as postLead } from '@/app/api/lead/route'

type Call = { method: string; url: string; body: unknown }

// Valores válidos del enum fuente_del_lead en HubSpot. Cualquier otro devuelve 400.
const FUENTES_VALIDAS = ['Ads', 'Orgánico', 'Referido', 'Outbound/Piloto BBDD', 'MetaRecsa']

// Simula HubSpot (y Meta). `contactPost` define las respuestas sucesivas al crear contacto.
function mockHubspot(opts: { contactPost?: { status: number; json: unknown }[] } = {}) {
  const calls: Call[] = []
  let contactPosts = 0
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, url, body })
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.includes('/contacts/search')) return json(200, { total: 0, results: [] })
    if (method === 'POST' && url.endsWith('/crm/v3/objects/contacts')) {
      const r = opts.contactPost?.[contactPosts++] ?? { status: 201, json: { id: '77' } }
      return json(r.status, r.json)
    }
    if (url.endsWith('/crm/v3/objects/deals')) return json(201, { id: '88' })
    if (url.includes('/memberships/add')) return json(200, {})
    return json(200, {})
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

const contactWrites = (calls: Call[]) =>
  calls.filter((c) => c.method === 'POST' && c.url.endsWith('/crm/v3/objects/contacts'))

const propsOf = (call: Call) => (call.body as { properties: Record<string, string> }).properties

const leadPayload = {
  nombre: 'Ana',
  apellido: 'Pérez',
  empresa: 'Acme',
  email: 'ana@acme.cl',
  telefono: '+56911111111',
  facturas_pendientes: '10-50',
  alguien_cobrando: 'No',
}

function req(payload: unknown) {
  return new NextRequest('http://localhost/api/lead', { method: 'POST', body: JSON.stringify(payload) })
}

test.beforeEach(() => {
  process.env.HUBSPOT_ACCESS_TOKEN = 'test-token'
  delete process.env.META_PIXEL_ID
  delete process.env.META_CAPI_TOKEN
})

test.describe('/api/lead: fuente_del_lead válida', () => {
  test('lead con gclid manda fuente_del_lead "Ads" y origen Google', async () => {
    const m = mockHubspot()
    try {
      const res = await postLead(req({ ...leadPayload, gclid: 'abc' }))
      expect(res.status).toBe(200)
      const props = propsOf(contactWrites(m.calls)[0])
      expect(FUENTES_VALIDAS).toContain(props.fuente_del_lead)
      expect(props.fuente_del_lead).toBe('Ads')
      expect(props.origen).toBe('Google')
    } finally {
      m.restore()
    }
  })

  test('lead con gclid y campaña registrada manda origen_detalle de la taxonomía', async () => {
    const m = mockHubspot()
    try {
      await postLead(req({ ...leadPayload, gclid: 'abc', utmCampaign: '23584417865' }))
      expect(propsOf(contactWrites(m.calls)[0]).origen_detalle).toBe('google_search_recupera')
    } finally {
      m.restore()
    }
  })

  test('lead con gbraid cuenta como Google Ads', async () => {
    const m = mockHubspot()
    try {
      await postLead(req({ ...leadPayload, gbraid: 'gb1' }))
      const props = propsOf(contactWrites(m.calls)[0])
      expect(props.origen).toBe('Google')
      expect(props.origen_detalle).toBe('google_sin_utm')
    } finally {
      m.restore()
    }
  })

  test('pago de una plataforma desconocida no envía origen', async () => {
    const m = mockHubspot()
    try {
      await postLead(req({ ...leadPayload, utmSource: 'bing', utmMedium: 'cpc' }))
      const props = propsOf(contactWrites(m.calls)[0])
      expect(props.fuente_del_lead).toBe('Ads')
      expect(props).not.toHaveProperty('origen')
      expect(props.origen_detalle).toBe('pagado_otra_plataforma')
    } finally {
      m.restore()
    }
  })

  test('lead con fbclid nunca manda "Meta Ads" como fuente', async () => {
    const m = mockHubspot()
    try {
      await postLead(req({ ...leadPayload, fbclid: 'fb1' }))
      const props = propsOf(contactWrites(m.calls)[0])
      expect(props.fuente_del_lead).toBe('Ads')
      expect(props.origen).toBe('Meta')
    } finally {
      m.restore()
    }
  })

  test('lead sin señales es orgánico', async () => {
    const m = mockHubspot()
    try {
      await postLead(req(leadPayload))
      expect(propsOf(contactWrites(m.calls)[0]).fuente_del_lead).toBe('Orgánico')
    } finally {
      m.restore()
    }
  })

  test('rechaza un payload sin campos requeridos', async () => {
    const m = mockHubspot()
    try {
      const res = await postLead(req({ nombre: 'Ana' }))
      expect(res.status).toBe(400)
      expect(contactWrites(m.calls)).toHaveLength(0)
    } finally {
      m.restore()
    }
  })
})

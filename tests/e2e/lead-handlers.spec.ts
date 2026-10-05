import { NextRequest } from 'next/server'
import { test, expect } from '@playwright/test'

import { POST as postLead } from '@/app/api/lead/route'
import { isSmokeTest } from '@/lib/lead/smoke'

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

test.describe('/api/lead: un campo de clasificación rechazado no pierde el lead', () => {
  const CLASIFICACION = ['origen', 'origen_detalle', 'fuente_del_lead', 'sena_prioridad', 'etapa_del_lead']

  test('ante 400 INVALID_OPTION reintenta sin clasificación y responde ok', async () => {
    const m = mockHubspot({
      contactPost: [
        { status: 400, json: { errors: [{ code: 'INVALID_OPTION', message: 'fuente_del_lead' }] } },
        { status: 201, json: { id: '77' } },
      ],
    })
    try {
      const res = await postLead(req({ ...leadPayload, gclid: 'abc' }))
      expect(res.status).toBe(200)
      const writes = contactWrites(m.calls)
      expect(writes).toHaveLength(2)
      const reintento = propsOf(writes[1])
      for (const k of CLASIFICACION) expect(reintento).not.toHaveProperty(k)
      expect(reintento.email).toBe(leadPayload.email)
      expect(reintento.firstname).toBe('Ana')
    } finally {
      m.restore()
    }
  })

  test('ante PROPERTY_DOESNT_EXIST también guarda el lead sin clasificación', async () => {
    const m = mockHubspot({
      contactPost: [
        {
          status: 400,
          json: {
            message:
              'Property values were not valid: [{"error":"PROPERTY_DOESNT_EXIST","name":"origen_detalle"}]',
          },
        },
        { status: 201, json: { id: '78' } },
      ],
    })
    try {
      const res = await postLead(req({ ...leadPayload, gclid: 'abc' }))
      expect(res.status).toBe(200)
      expect(contactWrites(m.calls)).toHaveLength(2)
    } finally {
      m.restore()
    }
  })

  test('un error que no es de clasificación no se reintenta y responde 502', async () => {
    const m = mockHubspot({ contactPost: [{ status: 500, json: { message: 'boom' } }] })
    try {
      const res = await postLead(req(leadPayload))
      expect(res.status).toBe(502)
      expect(await res.json()).toMatchObject({ ok: false })
      expect(contactWrites(m.calls)).toHaveLength(1)
    } finally {
      m.restore()
    }
  })
})

const capiCalls = (calls: Call[]) => calls.filter((c) => c.url.includes('graph.facebook.com'))

test.describe('Meta CAPI: solo se reporta lo que el CRM guardó', () => {
  const payload = { ...leadPayload, fbclid: 'fb1' }

  test.beforeEach(() => {
    process.env.META_PIXEL_ID = 'pixel-1'
    process.env.META_CAPI_TOKEN = 'capi-token'
  })

  test('envía el evento Lead con event_id después de guardar en HubSpot', async () => {
    const m = mockHubspot()
    try {
      const res = await postLead(req({ ...payload, eventId: '123e4567-e89b-42d3-a456-426614174000' }))
      expect(res.status).toBe(200)
      const capi = capiCalls(m.calls)
      expect(capi).toHaveLength(1)
      const evento = (capi[0].body as { data: { event_id: string; event_name: string }[] }).data[0]
      expect(evento.event_name).toBe('Lead')
      expect(evento.event_id).toBe('123e4567-e89b-42d3-a456-426614174000')
      // el evento sale después de crear el contacto, no antes
      const iContacto = m.calls.findIndex(
        (c) => c.method === 'POST' && c.url.endsWith('/crm/v3/objects/contacts')
      )
      expect(m.calls.indexOf(capi[0])).toBeGreaterThan(iContacto)
    } finally {
      m.restore()
    }
  })

  test('genera un event_id si el cliente no manda uno', async () => {
    const m = mockHubspot()
    try {
      await postLead(req(payload))
      const evento = (capiCalls(m.calls)[0].body as { data: { event_id: string }[] }).data[0]
      expect(evento.event_id).toMatch(/^[0-9a-f-]{36}$/)
    } finally {
      m.restore()
    }
  })

  test('no reporta a Meta si HubSpot falla', async () => {
    const m = mockHubspot({ contactPost: [{ status: 500, json: { message: 'boom' } }] })
    try {
      const res = await postLead(req(payload))
      expect(res.status).toBe(502)
      expect(capiCalls(m.calls)).toHaveLength(0)
    } finally {
      m.restore()
    }
  })

  test('no reporta a Meta un payload inválido', async () => {
    const m = mockHubspot()
    try {
      const res = await postLead(req({ ...payload, email: 'sin-arroba' }))
      expect(res.status).toBe(400)
      expect(capiCalls(m.calls)).toHaveLength(0)
    } finally {
      m.restore()
    }
  })
})

test.describe('smoke tests: los emails +smoke no se reportan a Meta', () => {
  test.beforeEach(() => {
    process.env.META_PIXEL_ID = 'pixel-1'
    process.env.META_CAPI_TOKEN = 'capi-token'
  })

  test('guarda el lead pero no envía CAPI si el email lleva +smoke', async () => {
    const m = mockHubspot()
    try {
      const res = await postLead(req({ ...leadPayload, email: 'smoke+123@somossena.com' }))
      expect(res.status).toBe(200)
      expect(contactWrites(m.calls)).toHaveLength(1)
      expect(capiCalls(m.calls)).toHaveLength(0)
    } finally {
      m.restore()
    }
  })

  test('un email normal sí se reporta a Meta', async () => {
    const m = mockHubspot()
    try {
      await postLead(req({ ...leadPayload, email: 'ana+ventas@acme.cl' }))
      expect(capiCalls(m.calls)).toHaveLength(1)
    } finally {
      m.restore()
    }
  })

  test('isSmokeTest vale solo para el dominio propio', () => {
    expect(isSmokeTest('smoke+1730000000@somossena.com')).toBe(true)
    expect(isSmokeTest('ana+smoke@somossena.com')).toBe(true)
    expect(isSmokeTest('smoke+1@gmail.com')).toBe(false)
    expect(isSmokeTest('smoke+1@somossena.com.evil.cl')).toBe(false)
    expect(isSmokeTest('ana+ventas@somossena.com')).toBe(false)
  })
})

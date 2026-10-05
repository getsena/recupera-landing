import { test, expect } from '@playwright/test'

import { createDeal, upsertContact } from '@/lib/lead/hubspot'

type Call = { method: string; url: string; body: Record<string, unknown> | undefined }

// Simula HubSpot por ruta. `existing` es el contacto devuelto por la búsqueda por email;
// `dealsFound` es el total que devuelve la búsqueda de negocios abiertos.
function mockHubspot(opts: {
  existing?: { id: string; properties: Record<string, string | null> }
  dealsFound?: number
  associationStatus?: number
}) {
  const calls: Call[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET'
    calls.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.includes('/contacts/search')) {
      return opts.existing
        ? json(200, { total: 1, results: [opts.existing] })
        : json(200, { total: 0, results: [] })
    }
    if (url.includes('/deals/search')) return json(200, { total: opts.dealsFound ?? 0, results: [] })
    if (method === 'POST' && url.endsWith('/crm/v3/objects/contacts')) return json(201, { id: '500' })
    if (method === 'PATCH') return json(200, { id: opts.existing?.id ?? '0' })
    if (url.endsWith('/crm/v3/objects/deals')) return json(201, { id: '900' })
    if (method === 'PUT' && url.includes('/associations/')) {
      return json(opts.associationStatus ?? 200, opts.associationStatus ? { category: 'VALIDATION_ERROR' } : {})
    }
    return json(200, {})
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

const NEW_PROPS: Record<string, string> = {
  email: 'ana@acme.cl',
  firstname: 'Ana',
  phone: '+56911111111',
  hubspot_owner_id: '89319447',
  etapa_del_lead: 'Interesado',
  fuente_del_lead: 'Orgánico',
  origen: 'Orgánico',
  origen_detalle: 'organico_directo',
  tipo_de_origen: 'Form landing',
  sena_prioridad: 'A',
}

const patchBody = (calls: Call[]) =>
  (calls.find((c) => c.method === 'PATCH')?.body as { properties: Record<string, string> }).properties

test.describe('upsertContact: contacto existente (first-touch)', () => {
  test('no pisa propietario, etapa ni atribución si ya tienen valor', async () => {
    const m = mockHubspot({
      existing: {
        id: '10',
        properties: {
          hubspot_owner_id: '555',
          etapa_del_lead: 'Negociación',
          fuente_del_lead: 'Referido',
          origen: 'Outbound',
          origen_detalle: 'google_search_recupera',
          tipo_de_origen: 'Form landing',
        },
      },
    })
    process.env.HUBSPOT_ACCESS_TOKEN = 't'
    try {
      const r = await upsertContact('t', NEW_PROPS)
      expect(r).toEqual({ id: '10', isNew: false })
      const props = patchBody(m.calls)
      for (const k of [
        'hubspot_owner_id',
        'etapa_del_lead',
        'fuente_del_lead',
        'origen',
        'origen_detalle',
        'tipo_de_origen',
      ]) {
        expect(props).not.toHaveProperty(k)
      }
      // lo demás sí se actualiza
      expect(props.phone).toBe('+56911111111')
      expect(props.sena_prioridad).toBe('A')
    } finally {
      m.restore()
    }
  })

  test('completa los campos que el contacto tiene vacíos', async () => {
    const m = mockHubspot({
      existing: {
        id: '11',
        properties: { hubspot_owner_id: '555', etapa_del_lead: null, fuente_del_lead: '' },
      },
    })
    try {
      await upsertContact('t', NEW_PROPS)
      const props = patchBody(m.calls)
      expect(props).not.toHaveProperty('hubspot_owner_id')
      expect(props.etapa_del_lead).toBe('Interesado')
      expect(props.fuente_del_lead).toBe('Orgánico')
      expect(props.origen_detalle).toBe('organico_directo')
    } finally {
      m.restore()
    }
  })

  test('un contacto nuevo se crea con todas las propiedades', async () => {
    const m = mockHubspot({})
    try {
      const r = await upsertContact('t', NEW_PROPS)
      expect(r).toEqual({ id: '500', isNew: true })
      const post = m.calls.find((c) => c.method === 'POST' && c.url.endsWith('/crm/v3/objects/contacts'))
      expect((post?.body as { properties: Record<string, string> }).properties).toEqual(NEW_PROPS)
    } finally {
      m.restore()
    }
  })
})

test.describe('createDeal: sin negocios duplicados', () => {
  const deal = { dealname: 'Recupera — Acme', description: 'x' }
  const dealPosts = (calls: Call[]) =>
    calls.filter((c) => c.method === 'POST' && c.url.endsWith('/crm/v3/objects/deals'))

  test('no crea otro negocio si el contacto ya tiene uno abierto del mismo nombre', async () => {
    const m = mockHubspot({ dealsFound: 1 })
    try {
      await createDeal('t', '10', deal, true)
      expect(dealPosts(m.calls)).toHaveLength(0)
    } finally {
      m.restore()
    }
  })

  test('crea el negocio si no hay uno abierto', async () => {
    const m = mockHubspot({ dealsFound: 0 })
    try {
      await createDeal('t', '10', deal, true)
      expect(dealPosts(m.calls)).toHaveLength(1)
    } finally {
      m.restore()
    }
  })

  test('un contacto nuevo no consulta duplicados y crea el negocio', async () => {
    const m = mockHubspot({ dealsFound: 5 })
    try {
      await createDeal('t', '500', deal, false)
      expect(m.calls.some((c) => c.url.includes('/deals/search'))).toBe(false)
      expect(dealPosts(m.calls)).toHaveLength(1)
    } finally {
      m.restore()
    }
  })
})

test.describe('createDeal: falla de la asociación deal-contacto', () => {
  test('propaga el fallo (502 en la ruta) y lo registra sin datos personales', async () => {
    const m = mockHubspot({ associationStatus: 500 })
    const logs: string[] = []
    const originalError = console.error
    console.error = (...a: unknown[]) => logs.push(a.join(' '))
    try {
      await expect(
        createDeal('t', '10', { dealname: 'Recupera — Acme', description: 'x' }, false)
      ).rejects.toThrow(/associate deal failed: status=500/)
      expect(logs.join(' ')).toContain('status=500')
      expect(logs.join(' ')).not.toContain('Acme')
    } finally {
      console.error = originalError
      m.restore()
    }
  })

  test('si la asociación responde bien no lanza', async () => {
    const m = mockHubspot({})
    try {
      await expect(
        createDeal('t', '10', { dealname: 'Recupera — Acme', description: 'x' }, false)
      ).resolves.toBeUndefined()
    } finally {
      m.restore()
    }
  })
})

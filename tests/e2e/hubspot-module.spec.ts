import { test, expect } from '@playwright/test'

import { CLASSIFICATION_PROPS, describeHubspotError, upsertContact, writeContact } from '@/lib/lead/hubspot'

type Call = { method: string; url: string; body: { properties: Record<string, string> } }

// Simula HubSpot: responde en orden con las respuestas dadas y registra cada llamada.
function mockFetch(responses: { status: number; json: unknown }[]) {
  const calls: Call[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ method: init.method ?? 'GET', url, body: JSON.parse(String(init.body)) })
    const r = responses[calls.length - 1] ?? { status: 200, json: {} }
    return new Response(JSON.stringify(r.json), {
      status: r.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

const PROPS: Record<string, string> = {
  email: 'a@b.cl',
  firstname: 'Ana',
  origen: 'Google',
  origen_detalle: 'google_search_plataforma',
  fuente_del_lead: 'Ads',
  sena_prioridad: 'A',
}

test.describe('writeContact: un campo de clasificación nunca cuesta el lead', () => {
  test('guarda a la primera si HubSpot acepta todo', async () => {
    const m = mockFetch([{ status: 200, json: { id: '1' } }])
    try {
      const res = await writeContact('tok', 'POST', '/crm/v3/objects/contacts', PROPS)
      expect(res.ok).toBe(true)
      expect(m.calls).toHaveLength(1)
      expect(m.calls[0].body.properties).toEqual(PROPS)
    } finally {
      m.restore()
    }
  })

  test('reintenta sin clasificación ante INVALID_OPTION y conserva los datos de contacto', async () => {
    const m = mockFetch([
      { status: 400, json: { errors: [{ code: 'INVALID_OPTION', message: 'fuente_del_lead' }] } },
      { status: 201, json: { id: '2' } },
    ])
    try {
      const res = await writeContact('tok', 'POST', '/crm/v3/objects/contacts', PROPS)
      expect(res.ok).toBe(true)
      expect(m.calls).toHaveLength(2)
      expect(Object.keys(m.calls[1].body.properties).sort()).toEqual(['email', 'firstname'])
    } finally {
      m.restore()
    }
  })

  test('reintenta sin clasificación ante PROPERTY_DOESNT_EXIST (propiedad nueva aún no creada)', async () => {
    const m = mockFetch([
      {
        status: 400,
        json: {
          status: 'error',
          message: 'Property values were not valid: [{"error":"PROPERTY_DOESNT_EXIST","name":"origen_detalle"}]',
        },
      },
      { status: 200, json: { id: '3' } },
    ])
    try {
      const res = await writeContact('tok', 'PATCH', '/crm/v3/objects/contacts/3', PROPS)
      expect(res.ok).toBe(true)
      expect(m.calls).toHaveLength(2)
      expect(m.calls[1].body.properties).not.toHaveProperty('origen_detalle')
      expect(m.calls[1].body.properties.email).toBe('a@b.cl')
    } finally {
      m.restore()
    }
  })

  test('no reintenta ante otros errores y devuelve la respuesta fallida', async () => {
    const m = mockFetch([{ status: 500, json: { message: 'boom' } }])
    try {
      const res = await writeContact('tok', 'POST', '/crm/v3/objects/contacts', PROPS)
      expect(res.status).toBe(500)
      expect(m.calls).toHaveLength(1)
    } finally {
      m.restore()
    }
  })

  test('origen_detalle forma parte de las propiedades de clasificación', () => {
    expect(CLASSIFICATION_PROPS).toContain('origen_detalle')
  })
})

test.describe('los errores de HubSpot no exponen datos personales', () => {
  const PII = { email: 'ana.perez@acme.cl', telefono: '+56911112222', nombre: 'Ana Pérez' }
  const errorConPII = {
    status: 'error',
    category: 'VALIDATION_ERROR',
    message: `Property values were not valid: [{"error":"INVALID_EMAIL","message":"${PII.email} no es válido","telefono":"${PII.telefono}"}] ${PII.nombre}`,
    errors: [{ code: 'INVALID_EMAIL', context: { propertyName: ['email', 'phone'] } }],
  }

  test('describeHubspotError conserva estado, códigos y propiedades, y nada más', () => {
    const texto = describeHubspotError(400, errorConPII)
    expect(texto).toContain('status=400')
    expect(texto).toContain('INVALID_EMAIL')
    expect(texto).toContain('VALIDATION_ERROR')
    expect(texto).toContain('email,phone')
    for (const dato of Object.values(PII)) expect(texto).not.toContain(dato)
    expect(texto).not.toContain('@')
  })

  test('tolera cuerpos de error vacíos o raros', () => {
    expect(describeHubspotError(500, null)).toBe('status=500 codes=- props=-')
    expect(describeHubspotError(500, 'texto')).toContain('status=500')
    expect(describeHubspotError(500, { errors: 'no-es-array' })).toContain('props=-')
  })

  test('la excepción de upsertContact no incluye email, teléfono ni nombre', async () => {
    const m = mockFetch([
      { status: 200, json: { total: 0, results: [] } },
      { status: 400, json: errorConPII },
    ])
    try {
      let mensaje = ''
      await upsertContact('tok', { email: PII.email, firstname: 'Ana', phone: PII.telefono }).catch(
        (e: Error) => (mensaje = e.message)
      )
      expect(mensaje).toContain('POST contact failed')
      expect(mensaje).toContain('INVALID_EMAIL')
      for (const dato of Object.values(PII)) expect(mensaje).not.toContain(dato)
    } finally {
      m.restore()
    }
  })

  test('el log del reintento tampoco incluye datos personales', async () => {
    const logs: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => void logs.push(args.join(' '))
    const m = mockFetch([
      { status: 400, json: { ...errorConPII, errors: [{ code: 'INVALID_OPTION', context: { propertyName: ['origen'] } }] } },
      { status: 200, json: { id: '1' } },
    ])
    try {
      await writeContact('tok', 'POST', '/crm/v3/objects/contacts', { email: PII.email, origen: 'Google' })
      const salida = logs.join(' | ')
      expect(salida).toContain('INVALID_OPTION')
      for (const dato of Object.values(PII)) expect(salida).not.toContain(dato)
    } finally {
      console.error = original
      m.restore()
    }
  })
})

test.describe('robustez del guardado de contactos', () => {
  const props = {
    email: 'ana@acme.cl',
    firstname: 'Ana',
    lastname: 'Pérez',
    phone: '+56911112222',
    company: 'Acme',
    hubspot_owner_id: '89319447',
    origen: 'Google',
    origen_detalle: 'google_search_plataforma',
    fuente_del_lead: 'Ads',
    gclid: 'abc',
    landing_page: 'https://www.recupera.somossena.com',
    sena_contexto: 'x',
  }

  test('si el reintento también falla por una propiedad que no es de clasificación, guarda solo los campos núcleo', async () => {
    const m = mockFetch([
      { status: 400, json: { errors: [{ code: 'INVALID_OPTION' }] } },
      { status: 400, json: { message: 'Property values were not valid: [{"error":"PROPERTY_DOESNT_EXIST","name":"landing_page"}]' } },
      { status: 201, json: { id: '9' } },
    ])
    try {
      const res = await writeContact('tok', 'POST', '/crm/v3/objects/contacts', props)
      expect(res.ok).toBe(true)
      expect(m.calls).toHaveLength(3)
      expect(Object.keys(m.calls[2].body.properties).sort()).toEqual(
        ['company', 'email', 'firstname', 'hubspot_owner_id', 'lastname', 'phone']
      )
    } finally {
      m.restore()
    }
  })

  test('un 409 de contacto existente se resuelve actualizando ese contacto', async () => {
    const m = mockFetch([
      { status: 200, json: { total: 0, results: [] } },
      { status: 409, json: { status: 'error', message: 'Contact already exists. Existing ID: 4321', category: 'CONFLICT' } },
      { status: 200, json: { id: '4321' } },
    ])
    try {
      const r = await upsertContact('tok', props)
      expect(r).toEqual({ id: '4321', isNew: false })
      const patch = m.calls[2]
      expect(patch.method).toBe('PATCH')
      expect(patch.url).toContain('/contacts/4321')
    } finally {
      m.restore()
    }
  })

  test('un 409 sin id reconocible falla sin inventar un contacto', async () => {
    const m = mockFetch([
      { status: 200, json: { total: 0, results: [] } },
      { status: 409, json: { message: 'conflict' } },
    ])
    try {
      await expect(upsertContact('tok', props)).rejects.toThrow(/POST contact failed: status=409/)
    } finally {
      m.restore()
    }
  })

  test('una búsqueda que falla con 429 se reintenta antes de asumir que el contacto es nuevo', async () => {
    const m = mockFetch([
      { status: 429, json: { message: 'rate limit' } },
      { status: 200, json: { total: 1, results: [{ id: '10', properties: {} }] } },
      { status: 200, json: { id: '10' } },
    ])
    try {
      const r = await upsertContact('tok', props)
      expect(r).toEqual({ id: '10', isNew: false })
      expect(m.calls.map((c) => c.method)).toEqual(['POST', 'POST', 'PATCH'])
      expect(m.calls.some((c) => c.url.endsWith('/crm/v3/objects/contacts'))).toBe(false)
    } finally {
      m.restore()
    }
  })
})

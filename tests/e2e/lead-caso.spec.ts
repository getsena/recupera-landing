import { NextRequest } from 'next/server'
import { test, expect } from '@playwright/test'

import { POST as postLead } from '@/app/api/lead/route'
import { facturasDelVolumen, validateLead } from '@/lib/lead/validate'

// Formulario de dos pasos de la landing: manda un bloque `caso` y no trae apellido (si el visitante escribe
// un solo nombre) ni «alguien cobrando». /api/lead lo acepta sin inventar esos campos.

const caso = {
  cotizar: 'recupera',
  tipo_cartera: 'B2B',
  necesidad: 'dificil',
  canales: ['Correo', 'WhatsApp'],
  volumen_clientes: 12,
  antiguedad: '91-180',
  comentarios: 'Tres clientes que no responden.',
}

const casoLead = {
  nombre: 'Ana',
  empresa: 'Acme SpA',
  email: 'ana@acme.cl',
  telefono: '+56911111111',
  caso,
}

test.describe('validateLead con caso', () => {
  test('acepta el payload del formulario sin apellido, facturas ni «alguien cobrando»', () => {
    const r = validateLead(casoLead)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.apellido).toBe('')
      expect(r.value.facturas_pendientes).toBe('')
      expect(r.value.alguien_cobrando).toBe('')
      expect(r.value.caso).toMatchObject({ necesidad: 'dificil', canales: ['Correo', 'WhatsApp'] })
    }
  })

  test('sin caso, apellido, facturas y «alguien cobrando» siguen siendo obligatorios', () => {
    const { caso: _, ...sinCaso } = casoLead
    void _
    expect(validateLead(sinCaso).ok).toBe(false)
  })

  test('rechaza opciones fuera de lo permitido', () => {
    for (const malo of [
      { ...caso, cotizar: 'otro' },
      { ...caso, tipo_cartera: 'B2G' },
      { ...caso, necesidad: 'todo' },
      { ...caso, canales: ['Fax'] },
      { ...caso, canales: 'Correo' },
      { ...caso, comentarios: 'a'.repeat(1001) },
      'caso',
      null,
    ]) {
      expect(validateLead({ ...casoLead, caso: malo }).ok, JSON.stringify(malo)).toBe(false)
    }
  })

  test('descarta volúmenes y antigüedad inválidos sin rechazar el lead', () => {
    const r = validateLead({
      ...casoLead,
      caso: { ...caso, volumen_clientes: -3, volumen_facturas: 1.5, antiguedad: 'siempre' },
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.caso?.volumen_clientes).toBeUndefined()
      expect(r.value.caso?.volumen_facturas).toBeUndefined()
      expect(r.value.caso?.antiguedad).toBeUndefined()
    }
  })

  test('el número de facturas define el tramo de facturas pendientes', () => {
    expect(facturasDelVolumen(undefined)).toBeUndefined()
    expect(facturasDelVolumen(0)).toBeUndefined()
    expect(facturasDelVolumen(1)).toBe('1-10')
    expect(facturasDelVolumen(10)).toBe('1-10')
    expect(facturasDelVolumen(11)).toBe('10-50')
    expect(facturasDelVolumen(50)).toBe('10-50')
    expect(facturasDelVolumen(51)).toBe('50+')
    const r = validateLead({ ...casoLead, caso: { ...caso, volumen_facturas: 40 } })
    expect(r.ok && r.value.facturas_pendientes).toBe('10-50')
  })

  test('si vienen facturas o «alguien cobrando», se validan igual', () => {
    expect(validateLead({ ...casoLead, facturas_pendientes: '999' }).ok).toBe(false)
    expect(validateLead({ ...casoLead, alguien_cobrando: 'quizás' }).ok).toBe(false)
  })
})

test.describe('/api/lead con caso', () => {
  test.beforeEach(() => {
    process.env.HUBSPOT_ACCESS_TOKEN = 'test-token'
    delete process.env.META_PIXEL_ID
    delete process.env.META_CAPI_TOKEN
  })

  test('guarda el caso en el contexto y el negocio, sin prioridad ni campos inventados', async () => {
    const calls: { method: string; url: string; body: unknown }[] = []
    const original = globalThis.fetch
    globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET'
      calls.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined })
      const json = (status: number, data: unknown) =>
        new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
      if (url.includes('/contacts/search')) return json(200, { total: 0, results: [] })
      if (method === 'POST' && url.endsWith('/crm/v3/objects/contacts')) return json(201, { id: '77' })
      if (url.endsWith('/crm/v3/objects/deals')) return json(201, { id: '88' })
      return json(200, {})
    }) as typeof fetch
    try {
      const res = await postLead(
        new NextRequest('http://localhost/api/lead', { method: 'POST', body: JSON.stringify(casoLead) })
      )
      expect(res.status).toBe(200)

      const contacto = calls.find((c) => c.method === 'POST' && c.url.endsWith('/crm/v3/objects/contacts'))
      const props = (contacto?.body as { properties: Record<string, string> }).properties
      expect(props.firstname).toBe('Ana')
      expect(props.lastname).toBe('')
      expect(props.interes_del_producto).toBe('Recupero Plus')
      for (const k of ['sena_prioridad', 'sena_intencion', 'facturas_pendientes', 'alguien_cobrando']) {
        expect(props).not.toHaveProperty(k)
      }
      expect(props.sena_contexto).toContain('formulario de dos pasos')
      expect(props.sena_contexto).toContain('Quiere cotizar: Empezar por Recupera')
      expect(props.sena_contexto).toContain('Antigüedad de la deuda: 91 a 180 días')
      expect(props.sena_contexto).toContain('Canales: Correo, WhatsApp')

      const negocio = calls.find((c) => c.method === 'POST' && c.url.endsWith('/crm/v3/objects/deals'))
      const deal = (negocio?.body as { properties: Record<string, string> }).properties
      expect(deal.dealname).toBe('Recupera — Acme SpA')
      expect(deal.description).toContain('Tipo de cartera: B2B')

      expect(calls.some((c) => c.url.includes('/lists/363/memberships/add'))).toBe(true)
    } finally {
      globalThis.fetch = original
    }
  })

  test('un caso inválido responde 400 sin llamar a HubSpot', async () => {
    const original = globalThis.fetch
    let llamado = false
    globalThis.fetch = (async () => {
      llamado = true
      return new Response('{}')
    }) as typeof fetch
    try {
      const res = await postLead(
        new NextRequest('http://localhost/api/lead', {
          method: 'POST',
          body: JSON.stringify({ ...casoLead, caso: { ...caso, necesidad: 'todo' } }),
        })
      )
      expect(res.status).toBe(400)
      expect(llamado).toBe(false)
    } finally {
      globalThis.fetch = original
    }
  })
})

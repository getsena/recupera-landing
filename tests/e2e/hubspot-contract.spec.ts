import { NextRequest } from 'next/server'
import { test, expect } from '@playwright/test'

import { POST as postLead } from '@/app/api/lead/route'

// Test de contrato: todo lo que las la ruta de lead envían a HubSpot existe en HubSpot.
// Es de SOLO LECTURA: lee la definición de propiedades con GET (token de lectura) y ejecuta las rutas
// contra un HubSpot simulado, así que nunca crea ni modifica contactos.
//
// Habría detectado una falla real: valores de fuente_del_lead que HubSpot no tiene ('Google Ads' y 'Meta Ads').
//
//
// Se omite sin token. Se ejecuta a mano o en CI con HUBSPOT_CONTRACT_TOKEN (token de solo lectura).
const TOKEN = process.env.HUBSPOT_CONTRACT_TOKEN
const realFetch = globalThis.fetch

type HsProperty = { name: string; type: string; externalOptions?: boolean; options?: { value: string }[] }

async function livePropertyMap(): Promise<Map<string, HsProperty>> {
  const res = await realFetch('https://api.hubapi.com/crm/v3/properties/contacts', {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  expect(res.ok, `no se pudo leer las propiedades de HubSpot (${res.status})`).toBe(true)
  const data = (await res.json()) as { results: HsProperty[] }
  return new Map(data.results.map((p) => [p.name, p]))
}

// Ejecuta una ruta con HubSpot simulado y devuelve las propiedades del primer POST de contacto.
async function emittedProperties(
  run: (req: NextRequest) => Promise<Response>,
  path: string,
  payload: object
): Promise<Record<string, string>> {
  let captured: Record<string, string> = {}
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.includes('/contacts/search')) return json(200, { total: 0, results: [] })
    if (init.method === 'POST' && url.endsWith('/crm/v3/objects/contacts')) {
      captured = JSON.parse(String(init.body)).properties
      return json(201, { id: '1' })
    }
    if (url.endsWith('/crm/v3/objects/deals')) return json(201, { id: '2' })
    return json(200, {})
  }) as typeof fetch
  try {
    await run(new NextRequest(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(payload) }))
  } finally {
    globalThis.fetch = realFetch
  }
  // sin esto el test pasaría en vacío si la ruta fallara antes de crear el contacto
  expect(Object.keys(captured).length, `${path} no llegó a crear el contacto`).toBeGreaterThan(0)
  return captured
}

const lead = {
  nombre: 'Ana',
  apellido: 'Pérez',
  empresa: 'Acme',
  email: 'contrato@acme.cl',
  telefono: '+56911111111',
  facturas_pendientes: '10-50',
  alguien_cobrando: 'No',
}
// Entradas de atribución que recorren todas las reglas de la taxonomía.
const ATRIBUCIONES: object[] = [
  {},
  { gclid: 'x', utmCampaign: '23588970667' },
  { gbraid: 'x', utmCampaign: '23584417865' },
  { wbraid: 'x', utmCampaign: '24170007327' },
  { gclid: 'x', utmCampaign: '23580674078' },
  { gclid: 'x' },
  { gclid: 'x', utmCampaign: '999' },
  { fbclid: 'x' },
  { utmSource: 'instagram', utmMedium: 'paid_social' },
  { utmSource: 'linkedin', utmMedium: 'cpc' },
  { utmSource: 'bing', utmMedium: 'cpc' },
  { utmSource: 'newsletter', utmMedium: 'email' },
]

test.describe('contrato con HubSpot (solo lectura)', () => {
  test.skip(!TOKEN, 'sin HUBSPOT_CONTRACT_TOKEN')

  test.beforeEach(() => {
    process.env.HUBSPOT_ACCESS_TOKEN = 'contrato'
    delete process.env.META_PIXEL_ID
    delete process.env.META_CAPI_TOKEN
  })

  const rutas = [['/api/lead', (r: NextRequest) => postLead(r), lead]] as const

  for (const [path, run, base] of rutas) {
    test(`${path}: todas las propiedades enviadas existen en HubSpot`, async () => {
      const live = await livePropertyMap()
      const inexistentes = new Set<string>()
      for (const atrib of ATRIBUCIONES) {
        const props = await emittedProperties(run, path, { ...base, ...atrib })
        for (const name of Object.keys(props)) if (!live.has(name)) inexistentes.add(name)
      }
      expect([...inexistentes], 'propiedades que HubSpot no tiene').toEqual([])
    })

    test(`${path}: todos los valores de listas desplegables son opciones válidas`, async () => {
      const live = await livePropertyMap()
      const invalidos = new Set<string>()
      for (const atrib of ATRIBUCIONES) {
        const props = await emittedProperties(run, path, { ...base, ...atrib })
        for (const [name, value] of Object.entries(props)) {
          const def = live.get(name)
          // hubspot_owner_id y similares tienen opciones externas (los propietarios) que la API no enumera
          const validable = def?.type === 'enumeration' && !def.externalOptions && def.options?.length
          if (validable && !def.options?.some((o) => o.value === value)) {
            invalidos.add(`${name}=${value}`)
          }
        }
      }
      expect([...invalidos], 'valores que HubSpot rechazaría con INVALID_OPTION').toEqual([])
    })
  }
})

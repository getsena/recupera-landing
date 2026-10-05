import { test, expect, type APIRequestContext } from '@playwright/test'

// Smoke post-deploy: un lead de prueba real contra el sitio desplegado.
//
//   SMOKE_BASE_URL=https://recupera.somossena.com HUBSPOT_SMOKE_TOKEN=... \
//     yarn playwright test tests/e2e/lead-smoke.spec.ts
//
// Crea un contacto y un negocio en HubSpot con un email smoke+<marca de tiempo>@somossena.com, verifica
// la atribución y los BORRA al terminar. Los emails smoke no se reportan a Meta CAPI. El token necesita
// leer y borrar contactos y negocios. Escribe en HubSpot: ejecutar solo con aprobación y tras un deploy.
const BASE = process.env.SMOKE_BASE_URL
const TOKEN = process.env.HUBSPOT_SMOKE_TOKEN

const HS = 'https://api.hubapi.com'
const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

type Contact = { id: string; properties: Record<string, string | null> }

async function findContact(request: APIRequestContext, email: string): Promise<Contact | null> {
  // HubSpot indexa con un pequeño retraso: se reintenta hasta ~20 s.
  for (let i = 0; i < 10; i++) {
    const res = await request.post(`${HS}/crm/v3/objects/contacts/search`, {
      headers: auth,
      data: {
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
        properties: [
          'email',
          'fuente_del_lead',
          'origen',
          'origen_detalle',
          'tipo_de_origen',
          'hubspot_owner_id',
        ],
        limit: 1,
      },
    })
    const data = await res.json()
    if (data.total > 0) return data.results[0]
    await new Promise((r) => setTimeout(r, 2000))
  }
  return null
}

async function dealIds(request: APIRequestContext, contactId: string): Promise<string[]> {
  const res = await request.get(`${HS}/crm/v4/objects/contacts/${contactId}/associations/deals`, {
    headers: auth,
  })
  const data = await res.json()
  return (data.results ?? []).map((r: { toObjectId: number | string }) => String(r.toObjectId))
}

async function cleanup(request: APIRequestContext, contactId: string, deals: string[]) {
  for (const id of deals) await request.delete(`${HS}/crm/v3/objects/deals/${id}`, { headers: auth })
  await request.delete(`${HS}/crm/v3/objects/contacts/${contactId}`, { headers: auth })
}

const base = {
  nombre: 'Smoke',
  apellido: 'Test',
  empresa: 'Smoke Test SpA',
  telefono: '+56900000000',
  facturas_pendientes: '1-10',
  alguien_cobrando: 'Sí',
}

test.describe.configure({ mode: 'serial' })

test.describe('smoke post-deploy de /api/lead', () => {
  test.skip(!BASE || !TOKEN, 'sin SMOKE_BASE_URL o HUBSPOT_SMOKE_TOKEN')

  for (const caso of [
    {
      nombre: 'clic de Google Ads con campaña registrada',
      extra: { gclid: 'smoke-test', utmSource: 'google', utmMedium: 'cpc', utmCampaign: '23584417865' },
      esperado: { fuente_del_lead: 'Ads', origen: 'Google', origen_detalle: 'google_search_recupera' },
    },
    {
      nombre: 'visita sin señales de campaña',
      extra: {},
      esperado: { fuente_del_lead: 'Orgánico', origen: 'Orgánico', origen_detalle: 'organico_directo' },
    },
  ]) {
    test(`${caso.nombre}: llega a HubSpot con su atribución y se limpia`, async ({ request }) => {
      const email = `smoke+${Date.now()}@somossena.com`
      const res = await request.post(`${BASE}/api/lead`, { data: { ...base, email, ...caso.extra } })
      expect(res.status(), 'la ruta debe responder 200').toBe(200)
      expect(await res.json()).toMatchObject({ ok: true })

      const contact = await findContact(request, email)
      expect(contact, 'el contacto debe existir en HubSpot').not.toBeNull()
      const deals: string[] = []
      try {
        expect(contact!.properties).toMatchObject({ ...caso.esperado, tipo_de_origen: 'Form landing' })
        deals.push(...(await dealIds(request, contact!.id)))
        expect(deals.length, 'debe haber un negocio asociado').toBeGreaterThanOrEqual(1)
      } finally {
        await cleanup(request, contact!.id, deals)
      }
    })
  }
})

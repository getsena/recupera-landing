import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { mapFuente, mapOrigen } from '@/lib/lead/attribution'

type LeadPayload = {
  nombre: string
  apellido: string
  empresa: string
  email: string
  telefono: string
  facturas_pendientes: string
  alguien_cobrando: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  gclid?: string
  fbclid?: string
  landingPage?: string
}

const HS_API = 'https://api.hubapi.com'
const OWNER_FRANCISCO = '89319447'
const PRODUCT_LIST_ID = '363'
const INTERES_DEL_PRODUCTO = 'Recupero Plus'

function calcPrioridad(facturas: string, cobrando: string): 'A' | 'B' | 'C' {
  let score = 0
  if (facturas === '50+') score += 2
  else if (facturas === '10-50') score += 1

  const c = cobrando.toLowerCase().trim()
  if (c === 'no') score += 2
  else if (c === 'a veces') score += 1

  if (score >= 4) return 'A'
  if (score >= 2) return 'B'
  return 'C'
}

function calcSenaIntencion(p: 'A' | 'B' | 'C'): string {
  return p === 'A' ? 'Alta' : p === 'B' ? 'Media' : 'Baja'
}

function normalizeCobrando(value: string): string {
  const v = value.trim()
  if (v === 'Sí' || v === 'Si' || v.toLowerCase() === 'si') return 'Si'
  return v
}

function getToken(): string {
  const t = process.env.HUBSPOT_ACCESS_TOKEN
  if (!t) throw new Error('HUBSPOT_ACCESS_TOKEN no configurado')
  return t
}

async function findContactByEmail(token: string, email: string): Promise<string | null> {
  const res = await fetch(`${HS_API}/crm/v3/objects/contacts/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: ['email'],
      limit: 1,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.total > 0 ? data.results[0].id : null
}

async function upsertContact(token: string, body: LeadPayload): Promise<string> {
  const prioridad = calcPrioridad(body.facturas_pendientes, body.alguien_cobrando)
  const origen = mapOrigen(body.utmSource, body.gclid, body.fbclid)
  const fuente = mapFuente(body)

  const properties: Record<string, string> = {
    firstname: body.nombre,
    lastname: body.apellido,
    email: body.email,
    phone: body.telefono,
    company: body.empresa,
    hubspot_owner_id: OWNER_FRANCISCO,
    interes_del_producto: INTERES_DEL_PRODUCTO,
    tipo_de_origen: 'Form landing',
    etapa_del_lead: 'Interesado',
    origen,
    fuente_del_lead: fuente,
    sena_prioridad: prioridad,
    sena_intencion: calcSenaIntencion(prioridad),
    facturas_pendientes: body.facturas_pendientes,
    alguien_cobrando: normalizeCobrando(body.alguien_cobrando),
    sena_contexto: `Lead landing Recupera. Facturas: ${body.facturas_pendientes}. Cobrando: ${body.alguien_cobrando}. Prioridad auto: ${prioridad}. Origen: ${origen}.`,
  }

  if (body.gclid) properties.gclid = body.gclid
  if (body.fbclid) properties.fbclid = body.fbclid
  if (body.landingPage) properties.landing_page = body.landingPage
  if (body.utmCampaign) properties.utm_campaign = body.utmCampaign
  if (body.utmTerm) properties.utm_term = body.utmTerm

  const existingId = await findContactByEmail(token, body.email)

  if (existingId) {
    const res = await fetch(`${HS_API}/crm/v3/objects/contacts/${existingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ properties }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`PATCH contact failed: ${JSON.stringify(err)}`)
    }
    return existingId
  }

  const res = await fetch(`${HS_API}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ properties }),
  })
  if (res.status === 409) {
    // Contact exists but findContactByEmail missed it (race/transient error) — recover the ID
    const errData = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const conflictId = (errData.id as string) || (errData.data as Record<string, string>)?.existingObjectId
    if (conflictId) return conflictId
    const fallback = await findContactByEmail(token, body.email)
    if (fallback) return fallback
    throw new Error(`POST contact 409 conflict, ID not recoverable`)
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`POST contact failed: ${JSON.stringify(err)}`)
  }
  const data = await res.json()
  return data.id
}

async function createDeal(token: string, contactId: string, body: LeadPayload): Promise<void> {
  const prioridad = calcPrioridad(body.facturas_pendientes, body.alguien_cobrando)

  const res = await fetch(`${HS_API}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      properties: {
        dealname: `Recupera — ${body.empresa}`,
        dealstage: 'appointmentscheduled',
        pipeline: 'default',
        hubspot_owner_id: OWNER_FRANCISCO,
        closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `Prioridad: ${prioridad} · Facturas: ${body.facturas_pendientes} · Cobrando: ${body.alguien_cobrando}`,
      },
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`POST deal failed: ${JSON.stringify(err)}`)
  }
  const deal = await res.json()

  await fetch(`${HS_API}/crm/v3/objects/deals/${deal.id}/associations/contacts/${contactId}/3`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  })
}

async function addToList(token: string, contactId: string): Promise<void> {
  const res = await fetch(`${HS_API}/crm/v3/lists/${PRODUCT_LIST_ID}/memberships/add`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify([contactId]),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || (data as { recordIdsMissing?: string[] }).recordIdsMissing?.length) {
    throw new Error(`addToList failed for contact ${contactId}: ${JSON.stringify(data)}`)
  }
}

async function sendMetaCapi(body: LeadPayload): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID
  const capiToken = process.env.META_CAPI_TOKEN
  if (!pixelId || !capiToken) return

  const hashedEmail = createHash('sha256').update(body.email.toLowerCase().trim()).digest('hex')

  const userData: Record<string, string | string[]> = {
    em: [hashedEmail],
  }
  if (body.fbclid) userData.fbc = `fb.1.${Date.now()}.${body.fbclid}`

  try {
    await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: capiToken,
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            user_data: userData,
            custom_data: {
              content_name: 'recupera',
              utm_source: body.utmSource,
              utm_campaign: body.utmCampaign,
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('[CAPI] error:', err instanceof Error ? err.message : 'CAPI error')
  }
}

export async function POST(req: NextRequest) {
  let token: string
  try {
    token = getToken()
  } catch {
    return NextResponse.json({ error: 'HubSpot no configurado' }, { status: 500 })
  }

  let body: LeadPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { nombre, apellido, empresa, email, telefono, facturas_pendientes, alguien_cobrando } = body
  if (!nombre || !apellido || !empresa || !email || !telefono || !facturas_pendientes || !alguien_cobrando) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const capiPromise = sendMetaCapi(body)

  try {
    const contactId = await upsertContact(token, body)
    await Promise.all([createDeal(token, contactId, body), addToList(token, contactId)])
    await capiPromise
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[HubSpot] error:', err instanceof Error ? err.message : 'CRM error')
    await capiPromise
    return NextResponse.json(
      { ok: false, error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' },
      { status: 502 }
    )
  }
}

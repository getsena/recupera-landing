import { createHash, randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

import { classifyLead } from '@/lib/lead/classify'
import {
  OWNER_FRANCISCO,
  RECUPERA_LIST_ID,
  addToList,
  createDeal,
  getToken,
  upsertContact,
} from '@/lib/lead/hubspot'
import { notifyLead, notifyLeadInBackground, type NotifyLeadInput } from '@/lib/lead/notify'
import { isSmokeTest } from '@/lib/lead/smoke'
import { allowUnverified, clientIp, turnstileTokenFrom, verifyTurnstile } from '@/lib/lead/turnstile'
import { readJsonBody, validateLead, type LeadPayload } from '@/lib/lead/validate'

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

function clasificar(body: LeadPayload) {
  return classifyLead({
    utmSource: body.utmSource,
    utmMedium: body.utmMedium,
    utmCampaign: body.utmCampaign,
    gclid: body.gclid,
    gbraid: body.gbraid,
    wbraid: body.wbraid,
    fbclid: body.fbclid,
  })
}

// Datos del aviso interno por correo (ver src/lib/lead/notify.ts).
function notifyInput(
  body: LeadPayload,
  outcome: NotifyLeadInput['outcome'],
  extra: { contactId?: string; error?: string; unverified?: boolean } = {}
): NotifyLeadInput {
  const clasificacion = clasificar(body)
  return {
    outcome,
    source: 'recupera',
    lead: {
      nombre: body.nombre,
      apellido: body.apellido,
      empresa: body.empresa,
      email: body.email,
      telefono: body.telefono,
      extras: {
        'Facturas pendientes': body.facturas_pendientes,
        '¿Alguien cobrando?': body.alguien_cobrando,
        Prioridad: calcPrioridad(body.facturas_pendientes, body.alguien_cobrando),
      },
    },
    attribution: {
      fuente: clasificacion.fuente,
      origen: clasificacion.origen,
      origenDetalle: clasificacion.origenDetalle,
      utmCampaign: body.utmCampaign,
    },
    ...extra,
  }
}

function buildContactProperties(body: LeadPayload): Record<string, string> {
  const prioridad = calcPrioridad(body.facturas_pendientes, body.alguien_cobrando)
  const clasificacion = clasificar(body)

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
    fuente_del_lead: clasificacion.fuente,
    origen_detalle: clasificacion.origenDetalle,
    sena_prioridad: prioridad,
    sena_intencion: calcSenaIntencion(prioridad),
    facturas_pendientes: body.facturas_pendientes,
    alguien_cobrando: normalizeCobrando(body.alguien_cobrando),
    sena_contexto: `Lead landing Recupera. Facturas: ${body.facturas_pendientes}. Cobrando: ${body.alguien_cobrando}. Prioridad auto: ${prioridad}. Origen: ${clasificacion.origen || 'otro'}.`,
  }

  // origen queda vacío para pagos de una plataforma desconocida (regla R4): no se envía.
  if (clasificacion.origen) properties.origen = clasificacion.origen

  if (body.gclid) properties.gclid = body.gclid
  if (body.fbclid) properties.fbclid = body.fbclid
  if (body.landingPage) properties.landing_page = body.landingPage
  if (body.utmCampaign) properties.utm_campaign = body.utmCampaign
  if (body.utmTerm) properties.utm_term = body.utmTerm

  return properties
}

async function sendMetaCapi(body: LeadPayload, eventId: string): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID
  const capiToken = process.env.META_CAPI_TOKEN
  if (!pixelId || !capiToken) return

  const hashedEmail = createHash('sha256').update(body.email.toLowerCase().trim()).digest('hex')

  const userData: Record<string, string | string[]> = {
    em: [hashedEmail],
  }
  if (body.fbclid) userData.fbc = `fb.1.${Date.now()}.${body.fbclid}`

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: capiToken,
        data: [
          {
            event_name: 'Lead',
            event_id: eventId,
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
      signal: AbortSignal.timeout(2000),
    })
    // Token vencido o pixel inválido: sin este log el fallo de Meta pasa inadvertido (sin PII)
    if (!res.ok) console.error('[CAPI] status', res.status)
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

  const parsed = await readJsonBody(req)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  const validated = validateLead(parsed.value)
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: validated.status })
  const body = validated.value

  // Turnstile: un token inválido se rechaza; sin token o con Cloudflare caído el lead se procesa igual,
  // pero queda marcado, sin Meta CAPI y con tope por IP (ver src/lib/lead/turnstile.ts).
  const ip = clientIp(req.headers)
  const verification = await verifyTurnstile(turnstileTokenFrom(parsed.value), { remoteIp: ip, action: 'lead' })
  if (verification.status === 'rejected') {
    return NextResponse.json(
      { ok: false, error: 'No pudimos verificar que eres una persona. Recarga la página e intenta de nuevo.' },
      { status: 403 }
    )
  }
  const unverified = verification.status === 'unverified'
  if (unverified && !allowUnverified(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Recibimos demasiados intentos. Intenta de nuevo en unos minutos.' },
      { status: 429 }
    )
  }

  let savedContactId: string | undefined
  try {
    const { id: contactId, isNew } = await upsertContact(token, buildContactProperties(body))
    savedContactId = contactId
    const prioridad = calcPrioridad(body.facturas_pendientes, body.alguien_cobrando)
    const [dealCreated] = await Promise.all([
      createDeal(
        token,
        contactId,
        {
          dealname: `Recupera — ${body.empresa}`,
          description: `Prioridad: ${prioridad} · Facturas: ${body.facturas_pendientes} · Cobrando: ${body.alguien_cobrando}`,
        },
        !isNew
      ),
      addToList(token, contactId, RECUPERA_LIST_ID),
    ])
    // Meta solo se entera de leads que el CRM sí guardó (evita conversiones fantasma)
    if (!isSmokeTest(body.email) && !unverified) await sendMetaCapi(body, body.eventId ?? randomUUID())
    // Aviso interno solo si hay contacto o negocio nuevo: el reenvío de un lead ya abierto no repite el correo.
    if (isNew || dealCreated) notifyLeadInBackground(notifyInput(body, 'ok', { contactId, unverified }))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[HubSpot] error:', err instanceof Error ? err.message : 'CRM error')
    // El correo es el único registro del lead: se espera (tope de 3 s) antes de responder el error.
    await notifyLead(
      notifyInput(body, 'hubspot_failed', {
        contactId: savedContactId,
        error: err instanceof Error ? err.message : 'error desconocido',
        unverified,
      })
    )
    return NextResponse.json(
      { ok: false, error: 'No pudimos registrar tu solicitud. Intenta de nuevo.' },
      { status: 502 }
    )
  }
}

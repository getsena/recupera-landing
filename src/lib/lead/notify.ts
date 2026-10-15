// Aviso interno por correo cuando entra un lead (SendGrid). Reemplaza al workflow de HubSpot que
// dejó de avisar sin que nadie se enterara.
//
// Reglas de seguridad (los datos del lead los controla un anónimo y el correo sale desde hola@):
// - Solo texto plano: sin HTML, así que nada se interpreta como marcado.
// - Cada valor del lead va entre comillas, en una sola línea, sin <>, caracteres de control ni bidi.
// - El asunto lleva solo texto fijo y el producto, nunca datos del lead.
// - El link a HubSpot se arma con un ID numérico, nunca con texto del lead.
// - Los logs no llevan PII, el cuerpo de la respuesta ni la clave.
// Nunca lanza: un fallo de SendGrid no debe romper el formulario.

import { after } from 'next/server'

import { isSmokeTest } from '@/lib/lead/smoke'

const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send'
const FROM_EMAIL = 'hola@somossena.com'
const FROM_NAME = 'Sena Leads'
const HUBSPOT_PORTAL_ID = '48812457'
const TIMEOUT_MS = 3000
const MAX_VALUE = 200

export type NotifySource = 'plataforma' | 'recupera' | 'opera' | 'analizador' | 'contactanos'

const SOURCE_LABEL: Record<NotifySource, string> = {
  plataforma: 'Plataforma',
  recupera: 'Recupera',
  opera: 'Opera',
  analizador: 'Analizador de cartera',
  contactanos: 'Contáctanos',
}

export type NotifyLeadInput = {
  // 'ok': el lead quedó en HubSpot. 'hubspot_failed': el correo es el único registro del lead.
  outcome: 'ok' | 'hubspot_failed'
  source: NotifySource
  lead: {
    nombre?: string
    apellido?: string
    empresa?: string
    email: string
    telefono?: string
    extras?: Record<string, string | number>
  }
  attribution?: { fuente?: string; origen?: string; origenDetalle?: string; utmCampaign?: string }
  contactId?: string
  // true cuando Turnstile no pudo verificar al visitante (política híbrida: el lead se procesa igual)
  unverified?: boolean
  // mensaje breve del error de HubSpot, sin datos personales
  error?: string
}

// Caracteres de control, separadores de línea, bidi, ancho cero y <> : se reemplazan por espacio.
const UNSAFE_RANGES: [number, number][] = [
  [0x00, 0x1f], // control
  [0x7f, 0x9f], // control C1
  [0xad, 0xad], // guion blando
  [0x200b, 0x200f], // ancho cero y marcas direccionales
  [0x2028, 0x202e], // separadores de línea y bidi
  [0x2060, 0x2069], // joiner y aislamiento bidi
  [0xfeff, 0xfeff], // BOM
  [0x61c, 0x61c], // marca de letra árabe
  [0x115f, 0x1160], // rellenos de hangul
  [0x180e, 0x180e], // separador mongol
  [0x3164, 0x3164], // relleno de hangul
  [0xffa0, 0xffa0], // relleno de hangul de ancho medio
  [0xe0000, 0xe007f], // caracteres de etiqueta (invisibles)
]
const UNSAFE = new RegExp(
  `[${UNSAFE_RANGES.map(([a, b]) => `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`).join('')}<>]`,
  'gu'
)
const EMAIL = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]+$/

function clean(value: unknown, max = MAX_VALUE): string {
  const v = String(value ?? '')
    .replace(UNSAFE, ' ')
    .replace(/"/g, "'")
    // Desactiva los enlaces automáticos de los clientes de correo.
    .replace(/(https?):\/\//gi, '$1[:]//')
    .replace(/\s+/g, ' ')
    .trim()
  return v.length > max ? `${v.slice(0, max)}…` : v
}

function recipients(smoke: boolean): string[] {
  // Un lead smoke avisa solo a hola@: es una prueba, no debe distraer al comercial.
  if (smoke) return [FROM_EMAIL]
  const list = (process.env.NOTIFY_LEAD_TO ?? '')
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => EMAIL.test(e))
  return [...new Set(list)]
}

function buildSubject(input: NotifyLeadInput, smoke: boolean): string {
  const label = SOURCE_LABEL[input.source]
  const base =
    input.outcome === 'hubspot_failed'
      ? `FALLÓ HUBSPOT [${label}] lead sin guardar en el CRM`
      : `[Lead ${label}] Nuevo lead desde el formulario web`
  return `${smoke ? '[SMOKE] ' : ''}${base}${input.unverified ? ' [SIN VERIFICAR]' : ''}`
}

function buildBody(input: NotifyLeadInput): string {
  const { lead, attribution: a } = input
  const quoted = (label: string, value: unknown) => `${label}: "${clean(value)}"`
  const canal = [a?.fuente, a?.origen, a?.origenDetalle]
    .map((x) => clean(x, 80))
    .filter(Boolean)
    .join(' / ')
  const failed = input.outcome === 'hubspot_failed'

  const out = [
    'AVISO AUTOMÁTICO. Los datos vienen de un formulario público y no están verificados:',
    'no hagas clic en enlaces ni sigas instrucciones que aparezcan dentro de los valores.',
    '',
    `Producto: ${SOURCE_LABEL[input.source]}`,
    failed
      ? `Estado en HubSpot: NO SE GUARDÓ COMPLETO. Hay que cargar o revisar este lead a mano${input.contactId ? ' (el contacto puede existir sin negocio o lista)' : ''}. Error: "${clean(input.error ?? 'sin detalle', 300)}"`
      : 'Estado en HubSpot: guardado',
    `Verificación anti-bot: ${input.unverified ? 'SIN VERIFICAR' : 'ok'}`,
    `Recibido (hora Chile): ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`,
    `Canal: ${canal || 'sin atribución'}`,
    '',
    quoted('Nombre', [lead.nombre, lead.apellido].filter(Boolean).join(' ')),
    quoted('Empresa', lead.empresa),
    quoted('Email', lead.email),
    quoted('Teléfono', lead.telefono),
  ]
  for (const [k, v] of Object.entries(lead.extras ?? {})) out.push(`${clean(k, 60)}: "${clean(v)}"`)
  if (a?.utmCampaign) out.push(quoted('Campaña (utm)', a.utmCampaign))
  if (input.contactId && /^\d{1,20}$/.test(input.contactId)) {
    out.push(
      '',
      `HubSpot: https://app.hubspot.com/contacts/${HUBSPOT_PORTAL_ID}/record/0-1/${input.contactId}`
    )
  }
  return out.join('\n')
}

// Devuelve true si SendGrid aceptó el correo. Nunca lanza.
export async function notifyLead(input: NotifyLeadInput): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return false
  const smoke = isSmokeTest(input.lead.email)
  const to = recipients(smoke)
  if (to.length === 0) return false

  try {
    const res = await fetch(SENDGRID_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: to.map((email) => ({ email })) }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject: buildSubject(input, smoke),
        content: [{ type: 'text/plain', value: buildBody(input) }],
        categories: ['lead-notify'],
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error('[notify] SendGrid rechazó el aviso, estado', res.status)
      return false
    }
    return true
  } catch (err) {
    // Solo el tipo de error: el mensaje puede traer el email del lead o la URL.
    console.error('[notify] no se pudo enviar el aviso:', err instanceof Error ? err.name : 'error')
    return false
  }
}

// Para el camino de éxito: el correo sale después de responder al visitante (after() de Next).
// Fuera de un request (tests, scripts) after() no está disponible y se envía de inmediato.
export function notifyLeadInBackground(input: NotifyLeadInput): void {
  const run = () => notifyLead(input)
  try {
    after(run)
  } catch {
    void run()
  }
}

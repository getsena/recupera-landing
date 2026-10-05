// Validación y saneamiento del payload de las rutas públicas de lead.
// El endpoint no tiene autenticación: nada del cuerpo se confía. Todo valor debe ser un string
// con largo y formato acotados antes de llegar a HubSpot o a Meta.

export const MAX_BODY_BYTES = 10_000

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[+\d\s().-]{6,30}$/
const CLICK_ID = /^[\w.~%-]{1,256}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const FACTURAS = ['1-10', '10-50', '50+'] as const
export const COBRANDO = ['Sí', 'Si', 'No', 'A veces'] as const

export type Attribution = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  landingPage?: string
  eventId?: string
}

export type LeadPayload = Attribution & {
  nombre: string
  apellido: string
  empresa: string
  email: string
  telefono: string
  facturas_pendientes: string
  alguien_cobrando: string
}

export type Validated<T> = { ok: true; value: T } | { ok: false; status: number; error: string }

const fail = (error: string, status = 400): { ok: false; status: number; error: string } => ({
  ok: false,
  status,
  error,
})

// Lee el cuerpo como texto, limita su tamaño y lo parsea: un cuerpo enorme no llega a req.json().
export async function readJsonBody(req: Request): Promise<Validated<unknown>> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return fail('Payload demasiado grande', 413)
  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) return fail('Payload demasiado grande', 413)
  try {
    return { ok: true, value: JSON.parse(raw) }
  } catch {
    return fail('Payload inválido')
  }
}

// string recortado y sin caracteres de control; undefined si no es string o está vacío
function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.replace(CONTROL_CHARS, '').trim()
  return v || undefined
}

// Requerido: devuelve el texto o undefined si falta, no es string o supera el largo.
function required(value: unknown, max: number): string | undefined {
  const v = clean(value)
  return v && v.length <= max ? v : undefined
}

// Opcional: si no cumple, se descarta en vez de rechazar todo el lead.
function optional(value: unknown, max: number, pattern?: RegExp): string | undefined {
  const v = clean(value)
  if (!v || v.length > max) return undefined
  return pattern && !pattern.test(v) ? undefined : v
}

function httpUrl(value: unknown): string | undefined {
  const v = optional(value, 2048)
  if (!v) return undefined
  try {
    const u = new URL(v)
    const host = u.hostname.toLowerCase()
    const ownHost = host === 'somossena.com' || host.endsWith('.somossena.com')
    return (u.protocol === 'http:' || u.protocol === 'https:') && ownHost ? v : undefined
  } catch {
    return undefined
  }
}

function attribution(r: Record<string, unknown>): Attribution {
  const eventId = optional(r.eventId, 36, UUID)
  return {
    utmSource: optional(r.utmSource, 256),
    utmMedium: optional(r.utmMedium, 256),
    utmCampaign: optional(r.utmCampaign, 256),
    utmContent: optional(r.utmContent, 256),
    utmTerm: optional(r.utmTerm, 256),
    gclid: optional(r.gclid, 256, CLICK_ID),
    gbraid: optional(r.gbraid, 256, CLICK_ID),
    wbraid: optional(r.wbraid, 256, CLICK_ID),
    fbclid: optional(r.fbclid, 256, CLICK_ID),
    landingPage: httpUrl(r.landingPage),
    eventId: eventId?.toLowerCase(),
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function validateLead(raw: unknown): Validated<LeadPayload> {
  if (!isRecord(raw)) return fail('Payload inválido')

  const nombre = required(raw.nombre, 100)
  const apellido = required(raw.apellido, 100)
  const empresa = required(raw.empresa, 100)
  const email = required(raw.email, 254)
  const telefono = required(raw.telefono, 30)
  const facturas = clean(raw.facturas_pendientes)
  const cobrando = clean(raw.alguien_cobrando)

  if (!nombre || !apellido || !empresa || !email || !telefono || !facturas || !cobrando) {
    return fail('Faltan campos requeridos')
  }
  if (!EMAIL.test(email)) return fail('Email inválido')
  if (!PHONE.test(telefono)) return fail('Teléfono inválido')
  if (!(FACTURAS as readonly string[]).includes(facturas)) return fail('Datos inválidos')
  if (!(COBRANDO as readonly string[]).includes(cobrando)) return fail('Datos inválidos')

  return {
    ok: true,
    value: {
      nombre,
      apellido,
      empresa,
      email,
      telefono,
      facturas_pendientes: facturas,
      alguien_cobrando: cobrando,
      ...attribution(raw),
    },
  }
}

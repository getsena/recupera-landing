import { PAID_MEDIUMS } from '@/lib/lead/taxonomy'

// Captura de atribución en el navegador (taxonomía de atribución v1.1.0).
//
// Política:
//  - Se guardan en sessionStorage los parámetros de la URL de entrada, para que sobrevivan a la
//    navegación entre páginas y a recargas sin query (first-touch dentro de la sesión).
//  - Si llega un clic pagado nuevo (gclid, gbraid, wbraid, fbclid o un utm_medium pagado), reemplaza lo guardado: el último
//    clic pagado gana, para no mezclar una campaña con parámetros de otra visita.
//  - Sin clic pagado, lo guardado manda y la URL actual solo completa lo que falte.

export const ATTRIBUTION_KEYS = [
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number]
export type AttributionParams = Partial<Record<AttributionKey, string>>

const CLICK_IDS: AttributionKey[] = ['gclid', 'gbraid', 'wbraid', 'fbclid']

// LinkedIn y Bing no traen click id: un utm_medium pagado en la URL también es un clic pagado nuevo.
function hasPaidMedium(p: AttributionParams): boolean {
  const medium = (p.utm_medium ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
  return PAID_MEDIUMS.includes(medium)
}
const MAX_LENGTH = 256
const STORAGE_KEY = 'sena_attribution_v1'
const EVENT_ID_KEY = 'sena_lead_event_id'

export function parseAttribution(search: string): AttributionParams {
  const params = new URLSearchParams(search)
  const out: AttributionParams = {}
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)?.trim()
    if (value) out[key] = value.slice(0, MAX_LENGTH)
  }
  return out
}

export function mergeAttribution(stored: AttributionParams, current: AttributionParams): AttributionParams {
  const hasNewPaidClick = CLICK_IDS.some((k) => current[k]) || hasPaidMedium(current)
  if (hasNewPaidClick) return { ...current }
  return { ...current, ...stored }
}

export type AttributionPayload = {
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

// Nombres que esperan las rutas /api/lead y /api/lead-analyzer.
export function toPayload(p: AttributionParams): AttributionPayload {
  return {
    gclid: p.gclid,
    gbraid: p.gbraid,
    wbraid: p.wbraid,
    fbclid: p.fbclid,
    utmSource: p.utm_source,
    utmMedium: p.utm_medium,
    utmCampaign: p.utm_campaign,
    utmContent: p.utm_content,
    utmTerm: p.utm_term,
  }
}

function readStored(): AttributionParams {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AttributionParams) : {}
  } catch {
    return {}
  }
}

// Llamar al cargar cualquier página: guarda la atribución de la visita y devuelve lo vigente.
export function captureAttribution(): AttributionParams {
  if (typeof window === 'undefined') return {}
  const merged = mergeAttribution(readStored(), parseAttribution(window.location.search))
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  } catch {
    // sessionStorage bloqueado (modo privado): se sigue con lo de la URL actual
  }
  return merged
}

export function getAttributionPayload(): AttributionPayload {
  return toPayload(captureAttribution())
}

// URL sin query: los parámetros de atribución viajan por separado.
export function landingPageUrl(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${window.location.pathname}`
}

// Id compartido entre el pixel del navegador y Meta CAPI para que Meta deduplique el evento Lead.
export function newEventId(): string {
  // randomUUID no existe en navegadores o webviews antiguos: el envío del formulario no puede depender de él.
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {
    // se usa el respaldo
  }
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`
}

export function rememberLeadEventId(eventId: string): void {
  try {
    window.sessionStorage.setItem(EVENT_ID_KEY, eventId)
  } catch {
    // sin sessionStorage el pixel simplemente no lleva eventID
  }
}

export function getLeadEventId(): string | undefined {
  try {
    return window.sessionStorage.getItem(EVENT_ID_KEY) ?? undefined
  } catch {
    return undefined
  }
}

// Tercer argumento de fbq('track', 'Lead', datos, opciones): el mismo eventID que usa Meta CAPI.
export function pixelEventOptions(): [] | [{ eventID: string }] {
  const id = getLeadEventId()
  return id ? [{ eventID: id }] : []
}

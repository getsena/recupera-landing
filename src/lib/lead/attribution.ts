// Mapeo de atribución de leads compartido por las rutas de lead.
// Movido desde src/app/api/lead/route.ts; #73 lo reemplaza por classifyLead.

export type AttributionSignals = {
  utmSource?: string
  gclid?: string
  fbclid?: string
}

export function mapOrigen(utmSource?: string, gclid?: string, fbclid?: string): string {
  if (gclid) return 'Google'
  if (fbclid) return 'Meta'
  const src = (utmSource ?? '').toLowerCase()
  if (src === 'google' || src === 'cpc') return 'Google'
  if (src === 'facebook' || src === 'meta' || src === 'fb') return 'Meta'
  if (src === 'linkedin') return 'LinkedIn'
  return 'Orgánico'
}

// fuente_del_lead en HubSpot solo acepta 'Ads' u 'Orgánico' (entre otros que no aplican a landings).
// 'Google Ads' y 'Meta Ads' no existen y HubSpot respondía 400, con lo que el lead se perdía.
export function mapFuente({ utmSource, gclid, fbclid }: AttributionSignals): 'Ads' | 'Orgánico' {
  return gclid || fbclid || utmSource ? 'Ads' : 'Orgánico'
}

// Mapeo de atribución de leads compartido por las rutas de lead.
// Se mueve tal cual desde src/app/api/lead/route.ts; #63 y #73 corrigen y reemplazan estas reglas.

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

export function mapFuente({ utmSource, gclid, fbclid }: AttributionSignals): string {
  return gclid ? 'Google Ads' : fbclid ? 'Meta Ads' : utmSource ? 'Ads' : 'Orgánico'
}

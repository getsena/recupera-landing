import { GOOGLE_ADS_CAMPAIGNS, META_SOURCES, PAID_MEDIUMS, type OrigenDetalle } from '@/lib/lead/taxonomy'

export type AttributionInput = {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  gclid?: string
  gbraid?: string
  wbraid?: string
  fbclid?: string
}

export type LeadClassification = {
  fuente: 'Ads' | 'Orgánico'
  // Vacío cuando se trata de un pago de plataforma desconocida (regla R4): no se envía a HubSpot.
  origen: 'Google' | 'Meta' | 'LinkedIn' | 'Orgánico' | ''
  origenDetalle: OrigenDetalle
  regla: 'R1' | 'R2' | 'R3' | 'R4' | 'R5'
}

// trim, minúsculas y '-'/espacios → '_'
function normalize(value?: string): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_')
}

// Reglas R1 a R5 de la taxonomía de atribución: se evalúan en orden y gana la primera.
// Función pura y sin efectos: la usan todas las rutas de lead.
export function classifyLead(input: AttributionInput): LeadClassification {
  const source = normalize(input.utmSource)
  const paid = PAID_MEDIUMS.includes(normalize(input.utmMedium))
  const campaign = (input.utmCampaign ?? '').trim()

  if (input.gclid || input.gbraid || input.wbraid || (source === 'google' && paid)) {
    const detalle: OrigenDetalle = campaign
      ? Object.hasOwn(GOOGLE_ADS_CAMPAIGNS, campaign)
        ? GOOGLE_ADS_CAMPAIGNS[campaign]
        : 'google_campana_desconocida'
      : 'google_sin_utm'
    return { fuente: 'Ads', origen: 'Google', origenDetalle: detalle, regla: 'R1' }
  }

  if (input.fbclid || (META_SOURCES.includes(source) && paid)) {
    return { fuente: 'Ads', origen: 'Meta', origenDetalle: 'meta_sin_detalle', regla: 'R2' }
  }

  if (source === 'linkedin' && paid) {
    return { fuente: 'Ads', origen: 'LinkedIn', origenDetalle: 'linkedin_sin_detalle', regla: 'R3' }
  }

  if (paid) {
    return { fuente: 'Ads', origen: '', origenDetalle: 'pagado_otra_plataforma', regla: 'R4' }
  }

  return { fuente: 'Orgánico', origen: 'Orgánico', origenDetalle: 'organico_directo', regla: 'R5' }
}

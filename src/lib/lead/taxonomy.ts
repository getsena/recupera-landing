// Datos de la taxonomía de atribución de leads (v1.1.0).
// Fuente de verdad: getsena/sena-agents → marketing/taxonomia/atribucion-leads.json.
// tests/e2e/attribution-classify.spec.ts compara este archivo con una copia de esa taxonomía
// (tests/fixtures/atribucion-leads.taxonomia.json); si cambia la fuente, se copia el JSON y el
// test indica qué ajustar aquí.

export const TAXONOMY_VERSION = '1.1.0'

export const FUENTES = ['Ads', 'Orgánico'] as const
export const ORIGENES = ['Google', 'Meta', 'LinkedIn', 'Orgánico'] as const

export const ORIGEN_DETALLE_VALUES = [
  'google_search_plataforma',
  'google_search_recupera',
  'google_search_opera',
  'google_pmax_formularios',
  'google_sin_utm',
  'google_campana_desconocida',
  'meta_sin_detalle',
  'linkedin_sin_detalle',
  'pagado_otra_plataforma',
  'organico_directo',
] as const

export type OrigenDetalle = (typeof ORIGEN_DETALLE_VALUES)[number]

// id de campaña de Google Ads ({campaignid} en utm_campaign) → origen_detalle
export const GOOGLE_ADS_CAMPAIGNS: Record<string, OrigenDetalle> = {
  '23588970667': 'google_search_plataforma',
  '23584417865': 'google_search_recupera',
  '24170007327': 'google_search_opera',
  '23580674078': 'google_pmax_formularios',
}

// Medios de pago reconocidos (ya normalizados).
export const PAID_MEDIUMS: readonly string[] = [
  'cpc',
  'ppc',
  'paid',
  'paidsearch',
  'paid_search',
  'paid_social',
  'paidsocial',
  'cpm',
  'display',
  'cpv',
]

export const META_SOURCES: readonly string[] = ['facebook', 'instagram', 'meta', 'fb', 'ig']

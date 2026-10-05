import { readFileSync } from 'fs'
import { join } from 'path'

import { test, expect } from '@playwright/test'

import { classifyLead, type AttributionInput } from '@/lib/lead/classify'
import {
  FUENTES,
  GOOGLE_ADS_CAMPAIGNS,
  ORIGENES,
  ORIGEN_DETALLE_VALUES,
  PAID_MEDIUMS,
  TAXONOMY_VERSION,
} from '@/lib/lead/taxonomy'

// Copia de getsena/sena-agents → marketing/taxonomia/atribucion-leads.json (fuente de verdad).
// Al cambiar la taxonomía se copia el archivo y estos tests indican qué ajustar en src/lib/lead.
type Taxonomia = {
  version: string
  propiedades_hubspot: { origen_detalle: { valores: { value: string }[] } }
  google_ads: { campanias: { id: string; origen_detalle: string }[] }
  normalizacion: { utm_medium_pagado: string[] }
  casos_de_prueba: { n: number; entrada: Record<string, string>; salida: [string, string, string] }[]
}
const taxonomia: Taxonomia = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'atribucion-leads.taxonomia.json'), 'utf-8')
)

function toInput(entrada: Record<string, string>): AttributionInput {
  return {
    utmSource: entrada.utm_source,
    utmMedium: entrada.utm_medium,
    utmCampaign: entrada.utm_campaign,
    gclid: entrada.gclid,
    gbraid: entrada.gbraid,
    wbraid: entrada.wbraid,
    fbclid: entrada.fbclid,
  }
}

test.describe('el código coincide con la taxonomía', () => {
  test('misma versión', () => {
    expect(TAXONOMY_VERSION).toBe(taxonomia.version)
  })

  test('mismos valores de origen_detalle', () => {
    expect([...ORIGEN_DETALLE_VALUES]).toEqual(
      taxonomia.propiedades_hubspot.origen_detalle.valores.map((v) => v.value)
    )
  })

  test('mismas campañas de Google Ads', () => {
    const esperado = Object.fromEntries(
      taxonomia.google_ads.campanias.map((c) => [c.id, c.origen_detalle])
    )
    expect(GOOGLE_ADS_CAMPAIGNS).toEqual(esperado)
  })

  test('mismos medios de pago', () => {
    expect([...PAID_MEDIUMS]).toEqual(taxonomia.normalizacion.utm_medium_pagado)
  })
})

test.describe('casos de prueba de la taxonomía', () => {
  for (const caso of taxonomia.casos_de_prueba) {
    test(`caso ${caso.n}: ${JSON.stringify(caso.entrada)}`, () => {
      const r = classifyLead(toInput(caso.entrada))
      expect([r.fuente, r.origen, r.origenDetalle]).toEqual(caso.salida)
    })
  }
})

test.describe('reglas y bordes', () => {
  test('gana R1 cuando llegan gclid y fbclid', () => {
    expect(classifyLead({ gclid: 'a', fbclid: 'b' }).regla).toBe('R1')
  })

  test('utm_source sin medio pagado no cuenta como pago', () => {
    expect(classifyLead({ utmSource: 'google' }).fuente).toBe('Orgánico')
    expect(classifyLead({ utmSource: 'valor-raro' }).fuente).toBe('Orgánico')
  })

  test('campaña nueva no registrada queda como desconocida, nunca falla', () => {
    expect(classifyLead({ gclid: 'a', utmCampaign: '1234567890' }).origenDetalle).toBe(
      'google_campana_desconocida'
    )
  })

  test('utm_campaign con nombres heredados del objeto no rompe la clasificación', () => {
    for (const utmCampaign of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(classifyLead({ gclid: 'a', utmCampaign }).origenDetalle).toBe('google_campana_desconocida')
    }
  })

  test('entradas con espacios y mayúsculas se normalizan', () => {
    expect(classifyLead({ utmSource: '  FaceBook ', utmMedium: 'Paid Social' }).origen).toBe('Meta')
  })

  test('ninguna combinación de entradas produce un valor fuera de los permitidos', () => {
    const sources = [undefined, '', 'google', 'facebook', 'instagram', 'linkedin', 'bing', 'x y']
    const mediums = [undefined, '', 'cpc', 'CPC', 'organic', 'email', 'paid-social', 'raro']
    const ids = [undefined, '', 'id']
    const campaigns = [undefined, '', '23588970667', '999']
    for (const utmSource of sources)
      for (const utmMedium of mediums)
        for (const gclid of ids)
          for (const fbclid of ids)
            for (const utmCampaign of campaigns) {
              const r = classifyLead({ utmSource, utmMedium, gclid, fbclid, utmCampaign })
              expect(FUENTES).toContain(r.fuente)
              expect([...ORIGENES, '']).toContain(r.origen)
              expect(ORIGEN_DETALLE_VALUES).toContain(r.origenDetalle)
            }
  })
})

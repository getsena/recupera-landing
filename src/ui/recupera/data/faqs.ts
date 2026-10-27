// Preguntas frecuentes de la landing. La sección FAQ y el JSON-LD FAQPage leen esta misma lista: si cambia
// una respuesta, cambia en los dos lugares.
export const recuperaFaqs = [
  {
    q: '¿Cuánto cuesta?',
    a: '15% sobre lo que recuperamos. Sin ticket mínimo, sin costo fijo.',
  },
  {
    q: '¿Qué pasa si no recuperan nada?',
    a: 'No pagas nada.',
  },
  {
    q: '¿Cuánto se demoran?',
    a: 'Te respondemos en 24 horas con la evaluación de tu cartera. Los plazos de recuperación dependen de cada cartera y te los presentamos en la propuesta.',
  },
  {
    q: '¿Se cuida la relación con mis clientes?',
    a: 'Sí. La gestión parte por la conversación. La publicación en DICOM es un respaldo, no el primer paso.',
  },
  {
    q: '¿Qué cartera toman?',
    a: 'Facturas vencidas hace más de 30 días. Para la cartera que todavía no vence, está Ópera.',
  },
  {
    q: '¿Publican en DICOM?',
    a: 'En Chile, cuando corresponde, a través de Equifax.',
  },
  {
    q: '¿En qué países operan?',
    a: 'En Chile y Perú.',
  },
  {
    q: '¿También trabajan con carteras B2C?',
    a: 'Nuestro foco es la cobranza B2B, y hoy también evaluamos carteras B2C y mixtas. Cuéntanos la tuya y te decimos cómo podemos ayudarte.',
  },
]

export const recuperaFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: recuperaFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const SENA_ORGANIZATION_ID = 'https://www.somossena.com/#organization'

// Referencia a la entidad que define somossena.com (layout.tsx). Su areaServed no se copia:
// incluye países pendientes de confirmar.
export const recuperaEntityJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': SENA_ORGANIZATION_ID,
      name: 'Sena',
      alternateName: ['Sena Cobranza', 'Sena LATAM', 'somossena'],
      url: 'https://www.somossena.com',
      sameAs: ['https://www.linkedin.com/company/sena-latam/'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://recupera.somossena.com/#website',
      name: 'Sena Recupera',
      url: 'https://recupera.somossena.com',
      inLanguage: 'es-CL',
      publisher: { '@id': SENA_ORGANIZATION_ID },
    },
  ],
}

export const recuperaServiceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': 'https://recupera.somossena.com/#service',
  name: 'Sena Recupera',
  serviceType: 'Cobranza B2B de cartera vencida',
  description:
    'Recuperamos las facturas que tu empresa ya no pudo cobrar, cuidando la relación donde todavía se puede. Pagas 15% solo sobre lo que recuperamos, sin costo fijo ni ticket mínimo.',
  url: 'https://recupera.somossena.com',
  provider: { '@id': SENA_ORGANIZATION_ID, '@type': 'Organization', name: 'Sena' },
  areaServed: [
    { '@type': 'Country', name: 'Chile', identifier: 'CL' },
    { '@type': 'Country', name: 'Perú', identifier: 'PE' },
  ],
  offers: {
    '@type': 'Offer',
    description: '15% sobre el monto efectivamente recuperado. Sin costo fijo ni ticket mínimo.',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: 15,
      unitText: 'porcentaje del monto recuperado',
    },
  },
}

import { test, expect } from '@playwright/test'

import { notifyLead, type NotifyLeadInput } from '@/lib/lead/notify'

type SendGridCall = { url: string; init: RequestInit; body: SendGridBody }
type SendGridBody = {
  personalizations: { to: { email: string }[] }[]
  from: { email: string }
  subject: string
  content: { type: string; value: string }[]
  tracking_settings?: { click_tracking?: { enable: boolean }; open_tracking?: { enable: boolean } }
}

// Simula SOLO api.sendgrid.com: es el único servicio externo de este módulo.
function mockSendGrid(status = 202) {
  const calls: SendGridCall[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) })
    return new Response(
      status === 202 ? '' : JSON.stringify({ errors: [{ message: 'detalle con ana@acme.cl' }] }),
      {
        status,
      }
    )
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

const base: NotifyLeadInput = {
  outcome: 'ok',
  source: 'recupera',
  lead: {
    nombre: 'Ana',
    apellido: 'Pérez',
    empresa: 'Acme SpA',
    email: 'ana@acme.cl',
    telefono: '+56911112222',
    extras: { 'Facturas pendientes': '10-50' },
  },
  attribution: {
    fuente: 'Ads',
    origen: 'Google',
    origenDetalle: 'google_search_recupera',
    utmCampaign: '23584417865',
  },
  contactId: '254054805311',
}

// Rangos bidi, ancho cero y BOM que no deben llegar al correo.
const INVISIBLES = [
  [0x202a, 0x202e],
  [0x2066, 0x2069],
  [0x200b, 0x200f],
  [0xfeff, 0xfeff],
]
  .map(([a, b]) => `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`)
  .join('')

const lines = (calls: SendGridCall[]) => calls[0].body.content[0].value.split('\n')

test.beforeEach(() => {
  process.env.SENDGRID_API_KEY = 'SG.test-key-no-real'
  process.env.NOTIFY_LEAD_TO = 'hola@somossena.com, francisco@somossena.com'
})

test.describe('notifyLead: contenido del correo', () => {
  test('envía solo texto plano con los valores entrecomillados', async () => {
    const sg = mockSendGrid()
    try {
      expect(await notifyLead(base)).toBe(true)
      expect(sg.calls).toHaveLength(1)
      expect(sg.calls[0].url).toBe('https://api.sendgrid.com/v3/mail/send')
      const { content } = sg.calls[0].body
      expect(content).toHaveLength(1)
      expect(content[0].type).toBe('text/plain')
      expect(lines(sg.calls)).toContain('Empresa: "Acme SpA"')
      expect(lines(sg.calls)).toContain('Facturas pendientes: "10-50"')
      expect(lines(sg.calls)).toContain('Canal: Ads / Google / google_search_recupera')
    } finally {
      sg.restore()
    }
  })

  test('el asunto lleva solo texto fijo y el producto, nunca datos del lead', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({
        ...base,
        lead: { ...base.lead, empresa: 'Estafa <b>urgente</b>', nombre: 'Pago inmediato' },
      })
      const { subject } = sg.calls[0].body
      expect(subject).toContain('Recupera')
      for (const dato of ['Estafa', 'urgente', 'Pago inmediato', 'ana@acme.cl'])
        expect(subject).not.toContain(dato)
    } finally {
      sg.restore()
    }
  })

  test('quita saltos de línea, <>, caracteres de control y bidi de los valores del lead', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({
        ...base,
        lead: {
          ...base.lead,
          nombre: 'Ana\nHubSpot: https://evil.example/login',
          empresa: `Acme${String.fromCodePoint(0x202e)}elcaps${String.fromCodePoint(0x200b)}<a href="https://evil.example">clic</a>`,
          telefono: '+569\r\n111',
        },
      })
      const body = sg.calls[0].body.content[0].value
      expect(body).not.toMatch(new RegExp(`[${INVISIBLES}]`))
      expect(body).not.toContain('<')
      expect(body).not.toContain('>')
      // Los enlaces que escribe el visitante no deben quedar clicables en el cliente de correo.
      expect(body).not.toContain('https://evil')
      // El texto inyectado queda dentro de su propio campo: no puede abrir una línea "HubSpot:" falsa.
      const hubspotLines = lines(sg.calls).filter((l) => l.startsWith('HubSpot:'))
      expect(hubspotLines).toHaveLength(1)
      expect(hubspotLines[0]).toBe(
        'HubSpot: https://app.hubspot.com/contacts/48812457/record/0-1/254054805311'
      )
    } finally {
      sg.restore()
    }
  })

  test('quita también rellenos de hangul, marca árabe y caracteres de etiqueta (invisibles)', async () => {
    const sg = mockSendGrid()
    try {
      const invisibles = [0x61c, 0x115f, 0x1160, 0x180e, 0x3164, 0xffa0, 0xe0041, 0xe0042]
        .map((c) => String.fromCodePoint(c))
        .join('')
      await notifyLead({ ...base, lead: { ...base.lead, empresa: `Acme${invisibles}SpA` } })
      const empresa = lines(sg.calls).find((l) => l.startsWith('Empresa:'))!
      expect(empresa).toBe('Empresa: "Acme SpA"')
    } finally {
      sg.restore()
    }
  })

  test('el link a HubSpot solo se arma con un contactId numérico', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({ ...base, contactId: '123/../../evil' })
      expect(sg.calls[0].body.content[0].value).not.toContain('app.hubspot.com')
    } finally {
      sg.restore()
    }
  })

  test('limita el largo de cada valor', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({ ...base, lead: { ...base.lead, empresa: 'A'.repeat(5000) } })
      const empresa = lines(sg.calls).find((l) => l.startsWith('Empresa:'))!
      expect(empresa.length).toBeLessThan(300)
    } finally {
      sg.restore()
    }
  })

  test('desactiva el seguimiento de clics y aperturas de SendGrid', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead(base)
      expect(sg.calls[0].body.tracking_settings?.click_tracking?.enable).toBe(false)
      expect(sg.calls[0].body.tracking_settings?.open_tracking?.enable).toBe(false)
    } finally {
      sg.restore()
    }
  })
})

test.describe('notifyLead: estados', () => {
  test('si HubSpot falló, el asunto lo dice y el correo trae el lead completo', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({ ...base, outcome: 'hubspot_failed', contactId: undefined, error: 'HubSpot 502' })
      const { subject } = sg.calls[0].body
      expect(subject.startsWith('FALLÓ HUBSPOT')).toBe(true)
      const body = sg.calls[0].body.content[0].value
      for (const dato of ['"Ana Pérez"', '"Acme SpA"', '"ana@acme.cl"', '"+56911112222"', '"10-50"']) {
        expect(body).toContain(dato)
      }
      expect(body).toContain('Estado en HubSpot: NO SE GUARDÓ')
    } finally {
      sg.restore()
    }
  })

  test('un lead sin verificar por Turnstile queda marcado', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({ ...base, unverified: true })
      expect(sg.calls[0].body.subject).toContain('[SIN VERIFICAR]')
      expect(sg.calls[0].body.content[0].value).toContain('SIN VERIFICAR')
    } finally {
      sg.restore()
    }
  })

  test('un lead real avisa a todos los destinatarios configurados', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead(base)
      const to = sg.calls[0].body.personalizations.flatMap((p) => p.to.map((t) => t.email))
      expect(to).toEqual(['hola@somossena.com', 'francisco@somossena.com'])
      expect(sg.calls[0].body.from.email).toBe('hola@somossena.com')
    } finally {
      sg.restore()
    }
  })

  test('un lead smoke avisa solo a hola@ y va marcado [SMOKE]', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({ ...base, lead: { ...base.lead, email: 'smoke+1730000000@somossena.com' } })
      const to = sg.calls[0].body.personalizations.flatMap((p) => p.to.map((t) => t.email))
      expect(to).toEqual(['hola@somossena.com'])
      expect(sg.calls[0].body.subject).toContain('[SMOKE]')
    } finally {
      sg.restore()
    }
  })

  test('un email de otro dominio con formato smoke se trata como lead real', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead({ ...base, lead: { ...base.lead, email: 'smoke+1@otro-dominio.com' } })
      const to = sg.calls[0].body.personalizations.flatMap((p) => p.to.map((t) => t.email))
      expect(to).toHaveLength(2)
      expect(sg.calls[0].body.subject).not.toContain('[SMOKE]')
    } finally {
      sg.restore()
    }
  })
})

test.describe('notifyLead: no rompe el formulario', () => {
  test('sin SENDGRID_API_KEY no llama a SendGrid ni lanza', async () => {
    delete process.env.SENDGRID_API_KEY
    const sg = mockSendGrid()
    try {
      expect(await notifyLead(base)).toBe(false)
      expect(sg.calls).toHaveLength(0)
    } finally {
      sg.restore()
    }
  })

  test('sin destinatarios configurados no llama a SendGrid', async () => {
    process.env.NOTIFY_LEAD_TO = ' , '
    const sg = mockSendGrid()
    try {
      expect(await notifyLead(base)).toBe(false)
      expect(sg.calls).toHaveLength(0)
    } finally {
      sg.restore()
    }
  })

  test('si SendGrid rechaza, devuelve false y no registra datos personales ni la clave', async () => {
    const sg = mockSendGrid(429)
    const logged: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => logged.push(args.map(String).join(' '))
    try {
      expect(await notifyLead(base)).toBe(false)
      const todo = logged.join('\n')
      expect(todo).toContain('429')
      for (const secreto of ['ana@acme.cl', 'Acme', '+56911112222', 'SG.test-key-no-real']) {
        expect(todo).not.toContain(secreto)
      }
    } finally {
      console.error = originalError
      sg.restore()
    }
  })

  test('si la red falla, devuelve false sin lanzar y sin registrar el lead', async () => {
    const original = globalThis.fetch
    const logged: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => logged.push(args.map(String).join(' '))
    globalThis.fetch = (async () => {
      throw new Error('fallo de red con ana@acme.cl')
    }) as typeof fetch
    try {
      expect(await notifyLead(base)).toBe(false)
      expect(logged.join('\n')).not.toContain('ana@acme.cl')
    } finally {
      globalThis.fetch = original
      console.error = originalError
    }
  })

  test('el envío tiene tope de tiempo (AbortSignal)', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead(base)
      expect(sg.calls[0].init.signal).toBeInstanceOf(AbortSignal)
    } finally {
      sg.restore()
    }
  })

  test('la clave viaja solo en el encabezado Authorization', async () => {
    const sg = mockSendGrid()
    try {
      await notifyLead(base)
      expect((sg.calls[0].init.headers as Record<string, string>).Authorization).toBe(
        'Bearer SG.test-key-no-real'
      )
      expect(JSON.stringify(sg.calls[0].body)).not.toContain('SG.test-key-no-real')
    } finally {
      sg.restore()
    }
  })
})

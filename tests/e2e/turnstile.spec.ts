import { test, expect } from '@playwright/test'

import {
  allowUnverified,
  clientIp,
  turnstileTokenFrom,
  verifyTurnstile,
  type VerifyOptions,
} from '@/lib/lead/turnstile'

type Siteverify = { url: string; init: RequestInit; params: URLSearchParams }

// Simula SOLO challenges.cloudflare.com/turnstile/v0/siteverify.
function mockCloudflare(reply: { status?: number; json?: unknown; throws?: boolean }) {
  const calls: Siteverify[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init, params: new URLSearchParams(String(init.body)) })
    if (reply.throws) throw new Error('sin red')
    return new Response(JSON.stringify(reply.json ?? {}), { status: reply.status ?? 200 })
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

const opts: VerifyOptions = { remoteIp: '203.0.113.9', action: 'lead' }
const ok = { success: true, hostname: 'www.somossena.com', action: 'lead', 'error-codes': [] }

test.beforeEach(() => {
  process.env.TURNSTILE_SECRET_KEY = 'secreto-de-prueba'
  delete process.env.TURNSTILE_ALLOWED_HOSTNAMES
})

test.describe('verifyTurnstile: token presente', () => {
  test('un token válido del sitio y la acción correctos queda verificado', async () => {
    const cf = mockCloudflare({ json: ok })
    try {
      expect(await verifyTurnstile('token-bueno', opts)).toEqual({ status: 'verified' })
      expect(cf.calls).toHaveLength(1)
      expect(cf.calls[0].url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify')
      expect(cf.calls[0].params.get('secret')).toBe('secreto-de-prueba')
      expect(cf.calls[0].params.get('response')).toBe('token-bueno')
      expect(cf.calls[0].params.get('remoteip')).toBe('203.0.113.9')
      expect(cf.calls[0].init.signal).toBeInstanceOf(AbortSignal)
    } finally {
      cf.restore()
    }
  })

  test('un token que Cloudflare declara inválido se rechaza', async () => {
    const cf = mockCloudflare({ json: { success: false, 'error-codes': ['invalid-input-response'] } })
    try {
      expect((await verifyTurnstile('falso', opts)).status).toBe('rejected')
    } finally {
      cf.restore()
    }
  })

  test('un token vencido o repetido se rechaza (el widget pide uno nuevo)', async () => {
    const cf = mockCloudflare({ json: { success: false, 'error-codes': ['timeout-or-duplicate'] } })
    try {
      expect((await verifyTurnstile('usado', opts)).status).toBe('rejected')
    } finally {
      cf.restore()
    }
  })

  test('acepta los 3 sitios que renderizan el widget (www, recupera y agente)', async () => {
    for (const hostname of ['www.somossena.com', 'recupera.somossena.com', 'agente.somossena.com']) {
      const cf = mockCloudflare({ json: { ...ok, hostname } })
      try {
        expect((await verifyTurnstile('t', opts)).status, hostname).toBe('verified')
      } finally {
        cf.restore()
      }
    }
  })

  test('un token emitido para otro sitio se rechaza', async () => {
    const cf = mockCloudflare({ json: { ...ok, hostname: 'sitio-ajeno.example' } })
    try {
      expect((await verifyTurnstile('de-otro-sitio', opts)).status).toBe('rejected')
    } finally {
      cf.restore()
    }
  })

  test('un token de otra acción se rechaza', async () => {
    const cf = mockCloudflare({ json: { ...ok, action: 'login' } })
    try {
      expect((await verifyTurnstile('otra-accion', opts)).status).toBe('rejected')
    } finally {
      cf.restore()
    }
  })

  test('acepta el hostname extra de TURNSTILE_ALLOWED_HOSTNAMES (preview y CI)', async () => {
    process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'example.com, recupera.somossena.com'
    const cf = mockCloudflare({ json: { ...ok, hostname: 'example.com' } })
    try {
      expect((await verifyTurnstile('t', opts)).status).toBe('verified')
    } finally {
      cf.restore()
    }
  })

  test('un token absurdamente largo se rechaza sin llamar a Cloudflare', async () => {
    const cf = mockCloudflare({ json: ok })
    try {
      expect((await verifyTurnstile('x'.repeat(5000), opts)).status).toBe('rejected')
      expect(cf.calls).toHaveLength(0)
    } finally {
      cf.restore()
    }
  })

  test('con las claves de prueba de Cloudflare no exige acción (el servicio no la devuelve)', async () => {
    process.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'
    process.env.TURNSTILE_ALLOWED_HOSTNAMES = 'example.com'
    const cf = mockCloudflare({ json: { success: true, hostname: 'example.com', 'error-codes': [] } })
    try {
      expect((await verifyTurnstile('XXXX.DUMMY.TOKEN.XXXX', opts)).status).toBe('verified')
    } finally {
      cf.restore()
    }
  })

  test('con una clave real, una respuesta sin acción se rechaza', async () => {
    const cf = mockCloudflare({ json: { success: true, hostname: 'www.somossena.com', 'error-codes': [] } })
    try {
      expect((await verifyTurnstile('t', opts)).status).toBe('rejected')
    } finally {
      cf.restore()
    }
  })
})

test.describe('verifyTurnstile: política híbrida (no perder leads reales)', () => {
  test('sin token queda sin verificar y no llama a Cloudflare', async () => {
    const cf = mockCloudflare({ json: ok })
    try {
      for (const vacio of [undefined, '', '   ']) {
        expect(await verifyTurnstile(vacio, opts)).toEqual({ status: 'unverified', reason: 'missing_token' })
      }
      expect(cf.calls).toHaveLength(0)
    } finally {
      cf.restore()
    }
  })

  test('si Cloudflare no responde (red caída) queda sin verificar', async () => {
    const cf = mockCloudflare({ throws: true })
    try {
      expect(await verifyTurnstile('t', opts)).toEqual({
        status: 'unverified',
        reason: 'cloudflare_unreachable',
      })
    } finally {
      cf.restore()
    }
  })

  test('si Cloudflare responde 5xx o algo que no es JSON queda sin verificar', async () => {
    const cf = mockCloudflare({ status: 503, json: { message: 'caído' } })
    try {
      expect((await verifyTurnstile('t', opts)).status).toBe('unverified')
    } finally {
      cf.restore()
    }
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response('<html>error</html>', { status: 200 })) as typeof fetch
    try {
      expect((await verifyTurnstile('t', opts)).status).toBe('unverified')
    } finally {
      globalThis.fetch = original
    }
  })

  test('un internal-error de Cloudflare no se castiga: queda sin verificar', async () => {
    const cf = mockCloudflare({ json: { success: false, 'error-codes': ['internal-error'] } })
    try {
      expect((await verifyTurnstile('t', opts)).status).toBe('unverified')
    } finally {
      cf.restore()
    }
  })

  test('sin TURNSTILE_SECRET_KEY la verificación está desactivada (despliegue gradual)', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const cf = mockCloudflare({ json: ok })
    try {
      expect(await verifyTurnstile('lo-que-sea', opts)).toEqual({ status: 'disabled' })
      expect(cf.calls).toHaveLength(0)
    } finally {
      cf.restore()
    }
  })

  test('nunca lanza ni registra el token, la clave ni la IP', async () => {
    const cf = mockCloudflare({ throws: true })
    const logged: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => logged.push(args.map(String).join(' '))
    try {
      await verifyTurnstile('token-secreto-123', opts)
      const todo = logged.join('\n')
      for (const dato of ['token-secreto-123', 'secreto-de-prueba', '203.0.113.9'])
        expect(todo).not.toContain(dato)
    } finally {
      console.error = originalError
      cf.restore()
    }
  })
})

test.describe('turnstileTokenFrom', () => {
  test('lee cf-turnstile-response del cuerpo y descarta lo que no es texto', () => {
    expect(turnstileTokenFrom({ 'cf-turnstile-response': 'abc' })).toBe('abc')
    expect(turnstileTokenFrom({ 'cf-turnstile-response': 123 })).toBeUndefined()
    expect(turnstileTokenFrom({ 'cf-turnstile-response': { a: 1 } })).toBeUndefined()
    expect(turnstileTokenFrom({})).toBeUndefined()
    expect(turnstileTokenFrom(null)).toBeUndefined()
    expect(turnstileTokenFrom('texto')).toBeUndefined()
  })
})

test.describe('clientIp', () => {
  test('usa x-real-ip y no confía en x-forwarded-for, que el cliente puede falsear', () => {
    const h = new Headers({ 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })
    expect(clientIp(h)).toBe('198.51.100.7')
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1' }))).toBeUndefined()
  })
})

test.describe('allowUnverified: tope por IP para leads sin verificar', () => {
  test('permite 3 en la ventana y bloquea el cuarto; otra IP no se ve afectada', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 3; i++) expect(allowUnverified('198.51.100.1', t0 + i)).toBe(true)
    expect(allowUnverified('198.51.100.1', t0 + 10)).toBe(false)
    expect(allowUnverified('198.51.100.2', t0 + 10)).toBe(true)
  })

  test('pasada la ventana de 10 minutos vuelve a permitir', () => {
    const t0 = 5_000_000
    for (let i = 0; i < 3; i++) allowUnverified('198.51.100.3', t0 + i)
    expect(allowUnverified('198.51.100.3', t0 + 5)).toBe(false)
    expect(allowUnverified('198.51.100.3', t0 + 10 * 60 * 1000 + 100)).toBe(true)
  })

  test('sin IP conocida el tope se comparte bajo una misma clave (no se evade ocultando la IP)', () => {
    const t0 = 9_000_000
    for (let i = 0; i < 3; i++) expect(allowUnverified(undefined, t0 + i)).toBe(true)
    expect(allowUnverified(undefined, t0 + 10)).toBe(false)
  })
})

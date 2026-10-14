// Verificación server-side de Cloudflare Turnstile para las rutas públicas de lead.
//
// Política híbrida (un lead real no se debe perder):
// - Token inválido de forma explícita (falso, vencido, repetido, de otro sitio o acción) -> 'rejected' (403).
// - Token ausente o Cloudflare sin respuesta -> 'unverified': el lead se procesa igual, el aviso lleva
//   [SIN VERIFICAR], no se reporta a Meta CAPI y queda sujeto a un tope por IP.
// - Sin TURNSTILE_SECRET_KEY -> 'disabled': permite desplegar el código antes de crear el widget.
// El token solo se valida aquí, en el servidor. Nunca se registra el token, la clave ni la IP.

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 3000
const MAX_TOKEN_LENGTH = 2048
// Sitios donde se renderiza el widget: sena-landing (www), recupera-landing y agent-project-landing (Opera).
const DEFAULT_HOSTNAMES = [
  'www.somossena.com',
  'somossena.com',
  'recupera.somossena.com',
  'agente.somossena.com',
]
// Claves de prueba que publica Cloudflare (1x pasa, 2x falla, 3x token ya usado): su respuesta no trae acción.
const CLOUDFLARE_TEST_SECRET = /^[123]x0+AA$/

export type TurnstileResult =
  | { status: 'verified' }
  | { status: 'rejected'; reason: string }
  | { status: 'unverified'; reason: 'missing_token' | 'cloudflare_unreachable' | 'cloudflare_error' }
  | { status: 'disabled' }

export type VerifyOptions = {
  remoteIp?: string
  // acción con la que se renderiza el widget; debe coincidir con la que devuelve Cloudflare
  action: string
}

type Siteverify = { success?: boolean; hostname?: string; action?: string; 'error-codes'?: string[] }

export function turnstileTokenFrom(raw: unknown): string | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const v = (raw as Record<string, unknown>)['cf-turnstile-response']
  return typeof v === 'string' ? v : undefined
}

// x-real-ip lo fija la plataforma; x-forwarded-for puede traer valores que escribió el cliente.
export function clientIp(headers: Headers): string | undefined {
  return headers.get('x-real-ip')?.trim() || undefined
}

function allowedHostnames(): string[] {
  const extra = (process.env.TURNSTILE_ALLOWED_HOSTNAMES ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
  return [...DEFAULT_HOSTNAMES, ...extra]
}

export async function verifyTurnstile(
  token: string | undefined,
  opts: VerifyOptions
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { status: 'disabled' }

  const t = token?.trim()
  if (!t) return { status: 'unverified', reason: 'missing_token' }
  if (t.length > MAX_TOKEN_LENGTH) return { status: 'rejected', reason: 'token_invalid' }

  let data: Siteverify
  try {
    const body = new URLSearchParams({ secret, response: t })
    if (opts.remoteIp) body.set('remoteip', opts.remoteIp)
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error('[turnstile] Cloudflare respondió con estado', res.status)
      return { status: 'unverified', reason: 'cloudflare_error' }
    }
    data = (await res.json()) as Siteverify
  } catch (err) {
    // Solo el tipo de error: no registrar token, clave ni IP.
    console.error('[turnstile] no se pudo verificar:', err instanceof Error ? err.name : 'error')
    return { status: 'unverified', reason: 'cloudflare_unreachable' }
  }

  if (!data.success) {
    // Un fallo interno de Cloudflare no debe costar el lead.
    if (data['error-codes']?.includes('internal-error'))
      return { status: 'unverified', reason: 'cloudflare_error' }
    return { status: 'rejected', reason: (data['error-codes'] ?? []).join(',') || 'token_invalid' }
  }
  if (!data.hostname || !allowedHostnames().includes(data.hostname.toLowerCase())) {
    return { status: 'rejected', reason: 'hostname_mismatch' }
  }
  const sinAccion = !data.action && CLOUDFLARE_TEST_SECRET.test(secret)
  if (!sinAccion && data.action !== opts.action) return { status: 'rejected', reason: 'action_mismatch' }
  return { status: 'verified' }
}

// Tope para leads sin verificar. Es por instancia (en serverless no hay estado compartido): frena ráfagas
// desde una misma IP pero no reemplaza al límite del WAF de Vercel (task de límite por IP).
const UNVERIFIED_MAX = 3
const UNVERIFIED_WINDOW_MS = 10 * 60 * 1000
const UNKNOWN_IP = 'sin-ip'
const hits = new Map<string, number[]>()

export function allowUnverified(ip: string | undefined, now = Date.now()): boolean {
  const key = ip ?? UNKNOWN_IP
  const recent = (hits.get(key) ?? []).filter((t) => now - t < UNVERIFIED_WINDOW_MS)
  if (recent.length >= UNVERIFIED_MAX) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  // Evita que el mapa crezca sin límite en una instancia de larga vida.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= UNVERIFIED_WINDOW_MS)) hits.delete(k)
  }
  return true
}

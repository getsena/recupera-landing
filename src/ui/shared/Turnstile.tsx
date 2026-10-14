'use client'

// Widget de Cloudflare Turnstile para los formularios de lead.
//
// - Modo "interaction-only": es invisible salvo que Cloudflare necesite una interacción.
// - Nunca bloquea el envío: si el script no carga (bloqueador de anuncios, red corporativa) o no hay
//   clave pública, getToken() devuelve undefined y el formulario se envía igual. El servidor decide
//   qué hacer con un lead sin verificar (ver src/lib/lead/turnstile.ts).
// - El token es de un solo uso y dura 5 minutos: llamar a reset() después de cada envío fallido.

import { useCallback, useEffect, useRef, useState } from 'react'

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const DEFAULT_WAIT_MS = 4000

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('sin ventana'))
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('no cargó'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export type TurnstileControl = {
  attach: (el: HTMLDivElement | null) => void
  getToken: (timeoutMs?: number) => Promise<string | undefined>
  reset: () => void
}

export function useTurnstile(action = 'lead'): TurnstileControl {
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const widgetId = useRef<string | undefined>(undefined)
  const token = useRef<string | undefined>(undefined)
  // true cuando el script no cargó o el widget falló: getToken responde sin esperar (el envío no se retrasa).
  const failed = useRef(false)
  const waiters = useRef<Array<(t: string | undefined) => void>>([])

  const flush = useCallback((t: string | undefined) => {
    const pending = waiters.current
    waiters.current = []
    for (const resolve of pending) resolve(t)
  }, [])

  useEffect(() => {
    if (!SITE_KEY || !el) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return
        widgetId.current = window.turnstile.render(el, {
          sitekey: SITE_KEY,
          action,
          appearance: 'interaction-only',
          callback: (t: string) => {
            failed.current = false
            token.current = t
            flush(t)
          },
          'expired-callback': () => {
            token.current = undefined
          },
          'timeout-callback': () => {
            token.current = undefined
          },
          'error-callback': () => {
            failed.current = true
            token.current = undefined
            flush(undefined)
          },
          'unsupported-callback': () => {
            failed.current = true
            flush(undefined)
          },
        })
      })
      .catch(() => {
        failed.current = true
        flush(undefined)
      })
    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = undefined
      token.current = undefined
    }
  }, [el, action, flush])

  const getToken = useCallback((timeoutMs = DEFAULT_WAIT_MS) => {
    if (token.current) return Promise.resolve(token.current)
    if (!SITE_KEY || failed.current) return Promise.resolve(undefined)
    return new Promise<string | undefined>((resolve) => {
      const timer = setTimeout(() => resolve(undefined), timeoutMs)
      waiters.current.push((t) => {
        clearTimeout(timer)
        resolve(t)
      })
    })
  }, [])

  const reset = useCallback(() => {
    token.current = undefined
    if (widgetId.current) {
      // El widget pedirá un token nuevo: si antes había fallado, vuelve a esperarlo.
      failed.current = false
      window.turnstile?.reset(widgetId.current)
    }
  }, [])

  return { attach: setEl, getToken, reset }
}

// attach es un callback ref (setState), no un ref de React: se desestructura para no leerlo como ref en el render.
export function TurnstileWidget({ turnstile: { attach } }: { turnstile: TurnstileControl }) {
  if (!SITE_KEY) return null
  return <div ref={attach} data-testid="turnstile-widget" />
}

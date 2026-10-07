import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

import { test, expect } from '@playwright/test'

// completar_formulario de GA4 lo emite SOLO GTM, a partir del evento de dataLayer conversion_event_signup_2 de las
// páginas de gracias. Si el código también lo emite con gtag (sin send_to), el evento llega a todas las propiedades
// conectadas y se cuenta doble. Las conversiones de Google Ads (gtag 'conversion') no se tocan.
function sources(dir: string): { path: string; text: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|tsx)$/.test(name) ? [{ path: p, text: readFileSync(p, 'utf8') }] : []
  })
}

const GRACIAS: [string, string][] = [['src/ui/thankyou/ThankyouPage.tsx','recupera']]

test.describe('completar_formulario de GA4: una sola fuente', () => {
  test('el código no emite completar_formulario con gtag', () => {
    const emite = sources('src').filter((f) => /gtag\(\s*['"]event['"]\s*,\s*['"]completar_formulario['"]/.test(f.text))
    expect(emite.map((f) => f.path)).toEqual([])
  })

  for (const [path, origin] of GRACIAS) {
    test(`${path} avisa a GTM con conversion_event_signup_2 y origin ${origin}`, () => {
      const text = readFileSync(path, 'utf8')
      expect(text).toContain('conversion_event_signup_2')
      expect(text).toMatch(new RegExp(String.raw`origin:\s*['"]` + origin + `['"]`))
    })
  }
})

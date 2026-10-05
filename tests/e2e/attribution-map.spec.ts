import { test, expect } from '@playwright/test'

import { mapFuente, mapOrigen } from '@/lib/lead/attribution'

test.describe('mapOrigen', () => {
  test('gclid gana sobre cualquier utm_source', () => {
    expect(mapOrigen('facebook', 'abc', undefined)).toBe('Google')
  })

  test('fbclid indica Meta', () => {
    expect(mapOrigen(undefined, undefined, 'fb1')).toBe('Meta')
  })

  test('reconoce utm_source de Google, Meta y LinkedIn', () => {
    expect(mapOrigen('google')).toBe('Google')
    expect(mapOrigen('Facebook')).toBe('Meta')
    expect(mapOrigen('linkedin')).toBe('LinkedIn')
  })

  test('sin señales es Orgánico', () => {
    expect(mapOrigen()).toBe('Orgánico')
    expect(mapOrigen('newsletter')).toBe('Orgánico')
  })
})

test.describe('mapFuente', () => {
  test('sin señales es Orgánico', () => {
    expect(mapFuente({})).toBe('Orgánico')
  })

  test('con click id o utm_source es de pago', () => {
    expect(mapFuente({ gclid: 'x' })).not.toBe('Orgánico')
    expect(mapFuente({ fbclid: 'x' })).not.toBe('Orgánico')
    expect(mapFuente({ utmSource: 'google' })).not.toBe('Orgánico')
  })
})

import { test, expect } from '@playwright/test'

import { submitLead } from '@/lib/lead/submit'

const ok = async () => true
const rejects = async () => {
  throw new Error('caído')
}

test.describe('submitLead: el lead se conserva si falla uno de los dos destinos', () => {
  test('HubSpot y backend responden bien', async () => {
    expect(await submitLead({ saveCrm: ok, saveBackend: ok })).toEqual({ ok: true, crm: true, backend: true })
  })

  test('HubSpot falla (responde false) pero el backend guarda el lead: éxito', async () => {
    const r = await submitLead({ saveCrm: async () => false, saveBackend: ok })
    expect(r).toEqual({ ok: true, crm: false, backend: true })
  })

  test('HubSpot lanza una excepción y el backend guarda el lead: éxito', async () => {
    const r = await submitLead({ saveCrm: rejects, saveBackend: ok })
    expect(r.ok).toBe(true)
    expect(r.crm).toBe(false)
  })

  test('el backend falla pero HubSpot guardó el lead: éxito', async () => {
    const r = await submitLead({ saveCrm: ok, saveBackend: rejects })
    expect(r).toEqual({ ok: true, crm: true, backend: false })
  })

  test('si fallan los dos destinos, no hay éxito', async () => {
    const r = await submitLead({ saveCrm: rejects, saveBackend: async () => false })
    expect(r).toEqual({ ok: false, crm: false, backend: false })
  })

  test('intenta ambos destinos aunque el primero falle', async () => {
    let backendCalls = 0
    await submitLead({
      saveCrm: rejects,
      saveBackend: async () => {
        backendCalls += 1
        return true
      },
    })
    expect(backendCalls).toBe(1)
  })
})

test.describe('submitLead: tope de tiempo por destino', () => {
  const hangs = () => new Promise<boolean>(() => {})

  test('un destino colgado cuenta como fallo y el otro conserva el lead', async () => {
    const r = await submitLead({ saveCrm: hangs, saveBackend: ok, timeoutMs: 50 })
    expect(r).toEqual({ ok: true, crm: false, backend: true })
  })

  test('si ambos destinos se cuelgan, termina sin éxito', async () => {
    const r = await submitLead({ saveCrm: hangs, saveBackend: hangs, timeoutMs: 50 })
    expect(r).toEqual({ ok: false, crm: false, backend: false })
  })

  test('un destino lento pero dentro del tope sigue contando', async () => {
    const slow = () => new Promise<boolean>((res) => setTimeout(() => res(true), 20))
    const r = await submitLead({ saveCrm: slow, saveBackend: ok, timeoutMs: 500 })
    expect(r).toEqual({ ok: true, crm: true, backend: true })
  })
})


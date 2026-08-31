import { describe, expect, it, vi } from 'vitest'
import { createEmergencyContact } from '../src/generated/xforge'

describe('generated client sends a body', () => {
  it('POSTs the payload', async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal('fetch', spy)

    await createEmergencyContact('33333333-3333-4333-8333-333333333333', {
      name: 'Siti',
      phone: '+60 12-345 6789',
      relationship: 'Spouse',
    })

    const call = spy.mock.calls[0] as unknown as [string, RequestInit]
    const [url, init] = call
    expect(url).toContain('/api/v1/employees/')
    expect(init.method).toBe('POST')
    expect(init.body).toBeDefined()
    expect(JSON.parse(String(init.body))).toMatchObject({ name: 'Siti' })

    // Regression guard: fetch comma-joins duplicate headers, and
    // 'application/json, application/json' is not a valid media type -- the
    // server then parses no body and every POST fails validation.
    const ct = new Headers(init.headers).get('content-type')
    expect(ct).toBe('application/json')
  })
})

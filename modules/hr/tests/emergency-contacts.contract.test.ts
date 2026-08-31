/**
 * Contract tests -- real HTTP requests through the real app.
 *
 * This is the spine's end-to-end proof: contract -> adapter -> policy ->
 * handler -> repository -> chokepoint. Nothing is stubbed except the database
 * driver, and the driver seam is itself part of the architecture (ADR-003:
 * every access goes through withTenant, whatever is underneath).
 */

import { createApp } from '@xforge/api'
import { type Driver, setDriver, type TenantClient } from '@xforge/db'
import type { Principal } from '@xforge/policy'
import { beforeEach, describe, expect, it } from 'vitest'
import { __resetHrStore, hrModuleRoutes } from '../index'

const TENANT = '11111111-1111-4111-8111-111111111111'
const OTHER_TENANT = '22222222-2222-4222-8222-222222222222'
const EMPLOYEE = '33333333-3333-4333-8333-333333333333'
const CONTACT = '44444444-4444-4444-8444-444444444444'

/**
 * In-memory driver.
 *
 * It records the tenant each transaction ran under, so the tests can assert the
 * chokepoint was actually used rather than trusting that it was.
 */
const tenantsSeen: string[] = []
const noSql = (() => {
  throw new Error('no SQL client in the test driver')
}) as unknown as TenantClient

const driver: Driver = {
  async transactionWithTenant(tenantId, fn) {
    tenantsSeen.push(tenantId)
    return fn(noSql)
  },
  async transactionAsPlatform(fn) {
    tenantsSeen.push('__platform__')
    return fn(noSql)
  },
}
setDriver(driver)

const _app = createApp(hrModuleRoutes)

/** Build a request with an explicitly bound tenant (ADR-015). */
function req(
  path: string,
  init: RequestInit = {},
  principal: Principal | null = {
    id: 'u1',
    kind: 'user',
    tenantId: TENANT,
    grants: [
      { permission: 'hr.employee.read', scopeType: 'tenant', scopeId: TENANT },
      { permission: 'hr.employee.update', scopeType: 'tenant', scopeId: TENANT },
    ],
  },
) {
  // Middleware must be passed to createApp, not added afterwards: Hono applies
  // middleware only to routes registered AFTER it, so `app.use()` on a built app
  // silently does nothing. The first draft of this test did exactly that and
  // every request 401'd -- which is how the AppOptions seam came to exist.
  const wrapped = createApp(hrModuleRoutes, {
    middleware: [
      async (c, next) => {
        if (principal) c.set('principal', principal)
        c.set('asOf', '2026-08-31T00:00:00.000Z')
        c.set('newId', CONTACT)
        await next()
      },
    ],
  })
  return wrapped.request(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
}

beforeEach(() => {
  __resetHrStore()
  tenantsSeen.length = 0
})

describe('authorisation (ADR-014)', () => {
  it('401 when there is no principal', async () => {
    const res = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {}, null)
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type')).toContain('application/problem+json')
  })

  it('403 when the principal lacks the declared permission', async () => {
    const res = await req(
      `/v1/employees/${EMPLOYEE}/emergency-contacts`,
      {},
      {
        id: 'u2',
        kind: 'user',
        tenantId: TENANT,
        grants: [],
      },
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.detail).toMatch(/hr\.employee\.read/)
  })

  it('403 when the grant belongs to a different tenant', async () => {
    const res = await req(
      `/v1/employees/${EMPLOYEE}/emergency-contacts`,
      {},
      {
        id: 'u3',
        kind: 'user',
        tenantId: TENANT,
        grants: [{ permission: 'hr.employee.read', scopeType: 'tenant', scopeId: OTHER_TENANT }],
      },
    )
    expect(res.status).toBe(403)
  })
})

describe('the vertical slice', () => {
  it('lists an empty collection before anything exists', async () => {
    const res = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [] })
  })

  it('creates, then lists', async () => {
    const created = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Siti', relationship: 'Spouse', phone: '+60 12-345 6789' }),
    })
    expect(created.status).toBe(201)
    const contact = await created.json()
    expect(contact).toMatchObject({ name: 'Siti', version: 1 })

    const listed = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`)
    const body = await listed.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].name).toBe('Siti')
  })

  it('every database access went through withTenant, bound to the request tenant', async () => {
    await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`)
    expect(tenantsSeen).toEqual([TENANT])
    expect(tenantsSeen).not.toContain('__platform__')
  })
})

describe('optimistic concurrency (ADR-013)', () => {
  it('updates when the version matches', async () => {
    await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Siti', relationship: 'Spouse', phone: '+60 12-345 6789' }),
    })

    const res = await req(`/v1/emergency-contacts/${CONTACT}`, {
      method: 'PATCH',
      body: JSON.stringify({ phone: '+60 19-999 9999', version: 1 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.phone).toBe('+60 19-999 9999')
    expect(body.version).toBe(2) // version advances so the next stale write is caught
  })

  it('REJECTS a stale write with 409 rather than merging it', async () => {
    await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Siti', relationship: 'Spouse', phone: '+60 12-345 6789' }),
    })

    // Admin A saves first and wins.
    await req(`/v1/emergency-contacts/${CONTACT}`, {
      method: 'PATCH',
      body: JSON.stringify({ phone: '+60 11-111 1111', version: 1 }),
    })

    // Admin B saves second, still holding version 1 from their earlier read.
    // Last-write-wins would silently discard A's change -- and when the field is
    // a bank account, nobody finds out until payday.
    const stale = await req(`/v1/emergency-contacts/${CONTACT}`, {
      method: 'PATCH',
      body: JSON.stringify({ phone: '+60 22-222 2222', version: 1 }),
    })
    expect(stale.status).toBe(409)
    const problem = await stale.json()
    expect(problem.title).toBe('Version conflict')
    expect(problem.detail).toMatch(/current version 2/)

    // A's change survived.
    const listed = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`)
    const body = await listed.json()
    expect(body.items[0].phone).toBe('+60 11-111 1111')
  })

  it('404 for a contact that does not exist', async () => {
    const res = await req(`/v1/emergency-contacts/${CONTACT}`, {
      method: 'PATCH',
      body: JSON.stringify({ phone: '+60 12-000 0000', version: 1 }),
    })
    expect(res.status).toBe(404)
  })
})

describe('boundary hardening (architecture-final.md 6.4)', () => {
  it('rejects a body that violates the schema', async () => {
    const res = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      method: 'POST',
      body: JSON.stringify({ name: '', relationship: 'Spouse', phone: '+60 12-345 6789' }),
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('rejects malformed JSON rather than crashing', async () => {
    const res = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      method: 'POST',
      body: '{not json',
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('rejects an update with no version token', async () => {
    const res = await req(`/v1/emergency-contacts/${CONTACT}`, {
      method: 'PATCH',
      body: JSON.stringify({ phone: '+60 12-000 0000' }),
    })
    // The contract marks version required, so this never reaches the handler.
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})

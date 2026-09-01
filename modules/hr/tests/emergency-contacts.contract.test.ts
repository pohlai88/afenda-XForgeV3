/**
 * Contract tests -- real HTTP requests through the real app, against a REAL
 * PostgreSQL as the non-owner `app_user` role.
 *
 * Nothing is stubbed. That is the point of tenancy slice 1: the application
 * path and the security-test path must be the SAME path. While the repository
 * was in-memory, this suite proved the contract and the handler and told us
 * nothing about the boundary those handlers actually run behind -- and a suite
 * that proves a path nothing runs is convincing in exactly the wrong way.
 *
 * The tenant context is built here the way the composition root builds it:
 * candidate from host, membership check, VerifiedTenantContext. A test cannot
 * fabricate one, because nothing outside packages/tenancy can (ADR-022).
 */

import { createApp } from '@xforge/api'
import {
  type Driver,
  hasActiveMembership,
  resolveHostname,
  setDriver,
  tenancyDriver,
} from '@xforge/db'
import { createPostgresDriver } from '@xforge/db/postgres'
import { EMPLOYEE } from '@xforge/fixtures/employee'
import { appUrl, ownerUrl } from '@xforge/fixtures/local-database'
import { HOST_A, seedTenancy, TENANT_A, TENANT_B } from '@xforge/fixtures/tenancy'
import type { Principal } from '@xforge/policy'
import { type MembershipQueries, resolveRequestTenant } from '@xforge/tenancy'
import postgres from 'postgres'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { hrModuleRoutes } from '../index'

// Derived, not restated. The owner is @xforge/fixtures/tenancy.
const TENANT = TENANT_A
const OTHER_TENANT = TENANT_B
/**
 * The contact row this suite creates, at an id it chooses rather than one the
 * server invents, so the version-conflict cases can address it directly.
 *
 * DISTINCT FROM EVERY EMPLOYEE ID ON PURPOSE. This was 44444444, which is also
 * the employee `e2e/conformance-harness.spec.ts` deliberately uses to avoid
 * sharing state with the emergency-contacts specs. One literal, two unrelated
 * facts, agreeing by coincidence -- and a shared spelling is exactly what
 * invites someone to consolidate them later, coupling a contact row to an
 * employee for no reason either file records.
 */
const CONTACT = '77777777-7777-4777-8777-777777777777'

/** Reachability is probed at MODULE scope: describe.skipIf runs at collection. */
let owner!: ReturnType<typeof postgres>
let pg!: ReturnType<typeof createPostgresDriver>
let reachable = false

try {
  owner = postgres(ownerUrl(), { connect_timeout: 5, max: 2, prepare: false })
  await owner`select 1`
  pg = createPostgresDriver(appUrl())
  reachable = true
} catch {
  reachable = false
}

/**
 * A decorator over the REAL driver, so the suite can assert the chokepoint was
 * used rather than trusting that it was. It records and delegates -- it does
 * not substitute, which would put us back on a path nothing runs.
 */
const tenantsSeen: string[] = []
if (reachable) {
  const recording: Driver = {
    transactionAsPlatform(fn) {
      tenantsSeen.push('__platform__')
      return pg.transactionAsPlatform(fn)
    },
    transactionWithTenant(tenantId, fn) {
      tenantsSeen.push(tenantId)
      return pg.transactionWithTenant(tenantId, fn)
    },
  }
  setDriver(recording)
}

const queries: MembershipQueries = {
  hasActiveMembership: (tenantId, principalId, asOf) =>
    hasActiveMembership(tenancyDriver(), tenantId, principalId, asOf),
  resolveHostname: (hostname) => resolveHostname(tenancyDriver(), hostname),
}

afterAll(async () => {
  if (!reachable) {
    return
  }
  await owner.end({ timeout: 5 })
  await pg.close()
})

/** Build a request with an explicitly bound tenant (ADR-015). */
function req(
  path: string,
  init: RequestInit = {},
  principal: Principal | null = {
    grants: [
      { permission: 'hr.employee.read', scopeId: TENANT, scopeType: 'tenant' },
      { permission: 'hr.employee.update', scopeId: TENANT, scopeType: 'tenant' },
    ],
    id: 'u1',
    kind: 'user',
  },
) {
  // Middleware must be passed to createApp, not added afterwards: Hono applies
  // middleware only to routes registered AFTER it, so `app.use()` on a built app
  // silently does nothing. The first draft of this test did exactly that and
  // every request 401'd -- which is how the AppOptions seam came to exist.
  const wrapped = createApp(hrModuleRoutes, {
    middleware: [
      async (c, next) => {
        if (principal) {
          // Exactly the composition root's sequence: hostname -> candidate ->
          // membership -> verified context (ADR-022).
          const resolved = await resolveRequestTenant(HOST_A, principal, queries, new Date())
          if (resolved.kind === 'verified') {
            c.set('tenant', resolved.context)
          }
          c.set('principal', principal)
        }
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

beforeEach(async () => {
  if (!reachable) {
    return
  }
  await seedTenancy(owner, [
    { principalId: 'u1', tenantId: TENANT },
    { principalId: 'u2', tenantId: TENANT },
    { principalId: 'u3', tenantId: TENANT },
  ])
  // Scoped by a WHERE clause, not by RLS.
  //
  // The previous version set a tenant context and issued a context-free DELETE,
  // on the stated grounds that FORCE RLS would confine it. It does not: this
  // connection is `postgres`, and `rolsuper`/`rolbypassrls` are both true --
  // checked against the live database, not inferred. A superuser bypasses row
  // security unconditionally, and FORCE only subjects the table OWNER. So the
  // loop deleted every tenant every time, and would have wiped any other
  // suite's rows too.
  //
  // tests/fixtures/tenancy.ts records fixing exactly this once already, in its
  // own seeding. The same false assumption survived here in a second file --
  // one fact, two homes, agreeing until they did not.
  for (const tenant of [TENANT, OTHER_TENANT]) {
    await owner`delete from emergency_contact where tenant_id = ${tenant}`
  }
  tenantsSeen.length = 0
})

describe.skipIf(!reachable)('authorisation (ADR-014)', () => {
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
        grants: [],
        id: 'u2',
        kind: 'user',
      },
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    // FLAT OUTSIDE. Naming the missing permission tells a caller exactly which
    // grant to go phishing for, and confirms the resource was there to protect.
    expect(body.detail).toBe('you do not have access to this operation')
    expect(JSON.stringify(body)).not.toMatch(/hr\.employee\.read/)
  })

  it('403 when the grant belongs to a different tenant', async () => {
    const res = await req(
      `/v1/employees/${EMPLOYEE}/emergency-contacts`,
      {},
      {
        grants: [{ permission: 'hr.employee.read', scopeId: OTHER_TENANT, scopeType: 'tenant' }],
        id: 'u3',
        kind: 'user',
      },
    )
    expect(res.status).toBe(403)
  })
})

describe.skipIf(!reachable)('the vertical slice', () => {
  /**
   * An empty collection is COMPLETE, and says so.
   *
   * The marker is present on every response, not only when something is
   * degraded -- a client that only ever sees it on the unhappy path is one that
   * never learned to look. `toEqual` rather than `toMatchObject`, so a future
   * field cannot appear here unnoticed.
   */
  it('lists an empty collection, stated as complete, before anything exists', async () => {
    const res = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [], meta: { completeness: 'complete' } })
  })

  it('creates, then lists', async () => {
    const created = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      body: JSON.stringify({ name: 'Siti', phone: '+60 12-345 6789', relationship: 'Spouse' }),
      method: 'POST',
    })
    expect(created.status).toBe(201)
    const contact = await created.json()
    expect(contact).toMatchObject({ name: 'Siti', version: 1 })

    const listed = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`)
    const body = await listed.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].name).toBe('Siti')

    // A short list is complete and carries no reasons. The invariant is in the
    // schema; this asserts the handler actually satisfies it on a real response
    // rather than only in a unit test of the schema.
    expect(body.meta).toEqual({ completeness: 'complete' })
  })

  it('the ADR-022 chain runs in order, and never touches another tenant', async () => {
    await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`)

    // Three database transactions, in this order, per request:
    //
    //   __platform__  the hostname lookup. Routing metadata only -- no tenant
    //                 is bound yet because this is the step that finds one. It
    //                 is not withPlatformAccess and writes no audit row: an
    //                 audit trail where nearly every entry is a routine page
    //                 load is one nobody reads.
    //   TENANT        the membership check, bound to the CANDIDATE tenant so
    //                 RLS confines it to that tenant's membership rows.
    //   TENANT        the business query, bound to the now-verified tenant.
    expect(tenantsSeen).toEqual(['__platform__', TENANT, TENANT])
    expect(tenantsSeen).not.toContain(OTHER_TENANT)
  })
})

describe.skipIf(!reachable)('optimistic concurrency (ADR-013)', () => {
  it('updates when the version matches', async () => {
    await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      body: JSON.stringify({ name: 'Siti', phone: '+60 12-345 6789', relationship: 'Spouse' }),
      method: 'POST',
    })

    const res = await req(`/v1/emergency-contacts/${CONTACT}`, {
      body: JSON.stringify({ phone: '+60 19-999 9999', version: 1 }),
      method: 'PATCH',
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.phone).toBe('+60 19-999 9999')
    expect(body.version).toBe(2) // version advances so the next stale write is caught
  })

  it('REJECTS a stale write with 409 rather than merging it', async () => {
    await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      body: JSON.stringify({ name: 'Siti', phone: '+60 12-345 6789', relationship: 'Spouse' }),
      method: 'POST',
    })

    // Admin A saves first and wins.
    await req(`/v1/emergency-contacts/${CONTACT}`, {
      body: JSON.stringify({ phone: '+60 11-111 1111', version: 1 }),
      method: 'PATCH',
    })

    // Admin B saves second, still holding version 1 from their earlier read.
    // Last-write-wins would silently discard A's change -- and when the field is
    // a bank account, nobody finds out until payday.
    const stale = await req(`/v1/emergency-contacts/${CONTACT}`, {
      body: JSON.stringify({ phone: '+60 22-222 2222', version: 1 }),
      method: 'PATCH',
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
      body: JSON.stringify({ phone: '+60 12-000 0000', version: 1 }),
      method: 'PATCH',
    })
    expect(res.status).toBe(404)
  })
})

describe('boundary hardening (architecture-final.md 6.4)', () => {
  it('rejects a body that violates the schema', async () => {
    const res = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      body: JSON.stringify({ name: '', phone: '+60 12-345 6789', relationship: 'Spouse' }),
      method: 'POST',
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('rejects malformed JSON rather than crashing', async () => {
    const res = await req(`/v1/employees/${EMPLOYEE}/emergency-contacts`, {
      body: '{not json',
      method: 'POST',
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('rejects an update with no version token', async () => {
    const res = await req(`/v1/emergency-contacts/${CONTACT}`, {
      body: JSON.stringify({ phone: '+60 12-000 0000' }),
      method: 'PATCH',
    })
    // The contract marks version required, so this never reaches the handler.
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })
})

/**
 * T11 / MUTATION B -- break the policy, and the proof must break with it.
 *
 * T02 asserts that deleting the application predicate changes nothing. That is
 * only meaningful if T02 would NOTICE the boundary disappearing. A suite can
 * pass for the wrong reason -- pooling, an accidental filter, a fixture that
 * seeded one tenant -- and then it is testing nothing while looking green.
 *
 * So this deliberately disables row-level security and requires isolation to
 * FAIL. If the tenants stayed separate here, T02's success would prove nothing
 * about RLS.
 *
 * The two together are the actual claim:
 *
 *   application predicate  =  correctness, query plans, defence in depth
 *   FORCE ROW LEVEL SECURITY  =  the security boundary
 */
import { withTenant } from '@xforge/db'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeAll, contextFor, owner, reachable, seed, TENANT_A } from './harness'

beforeAll(async () => {
  if (reachable) await seed()
})
afterAll(closeAll)

const rowsVisibleToA = () =>
  withTenant(contextA, async (sql) => {
    const r = await sql<{ id: string }>`select id from emergency_contact`
    return [...r]
  })

let contextA!: Awaited<ReturnType<typeof contextFor>>

describe.skipIf(!reachable)('T11 -- the boundary is RLS, and it is load-bearing', () => {
  beforeAll(async () => {
    contextA = await contextFor(TENANT_A)
  })

  it('with RLS intact, tenant A sees exactly one row', async () => {
    expect(await rowsVisibleToA()).toHaveLength(1)
  })

  it('DISABLING row-level security makes both tenants visible', async () => {
    try {
      await owner`alter table emergency_contact disable row level security`
      const leaked = await rowsVisibleToA()
      // The mutation must be DETECTED. If this stayed at 1, T02 was passing for
      // some reason other than the one claimed.
      expect(leaked.length).toBeGreaterThan(1)
    } finally {
      await owner`alter table emergency_contact enable row level security`
      await owner`alter table emergency_contact force row level security`
    }
  })

  it('and the enumeration check would have failed while it was off', async () => {
    // AQS-005 asks the catalogue, not a maintained list. Prove it is sensitive
    // to the same mutation rather than trusting that it is.
    let off: { relrowsecurity: boolean }[] = []
    try {
      await owner`alter table emergency_contact disable row level security`
      // AWAITED inside the try. postgres.js queries are lazy, so returning one
      // and restoring in `finally` would run the ALTER first and read the
      // restored state -- a test that passes by measuring the wrong moment.
      off = [
        ...(await owner<{ relrowsecurity: boolean }[]>`
          select relrowsecurity from pg_class where relname = 'emergency_contact'
        `),
      ]
    } finally {
      await owner`alter table emergency_contact enable row level security`
      await owner`alter table emergency_contact force row level security`
    }
    expect(off[0]?.relrowsecurity).toBe(false)
  })

  it('restores enabled AND forced, so the rest of the suite is honest', async () => {
    const state = await owner<{ relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
      select relrowsecurity, relforcerowsecurity
      from pg_class where relname = 'emergency_contact'
    `
    expect(state[0]?.relrowsecurity).toBe(true)
    expect(state[0]?.relforcerowsecurity).toBe(true)
  })

  it('and isolation holds again', async () => {
    expect(await rowsVisibleToA()).toHaveLength(1)
  })
})

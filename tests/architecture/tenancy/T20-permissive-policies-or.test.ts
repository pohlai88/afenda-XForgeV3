/**
 * T20 -- permissive policies combine with OR, so adding one WIDENS access.
 *
 * This is the pitfall most likely to bite us next, because it looks like the
 * opposite of what it is. Adding a policy reads as adding a restriction. In
 * PostgreSQL a row is visible if ANY permissive policy allows it, so a second
 * policy can only ever grant more.
 *
 * We came within one design decision of this: a "principal may read their own
 * memberships" policy alongside tenant isolation on `tenant_membership` would
 * have quietly turned that table into a legitimate cross-tenant read.
 *
 * So the hazard is proven executably rather than trusted to memory, and the
 * suite precondition now pins the exact policy SET -- because a leftover
 * permissive policy widens access while every RLS flag still reads as healthy.
 */
import { withTenant } from '@xforge/db'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  A_ROW,
  assertBoundaryIntact,
  closeAll,
  contextFor,
  owner,
  reachable,
  seed,
  TENANT_A,
} from './harness'

beforeAll(async () => {
  if (reachable) await seed()
})

const visibleToA = async () =>
  withTenant(await contextFor(TENANT_A), async (sql) => [
    ...(await sql<{ id: string }>`select id from emergency_contact`),
  ])

describe.skipIf(!reachable)('T20 -- a second permissive policy grants, never restricts', () => {
  it('isolation holds with the single expected policy', async () => {
    expect((await visibleToA()).map((r) => r.id)).toEqual([A_ROW])
  })

  it('adding a permissive policy exposes every tenant', async () => {
    try {
      await owner`
        create policy "t20_widening" on emergency_contact
        as permissive for select to app_user using (true)
      `
      const rows = await visibleToA()
      // Two policies, OR'd. The isolation policy did not stop applying -- the
      // new one simply also allows, and allowing wins.
      expect(rows.length).toBeGreaterThan(1)
    } finally {
      await owner`drop policy if exists "t20_widening" on emergency_contact`
    }
  })

  it('and dropping it restores isolation', async () => {
    expect((await visibleToA()).map((r) => r.id)).toEqual([A_ROW])
  })

  afterAll(async () => {
    if (!reachable) return
    await owner`drop policy if exists "t20_widening" on emergency_contact`
    await assertBoundaryIntact()
    await closeAll()
  })
})

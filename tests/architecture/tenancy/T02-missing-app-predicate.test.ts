/**
 * T02 / MUTATION A -- the application forgets its tenant predicate.
 *
 * This is the case the whole phase exists for. The repository writes
 * `where tenant_id = $1` on every statement, and that predicate is defence in
 * depth and an index hint -- it is NOT the security boundary. If it were, then
 * one day an agent (or a person) writes the same query without it, every test
 * still passes, and customer data crosses.
 *
 * So this test deliberately makes that exact mistake, ON THE PRODUCTION
 * CONNECTION PATH: the same `withTenant`, the same non-owner `app_user`, the
 * same transaction-local `SET LOCAL app.tenant_id`. Only the query text is
 * mutated. Isolation must hold anyway, because PostgreSQL is holding it.
 *
 * If this test ever fails, the architecture's central claim is false and the
 * tenant predicate has been carrying the boundary all along.
 */
import { withTenant } from '@xforge/db'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { A_ROW, B_ROW, closeAll, contextFor, reachable, seed, TENANT_A, TENANT_B } from './harness'

beforeAll(async () => {
  if (reachable) {
    await seed()
  }
})
afterAll(closeAll)

describe.skipIf(!reachable)('T02 -- RLS carries the boundary, not the WHERE clause', () => {
  it('a SELECT with NO tenant predicate returns only the bound tenant', async () => {
    const ctx = await contextFor(TENANT_A)
    const rows = await withTenant(ctx, async (sql) => {
      // The mutation. A developer or an agent writes this eventually.
      const r = await sql<{ id: string; tenant_id: string }>`
        select id, tenant_id from emergency_contact
      `
      return [...r]
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe(A_ROW)
    expect(rows.map((r) => r.tenant_id)).not.toContain(TENANT_B)
  })

  it('an UPDATE with no tenant predicate cannot reach another tenant', async () => {
    const ctx = await contextFor(TENANT_A)
    const changed = await withTenant(ctx, async (sql) => {
      const r = await sql<{ id: string }>`
        update emergency_contact set phone = '+60 99-999 9999'
        returning id
      `
      return [...r]
    })
    expect(changed.map((r) => r.id)).toEqual([A_ROW])

    // And B is untouched, checked from B's own context.
    const bees = await withTenant(await contextFor(TENANT_B), async (sql) => {
      const r = await sql<{ id: string; phone: string }>`select id, phone from emergency_contact`
      return [...r]
    })
    expect(bees).toHaveLength(1)
    expect(bees[0]?.id).toBe(B_ROW)
    expect(bees[0]?.phone).not.toBe('+60 99-999 9999')
  })

  it('a DELETE with no tenant predicate cannot reach another tenant', async () => {
    const ctx = await contextFor(TENANT_A)
    const deleted = await withTenant(ctx, async (sql) => {
      const r = await sql<{ id: string }>`delete from emergency_contact returning id`
      return [...r]
    })
    expect(deleted.map((r) => r.id)).toEqual([A_ROW])

    const survivors = await withTenant(await contextFor(TENANT_B), async (sql) => {
      const r = await sql<{ id: string }>`select id from emergency_contact`
      return [...r]
    })
    expect(survivors.map((r) => r.id)).toEqual([B_ROW])
  })
})

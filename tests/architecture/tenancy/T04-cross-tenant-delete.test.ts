/**
 * T04 -- tenant A deletes tenant B.
 *
 * Written from the matrix entry, not from the code: the claim is that A cannot
 * delete B's row, and nothing in it mentions an HR delete operation. This case
 * was filed as "blocked on product scope" for two sessions, which had the
 * dependency backwards -- exposing `DELETE /employees/:id` so an architecture
 * test could call it would add product surface to satisfy a test.
 *
 * The claim is about the database boundary, so it is asserted there, on the
 * application role through the sanctioned chokepoint.
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

describe.skipIf(!reachable)('T04 -- cross-tenant delete is denied', () => {
  it("A's delete of B's row by id removes nothing", async () => {
    const deleted = await withTenant(await contextFor(TENANT_A), async (sql) => [
      ...(await sql<{ id: string }>`
        delete from emergency_contact where id = ${B_ROW} returning id
      `),
    ])
    // Not an error -- INVISIBLE. Under RLS the row does not exist for this
    // transaction, so the statement succeeds and affects nothing. An attacker
    // learns only that they deleted nothing of their own.
    expect(deleted).toEqual([])
  })

  it("and B's row is still there, checked from B's own context", async () => {
    const rows = await withTenant(await contextFor(TENANT_B), async (sql) => [
      ...(await sql<{ id: string }>`select id from emergency_contact`),
    ])
    expect(rows.map((r) => r.id)).toEqual([B_ROW])
  })

  it('while A can delete its OWN row, so the assertion above means something', async () => {
    const deleted = await withTenant(await contextFor(TENANT_A), async (sql) => [
      ...(await sql<{ id: string }>`
        delete from emergency_contact where id = ${A_ROW} returning id
      `),
    ])
    expect(deleted.map((r) => r.id)).toEqual([A_ROW])
  })
})

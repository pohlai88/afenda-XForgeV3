/**
 * T01 -- tenant A reads tenant B by id.
 *
 * Through the SHIPPED repository, not a query written for the test.
 */
import * as repo from '@xforge/hr/repository'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { A_ROW, B_ROW, closeAll, contextFor, EMPLOYEE, reachable, seed, TENANT_A } from './harness'

beforeAll(async () => {
  if (reachable) {
    await seed()
  }
})
afterAll(closeAll)

describe.skipIf(!reachable)('T01 -- cross-tenant read is denied', () => {
  it('tenant A lists only its own rows', async () => {
    const { rows } = await repo.listByEmployee(await contextFor(TENANT_A), EMPLOYEE)
    expect(rows.map((r) => r.id)).toEqual([A_ROW])
    expect(rows.map((r) => r.id)).not.toContain(B_ROW)
  })

  it("tenant A cannot see tenant B's row even asking for it by id", async () => {
    const ctx = await contextFor(TENANT_A)
    const found = await repo.update(ctx, B_ROW, { phone: '+60 00-000 0000', version: 1 })
    // Not "forbidden" -- INVISIBLE. Under RLS the row does not exist for this
    // transaction, which is the stronger outcome: nothing leaks through the
    // difference between 403 and 404.
    expect(found.kind).toBe('not-found')
  })
})

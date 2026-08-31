/**
 * T05 -- an INSERT claiming another tenant.
 *
 * This one proves the WITH CHECK half of the policy, which is separately
 * forgettable: a policy with only USING governs what is VISIBLE and permits a
 * spoofed-tenant write. The row would then be invisible to its author and fully
 * visible to the victim.
 */
import { withTenant } from '@xforge/db'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { closeAll, contextFor, EMPLOYEE, reachable, seed, TENANT_A, TENANT_B } from './harness'

beforeAll(async () => {
  if (reachable) await seed()
})
afterAll(closeAll)

describe.skipIf(!reachable)('T05 -- an insert cannot spoof another tenant', () => {
  it('bound to A, inserting a row labelled B is refused', async () => {
    const ctx = await contextFor(TENANT_A)
    await expect(
      withTenant(ctx, async (sql) => {
        await sql`
          insert into emergency_contact (tenant_id, employee_id, name, relationship, phone)
          values (${TENANT_B}, ${EMPLOYEE}, 'Planted', 'Other', '+60 13-000 0000')
        `
      }),
    ).rejects.toThrow(/row-level security|policy/i)
  })

  it('and nothing was planted in B', async () => {
    const rows = await withTenant(await contextFor(TENANT_B), async (sql) => {
      const r = await sql<{ name: string }>`select name from emergency_contact`
      return [...r]
    })
    expect(rows.map((r) => r.name)).not.toContain('Planted')
  })
})

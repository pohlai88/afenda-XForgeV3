/**
 * T07 -- the case ADR-022 exists for.
 *
 * Jack belongs to tenant A and tenant B. He has `a.xforge.app` open in one tab
 * and `b.xforge.app` in another. He switches tenant in the second tab.
 *
 * With a mutable `session.activeTenantId` as the authority, the first tab's
 * security context changes underneath him. Nothing errors. The page simply
 * starts reading another tenant's data, and there is no reason for anyone to
 * notice.
 *
 *   Host selects.  Membership authorises.  Session identifies.
 *
 * So the navigation preference is passed here and must have no effect
 * whatsoever -- the resolver's signature does not even accept it, which is the
 * strongest form the proof can take.
 */
import * as repo from '@xforge/hr/repository'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  A_ROW,
  B_ROW,
  closeAll,
  EMPLOYEE,
  HOST_A,
  HOST_B,
  MEMBER_OF_BOTH,
  reachable,
  resolveFor,
  seed,
  TENANT_A,
  TENANT_B,
} from './harness'

beforeAll(async () => {
  if (reachable) {
    await seed()
  }
})
afterAll(closeAll)

/** What a session may legitimately carry: identity, and a UX preference. */
const session = { activeTenantId: TENANT_B, principalId: MEMBER_OF_BOTH }

describe.skipIf(!reachable)('T07 -- host decides, whatever the session prefers', () => {
  it("at A's host the context is A, even though the preference says B", async () => {
    const resolved = await resolveFor(HOST_A, session.principalId)
    expect(resolved.kind).toBe('verified')
    expect(resolved).toMatchObject({ context: { tenantId: TENANT_A } })
    expect(session.activeTenantId).toBe(TENANT_B) // unchanged, and irrelevant
  })

  it('and the HR repository sees only A', async () => {
    const resolved = await resolveFor(HOST_A, session.principalId)
    if (resolved.kind !== 'verified') {
      throw new Error('fixture failed')
    }
    const rows = await repo.listByEmployee(resolved.context, EMPLOYEE)
    expect(rows.map((r) => r.id)).toEqual([A_ROW])
  })

  it('two tabs resolve independently and concurrently', async () => {
    // Resolved together, from one principal, with no shared mutable state
    // between them. This is the shape a global "current tenant" cannot express.
    const [a, b] = await Promise.all([
      resolveFor(HOST_A, session.principalId),
      resolveFor(HOST_B, session.principalId),
    ])
    if (a.kind !== 'verified' || b.kind !== 'verified') {
      throw new Error('fixture failed')
    }
    expect(a.context.tenantId).toBe(TENANT_A)
    expect(b.context.tenantId).toBe(TENANT_B)

    const [rowsA, rowsB] = await Promise.all([
      repo.listByEmployee(a.context, EMPLOYEE),
      repo.listByEmployee(b.context, EMPLOYEE),
    ])
    expect(rowsA.map((r) => r.id)).toEqual([A_ROW])
    expect(rowsB.map((r) => r.id)).toEqual([B_ROW])
  })
})

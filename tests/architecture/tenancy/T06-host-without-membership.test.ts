/**
 * T06 -- a valid session presented at another tenant's host.
 *
 * The principal is genuinely authenticated and genuinely a member of tenant A.
 * They point a browser at tenant B's hostname. Authentication succeeds; the
 * request must still be refused, because being signed in is not the same fact
 * as being a member here.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  closeAll,
  HOST_A,
  HOST_B,
  MEMBER_OF_A_ONLY,
  reachable,
  resolveFor,
  seed,
  TENANT_A,
} from './harness'

beforeAll(async () => {
  if (reachable) await seed()
})
afterAll(closeAll)

describe.skipIf(!reachable)('T06 -- membership authorises, authentication does not', () => {
  it("a member of A only is denied at B's host", async () => {
    const resolved = await resolveFor(HOST_B, MEMBER_OF_A_ONLY)
    expect(resolved.kind).toBe('denied')
    expect(resolved).toMatchObject({ reason: 'no-membership' })
  })

  it("and is still admitted at A's own host", async () => {
    // The negative case is only meaningful beside the positive one: a resolver
    // that denied everything would pass the test above.
    const resolved = await resolveFor(HOST_A, MEMBER_OF_A_ONLY)
    expect(resolved.kind).toBe('verified')
    expect(resolved).toMatchObject({ context: { tenantId: TENANT_A } })
  })

  it('an unknown hostname yields no candidate at all', async () => {
    const resolved = await resolveFor('not-a-tenant.xforge.test', MEMBER_OF_A_ONLY)
    expect(resolved).toMatchObject({ kind: 'denied', reason: 'no-candidate' })
  })
})

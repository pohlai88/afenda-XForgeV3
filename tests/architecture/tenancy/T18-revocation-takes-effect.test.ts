/**
 * T18 -- a membership revoked between two requests denies the second.
 *
 * This is what makes membership an OBJECT rather than an event (ADR-018). The
 * session is still perfectly valid -- the principal is who they say they are --
 * and that is precisely the point: identity did not change, authority did.
 *
 * It also demonstrates why resolution is re-derived per request and not cached.
 * A cache entry outliving a revocation reopens exactly the window this closes,
 * which is why a cache here is a security decision rather than a speed one.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  closeAll,
  HOST_B,
  MEMBER_OF_BOTH,
  owner,
  reachable,
  resolveFor,
  revokeMembership,
  seed,
  TENANT_B,
} from './harness'

beforeAll(async () => {
  if (reachable) await seed()
})
afterAll(closeAll)

describe.skipIf(!reachable)('T18 -- revocation takes effect on the next request', () => {
  it('admits the principal, then refuses once the membership is closed', async () => {
    const before = await resolveFor(HOST_B, MEMBER_OF_BOTH)
    expect(before).toMatchObject({ kind: 'verified', context: { tenantId: TENANT_B } })

    const at = new Date()
    await revokeMembership(owner, MEMBER_OF_BOTH, TENANT_B, at)

    // Half-open [valid_from, valid_to): a membership ending at T does not
    // authorise a request at T. A closed range would leave the revoked
    // principal one last request, which is one more than anybody intends.
    const after = await resolveFor(HOST_B, MEMBER_OF_BOTH, at)
    expect(after).toMatchObject({ kind: 'denied', reason: 'no-membership' })
  })

  it('and the row survives, so "was this a member on date D" stays answerable', async () => {
    const rows = await owner<{ valid_to: Date | null }[]>`
      select valid_to from tenant_membership
      where tenant_id = ${TENANT_B} and principal_id = ${MEMBER_OF_BOTH}
    `
    expect(rows).toHaveLength(1)
    expect(rows[0]?.valid_to).not.toBeNull()
  })
})

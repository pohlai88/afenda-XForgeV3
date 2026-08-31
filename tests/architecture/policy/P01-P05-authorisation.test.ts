/**
 * P01-P05 -- policy decides what may be done INSIDE a tenant.
 *
 *   RLS answers   which tenant's rows can this request ever see?
 *   policy answers what may this principal do within it?
 *
 * Keeping those separate is the point of the phase. A case where both mechanisms
 * deny at once proves neither, so each of these varies exactly one thing.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  closeAll,
  EMPLOYEE,
  principalWith,
  READ,
  RESOLUTION_TRANSACTIONS,
  reachable,
  request,
  seed,
  TENANT_A,
  TENANT_B,
  transactions,
  UPDATE,
} from './harness'

const LIST = `/v1/employees/${EMPLOYEE}/emergency-contacts`
const tenantGrant = (permission: string, scopeId = TENANT_A) =>
  ({ permission, scopeType: 'tenant', scopeId }) as const

beforeAll(async () => {
  if (reachable) await seed()
})
afterAll(closeAll)

describe.skipIf(!reachable)('P01-P05 -- policy on the verified path', () => {
  it('P01 -- same tenant, correct permission: ALLOW', async () => {
    const res = await request(LIST, principalWith([tenantGrant(READ)]))
    expect(res.status).toBe(200)
    expect((await res.json()).items).toHaveLength(1)
  })

  it('P02 -- same tenant, permission absent: DENY, and say nothing useful', async () => {
    const res = await request(LIST, principalWith([tenantGrant(UPDATE)]))
    expect(res.status).toBe(403)
    const body = await res.json()
    // The caller learns that access was refused and nothing else. Naming the
    // missing permission hands over the exact grant to go phishing for, and
    // confirms there was something there to protect.
    expect(body.detail).toBe('you do not have access to this operation')
    expect(JSON.stringify(body)).not.toMatch(/hr\.employee\.(read|update)/)
    expect(body.request_id).toBe('req-policy')
  })

  it('P03 -- permission held, wrong tenant scope: DENY', async () => {
    // The grant is real and unexpired. It is simply for somewhere else, which
    // is a different fact from never having been granted -- and the reason the
    // evaluator distinguishes them internally.
    const res = await request(LIST, principalWith([tenantGrant(READ, TENANT_B)]))
    expect(res.status).toBe(403)
  })

  it('P04 -- a denied request NEVER reaches the business query', async () => {
    // The assertion that matters. Policy's guarantee is not "my check fired",
    // it is "no path granted" -- and those are different claims a test can
    // easily conflate. If the handler still ran and RLS happened to return
    // nothing, this suite would look identical while proving something weaker.
    await request(LIST, principalWith([tenantGrant(UPDATE)]))
    expect(transactions).toHaveLength(RESOLUTION_TRANSACTIONS)
    expect(transactions.slice(RESOLUTION_TRANSACTIONS)).toEqual([])

    // And the allowed request DOES reach it, so the count above means something.
    await request(LIST, principalWith([tenantGrant(READ)]))
    expect(transactions.length).toBeGreaterThan(RESOLUTION_TRANSACTIONS)
  })

  it('P05 -- the server decides; a client calling the API directly gains nothing', async () => {
    // UI permission state is presentation convenience, never authority. This
    // request bypasses the UI entirely and is refused on the same evidence.
    const res = await request(LIST, principalWith([]), { method: 'GET' })
    expect(res.status).toBe(403)
  })

  it('and an unauthenticated request is 401, not 403', async () => {
    // Distinguishable to us -- "who are you" and "you may not" are different
    // failures and collapsing them makes both harder to debug.
    const res = await request(LIST, null)
    expect(res.status).toBe(401)
  })
})

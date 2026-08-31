/**
 * P07-P08 -- revocation lands, and an evaluator that breaks denies.
 */
import { evaluate } from '@xforge/policy'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  closeAll,
  EMPLOYEE,
  principalWith,
  READ,
  reachable,
  request,
  seed,
  TENANT_A,
} from './harness'

const LIST = `/v1/employees/${EMPLOYEE}/emergency-contacts`

beforeAll(async () => {
  if (reachable) await seed()
})
afterAll(closeAll)

describe.skipIf(!reachable)('P07 -- a grant that has expired stops working', () => {
  it('allows inside the window and denies outside it, same principal', async () => {
    const scoped = (validTo?: string) =>
      principalWith([{ permission: READ, scopeType: 'tenant', scopeId: TENANT_A, validTo }])

    expect((await request(LIST, scoped())).status).toBe(200)
    // ADR-018: delegation expires by construction rather than by someone
    // remembering to remove it. `asOf` is fixed at 2026-08-31 by the harness.
    expect((await request(LIST, scoped('2026-08-30T00:00:00.000Z'))).status).toBe(403)
  })
})

describe('P08 -- an evaluator that cannot decide must not allow', () => {
  it('a malformed declaration denies rather than skipping the check', () => {
    // The natural implementation of an unknown branch is to fall through, which
    // silently allows. This is the case that catches that.
    const r = evaluate(
      { permission: READ, scopeType: 'galaxy' as never },
      {
        principal: principalWith([{ permission: READ, scopeType: 'tenant', scopeId: TENANT_A }]),
        tenantId: TENANT_A,
        asOf: '2026-08-31T00:00:00.000Z',
      },
    )
    expect(r).toMatchObject({ allowed: false, reason: 'scope_type_unknown' })
  })

  it('a principal with malformed grants denies rather than throwing past the check', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'tenant' },
      {
        principal: { id: 'x', kind: 'user', grants: [null as never] },
        tenantId: TENANT_A,
        asOf: '2026-08-31T00:00:00.000Z',
      },
    )
    expect(r.allowed).toBe(false)
  })
})

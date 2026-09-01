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
  if (reachable) {
    await seed()
  }
})
afterAll(closeAll)

describe.skipIf(!reachable)('P07 -- a grant that has expired stops working', () => {
  it('allows inside the window and denies outside it, same principal', async () => {
    // The key is OMITTED rather than set to undefined, and under
    // `exactOptionalPropertyTypes` that is now the difference between two
    // grants rather than two spellings of one. An absent `validTo` is a grant
    // that does not expire; `validTo: undefined` would be an expiry somebody
    // computed and lost. P07 asserts the first, so it must construct the first.
    const scoped = (validTo?: string) =>
      principalWith([
        {
          permission: READ,
          scopeId: TENANT_A,
          scopeType: 'tenant',
          ...(validTo === undefined ? {} : { validTo }),
        },
      ])

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
        asOf: '2026-08-31T00:00:00.000Z',
        principal: principalWith([{ permission: READ, scopeId: TENANT_A, scopeType: 'tenant' }]),
        tenantId: TENANT_A,
      },
    )
    expect(r).toMatchObject({ allowed: false, reason: 'scope_type_unknown' })
  })

  it('a principal with malformed grants denies rather than throwing past the check', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'tenant' },
      {
        asOf: '2026-08-31T00:00:00.000Z',
        principal: { grants: [null as never], id: 'x', kind: 'user' },
        tenantId: TENANT_A,
      },
    )
    expect(r.allowed).toBe(false)
  })
})

describe('P08 -- a malformed grant is ignored as authority, but not in silence', () => {
  it('reports a policy-integrity finding while still denying', async () => {
    const { onPolicyIntegrity } = await import('@xforge/policy')
    const findings: unknown[] = []
    onPolicyIntegrity((f) => findings.push(f))
    try {
      const r = evaluate(
        { permission: READ, scopeType: 'tenant' },
        {
          asOf: '2026-08-31T00:00:00.000Z',
          principal: { grants: [null as never], id: 'corrupt', kind: 'user' },
          tenantId: TENANT_A,
        },
      )
      expect(r.allowed).toBe(false)
      // Discarding it quietly would let the request behave correctly while the
      // underlying corruption went unnoticed for months.
      expect(findings).toHaveLength(1)
      expect(findings[0]).toMatchObject({ malformedGrants: 1, principalId: 'corrupt' })
    } finally {
      onPolicyIntegrity(() => {})
    }
  })

  it('a well-formed grant still allows even when a sibling row is corrupt', async () => {
    // Fail closed on the bad row, not on the request. One corrupt grant must
    // not deny a principal everything they legitimately hold.
    const r = evaluate(
      { permission: READ, scopeType: 'tenant' },
      {
        asOf: '2026-08-31T00:00:00.000Z',
        principal: {
          grants: [null as never, { permission: READ, scopeId: TENANT_A, scopeType: 'tenant' }],
          id: 'mixed',
          kind: 'user',
        },
        tenantId: TENANT_A,
      },
    )
    expect(r.allowed).toBe(true)
  })
})

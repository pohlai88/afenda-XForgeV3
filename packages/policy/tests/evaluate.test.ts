/**
 * Policy evaluation fails closed in every ambiguous case (ADR-010, ADR-018),
 * and says WHY -- internally.
 *
 * "Fails closed" is easy to claim and easy to lose: the natural implementation
 * of an unknown-scope branch is to skip the check, which silently allows.
 *
 * The denial REASON matters as much as the denial. Without it, debugging
 * authorisation means guessing which of three conditions failed, and the usual
 * response to that guessing is to widen a grant until the error goes away.
 */
import { describe, expect, it } from 'vitest'
import { evaluate, type Grant, type Principal } from '../src/index.js'

const T = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const READ = 'hr.employee.read'

const principal = (grants: Grant[]): Principal => ({ id: 'u1', kind: 'user', grants })
const at = '2026-08-31T00:00:00.000Z'
const ctx = (grants: Grant[], scopeId?: string) => ({
  principal: principal(grants),
  tenantId: T,
  scopeId,
  asOf: at,
})

describe('evaluate', () => {
  it("allows 'public' without a principal check", () => {
    expect(evaluate('public', ctx([])).allowed).toBe(true)
  })

  it('allows a matching tenant-scoped grant', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'tenant' },
      ctx([{ permission: READ, scopeType: 'tenant', scopeId: T }]),
    )
    expect(r.allowed).toBe(true)
    // The grant that allowed it, so an audit record can name the authority
    // rather than only the outcome.
    expect(r).toMatchObject({ grant: { permission: READ } })
  })

  it('permission_missing when there is no such grant at all', () => {
    const r = evaluate({ permission: READ, scopeType: 'tenant' }, ctx([]))
    expect(r).toMatchObject({ allowed: false, reason: 'permission_missing' })
  })

  it('scope_mismatch when the grant exists but for another scope', () => {
    // Distinct from permission_missing on purpose: "you have this permission
    // somewhere else" and "you have never been given it" are different facts,
    // and conflating them is how a scope bug gets fixed by widening a role.
    const r = evaluate(
      { permission: READ, scopeType: 'legal_entity' },
      ctx([{ permission: READ, scopeType: 'legal_entity', scopeId: 'MY01' }], 'MY02'),
    )
    expect(r).toMatchObject({ allowed: false, reason: 'scope_mismatch' })
  })

  it('scope_mismatch for a tenant grant issued to a DIFFERENT tenant', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'tenant' },
      ctx([{ permission: READ, scopeType: 'tenant', scopeId: OTHER }]),
    )
    expect(r).toMatchObject({ allowed: false, reason: 'scope_mismatch' })
  })

  it('scope_mismatch when a non-tenant scope has no scopeId supplied', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'legal_entity' },
      ctx([{ permission: READ, scopeType: 'legal_entity', scopeId: 'MY01' }]),
    )
    expect(r).toMatchObject({ allowed: false, reason: 'scope_mismatch' })
  })

  it('grant_expired when the window has closed (ADR-018)', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'tenant' },
      ctx([
        {
          permission: READ,
          scopeType: 'tenant',
          scopeId: T,
          validTo: '2026-08-30T00:00:00.000Z',
        },
      ]),
    )
    expect(r).toMatchObject({ allowed: false, reason: 'grant_expired' })
  })

  it('grant_expired when the window has not opened yet', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'tenant' },
      ctx([
        {
          permission: READ,
          scopeType: 'tenant',
          scopeId: T,
          validFrom: '2026-09-01T00:00:00.000Z',
        },
      ]),
    )
    expect(r).toMatchObject({ allowed: false, reason: 'grant_expired' })
  })

  it('scope_type_unknown DENIES rather than ignoring the check', () => {
    const r = evaluate(
      { permission: READ, scopeType: 'galaxy' as never },
      ctx([{ permission: READ, scopeType: 'tenant', scopeId: T }]),
    )
    expect(r).toMatchObject({ allowed: false, reason: 'scope_type_unknown' })
  })

  it('allows a legal-entity grant only for the matching entity', () => {
    const grants: Grant[] = [{ permission: READ, scopeType: 'legal_entity', scopeId: 'MY01' }]
    const decl = { permission: READ, scopeType: 'legal_entity' } as const
    expect(evaluate(decl, ctx(grants, 'MY01')).allowed).toBe(true)
    expect(evaluate(decl, ctx(grants, 'MY02')).allowed).toBe(false)
  })

  it('the tenant comes from the request context, not from the principal', () => {
    // The regression that matters: policy must not carry its own opinion about
    // which tenant this is. A grant for tenant T is worthless when the verified
    // context says the request is in OTHER.
    const grants: Grant[] = [{ permission: READ, scopeType: 'tenant', scopeId: T }]
    const decl = { permission: READ, scopeType: 'tenant' } as const
    expect(evaluate(decl, { principal: principal(grants), tenantId: T, asOf: at }).allowed).toBe(
      true,
    )
    expect(
      evaluate(decl, { principal: principal(grants), tenantId: OTHER, asOf: at }).allowed,
    ).toBe(false)
  })
})

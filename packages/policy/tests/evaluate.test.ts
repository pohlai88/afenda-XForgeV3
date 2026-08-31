/**
 * Policy evaluation fails closed in every ambiguous case (ADR-010, ADR-018).
 *
 * "Fails closed" is easy to claim and easy to lose: the natural implementation
 * of an unknown-scope branch is to skip the check, which silently allows.
 */
import { describe, expect, it } from 'vitest'
import { evaluate, type Grant, type Principal } from '../src/index.js'

const T = '11111111-1111-1111-1111-111111111111'

const principal = (grants: Grant[]): Principal => ({
  id: 'u1',
  kind: 'user',
  tenantId: T,
  grants,
})

const at = '2026-08-31T00:00:00.000Z'

describe('evaluate', () => {
  it("allows 'public' without a principal check", () => {
    expect(evaluate('public', { principal: principal([]), asOf: at })).toEqual({ allowed: true })
  })

  it('allows a matching tenant-scoped grant', () => {
    const p = principal([{ permission: 'hr.employee.read', scopeType: 'tenant', scopeId: T }])
    expect(
      evaluate({ permission: 'hr.employee.read', scopeType: 'tenant' }, { principal: p, asOf: at })
        .allowed,
    ).toBe(true)
  })

  it('denies when the principal has no such grant', () => {
    const p = principal([])
    const r = evaluate(
      { permission: 'hr.employee.read', scopeType: 'tenant' },
      { principal: p, asOf: at },
    )
    expect(r.allowed).toBe(false)
  })

  it('DENIES an unrecognised scopeType rather than ignoring it', () => {
    const p = principal([{ permission: 'x', scopeType: 'tenant', scopeId: T }])
    const r = evaluate(
      { permission: 'x', scopeType: 'galaxy' as never },
      { principal: p, asOf: at },
    )
    expect(r.allowed).toBe(false)
    expect(r.allowed === false && r.reason).toMatch(/failing closed/)
  })

  it('denies a grant that has expired (ADR-018: delegation expires by construction)', () => {
    const p = principal([
      {
        permission: 'hr.employee.update',
        scopeType: 'tenant',
        scopeId: T,
        validTo: '2026-08-01T00:00:00.000Z',
      },
    ])
    expect(
      evaluate(
        { permission: 'hr.employee.update', scopeType: 'tenant' },
        { principal: p, asOf: at },
      ).allowed,
    ).toBe(false)
  })

  it('denies a grant that is not yet valid', () => {
    const p = principal([
      {
        permission: 'hr.employee.update',
        scopeType: 'tenant',
        scopeId: T,
        validFrom: '2027-01-01T00:00:00.000Z',
      },
    ])
    expect(
      evaluate(
        { permission: 'hr.employee.update', scopeType: 'tenant' },
        { principal: p, asOf: at },
      ).allowed,
    ).toBe(false)
  })

  it('denies a tenant-scoped grant issued for a DIFFERENT tenant', () => {
    const other = '22222222-2222-2222-2222-222222222222'
    const p = principal([{ permission: 'hr.employee.read', scopeType: 'tenant', scopeId: other }])
    expect(
      evaluate({ permission: 'hr.employee.read', scopeType: 'tenant' }, { principal: p, asOf: at })
        .allowed,
    ).toBe(false)
  })

  it('denies a non-tenant scope when no scopeId is supplied', () => {
    const p = principal([
      { permission: 'payroll.run.approve', scopeType: 'legal_entity', scopeId: 'MY01' },
    ])
    expect(
      evaluate(
        { permission: 'payroll.run.approve', scopeType: 'legal_entity' },
        { principal: p, asOf: at },
      ).allowed,
    ).toBe(false)
  })

  it('allows a legal-entity grant only for the matching entity', () => {
    const p = principal([
      { permission: 'payroll.run.approve', scopeType: 'legal_entity', scopeId: 'MY01' },
    ])
    const policy = { permission: 'payroll.run.approve', scopeType: 'legal_entity' } as const
    expect(evaluate(policy, { principal: p, scopeId: 'MY01', asOf: at }).allowed).toBe(true)
    expect(evaluate(policy, { principal: p, scopeId: 'MY02', asOf: at }).allowed).toBe(false)
  })
})

/**
 * P06 -- an unregistered permission code cannot authorise anything.
 *
 * Written from the matrix entry: "build or startup failure". Both boundaries
 * matter and they fail differently.
 *
 * In application code a typo is a TYPE error, because the registry derives the
 * type. From persisted or external input -- a grant row, a seeded fixture, an
 * imported role -- there is no compiler, so the evaluator must refuse at
 * runtime. ADR-019's rule is that an unknown or retired code compiles to DENY,
 * never to "no restriction", because the permissive reading is the natural one:
 * there is no rule, so nothing forbids it.
 */
import { evaluate, isRegisteredPermission, PERMISSIONS, type Permission } from '@xforge/policy'
import { describe, expect, it } from 'vitest'
import { principalWith, READ, TENANT_A } from './harness'

const at = '2026-08-31T00:00:00.000Z'

describe('P06 -- unregistered permission codes fail closed', () => {
  it('the registry is the one authority for what a code is', () => {
    expect(isRegisteredPermission(READ)).toBe(true)
    expect(isRegisteredPermission('hr.employee.obliterate')).toBe(false)
  })

  it('an unregistered code DENIES even when the principal holds a matching grant', () => {
    // The dangerous case. The principal really does hold a grant naming this
    // code -- a stale row, a renamed permission, an imported role -- and it
    // must still not authorise anything.
    const r = evaluate(
      { permission: 'hr.employee.obliterate', scopeType: 'tenant' },
      {
        asOf: at,
        principal: principalWith([
          { permission: 'hr.employee.obliterate', scopeId: TENANT_A, scopeType: 'tenant' },
        ]),
        tenantId: TENANT_A,
      },
    )
    expect(r).toMatchObject({ allowed: false, reason: 'permission_unregistered' })
  })

  it('every registered code carries a description a reviewer can judge', () => {
    for (const [code, description] of Object.entries(PERMISSIONS)) {
      expect(code, `${code} should be module.resource.action`).toMatch(/^[a-z]+\.[a-z-]+\.[a-z-]+$/)
      expect(description.length).toBeGreaterThan(10)
    }
  })

  it('and the type makes a typo a compile error in application code', () => {
    const good: Permission = 'hr.employee.read'
    expect(isRegisteredPermission(good)).toBe(true)
    // @ts-expect-error ADR-019: an unregistered code is not a Permission.
    const bad: Permission = 'hr.employee.obliterate'
    expect(isRegisteredPermission(bad)).toBe(false)
  })
})

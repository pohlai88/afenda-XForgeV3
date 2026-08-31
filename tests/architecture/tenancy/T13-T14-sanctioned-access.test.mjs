/**
 * T13 and T14 -- the two ways a module reaches around the chokepoints.
 *
 * Both are static claims about the codebase, so they are asserted against the
 * guards rather than at runtime. The matrix says "guard failure" for each, and
 * a guard nobody has watched reject anything is not yet a guard.
 *
 * T13 found a real gap: architecture-final.md 23.1 has listed
 * "database access outside a repository / withTenant()" since the spine phase
 * and it had never been implemented. The matrix asked for a failure and there
 * was no guard to fail.
 */
import { describe, expect, it } from 'vitest'
import { fixtures } from '../../../tooling/architecture/fixtures/index.mjs'
import { guardById } from '../../../tooling/architecture/guards/index.mjs'
import { scanWorkspace } from '../../../tooling/architecture/run-guards.mjs'

const rejects = (id) => {
  const g = guardById[id]
  const f = fixtures[id]
  return {
    violating: g.check(f.violating.path, f.violating.source).length,
    clean: g.check(f.clean.path, f.clean.source).length,
    appliesToViolating: g.applies(f.violating.path),
  }
}

describe('T13 -- a database handle acquired outside the repository layer', () => {
  it('is rejected by the guard', () => {
    expect(rejects('db-access-outside-repository')).toEqual({
      violating: 1,
      clean: 0,
      appliesToViolating: true,
    })
  })

  it('and the real workspace is clean of it', () => {
    const found = scanWorkspace().violations.filter(
      (v) => v.guard === 'db-access-outside-repository',
    )
    expect(found).toEqual([])
  })
})

describe('T14 -- withPlatformAccess called from a business module', () => {
  it('is rejected by the guard', () => {
    expect(rejects('platform-access-outside-admin')).toMatchObject({
      violating: 1,
      appliesToViolating: true,
    })
  })

  it('and the allowlist stays short enough to read', () => {
    // The value of this guard is entirely in the allowlist being enumerable.
    // If cross-tenant access becomes the answer whenever a query is
    // inconvenient, the RLS architecture erodes one call site at a time.
    const g = guardById['platform-access-outside-admin']
    for (const allowed of [
      'packages/db/src/platform-access.ts',
      'apps/admin/console/tenants.ts',
      'packages/tenancy/platform/rollup.ts',
      'tooling/operations/reconcile.ts',
    ]) {
      expect(g.applies(allowed), `${allowed} should be exempt`).toBe(false)
    }
    expect(g.applies('modules/payroll/application/run.ts')).toBe(true)
  })
})

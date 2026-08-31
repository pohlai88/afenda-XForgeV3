/**
 * T09 and T10 -- the application role must stay unprivileged, and the gate must
 * NOTICE when it does not.
 *
 * The matrix says "verify failure", not "the role is unprivileged". Asserting
 * the current state proves the database is healthy today; it says nothing about
 * whether anything would complain tomorrow. So each privilege is granted on
 * purpose and the check must report it.
 *
 * The mutations are the reason `checkApplicationRole` is a shared function
 * rather than assertions inlined in the integration suite: the thing exercised
 * here must be the thing that runs there.
 */
import { checkApplicationRole } from '@xforge/fixtures/rls-checks'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { assertBoundaryIntact, closeAll, owner, reachable, seed } from './harness'

beforeAll(async () => {
  if (reachable) {
    await seed()
  }
})
afterAll(closeAll)

describe.skipIf(!reachable)('T09/T10 -- the gate notices a privileged app role', () => {
  it('reports nothing while the role is properly unprivileged', async () => {
    expect(await checkApplicationRole(owner)).toEqual([])
  })

  it('T10 -- BYPASSRLS is DETECTED, not merely absent today', async () => {
    try {
      await owner`alter role app_user bypassrls`
      const findings = await checkApplicationRole(owner)
      expect(findings.map((f) => f.detail)).toContain('holds BYPASSRLS')
    } finally {
      await owner`alter role app_user nobypassrls`
    }
    expect(await checkApplicationRole(owner)).toEqual([])
  })

  it('T09 -- owning a tenant table is DETECTED', async () => {
    // RLS skips the owner unless FORCE is set. An ownership change therefore
    // makes the guarantee rest on a second setting, silently.
    try {
      await owner`alter table emergency_contact owner to app_user`
      const findings = await checkApplicationRole(owner)
      expect(findings.map((f) => f.detail)).toContain('owned by app_user')
    } finally {
      await owner`alter table emergency_contact owner to postgres`
      // Ownership does NOT carry the grants back. Restoring the owner and
      // stopping there left the table readable by nobody, and every later case
      // failed with "permission denied" -- which points at authorisation, three
      // steps from a fixture that half-restored.
      await owner`grant select, insert, update, delete on emergency_contact to app_user`
    }
    expect(await checkApplicationRole(owner)).toEqual([])
    await assertBoundaryIntact()
  })
})

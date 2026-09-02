/**
 * Shared fixtures for the tenancy attack suite.
 *
 * ONE RULE governs this file: everything here must use the path the application
 * uses. The real PostgreSQL driver against `app_user`, the real host and
 * membership resolution, the real `withTenant`, the real HR repository -- no
 * privileged shortcut, no test-only client that behaves better than production.
 *
 * The failure this guards against is the same shape as every ordering defect
 * this repository has hit: a proof that is internally consistent, entirely
 * convincing, and about a path nothing runs.
 */
import { hasActiveMembership, resolveHostname, setDriver, tenancyDriver } from '@xforge/db'
import { createPostgresDriver } from '@xforge/db/postgres'
import { EMPLOYEE } from '@xforge/fixtures/employee'
import { resetEmergencyContacts } from '@xforge/fixtures/hr'
import { HOST_A, HOST_B, seedTenancy, TENANT_A, TENANT_B } from '@xforge/fixtures/tenancy'

export { EMPLOYEE } from '@xforge/fixtures/employee'

export {
  HOST_A,
  HOST_B,
  revokeMembership,
  TENANT_A,
  TENANT_B,
} from '@xforge/fixtures/tenancy'

import {
  type MembershipQueries,
  resolveRequestTenant,
  type TenantResolution,
  type VerifiedTenantContext,
} from '@xforge/tenancy'
import postgres from 'postgres'
import { acquireFixture, releaseFixture } from '../../fixtures/fixture-lock'
import { appUrl, ownerUrl } from '../../fixtures/local-database'

export const A_ROW = '55555555-5555-4555-8555-555555555555'
export const B_ROW = '66666666-6666-4666-8666-666666666666'

/**
 * `MEMBER_OF_BOTH` is deliberately permissive: T01-T05 must fail at the
 * DATABASE boundary, not because the membership check happened to refuse first.
 * A case where several mechanisms deny at once tells you nothing about which is
 * load-bearing. `MEMBER_OF_A_ONLY` is the principal T06 needs.
 */
export const MEMBER_OF_BOTH = 'user-a'
export const MEMBER_OF_A_ONLY = 'user-only-a'

/**
 * Exactly the policies each tenant-owned table should carry. Checked as a SET:
 * a missing one removes protection, an extra permissive one adds access.
 */
export const EXPECTED_POLICIES: Record<string, readonly string[]> = {
  emergency_contact: ['emergency_contact_tenant_isolation'],
  tenant_domain: ['tenant_domain_routing_lookup'],
  tenant_membership: ['tenant_membership_tenant_isolation'],
}

/**
 * What app_user must be able to do. Checked because a destructive case can take
 * it away without touching a single policy.
 *
 * T09 changes table OWNERSHIP and changes it back. That does not restore the
 * grants the previous owner had made, so the table came back protected,
 * policied -- and unreadable. Every later case failed with "permission denied",
 * which points at authorisation rather than at a fixture that half-restored.
 */
export const EXPECTED_GRANTS: Record<string, readonly string[]> = {
  emergency_contact: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  tenant_domain: ['SELECT'],
  tenant_membership: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
}

export let owner!: ReturnType<typeof postgres>
export let driver!: ReturnType<typeof createPostgresDriver>
export let reachable = false

try {
  owner = postgres(ownerUrl(), { connect_timeout: 5, max: 2, prepare: false })
  await owner`select 1`
  driver = createPostgresDriver(appUrl())
  setDriver(driver)
  reachable = true
} catch {
  reachable = false
}

/** The tenancy queries (ADR-023): neither hands out a database client. */
const queries: MembershipQueries = {
  hasActiveMembership: (tenantId, principalId, asOf) =>
    hasActiveMembership(tenancyDriver(), tenantId, principalId, asOf),
  resolveHostname: (hostname) => resolveHostname(tenancyDriver(), hostname),
}

export const hostFor = (tenantId: string): string => (tenantId === TENANT_A ? HOST_A : HOST_B)

/** Resolve exactly as a request does: hostname, principal, membership. */
export function resolveFor(
  hostname: string,
  principalId: string = MEMBER_OF_BOTH,
  asOf: Date = new Date(),
): Promise<TenantResolution> {
  return resolveRequestTenant(hostname, { id: principalId }, queries, asOf)
}

/** Build a real verified context -- the only way one can be made. */
export async function contextFor(
  tenantId: string,
  principalId: string = MEMBER_OF_BOTH,
): Promise<VerifiedTenantContext> {
  const resolved = await resolveFor(hostFor(tenantId), principalId)
  if (resolved.kind !== 'verified') {
    throw new Error(`fixture could not verify ${tenantId} for ${principalId}`)
  }
  return resolved.context
}

/**
 * PRECONDITION: the boundary is intact before anything is asserted about it.
 *
 * T11 deliberately disables row-level security. Serialisation stops it
 * undercutting the other cases mid-run, but it cannot help if the process dies
 * while RLS is off -- Ctrl-C, a crash, an assertion that skips teardown. The
 * table is then left unprotected on a developer's machine, and the cases that
 * lean on the repository's own tenant predicate keep passing.
 *
 * So every file checks first, and a poisoned database fails loudly here instead
 * of flattering the suite for the rest of the week.
 */
export async function assertBoundaryIntact(): Promise<void> {
  for (const [table, expected] of Object.entries(EXPECTED_POLICIES)) {
    const [state] = await owner<{ relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
      select relrowsecurity, relforcerowsecurity from pg_class where relname = ${table}
    `
    if (!(state?.relrowsecurity && state?.relforcerowsecurity)) {
      throw new Error(
        [
          `REFUSING TO RUN: ${table} does not have row-level security enabled AND forced.`,
          'A destructive mutation case was probably interrupted while the boundary was down.',
          'Restore it before trusting anything this suite says:',
          `  alter table ${table} enable row level security;`,
          `  alter table ${table} force row level security;`,
        ].join(' '),
      )
    }

    // The POLICY SET, not just the flags. Permissive policies combine with OR,
    // so a leftover policy from T20 would WIDEN access while every flag still
    // read as healthy -- a poisoned database that looks perfect.
    const found = (
      await owner<{ policyname: string }[]>`
        select policyname from pg_policies where tablename = ${table} order by policyname
      `
    ).map((r) => r.policyname)
    const missing = expected.filter((e) => !found.includes(e))
    const extra = found.filter((f) => !expected.includes(f))
    if (missing.length || extra.length) {
      throw new Error(
        `REFUSING TO RUN: ${table} has an unexpected policy set. ` +
          `missing=[${missing.join(', ')}] unexpected=[${extra.join(', ')}]. ` +
          'An unexpected PERMISSIVE policy widens access, because policies OR together.',
      )
    }

    const grants = (
      await owner<{ privilege_type: string }[]>`
        select privilege_type from information_schema.role_table_grants
        where grantee = 'app_user' and table_name = ${table}
      `
    ).map((r) => r.privilege_type)
    const lostGrants = (EXPECTED_GRANTS[table] ?? []).filter((g) => !grants.includes(g))
    if (lostGrants.length) {
      throw new Error(
        `REFUSING TO RUN: app_user has lost [${lostGrants.join(', ')}] on ${table}. ` +
          'An ownership mutation was probably interrupted, or restored the owner ' +
          'without restoring the grants. Restore with: grant ' +
          `${(EXPECTED_GRANTS[table] ?? []).join(', ').toLowerCase()} on ${table} to app_user;`,
      )
    }
  }
}

/** Two tenants, their hostnames, their memberships, one HR row each. */
export async function seed(): Promise<void> {
  // FIRST, and before the boundary check. Everything below writes at fixed
  // primary keys, so a second process running these fixtures corrupts this run
  // -- measured as a duplicate-key error that fails a whole file, or a row
  // count that fails the tenancy assertions and reads as an isolation breach.
  // Held until `closeAll`, so it spans the assertions and not merely the seed.
  await acquireFixture()
  await assertBoundaryIntact()

  await seedTenancy(owner, [
    { principalId: MEMBER_OF_BOTH, tenantId: TENANT_A },
    { principalId: MEMBER_OF_BOTH, tenantId: TENANT_B },
    { principalId: MEMBER_OF_A_ONLY, tenantId: TENANT_A },
  ])

  await resetEmergencyContacts(owner)
  for (const [tenant, id, name] of [
    [TENANT_A, A_ROW, 'Alice of Tenant A'],
    [TENANT_B, B_ROW, 'Bob of Tenant B'],
  ] as const) {
    await owner`
      insert into emergency_contact (id, tenant_id, employee_id, name, relationship, phone)
      values (${id}, ${tenant}, ${EMPLOYEE}, ${name}, 'Spouse', '+60 12-000 0000')
    `
  }
}

export async function closeAll(): Promise<void> {
  if (!reachable) {
    return
  }
  await owner.end({ timeout: 5 })
  await driver.close()
  // LAST. A waiting runner must not be handed the fixture until this one has
  // finished reading it.
  await releaseFixture()
}

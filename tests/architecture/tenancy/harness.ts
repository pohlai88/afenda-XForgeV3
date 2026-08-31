/**
 * Shared fixtures for the tenancy attack suite.
 *
 * ONE RULE governs this file: everything here must use the connection path the
 * application uses. `createPostgresDriver` against `app_user`, `withTenant`,
 * and the real HR repository -- no privileged shortcut, no test-only client
 * that behaves better than production.
 *
 * The failure this guards against is the same shape as every ordering defect
 * this repository has hit: a proof that is internally consistent, entirely
 * convincing, and about a path nothing runs.
 */
import { setDriver } from '@xforge/db'
import { createPostgresDriver } from '@xforge/db/postgres'
import {
  candidateFromHost,
  resolveTenantContext,
  staticMembershipSource,
  type VerifiedTenantContext,
} from '@xforge/tenancy'
import postgres from 'postgres'
import { appUrl, ownerUrl } from '../../fixtures/local-database'

export const TENANT_A = '11111111-1111-4111-8111-111111111111'
export const TENANT_B = '22222222-2222-4222-8222-222222222222'
export const EMPLOYEE = '33333333-3333-4333-8333-333333333333'

export const A_ROW = '55555555-5555-4555-8555-555555555555'
export const B_ROW = '66666666-6666-4666-8666-666666666666'

export let owner!: ReturnType<typeof postgres>
export let driver!: ReturnType<typeof createPostgresDriver>
export let reachable = false

try {
  owner = postgres(ownerUrl(), { max: 2, prepare: false, connect_timeout: 5 })
  await owner`select 1`
  driver = createPostgresDriver(appUrl())
  setDriver(driver)
  reachable = true
} catch {
  reachable = false
}

/**
 * A membership store covering both tenants for both principals.
 *
 * Deliberately PERMISSIVE. These cases must fail at the DATABASE boundary, not
 * because the membership check happened to refuse first. A test where five
 * mechanisms deny at once tells you nothing about which one is load-bearing.
 */
const memberships = staticMembershipSource([
  { principalId: 'user-a', tenantId: TENANT_A },
  { principalId: 'user-a', tenantId: TENANT_B },
  { principalId: 'user-b', tenantId: TENANT_A },
  { principalId: 'user-b', tenantId: TENANT_B },
])

/** Build a real verified context -- the only way one can be made. */
export async function contextFor(
  tenantId: string,
  principalId = 'user-a',
): Promise<VerifiedTenantContext> {
  const resolved = await resolveTenantContext(
    candidateFromHost(tenantId),
    { id: principalId },
    memberships,
  )
  if (resolved.kind !== 'verified') throw new Error(`fixture could not verify ${tenantId}`)
  return resolved.context
}

/**
 * PRECONDITION: the boundary is intact before anything is asserted about it.
 *
 * T11 deliberately disables row-level security. Serialisation stops it
 * undercutting the other cases mid-run, but it cannot help if the process dies
 * while RLS is off -- Ctrl-C, a crash, an assertion that skips teardown. The
 * table is then left unprotected on a developer's machine, and every later run
 * of T02 passes for entirely the wrong reason. Unanimous green, silently wrong:
 * this repository's signature failure, arriving through the one test that
 * exists to prove the boundary is real.
 *
 * So every file checks first. A poisoned database fails loudly here instead of
 * flattering the suite for the rest of the week.
 */
export async function assertBoundaryIntact(): Promise<void> {
  const [state] = await owner<{ relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
    select relrowsecurity, relforcerowsecurity
    from pg_class where relname = 'emergency_contact'
  `
  if (!state?.relrowsecurity || !state?.relforcerowsecurity) {
    throw new Error(
      [
        'REFUSING TO RUN: emergency_contact does not have row-level security enabled AND',
        'forced. A previous run of T11 was probably interrupted while the boundary was',
        'down. Restore it before trusting anything this suite says:',
        '  alter table emergency_contact enable row level security;',
        '  alter table emergency_contact force row level security;',
      ].join(' '),
    )
  }
}

/** Two tenants, one row each, seeded as owner inside each tenant's context. */
export async function seed(): Promise<void> {
  // Every file calls seed() in beforeAll, so the precondition is universal
  // without each case having to remember it.
  await assertBoundaryIntact()
  for (const tenant of [TENANT_A, TENANT_B]) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenant}, true)`
      await tx`delete from emergency_contact`
    })
  }
  for (const [tenant, id, name] of [
    [TENANT_A, A_ROW, 'Alice of Tenant A'],
    [TENANT_B, B_ROW, 'Bob of Tenant B'],
  ] as const) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenant}, true)`
      await tx`
        insert into emergency_contact (id, tenant_id, employee_id, name, relationship, phone)
        values (${id}, ${tenant}, ${EMPLOYEE}, ${name}, 'Spouse', '+60 12-000 0000')
      `
    })
  }
}

export async function closeAll(): Promise<void> {
  if (!reachable) return
  await owner.end({ timeout: 5 })
  await driver.close()
}

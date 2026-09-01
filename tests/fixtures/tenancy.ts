/**
 * The tenancy fixture: two tenants, their hostnames, and their memberships.
 *
 * One definition shared by the contract suite, the attack suite and the E2E
 * global setup, so all three attack the same world. Three fixtures that drifted
 * apart would each prove something about a different system.
 */
import type postgres from 'postgres'

type Sql = ReturnType<typeof postgres>

export const TENANT_A = '11111111-1111-4111-8111-111111111111'
export const TENANT_B = '22222222-2222-4222-8222-222222222222'

export const HOST_A = 'a.xforge.test'
export const HOST_B = 'b.xforge.test'
/**
 * What a browser sends locally, once the port is stripped. Both spellings are
 * seeded: Playwright drives 127.0.0.1 while a developer types localhost, and a
 * hostname lookup does not know they are the same machine.
 */
export const HOST_DEV = 'localhost'
export const HOST_DEV_IP = '127.0.0.1'

/**
 * When a seeded membership begins, stated as a fixed instant.
 *
 * `valid_from` used to be left to the column default, which is the DATABASE's
 * `now()` -- while `hasActiveMembership` asks `valid_from <= asOf` against
 * NODE's `new Date()`. Two clocks either side of law 20's half-open interval:
 * when Node's was a hair behind, a membership seeded microseconds earlier was
 * not yet active, and only the FIRST resolution after seeding failed. That is
 * why it read as a wiped membership rather than a boundary, and cost three
 * wrong diagnoses.
 *
 * A fixed past instant rather than `now() - interval '1 second'`: subtracting an
 * arbitrary margin makes the symptom go away while leaving the comparison
 * between two clocks intact, and hides the very semantics these fixtures exist
 * to protect. A date states what is true -- this membership began long before
 * any test asked about it -- and no clock is consulted at all.
 */
export const FIXTURE_VALID_FROM = new Date('2020-01-01T00:00:00.000Z')

export interface Membership {
  readonly principalId: string
  readonly tenantId: string
  /** Defaults to FIXTURE_VALID_FROM. Set when a test owns the lower boundary. */
  readonly validFrom?: Date
  /** Set to revoke: half-open, so a membership ending at T does not authorise T. */
  readonly validTo?: Date
}

/**
 * Seed tenants, hostnames and memberships.
 *
 * The seeding connection is a SUPERUSER, and a superuser bypasses row-level
 * security unconditionally -- FORCE does not change that; FORCE only subjects
 * the table OWNER to policy. So these statements see and touch every tenant's
 * rows regardless of any `set_config` around them.
 *
 * That matters here because the first draft deleted per tenant inside a tenant
 * context, assuming RLS would scope the DELETE. It did not: seeding tenant B
 * wiped tenant A's hostnames, host resolution for A returned nothing, and every
 * request 500'd with a message about a missing tenant context -- three steps
 * away from the actual cause.
 *
 * Clearing is now SCOPED to the rows this fixture owns and re-inserts.
 *
 * It used to clear `tenant_domain` and `tenant_membership` entirely, which gave
 * this fixture a known starting state and gave every other suite a wiped one.
 * That was invisible while one file used it; the moment a second did, whichever
 * seeded later removed the other's membership mid-run, and the symptom was a
 * resolution denied for a principal seeded moments earlier.
 *
 * A fixture may delete state it UNIQUELY OWNS. It may not restore global truth
 * by emptying a shared table. Scoped deletes keep the known-state property for
 * these rows and let two suites converge instead of destroying each other.
 */
export async function seedTenancy(owner: Sql, memberships: readonly Membership[]): Promise<void> {
  await owner`
    insert into tenant (id, slug, name) values
      (${TENANT_A}, 'tenant-a', 'Tenant A Sdn Bhd'),
      (${TENANT_B}, 'tenant-b', 'Tenant B Sdn Bhd')
    on conflict (id) do nothing
  `

  const ownedHostnames = [HOST_A, HOST_B, HOST_DEV, HOST_DEV_IP]
  await owner`delete from tenant_domain where hostname in ${owner(ownedHostnames)}`
  for (const m of memberships) {
    await owner`
      delete from tenant_membership
      where tenant_id = ${m.tenantId} and principal_id = ${m.principalId}
    `
  }

  for (const [tenantId, hostnames] of [
    [TENANT_A, [HOST_A, HOST_DEV, HOST_DEV_IP]],
    [TENANT_B, [HOST_B]],
  ] as const) {
    for (const hostname of hostnames) {
      await owner`
        insert into tenant_domain (tenant_id, hostname, is_primary)
        values (${tenantId}, ${hostname}, ${hostname === hostnames[0]})
      `
    }
  }

  for (const m of memberships) {
    await owner`
      insert into tenant_membership (tenant_id, principal_id, valid_from, valid_to)
      values (
        ${m.tenantId}, ${m.principalId},
        ${m.validFrom ?? FIXTURE_VALID_FROM}, ${m.validTo ?? null}
      )
    `
  }
}

/** Revoke a membership as of `at` -- ADR-018, by closing the range, never deleting. */
export async function revokeMembership(
  owner: Sql,
  principalId: string,
  tenantId: string,
  at: Date,
): Promise<void> {
  await owner`
    update tenant_membership set valid_to = ${at}
    where tenant_id = ${tenantId} and principal_id = ${principalId} and valid_to is null
  `
}

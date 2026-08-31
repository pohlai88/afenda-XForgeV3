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

export interface Membership {
  readonly principalId: string
  readonly tenantId: string
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
 * Clearing once, unscoped, is both correct and honest about what is happening.
 */
export async function seedTenancy(owner: Sql, memberships: readonly Membership[]): Promise<void> {
  await owner`
    insert into tenant (id, slug, name) values
      (${TENANT_A}, 'tenant-a', 'Tenant A Sdn Bhd'),
      (${TENANT_B}, 'tenant-b', 'Tenant B Sdn Bhd')
    on conflict (id) do nothing
  `

  await owner`delete from tenant_domain`
  await owner`delete from tenant_membership`

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
      insert into tenant_membership (tenant_id, principal_id, valid_to)
      values (${m.tenantId}, ${m.principalId}, ${m.validTo ?? null})
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

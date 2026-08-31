/**
 * Two closed queries that run BEFORE a tenant is bound (ADR-023).
 *
 * They exist because ADR-022's chain is circular at the start:
 *
 *   withTenant           needs a VerifiedTenantContext
 *   VerifiedTenantContext needs a membership check
 *   the membership check  needs the database
 *   the database          is only reachable through withTenant
 *
 * The decisive property of both functions is what they DO NOT do: no
 * `TenantClient` escapes. A general `withCandidateTenant(id, fn)` would hand a
 * caller full tenant-scoped access to a tenant nobody has verified, and the
 * first awkward feature would do its "quick lookup" inside that callback. These
 * take no callback. There is nothing to repurpose.
 *
 * A guard confines callers to packages/tenancy and the composition root.
 */
import type { Driver, TenantClient } from './index'

/**
 * Resolve a hostname to a CANDIDATE tenant id.
 *
 * Not tenant-scoped, because no tenant is bound yet -- and it need not be: it
 * maps a public hostname to an id, which is what a DNS record already
 * discloses, and it grants nothing. ADR-022's chain still requires membership.
 */
export async function resolveHostname(driver: Driver, hostname: string): Promise<string | null> {
  const rows = await driver.transactionAsPlatform(async (sql: TenantClient) => {
    const r = await sql<{ tenant_id: string }>`
      select td.tenant_id
      from tenant_domain td
      join tenant t on t.id = td.tenant_id
      where td.hostname = ${hostname.toLowerCase()}
        and td.status = 'verified'
        and t.status = 'active'
      limit 1
    `
    return [...r]
  })
  return rows[0]?.tenant_id ?? null
}

/**
 * Is this principal an active member of this candidate tenant, as of `asOf`?
 *
 * Binds the CANDIDATE tenant so the statement runs under that tenant's RLS
 * policy -- the read is confined by the same mechanism that confines everything
 * else, and cannot see another tenant's memberships whatever the caller
 * intended.
 *
 * Half-open [valid_from, valid_to): a membership ending at 09:00 does not
 * authorise a request at 09:00 (law 20).
 */
export async function hasActiveMembership(
  driver: Driver,
  tenantId: string,
  principalId: string,
  asOf: Date,
): Promise<boolean> {
  const rows = await driver.transactionWithTenant(tenantId, async (sql: TenantClient) => {
    const r = await sql<{ ok: boolean }>`
      select true as ok
      from tenant_membership
      where tenant_id = ${tenantId}
        and principal_id = ${principalId}
        and status = 'active'
        and valid_from <= ${asOf}
        and (valid_to is null or valid_to > ${asOf})
      limit 1
    `
    return [...r]
  })
  return rows.length > 0
}

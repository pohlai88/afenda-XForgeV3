import postgres from 'postgres'
import { ownerUrl } from '../tests/fixtures/local-database'
import { seedTenancy, TENANT_A } from '../tests/fixtures/tenancy'

/** Matches the composition root's development principal. */
const DEV_PRINCIPAL = 'dev-user'
const DEV_TENANT = process.env.DEV_TENANT_ID ?? TENANT_A

/**
 * The E2E suite runs against a real database, so it owns its starting state:
 * the tenant and its hostname (the app resolves `localhost` through
 * tenant_domain now), the membership that authorises the development
 * principal, and an empty contact list for the first spec's empty-state
 * assertion -- which was true for free while the store lived in a process and
 * is not true of a table that persists between runs.
 */
export default async function globalSetup(): Promise<void> {
  const owner = postgres(ownerUrl(), { connect_timeout: 5, max: 1, prepare: false })
  try {
    await seedTenancy(owner, [{ principalId: DEV_PRINCIPAL, tenantId: DEV_TENANT }])
    // Unscoped: this connection is a superuser and bypasses RLS regardless of
    // any transaction-local context, FORCE or not.
    await owner`delete from emergency_contact`
  } finally {
    await owner.end({ timeout: 5 })
  }
}

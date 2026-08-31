import postgres from 'postgres'
import { ownerUrl } from '../tests/fixtures/local-database'

const DEV_TENANT = process.env.DEV_TENANT_ID ?? '11111111-1111-4111-8111-111111111111'

/**
 * The E2E suite now runs against a real database, so it owns its starting
 * state. The first spec asserts an empty state, which was true for free while
 * the store lived in a server process and is not true of a table that persists
 * between runs.
 */
export default async function globalSetup(): Promise<void> {
  const owner = postgres(ownerUrl(), { max: 1, prepare: false, connect_timeout: 5 })
  try {
    // RLS is FORCED, so even the owner needs the tenant context: a context-free
    // DELETE matches no rows and would silently leave the fixture dirty.
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${DEV_TENANT}, true)`
      await tx`delete from emergency_contact`
    })
  } finally {
    await owner.end({ timeout: 5 })
  }
}

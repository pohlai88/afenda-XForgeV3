/**
 * T19 -- tenant context must not survive a connection being handed back.
 *
 * The entire `SET LOCAL` doctrine exists because pooled connections are reused.
 * We had a test that the setting expires after a transaction; we did not have
 * the adversarial sequence OWASP actually asks for: two tenants' requests over
 * the SAME physical connection, proving the second cannot observe the first.
 *
 * Those are different claims. "The variable is gone" is about one statement;
 * "tenant B cannot see tenant A's context" is about the failure people are
 * afraid of. A pool of one guarantees the connection really is reused, so this
 * is not passing because the pool happened to hand out a fresh socket.
 */
import { setDriver, withTenant } from '@xforge/db'
import { createPostgresDriver } from '@xforge/db/postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { appUrl } from '../../fixtures/local-database'
import {
  A_ROW,
  B_ROW,
  closeAll,
  contextFor,
  driver,
  reachable,
  seed,
  TENANT_A,
  TENANT_B,
} from './harness'

/** The REAL driver, forced to a single connection. Not a parallel client. */
const single = reachable ? createPostgresDriver(appUrl(), { max: 1 }) : null

beforeAll(async () => {
  if (reachable) {
    await seed()
  }
})
afterAll(async () => {
  if (single) {
    await single.close()
  }
  await closeAll()
})

describe.skipIf(!reachable)('T19 -- no tenant context survives a checkout', () => {
  it('two tenants over ONE connection see only their own rows', async () => {
    if (!single) {
      return
    }
    setDriver(single)
    try {
      const a = await withTenant(await contextFor(TENANT_A), async (sql) => [
        ...(await sql<{ id: string }>`select id from emergency_contact`),
      ])
      const b = await withTenant(await contextFor(TENANT_B), async (sql) => [
        ...(await sql<{ id: string }>`select id from emergency_contact`),
      ])
      expect(a.map((r) => r.id)).toEqual([A_ROW])
      expect(b.map((r) => r.id)).toEqual([B_ROW])
    } finally {
      setDriver(driver)
    }
  })

  it('and between them the connection carries no tenant at all', async () => {
    if (!single) {
      return
    }
    setDriver(single)
    try {
      await withTenant(await contextFor(TENANT_A), async (sql) => {
        await sql`select 1`
      })
      // Same connection, no transaction context. If SET (not SET LOCAL) had
      // been used, tenant A's id would still be here waiting for whoever
      // borrows this connection next -- which is the leak, not a lint issue.
      const [row] = await single.transactionAsPlatform(async (sql) => [
        ...(await sql<{ t: string | null }>`
          select current_setting('app.tenant_id', true) as t
        `),
      ])
      // Deliberately loose: `== null` matches undefined too, and an unset
      // setting arrives as either. Narrowing this to `=== null` -- which a
      // linter's automatic fix did -- makes the assertion pass only for one of
      // the two shapes of "no tenant context", in the test whose whole subject
      // is that there is none.
      // biome-ignore lint/suspicious/noEqualsToNull: matches undefined too, see above
      expect(row?.t == null || row.t === '').toBe(true)
    } finally {
      setDriver(driver)
    }
  })
})

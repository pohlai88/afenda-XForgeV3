/**
 * Tenant isolation against a REAL PostgreSQL database.
 *
 * This is an early down-payment on the tenancy phase's blocking gate
 * (AQS-005/006/007/022). It runs as `app_user` -- the same non-owner role the
 * application uses -- because a test run as the owner proves nothing: RLS
 * silently skips owners, so an owner-run isolation test passes whether the
 * policies work or not.
 *
 * Skips (rather than fails) when no database is reachable, and the verify stage
 * reports PENDING in that case. A test that silently passes when its
 * subject is absent is worse than one that says it did not run.
 */

import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createPostgresDriver } from '../src/postgres-driver'

const OWNER_URL = process.env.DATABASE_URL ?? 'postgres://postgres:xforge@127.0.0.1:55432/xforge'
const APP_URL =
  process.env.APP_DATABASE_URL ?? 'postgres://app_user:app_user_dev_only@127.0.0.1:55432/xforge'

const TENANT_A = '11111111-1111-4111-8111-111111111111'
const TENANT_B = '22222222-2222-4222-8222-222222222222'
const EMPLOYEE = '33333333-3333-4333-8333-333333333333'

/**
 * Reachability is probed at MODULE scope, not in beforeAll.
 *
 * `describe.skipIf(...)` is evaluated during collection, which happens before
 * any hook runs -- so a flag set in beforeAll is always still false and every
 * test skips silently while appearing to be wired up. Top-level await is the
 * only placement that makes the condition true in time.
 */
let owner!: ReturnType<typeof postgres>
let app!: ReturnType<typeof postgres>
let driver!: ReturnType<typeof createPostgresDriver>
let reachable = false

try {
  owner = postgres(OWNER_URL, { max: 2, prepare: false, connect_timeout: 5 })
  await owner`select 1`
  app = postgres(APP_URL, { max: 2, prepare: false, connect_timeout: 5 })
  await app`select 1`
  driver = createPostgresDriver(APP_URL)
  reachable = true
} catch {
  reachable = false
}

beforeAll(async () => {
  if (!reachable) return

  // Seed as owner: RLS is FORCED, so the owner is subject to policy too and
  // cannot insert rows for arbitrary tenants without setting the context.
  await owner`delete from emergency_contact`
  for (const [tenant, name] of [
    [TENANT_A, 'Tenant A contact'],
    [TENANT_B, 'Tenant B contact'],
  ] as const) {
    await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${tenant}, true)`
      await tx`
        insert into emergency_contact (tenant_id, employee_id, name, relationship, phone)
        values (${tenant}, ${EMPLOYEE}, ${name}, 'Spouse', '+60 12-000 0000')
      `
    })
  }
})

afterAll(async () => {
  if (!reachable) return
  await driver.close()
  await app.end({ timeout: 5 })
  await owner.end({ timeout: 5 })
})

describe.skipIf(!reachable)('AQS-007 -- the application role is unprivileged', () => {
  it('app_user is not a superuser and does not hold BYPASSRLS', async () => {
    const [row] = await owner`
      select rolsuper, rolbypassrls from pg_roles where rolname = 'app_user'
    `
    expect(row?.rolsuper).toBe(false)
    expect(row?.rolbypassrls).toBe(false)
  })

  it('app_user does not own the tenant tables', async () => {
    const [row] = await owner`
      select pg_get_userbyid(relowner) as owner
      from pg_class where relname = 'emergency_contact'
    `
    expect(row?.owner).not.toBe('app_user')
  })
})

describe.skipIf(!reachable)(
  'AQS-005 -- every tenant-owned table has RLS enabled AND forced',
  () => {
    it('enumerates tables dynamically rather than trusting a list', async () => {
      // Dynamic enumeration is the point: a table added later cannot escape by
      // being forgotten in a hand-maintained array.
      const rows = await owner`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join information_schema.columns col
        on col.table_name = c.relname and col.column_name = 'tenant_id'
      where n.nspname = 'public' and c.relkind = 'r'
    `
      expect(rows.length).toBeGreaterThan(0)
      for (const r of rows) {
        expect(r.relrowsecurity, `${r.relname} has RLS disabled`).toBe(true)
        // FORCE is the half Drizzle does not generate -- see migration 0001.
        expect(r.relforcerowsecurity, `${r.relname} does not FORCE RLS`).toBe(true)
      }
    })
  },
)

describe.skipIf(!reachable)('AQS-006 -- cross-tenant denial as the real app role', () => {
  it('a query with NO tenant predicate returns only the bound tenant rows', async () => {
    // This is the property that makes agent-written code safe: correctness does
    // not depend on the author remembering to filter.
    const rows = await driver.transactionWithTenant(TENANT_A, async (tx) => {
      return tx`select tenant_id, name from emergency_contact`
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.tenant_id).toBe(TENANT_A)
  })

  it('tenant A cannot read tenant B even when asking for it explicitly', async () => {
    const rows = await driver.transactionWithTenant(TENANT_A, async (tx) => {
      return tx`select * from emergency_contact where tenant_id = ${TENANT_B}`
    })
    expect(rows).toHaveLength(0)
  })

  it('tenant A cannot UPDATE tenant B rows', async () => {
    await driver.transactionWithTenant(TENANT_A, async (tx) => {
      return tx`update emergency_contact set name = 'hijacked' where tenant_id = ${TENANT_B}`
    })
    const [b] = await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${TENANT_B}, true)`
      return tx`select name from emergency_contact where tenant_id = ${TENANT_B}`
    })
    expect(b?.name).toBe('Tenant B contact')
  })

  it('tenant A cannot DELETE tenant B rows', async () => {
    await driver.transactionWithTenant(TENANT_A, async (tx) => {
      return tx`delete from emergency_contact where tenant_id = ${TENANT_B}`
    })
    const rows = await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${TENANT_B}, true)`
      return tx`select 1 from emergency_contact where tenant_id = ${TENANT_B}`
    })
    expect(rows).toHaveLength(1)
  })

  it('an INSERT cannot spoof another tenant (WITH CHECK)', async () => {
    // USING governs what is visible; WITH CHECK governs what may be written.
    // Omitting WITH CHECK would leave this hole wide open.
    await expect(
      driver.transactionWithTenant(TENANT_A, async (tx) => {
        return tx`
          insert into emergency_contact (tenant_id, employee_id, name, relationship, phone)
          values (${TENANT_B}, ${EMPLOYEE}, 'spoofed', 'Spouse', '+60 12-000 0000')
        `
      }),
    ).rejects.toThrow(/row-level security/i)
  })
})

describe.skipIf(!reachable)('AQS-022 -- tenant context is transaction-scoped', () => {
  it('SET LOCAL is visible inside the transaction', async () => {
    const [row] = await driver.transactionWithTenant(TENANT_A, async (tx) => {
      return tx`select current_setting('app.tenant_id', true) as t`
    })
    expect(row?.t).toBe(TENANT_A)
  })

  it('and is GONE after the transaction commits', async () => {
    await driver.transactionWithTenant(TENANT_A, async (tx) => {
      return tx`select 1`
    })
    // A session-wide SET would leak this value to whichever tenant borrows the
    // connection next -- the defect that makes pooled RLS silently unsafe.
    const [row] = await app`select current_setting('app.tenant_id', true) as t`
    expect(row?.t === null || row?.t === '').toBe(true)
  })

  it('with no tenant context set, the policy returns nothing rather than everything', async () => {
    const rows = await app`select * from emergency_contact`
    expect(rows).toHaveLength(0)
  })
})

/**
 * T21 -- a backup taken with the application role would be silently empty.
 *
 * FORCE ROW LEVEL SECURITY applies to `pg_dump` like any other reader. A dump
 * run by a role without BYPASSRLS, and therefore without a tenant context, sees
 * no rows in any tenant-owned table and produces a structurally valid backup
 * containing nothing.
 *
 * Nothing errors. The dump succeeds, the file is a plausible size because the
 * schema is in it, and the failure is discovered during a restore -- which is
 * the worst possible moment to discover anything.
 *
 * This is asserted as a property rather than by shelling out to pg_dump, so it
 * runs anywhere: what pg_dump would see is exactly what the role can SELECT.
 */

import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { appUrl } from '../../fixtures/local-database'
import { closeAll, owner, reachable, seed } from './harness'

const TENANT_TABLES = ['emergency_contact', 'tenant_membership'] as const

let app!: ReturnType<typeof postgres>

beforeAll(async () => {
  if (!reachable) return
  await seed()
  app = postgres(appUrl(), { max: 1, prepare: false })
})
afterAll(async () => {
  if (reachable) await app.end({ timeout: 5 })
  await closeAll()
})

describe.skipIf(!reachable)('T21 -- the application role must never take backups', () => {
  it('sees zero rows in every tenant-owned table with no tenant context', async () => {
    for (const table of TENANT_TABLES) {
      const rows = await app`select count(*)::int as n from ${app(table)}`
      expect(rows[0]?.n, `${table} should be invisible without a tenant context`).toBe(0)
    }
  })

  it('while the same tables demonstrably hold rows', async () => {
    // Without this the test above would pass on an empty database, which is
    // the reassuring-but-useless version of the same assertion.
    for (const table of TENANT_TABLES) {
      const rows = await owner`select count(*)::int as n from ${owner(table)}`
      expect(rows[0]?.n, `${table} fixture should not be empty`).toBeGreaterThan(0)
    }
  })

  it('so the backup role must hold BYPASSRLS, and app_user must not', async () => {
    const [appRole] = await owner<{ rolbypassrls: boolean; rolsuper: boolean }[]>`
      select rolbypassrls, rolsuper from pg_roles where rolname = 'app_user'
    `
    expect(appRole?.rolbypassrls).toBe(false)
    expect(appRole?.rolsuper).toBe(false)
  })
})

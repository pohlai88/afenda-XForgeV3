/**
 * Policy qualification harness.
 *
 * Drives the REAL app: real routes, real adapter, real tenancy resolution, real
 * PostgreSQL behind the non-owner role. The only thing varied per case is the
 * principal's grants, because that is the thing under test.
 *
 * The driver is DECORATED, not replaced, so a case can assert what the request
 * actually touched. That is what makes the negative assertion possible: policy's
 * guarantee is not "my check fired" but "no path granted", and the way to show
 * the second is that the business query never ran at all.
 */
import { createApp } from '@xforge/api'
import {
  type Driver,
  hasActiveMembership,
  resolveHostname,
  setDriver,
  tenancyDriver,
} from '@xforge/db'
import { createPostgresDriver } from '@xforge/db/postgres'
import { EMPLOYEE } from '@xforge/fixtures/employee'
import { HOST_A, seedTenancy, TENANT_A, TENANT_B } from '@xforge/fixtures/tenancy'

export { EMPLOYEE } from '@xforge/fixtures/employee'

export { HOST_A, TENANT_A, TENANT_B } from '@xforge/fixtures/tenancy'

import { hrModuleRoutes } from '@xforge/hr'
import type { Grant, Principal } from '@xforge/policy'
import { type MembershipQueries, resolveRequestTenant } from '@xforge/tenancy'
import postgres from 'postgres'
import { appUrl, ownerUrl } from '../../fixtures/local-database'

export const READ = 'hr.employee.read'
export const UPDATE = 'hr.employee.update'

export let owner!: ReturnType<typeof postgres>
export let pg!: ReturnType<typeof createPostgresDriver>
export let reachable = false

try {
  owner = postgres(ownerUrl(), { connect_timeout: 5, max: 2, prepare: false })
  await owner`select 1`
  pg = createPostgresDriver(appUrl())
  reachable = true
} catch {
  reachable = false
}

/** Transactions the request actually opened. Empty of business work == denied early. */
export const transactions: string[] = []

if (reachable) {
  const recording: Driver = {
    transactionAsPlatform(fn) {
      transactions.push('__platform__')
      return pg.transactionAsPlatform(fn)
    },
    transactionWithTenant(tenantId, fn) {
      transactions.push(tenantId)
      return pg.transactionWithTenant(tenantId, fn)
    },
  }
  setDriver(recording)
}

const queries: MembershipQueries = {
  hasActiveMembership: (tenantId, principalId, asOf) =>
    hasActiveMembership(tenancyDriver(), tenantId, principalId, asOf),
  resolveHostname: (hostname) => resolveHostname(tenancyDriver(), hostname),
}

export const principalWith = (grants: Grant[], id = 'p1'): Principal => ({
  grants,
  id,
  kind: 'user',
})

/**
 * How many transactions the tenancy chain itself costs: the hostname lookup and
 * the membership check. Anything beyond this is business work, which is exactly
 * what a denied request must never reach.
 */
export const RESOLUTION_TRANSACTIONS = 2

/** One request through the real app, as the given principal. */
export async function request(
  path: string,
  principal: Principal | null,
  init: RequestInit = {},
): Promise<Response> {
  transactions.length = 0
  const app = createApp(hrModuleRoutes, {
    middleware: [
      async (c, next) => {
        if (principal) {
          const resolved = await resolveRequestTenant(HOST_A, principal, queries, new Date())
          if (resolved.kind === 'verified') {
            c.set('tenant', resolved.context)
          }
          c.set('principal', principal)
        }
        c.set('asOf', '2026-08-31T00:00:00.000Z')
        c.set('requestId', 'req-policy')
        await next()
      },
    ],
  })
  return app.request(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
}

export async function seed(): Promise<void> {
  await seedTenancy(owner, [
    { principalId: 'p1', tenantId: TENANT_A },
    { principalId: 'p2', tenantId: TENANT_A },
    { principalId: 'outsider', tenantId: TENANT_B },
  ])
  await owner`delete from emergency_contact`
  await owner`
    insert into emergency_contact (tenant_id, employee_id, name, relationship, phone)
    values (${TENANT_A}, ${EMPLOYEE}, 'Alice', 'Spouse', '+60 12-000 0000')
  `
}

export async function closeAll(): Promise<void> {
  if (!reachable) {
    return
  }
  await owner.end({ timeout: 5 })
  await pg.close()
}

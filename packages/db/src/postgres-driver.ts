import postgres from 'postgres'
import type { Driver, TenantClient } from './index'

/**
 * The PostgreSQL driver.
 *
 * The whole tenancy guarantee rests on three properties of this file:
 *
 *  1. It connects as `app_user`, which does NOT own the tables and does NOT
 *     hold BYPASSRLS. RLS silently skips owners, so an owner connection makes
 *     every policy decorative.
 *  2. Tenant context is set with SET LOCAL inside a transaction -- never a
 *     session-wide SET, which under a connection pool leaks to whichever tenant
 *     borrows the connection next.
 *  3. The tenant id is passed as a BOUND PARAMETER, not interpolated. A string
 *     built by concatenation here would be an injection into the one predicate
 *     that separates customers.
 *
 * AQS-022 proves 2 and 3 against the real driver rather than assuming them.
 */
export function createPostgresDriver(
  url: string,
  options: { readonly max?: number } = {},
): Driver & { close: () => Promise<void> } {
  // `max` is configurable ONLY so the pooled-reuse proof can force a pool of
  // one and guarantee the same physical connection is handed back. Building a
  // separate client for that test would prove connection reuse is safe on a
  // path the application does not use.
  const sql = postgres(url, { max: options.max ?? 5, prepare: false })

  return {
    async close() {
      await sql.end({ timeout: 5 })
    },

    async transactionAsPlatform(fn) {
      return sql.begin(async (tx) => fn(tx as unknown as TenantClient)) as never
    },
    async transactionWithTenant(tenantId, fn) {
      return sql.begin(async (tx) => {
        // set_config(..., true) is SET LOCAL: scoped to this transaction and
        // discarded on commit or rollback, so it cannot outlive the checkout.
        // The tenant id is a BOUND PARAMETER -- concatenating it here would be
        // an injection into the one predicate that separates customers.
        await tx`select set_config('app.tenant_id', ${tenantId}, true)`
        // `tx` -- not `sql`. Handing back the pool would check out a different
        // connection with no tenant context.
        return fn(tx as unknown as TenantClient)
      }) as never
    },
  }
}

import type { Driver, TenantClient } from './index'

/**
 * In-memory driver for development and tests.
 *
 * It exists so the composition root always has to CHOOSE a driver -- there is
 * no implicit default, and `withTenant` throws if none was set. That is
 * deliberate: a silent fallback is how a service ends up talking to the wrong
 * database in an environment nobody checked.
 *
 * It honours the transaction contract in shape only. The Postgres driver, and
 * the AQS-022 proof that `SET LOCAL app.tenant_id` survives every statement in a
 * transaction and is dropped on checkout, arrive with the tenancy phase.
 */
export function createMemoryDriver(): Driver {
  // There is no SQL here. Any repository that reaches for the client under the
  // memory driver is one that will behave differently against Postgres, so it
  // fails loudly now rather than diverging silently later.
  const noSql = (() => {
    throw new Error('the in-memory driver has no SQL client -- use createPostgresDriver')
  }) as unknown as TenantClient

  return {
    async transactionWithTenant(_tenantId, fn) {
      return fn(noSql)
    },
    async transactionAsPlatform(fn) {
      return fn(noSql)
    },
  }
}

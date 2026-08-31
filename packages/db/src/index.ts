/**
 * packages/db -- the ONLY place a tenant-scoped database handle is obtained.
 *
 * Two chokepoints, and only two (ADR-003):
 *   withTenant(tenantId, fn)        the only path to tenant-scoped data
 *   withPlatformAccess(reason, fn)  the only path to cross-tenant data, audited
 *
 * The second exists because the admin console, billing rollups and platform
 * analytics genuinely need cross-tenant reads. With no sanctioned path someone
 * adds a privileged connection or disables RLS on a table "just for the admin
 * query" -- the documented way RLS architectures fail. The point is not that
 * cross-tenant access is safe; it is that it is rare, named and logged.
 */
export { createMemoryDriver } from './memory-driver'
export * as schema from './schema/index'
export { TENANT_OWNED_TABLES } from './schema/index'

export interface TenantSession {
  /** Every statement runs inside the transaction that set app.tenant_id. */
  readonly tenantId: string
  execute<T>(fn: () => Promise<T>): Promise<T>
}

export interface PlatformAuditRecord {
  readonly reason: string
  readonly at: string
  readonly caller: string
}

/**
 * A database driver, abstracted so the domain never imports a provider SDK and
 * so tests can substitute an in-memory implementation without weakening the
 * contract that every access is transaction-scoped.
 */
/**
 * A tenant-scoped SQL client: a tagged-template query function bound to the
 * transaction that set `app.tenant_id`.
 *
 * The callback MUST receive this handle. An earlier signature took a
 * zero-argument callback, and the consequence was subtle and serious: queries
 * inside `withTenant` reached for the ambient pool instead, checked out a
 * DIFFERENT connection with no tenant context, and returned zero rows. RLS
 * failed closed so nothing leaked -- but the chokepoint was decorative, and a
 * permissive default would have made it a cross-tenant read. Only a test
 * against a real database surfaced it; the in-memory driver ignored the
 * connection entirely and passed.
 */
export type TenantClient = <T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
) => Promise<T[]>

export interface Driver {
  /**
   * MUST open a transaction, issue `SET LOCAL app.tenant_id`, run `fn` WITH THE
   * TRANSACTION'S OWN CLIENT, and commit.
   *
   * `SET LOCAL`, never session-wide `SET`: under a connection pool a
   * session-scoped variable leaks to whichever tenant borrows the connection
   * next. AQS-022 proves the selected driver honours this.
   */
  transactionWithTenant<T>(tenantId: string, fn: (tx: TenantClient) => Promise<T>): Promise<T>
  transactionAsPlatform<T>(fn: (tx: TenantClient) => Promise<T>): Promise<T>
}

let driver: Driver | null = null
const platformAudit: PlatformAuditRecord[] = []

export function setDriver(d: Driver): void {
  driver = d
}

function requireDriver(): Driver {
  if (!driver)
    throw new Error('no database driver configured -- call setDriver() at composition root')
  return driver
}

/** The only sanctioned path to tenant-scoped data. */
export function withTenant<T>(tenantId: string, fn: (tx: TenantClient) => Promise<T>): Promise<T> {
  if (!tenantId) throw new Error('withTenant requires a tenantId')
  return requireDriver().transactionWithTenant(tenantId, fn)
}

/**
 * The only sanctioned path to cross-tenant data. Restricted to apps/admin by a
 * guard, requires a stated reason, and writes an audit record on EVERY call.
 */
export function withPlatformAccess<T>(
  reason: string,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  if (!reason || reason.trim().length < 3) {
    throw new Error('withPlatformAccess requires a stated reason')
  }
  platformAudit.push({
    reason,
    at: new Date(0).toISOString(),
    caller: new Error().stack?.split('\n')[2]?.trim() ?? 'unknown',
  })
  return requireDriver().transactionAsPlatform(fn)
}

/** Exposed so the isolation gate can assert an audit row per invocation. */
export function readPlatformAudit(): readonly PlatformAuditRecord[] {
  return platformAudit
}

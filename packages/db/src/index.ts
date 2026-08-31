/**
 * packages/db -- the ONLY place a tenant-scoped database handle is obtained.
 *
 * Two chokepoints, and only two (ADR-003):
 *   withTenant(ctx, fn)             the only path to tenant-scoped data
 *   withPlatformAccess(reason, fn)  the only path to cross-tenant data, audited
 *
 * The second exists because the admin console, billing rollups and platform
 * analytics genuinely need cross-tenant reads. With no sanctioned path someone
 * adds a privileged connection or disables RLS on a table "just for the admin
 * query" -- the documented way RLS architectures fail. The point is not that
 * cross-tenant access is safe; it is that it is rare, named and logged.
 */
import type { VerifiedTenantContext } from '@xforge/tenancy'
import { type PlatformAccessRequest, performPlatformAccess } from './platform-access'

export type {
  ExecutionContext,
  PlatformAccessRequest,
  PlatformAuditRecord,
  PlatformAuditSink,
  PlatformOperation,
} from './platform-access'
export {
  createMemoryAuditSink,
  currentExecutionContext,
  PLATFORM_OPERATIONS,
  readPlatformAudit,
  setPlatformAuditSink,
  withExecutionContext,
} from './platform-access'
export * as schema from './schema/index'
export { TENANT_OWNED_TABLES } from './schema/index'

export interface TenantSession {
  /** Every statement runs inside the transaction that set app.tenant_id. */
  readonly tenantId: string
  execute<T>(fn: () => Promise<T>): Promise<T>
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

export function setDriver(d: Driver): void {
  driver = d
}

function requireDriver(): Driver {
  if (!driver)
    throw new Error('no database driver configured -- call setDriver() at composition root')
  return driver
}

/**
 * The only sanctioned path to tenant-scoped data.
 *
 * It takes a VERIFIED context, not a tenant id (ADR-022). A string parameter
 * would make `withTenant(request.body.tenantId, ...)` typecheck, and the whole
 * isolation guarantee would then rest on that value having been checked
 * somewhere upstream -- the kind of "checked somewhere" that stops being true
 * during a refactor. The branded type is constructible only inside
 * `packages/tenancy`, after host resolution and membership verification.
 *
 * The import is type-only, so there is no runtime dependency and no cycle:
 * `packages/tenancy` never imports `packages/db`.
 */
export async function withTenant<T>(
  ctx: VerifiedTenantContext,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  // `async`, so a bad context REJECTS rather than throwing synchronously out of
  // a Promise-returning function. A synchronous throw from an async-shaped API
  // slips straight past `withTenant(...).catch(handle)`, which is precisely
  // where a caller expects to see it.
  if (!ctx?.tenantId) throw new Error('withTenant requires a verified tenant context')
  return requireDriver().transactionWithTenant(ctx.tenantId, fn)
}

/**
 * The only sanctioned path to cross-tenant data. Restricted to apps/admin by a
 * guard, requires a stated reason, and writes an audit record on EVERY call.
 */

/**
 * The only sanctioned path to cross-tenant data (ADR-003).
 *
 * The caller states intent; identity comes from the trusted execution context.
 * See platform-access.ts for why that split matters.
 */
export function withPlatformAccess<T>(
  request: PlatformAccessRequest,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  return performPlatformAccess(request, (inner) => requireDriver().transactionAsPlatform(inner), fn)
}

/**
 * Cross-tenant access -- a DANGEROUS CAPABILITY, not withTenant's twin.
 *
 * withPlatformAccess exists because the admin console, billing rollups and
 * platform analytics genuinely need cross-tenant reads, and because without a
 * sanctioned path someone adds a privileged connection or disables RLS on a
 * table "just for the admin query". That is the documented way RLS
 * architectures die.
 *
 * Three properties keep it from becoming the convenient helper that fixes an
 * inconvenient RLS error:
 *
 *  1. THE CALLER DOES NOT SUPPLY ITS OWN IDENTITY. `actor` and `correlationId`
 *     come from the trusted execution context established by the request or job
 *     layer. A caller that can name itself turns the audit trail into caller
 *     testimony rather than evidence.
 *
 *  2. `operation` IS A REGISTERED CAPABILITY, not free text, so every legitimate
 *     use of platform access is enumerable from one file.
 *
 *  3. THE ATTEMPT IS RECORDED DURABLY BEFORE THE WORK, and independently of it.
 *     Writing the audit row inside the same transaction as the privileged work
 *     means a ROLLBACK erases the evidence of exactly the accesses most worth
 *     investigating. If the attempt cannot be persisted, the work does not run.
 *
 * INVARIANT STILL OWED, recorded here so it is not rediscovered during an
 * incident: an ATTEMPTED row with no SUCCEEDED or FAILED after a bounded time
 * is INCOMPLETE, and that is a finding rather than corrupt data. Absence of an
 * outcome already carries the meaning, so no fourth state is needed -- but it
 * cannot on its own separate "still running" from "the process died" from "the
 * outcome write itself failed". The admin and operations surface owes an
 * explicit view of incomplete privileged operations. Phase 1 case T16.
 */
import type { TenantClient } from './index'

/**
 * Every legitimate reason to step around tenant isolation, in one place.
 *
 * Adding an entry is a reviewable diff. Free-text operations would make the set
 * of privileged accesses unknowable without grepping the whole codebase.
 */
export const PLATFORM_OPERATIONS = {
  'admin.tenant-detail': 'Inspect one tenant from the platform console',
  'admin.tenant-list': 'List tenants in the platform console',
  'billing.usage-rollup': 'Aggregate usage across tenants for invoicing',
  'ops.reconcile-tenant-domains': 'Repair orphaned tenant-domain associations',
} as const

export type PlatformOperation = keyof typeof PLATFORM_OPERATIONS

/**
 * Established by the request or job layer, never by business code.
 *
 * This is the half of the audit record that must not be self-reported.
 */
export interface ExecutionContext {
  readonly actor: string
  readonly correlationId: string
  readonly origin: 'request' | 'job' | 'cli'
  /**
   * The tenant this execution was operating in, where there is one.
   *
   * The SERVER-VERIFIED tenant from the request's VerifiedTenantContext, never
   * a client-supplied value -- OWASP's rule for audit records, and the same
   * reason `actor` is not the caller's to state. Absent for a job or a console
   * session that never bound one.
   *
   * Cross-tenant by definition is what platform access IS, so this does not
   * scope the access. It records where the privileged call was made FROM, which
   * is the question an investigation actually starts with.
   */
  readonly tenantId?: string
}

/** What a caller may state: intent, and nothing about who it is. */
export interface PlatformAccessRequest {
  readonly operation: PlatformOperation
  readonly reason: string
}

export type PlatformAuditOutcome = 'ATTEMPTED' | 'SUCCEEDED' | 'FAILED'

export interface PlatformAuditRecord extends PlatformAccessRequest, ExecutionContext {
  readonly at: string
  readonly error?: string
  readonly id: string
  readonly outcome: PlatformAuditOutcome
}

/**
 * The audit sink.
 *
 * `recordAttempt` MUST durably persist before returning, in its own
 * transaction. `recordOutcome` APPENDS -- it never updates the attempt row,
 * because an append-only trail cannot be quietly rewritten by the same code
 * path that failed.
 */
export interface PlatformAuditSink {
  read: () => readonly PlatformAuditRecord[]
  recordAttempt: (record: Omit<PlatformAuditRecord, 'outcome'>) => Promise<void>
  recordOutcome: (
    id: string,
    outcome: Exclude<PlatformAuditOutcome, 'ATTEMPTED'>,
    error?: string,
  ) => Promise<void>
}

/**
 * In-memory sink. Adequate for tests and local development, and NOT durable
 * across a restart -- the Postgres-backed sink lands with the tenancy phase,
 * where AQS-006 asserts an audit row per invocation. It is a real
 * implementation of the contract, not a stub: it appends rather than updates,
 * and it is separate from any business transaction.
 */
export function createMemoryAuditSink(): PlatformAuditSink {
  const rows: PlatformAuditRecord[] = []
  return {
    read() {
      // A copy. An audit trail must not hand out a mutable reference to itself.
      return [...rows]
    },
    async recordAttempt(record) {
      rows.push({ ...record, outcome: 'ATTEMPTED' })
    },
    async recordOutcome(id, outcome, error) {
      const attempt = rows.find((r) => r.id === id)
      if (!attempt) {
        throw new Error(`no audit attempt ${id} to append an outcome to`)
      }
      rows.push({ ...attempt, at: new Date(0).toISOString(), outcome, ...(error ? { error } : {}) })
    },
  }
}

let sink: PlatformAuditSink | null = null
let executionContext: ExecutionContext | null = null

export function setPlatformAuditSink(s: PlatformAuditSink): void {
  sink = s
}

/**
 * Run `fn` with a trusted execution context. Called by the request/job layer
 * only; business code has no reason to construct one.
 */
export async function withExecutionContext<T>(
  ctx: ExecutionContext,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = executionContext
  executionContext = ctx
  try {
    return await fn()
  } finally {
    executionContext = previous
  }
}

export function currentExecutionContext(): ExecutionContext | null {
  return executionContext
}

let counter = 0
const nextAuditId = () => {
  counter += 1
  return `pa_${counter}`
}

/**
 * The only sanctioned path to cross-tenant data.
 *
 * @param request what the caller intends. Identity is NOT the caller's to state.
 */
export async function performPlatformAccess<T>(
  request: PlatformAccessRequest,
  transact: (fn: (tx: TenantClient) => Promise<T>) => Promise<T>,
  fn: (tx: TenantClient) => Promise<T>,
): Promise<T> {
  // Read once. A privileged-access request may arrive from a job payload or a
  // CLI argument, neither of which the compiler checked, so the optional chain
  // is defensive by intent rather than redundant.
  // biome-ignore lint/suspicious/noUnnecessaryConditions: defensive by intent, see above
  const operation = request?.operation

  if (!(operation in PLATFORM_OPERATIONS)) {
    throw new Error(
      `'${operation}' is not a registered platform operation. Add it to ` +
        'PLATFORM_OPERATIONS in a reviewed change -- privileged access must be enumerable.',
    )
  }
  if (typeof request.reason !== 'string' || request.reason.trim().length < 3) {
    throw new Error(
      'withPlatformAccess requires a reason a reviewer can judge. If it is hard to ' +
        'state, this is probably the wrong tool.',
    )
  }

  // Fail closed: no trusted identity means no privileged access. Letting the
  // caller proceed anonymously would produce an audit row naming nobody.
  const ctx = executionContext
  if (!ctx) {
    throw new Error(
      'withPlatformAccess requires a trusted execution context. It is established by the ' +
        'request or job layer via withExecutionContext, never by the calling code.',
    )
  }
  if (!sink) {
    throw new Error('no platform audit sink configured -- privileged access cannot be recorded')
  }

  const id = nextAuditId()
  const attempt = { id, ...request, ...ctx, at: new Date(0).toISOString() }

  // Durably record the ATTEMPT before doing anything, and outside the work's
  // transaction. If this throws, the privileged work does not run.
  try {
    await sink.recordAttempt(attempt)
  } catch (cause) {
    throw new Error(
      `refusing privileged access: the attempt could not be audited (${
        cause instanceof Error ? cause.message : String(cause)
      })`,
      { cause },
    )
  }

  try {
    const result = await transact(fn)
    await sink.recordOutcome(id, 'SUCCEEDED')
    return result
  } catch (err) {
    await sink.recordOutcome(id, 'FAILED', err instanceof Error ? err.message : String(err))
    throw err
  }
}

/** Exposed so the tenancy gate can assert an audit trail per invocation. */
export function readPlatformAudit(): readonly PlatformAuditRecord[] {
  return sink ? sink.read() : []
}

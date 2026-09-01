/**
 * withPlatformAccess is the function most likely to erode the tenancy
 * architecture, so it is tested as a dangerous capability rather than a helper.
 *
 * The two properties that matter most:
 *   - the caller cannot name itself, so the audit trail is evidence not testimony
 *   - the attempt is recorded durably BEFORE the work, so a failed or rolled-back
 *     privileged access still leaves a trace
 */
import { TENANT_A } from '@xforge/fixtures/tenancy'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createMemoryAuditSink,
  currentExecutionContext,
  type PlatformAuditSink,
  readPlatformAudit,
  setDriver,
  setPlatformAuditSink,
  type TenantClient,
  withExecutionContext,
  withPlatformAccess,
} from '../src/index'

const noSql = (() => {
  throw new Error('no SQL in this test')
}) as unknown as TenantClient

setDriver({
  async transactionAsPlatform(fn) {
    return fn(noSql)
  },
  async transactionWithTenant(_t, fn) {
    return fn(noSql)
  },
})

const ctx = { actor: 'ops-alice', correlationId: 'req-123', origin: 'request' as const }
const request = { operation: 'admin.tenant-list' as const, reason: 'platform console listing' }

beforeEach(() => {
  setPlatformAuditSink(createMemoryAuditSink())
})

describe('the caller cannot name itself', () => {
  it('refuses without a trusted execution context', async () => {
    await expect(withPlatformAccess(request, async () => 1)).rejects.toThrow(
      /trusted execution context/,
    )
  })

  it('takes actor and correlationId from the context, not the request', async () => {
    await withExecutionContext(ctx, () => withPlatformAccess(request, async () => 1))
    const rows = readPlatformAudit()
    expect(rows[0]?.actor).toBe('ops-alice')
    expect(rows[0]?.correlationId).toBe('req-123')
  })

  it('a caller cannot override identity by passing extra fields', async () => {
    const spoofed = { ...request, actor: 'root', correlationId: 'forged' } as never
    await withExecutionContext(ctx, () => withPlatformAccess(spoofed, async () => 1))
    const rows = readPlatformAudit()
    expect(rows[0]?.actor).toBe('ops-alice')
    expect(rows[0]?.correlationId).toBe('req-123')
  })
})

describe('operations are registered, not free text', () => {
  it('refuses an unregistered operation', async () => {
    const bogus = { operation: 'whatever.i.want', reason: 'because' } as never
    await expect(
      withExecutionContext(ctx, () => withPlatformAccess(bogus, async () => 1)),
    ).rejects.toThrow(/not a registered platform operation/)
  })

  it('refuses a reason too thin for a reviewer to judge', async () => {
    const thin = { ...request, reason: 'x' }
    await expect(
      withExecutionContext(ctx, () => withPlatformAccess(thin, async () => 1)),
    ).rejects.toThrow(/reason a reviewer can judge/)
  })
})

describe('audit durability', () => {
  it('records ATTEMPTED before the work runs', async () => {
    let seenDuringWork: readonly { outcome: string }[] = []
    await withExecutionContext(ctx, () =>
      withPlatformAccess(request, async () => {
        seenDuringWork = [...readPlatformAudit()]
        return 1
      }),
    )
    expect(seenDuringWork.map((r) => r.outcome)).toEqual(['ATTEMPTED'])
  })

  it('APPENDS the outcome rather than rewriting the attempt', async () => {
    await withExecutionContext(ctx, () => withPlatformAccess(request, async () => 1))
    expect(readPlatformAudit().map((r) => r.outcome)).toEqual(['ATTEMPTED', 'SUCCEEDED'])
  })

  it('a FAILED access still leaves both rows -- the evidence is not rolled back', async () => {
    await expect(
      withExecutionContext(ctx, () =>
        withPlatformAccess(request, async () => {
          throw new Error('privileged work exploded')
        }),
      ),
    ).rejects.toThrow('privileged work exploded')

    const rows = readPlatformAudit()
    expect(rows.map((r) => r.outcome)).toEqual(['ATTEMPTED', 'FAILED'])
    expect(rows[1]?.error).toMatch(/exploded/)
  })

  it('FAILS CLOSED when the attempt cannot be audited', async () => {
    // An access that cannot be recorded must not happen. Proceeding anyway
    // would give exactly the accesses most worth investigating no trace at all.
    let workRan = false
    const brokenSink: PlatformAuditSink = {
      read: () => [],
      async recordAttempt() {
        throw new Error('audit store unavailable')
      },
      async recordOutcome() {},
    }
    setPlatformAuditSink(brokenSink)

    await expect(
      withExecutionContext(ctx, () =>
        withPlatformAccess(request, async () => {
          workRan = true
          return 1
        }),
      ),
    ).rejects.toThrow(/could not be audited/)
    expect(workRan).toBe(false)
  })
})

describe('the audit records where the privileged call came from', () => {
  it('carries the server-verified tenant from the execution context', async () => {
    const sink = createMemoryAuditSink()
    setPlatformAuditSink(sink)
    await withExecutionContext(
      {
        actor: 'admin@xforge',
        correlationId: 'req-9',
        origin: 'request',
        tenantId: TENANT_A,
      },
      () =>
        withPlatformAccess(
          { operation: 'admin.tenant-list', reason: 'support ticket 41' },
          async () => 'ok',
        ),
    )
    // Not scoping the access -- platform access is cross-tenant by definition.
    // Recording which tenant's console the operator was in when they reached
    // across, which is where an investigation starts.
    expect(sink.read().map((r) => r.tenantId)).toEqual([TENANT_A, TENANT_A])
  })
})

/**
 * Two operations in one process, overlapping across an await.
 *
 * `executionContext` is a module-scope `let`, written on entry and restored in
 * `finally`. That is safe only while no second caller can interleave. In a
 * process serving concurrent requests it is not: B writes the global while A is
 * suspended, and B's `finally` restores what B saw on entry -- which is A's
 * context, not null -- so whichever of them resumes next may read the other's
 * actor and correlationId.
 *
 * `withPlatformAccess` takes the AUDITED IDENTITY from this context precisely so
 * the caller cannot name itself. A bleed here does not merely mislabel a log
 * line; it attributes privileged cross-tenant access to the wrong actor, which
 * is the property T15/T16 exist to establish.
 *
 * NOT LIVE TODAY: nothing under apps/ or modules/ calls `withExecutionContext`,
 * so no request layer establishes one. Its own doc comment says the request
 * layer will, and this is written before that caller exists rather than after.
 *
 * The suite cannot currently see this on its own. Every test FILE gets a fresh
 * module registry under vitest isolation, so the singleton is effectively
 * per-file and the interleaving never arises. The isolation that makes the
 * tenancy proof reproducible is also what hides this.
 */
describe('the execution context survives a concurrent operation', () => {
  const ctxA = { actor: 'alice', correlationId: 'req-A', origin: 'request' as const }
  const ctxB = { actor: 'bob', correlationId: 'req-B', origin: 'request' as const }

  it('does not let one operation read another actor across an await', async () => {
    const seen: Record<string, string | undefined> = {}
    const settle = () => new Promise((resolve) => setTimeout(resolve, 5))

    const a = withExecutionContext(ctxA, async () => {
      await settle()
      seen.a = currentExecutionContext()?.actor
    })
    const b = withExecutionContext(ctxB, async () => {
      seen.b = currentExecutionContext()?.actor
      await settle()
    })
    await Promise.all([a, b])

    expect(seen.b).toBe('bob')
    expect(seen.a).toBe('alice')
  })

  it('leaves no context behind once every operation has finished', async () => {
    const a = withExecutionContext(ctxA, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
    const b = withExecutionContext(ctxB, async () => undefined)
    await Promise.all([a, b])

    expect(currentExecutionContext()).toBeNull()
  })
})

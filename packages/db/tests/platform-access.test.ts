/**
 * withPlatformAccess is the function most likely to erode the tenancy
 * architecture, so it is tested as a dangerous capability rather than a helper.
 *
 * The two properties that matter most:
 *   - the caller cannot name itself, so the audit trail is evidence not testimony
 *   - the attempt is recorded durably BEFORE the work, so a failed or rolled-back
 *     privileged access still leaves a trace
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createMemoryAuditSink,
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
  async transactionWithTenant(_t, fn) {
    return fn(noSql)
  },
  async transactionAsPlatform(fn) {
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
      async recordAttempt() {
        throw new Error('audit store unavailable')
      },
      async recordOutcome() {},
      read: () => [],
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

/**
 * T15 and T16 -- the two halves of "the audit is evidence, not decoration".
 *
 * T15: if the attempt cannot be recorded, the privileged work does not run.
 * T16: if the work dies, the attempt is still there.
 *
 * Written from the matrix entries. Both describe what happens when something
 * ELSE fails, which is the only interesting time to ask about an audit trail --
 * on the happy path every design looks equivalent.
 */
import {
  createMemoryAuditSink,
  type PlatformAuditSink,
  setDriver,
  setPlatformAuditSink,
  type TenantClient,
  withExecutionContext,
  withPlatformAccess,
} from '@xforge/db'
import { beforeEach, describe, expect, it } from 'vitest'

const noSql = (() => {
  throw new Error('no SQL in this case')
}) as unknown as TenantClient

setDriver({
  async transactionWithTenant(_t, fn) {
    return fn(noSql)
  },
  async transactionAsPlatform(fn) {
    return fn(noSql)
  },
})

const ctx = { actor: 'ops@xforge', correlationId: 'c-1', origin: 'cli' } as const
const request = { operation: 'admin.tenant-list', reason: 'incident 12' } as const

let sink: PlatformAuditSink
beforeEach(() => {
  sink = createMemoryAuditSink()
  setPlatformAuditSink(sink)
})

describe('T15 -- work that cannot be audited does not happen', () => {
  it('refuses when the attempt cannot be persisted, and never runs the work', async () => {
    let ran = false
    const broken: PlatformAuditSink = {
      recordAttempt: async () => {
        throw new Error('audit store unreachable')
      },
      recordOutcome: async () => {},
      read: () => [],
    }
    setPlatformAuditSink(broken)

    await expect(
      withExecutionContext(ctx, () =>
        withPlatformAccess(request, async () => {
          ran = true
          return 'done'
        }),
      ),
    ).rejects.toThrow(/could not be audited/)

    // The load-bearing assertion. Refusing while still doing the work would be
    // the worst of both: unlogged privileged access, plus an error suggesting
    // it did not happen.
    expect(ran).toBe(false)
  })
})

describe('T16 -- a crash leaves the attempt observable', () => {
  it('records ATTEMPTED before the work, and FAILED after it dies', async () => {
    await expect(
      withExecutionContext(ctx, () =>
        withPlatformAccess(request, async () => {
          throw new Error('process died mid-flight')
        }),
      ),
    ).rejects.toThrow(/died mid-flight/)

    const rows = sink.read()
    expect(rows.map((r) => r.outcome)).toEqual(['ATTEMPTED', 'FAILED'])
    // Appended, never updated: the same code path that failed cannot quietly
    // rewrite the record of having tried.
    expect(rows[0]?.reason).toBe('incident 12')
    expect(rows[1]?.error).toMatch(/died mid-flight/)
  })

  it('an ATTEMPTED with no outcome is what an interrupted process leaves behind', async () => {
    // No terminal row is not corrupt data -- it IS the finding, and the one an
    // operations view has to be able to ask for. Simulated by recording the
    // attempt and then losing the process before an outcome is appended.
    const attempt = {
      id: 'pa_probe',
      ...request,
      ...ctx,
      at: new Date(0).toISOString(),
    }
    await sink.recordAttempt(attempt)
    const rows = sink.read()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.outcome).toBe('ATTEMPTED')
    expect(rows.some((r) => r.outcome === 'SUCCEEDED' || r.outcome === 'FAILED')).toBe(false)
  })
})

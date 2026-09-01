/**
 * The experience mapper: does the transport vocabulary terminate here?
 *
 * The producer tests prove a state can be MADE; the harness proves it can be
 * RENDERED. This proves the meaning survives the crossing — the third of four
 * facts, and the one where a wire concept would leak upward if the mapping were
 * sloppy.
 *
 * The last test is the important one. Adding a wire code must break the build,
 * not be absorbed by a fallback, because a `default` returning something
 * generic is a producer for a state nobody decided to produce.
 */
import type { Completeness } from '@xforge/api-client'
import { ApiProblem } from '@xforge/api-client'
import { describe, expect, it } from 'vitest'
import {
  type MutationOutcome,
  type ReadOutcome,
  toResourceState,
  toWriteOutcome,
} from '../../apps/web/app/employees/[employeeId]/resource-state'

const complete = { completeness: 'complete' } as const
// Not `as const`: `partialReasons` is a mutable array on the generated type,
// and a readonly literal is not assignable to it.
const truncated: Completeness = {
  completeness: 'partial',
  partialReasons: [{ code: 'result_cap', limit: 100, returned: 100 }],
}

const read = (outcome: ReadOutcome<string>) => toResourceState(outcome)

describe('a read that has not finished', () => {
  it('is loading', () => {
    expect(read({ kind: 'pending' })).toEqual({ status: 'loading' })
  })
})

describe('a read that succeeded completely', () => {
  /**
   * Empty is its own state, not a `ready` with nothing in it.
   *
   * They ask different things of a person: create the first record, versus read
   * what is there. A screen that cannot tell them apart shows an empty list and
   * no explanation.
   */
  it('with nothing is empty', () => {
    expect(read({ items: [], kind: 'succeeded', meta: complete })).toEqual({ status: 'empty' })
  })

  it('with something is ready', () => {
    expect(read({ items: ['a'], kind: 'succeeded', meta: complete })).toEqual({
      data: ['a'],
      status: 'ready',
    })
  })
})

describe('a read the producer says is incomplete', () => {
  // The whole point of stage 4A arriving before this one: the state exists
  // because a bounded read can construct it, and this is where that becomes
  // something a person can be told.
  it('is partial, keeps its data, and explains why', () => {
    expect(read({ items: ['a', 'b'], kind: 'succeeded', meta: truncated })).toEqual({
      data: ['a', 'b'],
      reasons: [{ kind: 'truncated', limit: 100, shown: 100 }],
      status: 'partial',
    })
  })

  // Usable data with bounded uncertainty -- NOT an error that happens to carry
  // rows. The distinction decides whether a screen shows the list at all.
  it('is not an error, and the rows survive', () => {
    const state = read({ items: ['a'], kind: 'succeeded', meta: truncated })
    expect(state.status).toBe('partial')
    expect(state.status === 'partial' && state.data).toEqual(['a'])
  })

  /**
   * No invented total.
   *
   * The wire carries `limit` and `returned` and deliberately not `available`,
   * so nothing downstream can render "100 of 173" from a number nobody counted.
   */
  it('carries no total the server never counted', () => {
    const state = read({ items: [], kind: 'succeeded', meta: truncated })
    const reason = state.status === 'partial' ? state.reasons[0] : undefined
    expect(Object.keys(reason ?? {}).sort()).toEqual(['kind', 'limit', 'shown'])
  })
})

describe('a read that failed', () => {
  it('is forbidden, and not retryable, on a 403', () => {
    const state = read({
      error: new ApiProblem(403, { detail: 'needs hr.employee.read', title: 'Forbidden' }),
      kind: 'failed',
    })
    expect(state.status).toBe('forbidden')
    expect(state.status === 'forbidden' && state.issue.retryable).toBe(false)
  })

  // Offering "Try again" for a permission failure teaches people the control is
  // decorative, which costs more than the missing button.
  it('is a retryable error otherwise', () => {
    const state = read({ error: new Error('network'), kind: 'failed' })
    expect(state.status).toBe('error')
    expect(state.status === 'error' && state.issue.retryable).toBe(true)
  })
})

describe('a write', () => {
  const write = (outcome: MutationOutcome) => toWriteOutcome(outcome)

  it.each([
    ['idle', 'idle'],
    ['saving', 'saving'],
    ['saved', 'saved'],
  ] as const)('maps %s through unchanged', (kind, status) => {
    expect(write({ kind })).toEqual({ status })
  })

  /**
   * A stale write is a CONFLICT, not an error.
   *
   * ADR-013 refuses to merge it, and the difference matters to the person
   * holding the edit: an error says something broke, a conflict says someone
   * else changed this and here is what to do. Collapsing them loses the only
   * part that tells them what to do next.
   */
  it('is a conflict on 409, carrying what changed rather than a failure', () => {
    const outcome = write({
      error: new ApiProblem(409, { title: 'Version conflict' }),
      kind: 'failed',
    })
    expect(outcome.status).toBe('conflict')
    expect(outcome.status === 'conflict' && outcome.conflict.kind).toBe('stale-version')
  })

  it('is a plain failure on anything else', () => {
    const outcome = write({ error: new Error('offline'), kind: 'failed' })
    expect(outcome.status).toBe('failed')
  })
})

describe('the vocabularies do not mirror each other', () => {
  /**
   * `conflict` is NOT a member of `ResourceState`, deliberately.
   *
   * It is the outcome of a write whose version token was stale, never a state a
   * read can be in -- and the screen already models it that way, as a banner
   * above a list that is itself perfectly ready. Folding it in would give every
   * reader a case it can never produce, which is the modelling error the
   * producer rule exists to catch.
   */
  it('keeps conflict out of the read states', () => {
    const statuses = [
      read({ kind: 'pending' }),
      read({ items: [], kind: 'succeeded', meta: complete }),
      read({ items: ['a'], kind: 'succeeded', meta: complete }),
      read({ items: ['a'], kind: 'succeeded', meta: truncated }),
      read({ error: new ApiProblem(403, {}), kind: 'failed' }),
      read({ error: new Error('x'), kind: 'failed' }),
    ].map((s) => s.status)

    expect(statuses).toEqual(['loading', 'empty', 'ready', 'partial', 'forbidden', 'error'])
    expect(statuses).not.toContain('conflict')
  })

  /**
   * A new wire code must stop the build.
   *
   * `toUiReason` switches on `reason.code` and ends in `assertNever`, so the
   * day `enrichment_unavailable` is added to the contract, the mapper stops
   * compiling and somebody has to decide what a person is told. A `default`
   * branch would absorb it silently and the transport would evolve past the
   * experience without anyone noticing.
   *
   * The compile-time half cannot be asserted from a passing test -- it is
   * asserted by `assertNever` existing and by there being no `default` that
   * returns a value. This checks the RUNTIME half: an unrecognised code throws
   * rather than being mapped to something plausible.
   */
  it('throws rather than inventing a meaning for an unknown reason', () => {
    const rogue = {
      completeness: 'partial',
      partialReasons: [{ code: 'enrichment_unavailable', limit: 1, returned: 1 }],
    } as unknown as typeof truncated

    expect(() => read({ items: ['a'], kind: 'succeeded', meta: rogue })).toThrow(/partial reason/)
  })

  it('throws rather than inventing a meaning for an unknown completeness', () => {
    const rogue = { completeness: 'mostly' } as unknown as typeof complete
    expect(() => read({ items: [], kind: 'succeeded', meta: rogue })).toThrow(/completeness/)
  })
})

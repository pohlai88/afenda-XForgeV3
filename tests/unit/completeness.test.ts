/**
 * The completeness marker, and the rules that keep it honest.
 *
 * `partial` has been a member of a planned union since the first draft, with no
 * producer and no wire form. This project has now found the same shape three
 * times -- vocabulary that type-checks, validates and renders while nothing can
 * ever construct it -- so the marker is decided and tested BEFORE the state type
 * exists rather than after.
 *
 * What is tested here is the CONTRACT's own rules. That a real read produces the
 * marker is a separate question, proved against a real database, because a
 * schema accepting a partial envelope is not evidence that anything emits one.
 */
import { describe, expect, it } from 'vitest'
import { Completeness } from '../../modules/hr/contract/routes'

const parse = (value: unknown) => Completeness.safeParse(value)

describe('the completeness marker', () => {
  /**
   * The field is always present, and that is the design.
   *
   * A marker that appears only when something is wrong is one whose absence a
   * client reads as success without ever having looked for it -- and every
   * client that forgets is silently correct until the day it matters. Naming
   * the ordinary case is the same reason the budget file writes `inherited`
   * rather than leaving the common row blank.
   */
  it('requires completeness to be stated, never inferred from its absence', () => {
    expect(parse({}).success).toBe(false)
    expect(parse({ partialReasons: [] }).success).toBe(false)
    expect(parse({ completeness: 'complete' }).success).toBe(true)
  })

  it('rejects a completeness value outside the vocabulary', () => {
    expect(parse({ completeness: 'mostly' }).success).toBe(false)
  })
})

describe('the invariants between completeness and its reasons', () => {
  // Partial without a reason is a warning a user cannot act on: it says the
  // data is incomplete and refuses to say in what way.
  it('refuses partial with no reason', () => {
    expect(parse({ completeness: 'partial' }).success).toBe(false)
    expect(parse({ completeness: 'partial', partialReasons: [] }).success).toBe(false)
  })

  // Complete WITH a reason is the more dangerous direction: it would render a
  // degradation notice over data that is not degraded, and teach people that
  // the notice means nothing.
  it('refuses complete carrying a reason', () => {
    const doc = {
      completeness: 'complete',
      partialReasons: [{ code: 'result_cap', limit: 100, returned: 100 }],
    }
    expect(parse(doc).success).toBe(false)
  })

  it('accepts partial with a reason', () => {
    const doc = {
      completeness: 'partial',
      partialReasons: [{ code: 'result_cap', limit: 100, returned: 100 }],
    }
    expect(parse(doc).success).toBe(true)
  })

  /**
   * Reasons are a LIST, and the list is not silently truncated to one.
   *
   * A bounded read that hit its cap while an enrichment source was also
   * unavailable is one response with two independently meaningful degradations,
   * and a precedence rule would discard one of them. Only `result_cap` exists
   * today because only it has a producer -- `enrichment_unavailable` lands with
   * the source that can report it -- so this asserts the SHAPE carries more than
   * one, using the only code there is.
   */
  it('carries every reason rather than the first', () => {
    const doc = {
      completeness: 'partial',
      partialReasons: [
        { code: 'result_cap', limit: 100, returned: 100 },
        { code: 'result_cap', limit: 50, returned: 50 },
      ],
    }
    const result = parse(doc)
    expect(result.success).toBe(true)
    expect(result.success && result.data.partialReasons).toHaveLength(2)
  })
})

describe('what a reason may say', () => {
  // Codes and numbers, never prose. A sentence here cannot be localised, cannot
  // vary by surface, and makes the transport responsible for wording that the
  // experience layer owns.
  it('refuses a human-readable message in place of a code', () => {
    const doc = {
      completeness: 'partial',
      partialReasons: [{ message: 'Some results could not be loaded.' }],
    }
    expect(parse(doc).success).toBe(false)
  })

  it('refuses a reason missing the numbers that make it actionable', () => {
    expect(
      parse({ completeness: 'partial', partialReasons: [{ code: 'result_cap' }] }).success,
    ).toBe(false)
  })

  /**
   * The server does not claim a total it has not counted.
   *
   * `available` was deliberately left out of the reason. Reporting it means
   * either a second count query on every bounded read, or a number that is
   * already stale -- and a client showing "100 of 173" that is wrong is worse
   * than one showing "100, and there are more".
   */
  it('refuses an invented total', () => {
    const doc = {
      completeness: 'partial',
      partialReasons: [{ available: 173, code: 'result_cap', limit: 100, returned: 100 }],
    }
    // Rejected because the schema is closed, not merely because it is unused.
    expect(parse(doc).success).toBe(false)
  })
})

/**
 * The phase model decides which unmet prerequisites are tolerable, so it is
 * itself security-relevant: if the phase can be lowered, every mandatory check
 * for the phases below it silently becomes a legitimate PENDING and the gate
 * goes green having verified almost nothing.
 *
 * These tests make phase progression MONOTONIC and the declaration MANDATORY.
 */
import { describe, expect, it } from 'vitest'
import {
  BLOCKED,
  COMMITTED_PHASE,
  CURRENT_PHASE,
  EMPTY,
  FAIL,
  PASS,
  PENDING,
  PHASES,
  phaseHasStarted,
  resolvePhase,
  settleStatus,
} from '../lib/util.mjs'
import { stages } from '../stages.mjs'
import { decideGateOutcome, formatDuration, summariseTimings } from '../verify.mjs'

describe('the repository owns the phase', () => {
  it('reads a committed phase that is a known phase', () => {
    expect(PHASES).toContain(COMMITTED_PHASE)
  })

  it('ignores the environment entirely under --ci', () => {
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = PHASES.at(-1)
    try {
      expect(resolvePhase({ ci: true })).toBe(COMMITTED_PHASE)
    } finally {
      if (prev === undefined) {
        delete process.env.XFORGE_PHASE
      } else {
        process.env.XFORGE_PHASE = prev
      }
    }
  })

  it('lets the environment RAISE the phase locally', () => {
    const ahead = PHASES[PHASES.indexOf(COMMITTED_PHASE) + 1]
    if (!ahead) {
      return
    }
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = ahead
    try {
      expect(resolvePhase({ ci: false })).toBe(ahead)
    } finally {
      if (prev === undefined) {
        delete process.env.XFORGE_PHASE
      } else {
        process.env.XFORGE_PHASE = prev
      }
    }
  })

  it('REJECTS an environment phase behind the committed one', () => {
    const behindIndex = PHASES.indexOf(COMMITTED_PHASE) - 1
    if (behindIndex < 0) {
      return // nothing is behind 'spine'
    }
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = PHASES[behindIndex]
    try {
      expect(() => resolvePhase({ ci: false })).toThrow(/BEHIND the committed phase/)
    } finally {
      if (prev === undefined) {
        delete process.env.XFORGE_PHASE
      } else {
        process.env.XFORGE_PHASE = prev
      }
    }
  })

  it('REJECTS an unknown environment phase', () => {
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = 'not-a-phase'
    try {
      expect(() => resolvePhase({ ci: false })).toThrow(/not a known phase/)
    } finally {
      if (prev === undefined) {
        delete process.env.XFORGE_PHASE
      } else {
        process.env.XFORGE_PHASE = prev
      }
    }
  })
})

describe('every stage declares a phase', () => {
  it('no stage is missing one', () => {
    const missing = stages.filter((s) => !s.phase).map((s) => s.id)
    expect(missing, `stages without a declared phase: ${missing.join(', ')}`).toEqual([])
  })

  it('every declared phase is known', () => {
    const unknown = stages.filter((s) => !PHASES.includes(s.phase)).map((s) => `${s.id}=${s.phase}`)
    expect(unknown).toEqual([])
  })

  it('phaseHasStarted throws on an unknown phase rather than defaulting', () => {
    // Defaulting would silently classify an unknown phase as not-started,
    // which is the permissive direction.
    expect(() => phaseHasStarted('nonsense')).toThrow(/unknown phase/)
  })
})

describe('phase ordering', () => {
  // Against the EFFECTIVE phase, not the committed one. These two are the same
  // in CI and differ under a local `XFORGE_PHASE=<next>` raise -- which is the
  // whole point of the raise, and this test asserted the opposite until a
  // raised run caught it.
  it('every phase at or before the effective one has started', () => {
    for (const p of PHASES.slice(0, PHASES.indexOf(CURRENT_PHASE) + 1)) {
      expect(phaseHasStarted(p), `${p} should have started`).toBe(true)
    }
  })

  it('no phase after the effective one has started', () => {
    for (const p of PHASES.slice(PHASES.indexOf(CURRENT_PHASE) + 1)) {
      expect(phaseHasStarted(p), `${p} should NOT have started`).toBe(false)
    }
  })

  it('the effective phase is never behind the committed one', () => {
    expect(PHASES.indexOf(CURRENT_PHASE)).toBeGreaterThanOrEqual(PHASES.indexOf(COMMITTED_PHASE))
  })
})

/**
 * PENDING expires.
 *
 * The reviewer asked whether raising XFORGE_PHASE locally actually enables the
 * next phase's checks. It did not, and the answer was worse than either option
 * offered: guards are not phase-gated at all, and the one tenancy stage
 * returned a HARDCODED PENDING, so raising the phase surfaced nothing. CI
 * tolerates PENDING by design, so a mandatory stage could have sat unrun
 * forever while the gate reported green.
 */
describe('PENDING expires when its phase starts', () => {
  const pending = { detail: 'activates in the tenancy phase', status: PENDING }

  it('is allowed for a stage whose phase has NOT started', () => {
    const settled = settleStatus({ id: 'x', phase: 'payroll' }, pending)
    expect(settled.status).toBe(PENDING)
  })

  it('becomes FAIL for a stage whose phase HAS started', () => {
    const settled = settleStatus({ id: 'x', phase: 'spine' }, pending)
    expect(settled.status).toBe(FAIL)
    expect(settled.detail).toContain('during its own')
  })

  it('keeps the original detail, so the failure says what the stage claimed', () => {
    const settled = settleStatus({ id: 'x', phase: 'spine' }, pending)
    expect(settled.detail).toContain('activates in the tenancy phase')
  })

  it('leaves every other status untouched', () => {
    for (const status of [PASS, FAIL, EMPTY, BLOCKED]) {
      const r = { detail: 'd', status }
      expect(settleStatus({ id: 'x', phase: 'spine' }, r)).toBe(r)
    }
  })

  it('would turn the tenancy stage red the moment that phase is raised', () => {
    // The rule, not the run. Invoking rls.run() here would spawn the entire
    // attack suite from inside a unit test -- a test that runs a test suite,
    // which is how a fast feedback loop stops being one.
    const rls = stages.find((s) => s.id === 'rls')
    expect(rls.phase).toBe('tenancy')
    const incomplete = { detail: '13 assertions, 5/16 cases', status: PENDING }
    // Phases named explicitly, never the ambient one. This asserted that the
    // tenancy stage stays PENDING -- true at the committed phase and false
    // under `XFORGE_PHASE=tenancy`, so a local qualification run failed on the
    // test rather than on the thing being qualified.
    expect(settleStatus({ ...rls, phase: 'second-country' }, incomplete).status).toBe(PENDING)
    expect(settleStatus({ ...rls, phase: 'spine' }, incomplete).status).toBe(FAIL)
  })
})

/**
 * The behavioural invariant, and the only check in the gate that does not
 * depend on the source universe's category vocabulary being complete.
 */
describe('the gate leaves no trace', () => {
  const stage = stages.find((s) => s.id === 'idempotence')

  it('exists, runs last, and enforces law 33', () => {
    expect(stage).toBeDefined()
    expect(stages.at(-1).id).toBe('idempotence')
    expect(stage.enforces).toContain(33)
  })

  it('passes on a tree that was already dirty when the run started', () => {
    // "Does not MUTATE", not "is clean". Comparing against a clean tree would
    // fail on any uncommitted work and make the gate unusable during
    // development -- and an ignored gate is the same as no gate. This test runs
    // with whatever the working tree happens to hold, which is the point.
    expect([PASS, BLOCKED]).toContain(stage.run().status)
  })
})

/**
 * The gate's verdict is a state machine, so it is tested as one.
 *
 * It was statement ordering, and the ordering was wrong: the zero-pass branch
 * sat above the CI blocked-is-failure rule and exited 0 unconditionally. A
 * `--ci` run in which every stage was empty, pending or blocked reported
 * success -- the exact sentence verify.mjs's header forbids.
 *
 * Reordering two branches would have fixed the observed case and left
 * `0 pass, 0 blocked, --ci` still green, so the rule under test is the stronger
 * one: a CI verification with zero PASS stages is never successful.
 */
describe('the gate cannot report success without enforcing something', () => {
  const outcome = (pass, blocked, ci) => decideGateOutcome({ blocked, ci, fail: 0, pass })

  it.each([
    [1, 0, true, 0],
    [1, 1, true, 1],
    [0, 1, true, 1],
    [0, 0, true, 1],
    [0, 0, false, 0],
  ])('pass=%i blocked=%i ci=%s exits %i', (pass, blocked, ci, exit) => {
    expect(outcome(pass, blocked, ci).exit).toBe(exit)
  })

  // The one the reordering would have missed. Nothing ran, nothing was blocked,
  // and under merge authority that is not a pass.
  it('refuses a CI run that enforced nothing, even with nothing blocked', () => {
    expect(outcome(0, 0, true)).toEqual({ exit: 1, kind: 'nothing-enforced-ci' })
  })

  // Locally the same state is legitimate on an empty repository.
  it('keeps the local message for the same state', () => {
    expect(outcome(0, 0, false)).toEqual({ exit: 0, kind: 'nothing-enforced' })
  })

  it('fails on a failing stage whatever else is true', () => {
    expect(decideGateOutcome({ blocked: 0, ci: false, fail: 1, pass: 99 }).exit).toBe(1)
  })
})

/**
 * Timings are printed on every run, so they are output the gate is read from.
 *
 * The first draft printed `NaNs` in every row: the duration was attached to the
 * pushed result and the print read it from the raw one. Nothing caught it --
 * `unusableFinding()` asserts a GUARD's message carries no interpolated NaN, and
 * nothing makes the same demand of the gate's own output. These tests are that
 * demand, at the only place it is mechanically expressible.
 */
describe('stage timings', () => {
  it('formats a fixed-width duration', () => {
    expect(formatDuration(1234).trim()).toBe('1.23s')
    expect(formatDuration(0).trim()).toBe('0.00s')
    expect(formatDuration(1234)).toHaveLength(formatDuration(9).length)
  })

  it('never renders a duration as NaN', () => {
    expect(formatDuration(510)).not.toContain('NaN')
  })

  it('reports the slowest three, in order', () => {
    const { slowest } = summariseTimings([
      { ms: 10, stage: { title: 'a' } },
      { ms: 400, stage: { title: 'b' } },
      { ms: 200, stage: { title: 'c' } },
      { ms: 300, stage: { title: 'd' } },
    ])
    expect(slowest.map((r) => r.stage.title)).toEqual(['b', 'd', 'c'])
  })

  it('sums only what was actually timed', () => {
    const { total } = summariseTimings([{ ms: 10 }, { stage: { title: 'untimed' } }, { ms: 5 }])
    expect(total).toBe(15)
  })

  /**
   * The most interesting number in a run is how long the FAILING stage took.
   * The duration is captured before the fail-fast branch precisely so it
   * survives, and this is what would notice if that moved.
   */
  it('charges a failing stage for its own time', () => {
    const { slowest, total } = summariseTimings([
      { ms: 40_000, stage: { title: 'integration tests' }, status: 'FAIL' },
      { ms: 10, stage: { title: 'lint' }, status: 'PASS' },
    ])
    expect(total).toBe(40_010)
    expect(slowest[0]?.stage.title).toBe('integration tests')
  })
})

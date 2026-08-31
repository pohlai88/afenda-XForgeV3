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

describe('the repository owns the phase', () => {
  it('reads a committed phase that is a known phase', () => {
    expect(PHASES).toContain(COMMITTED_PHASE)
  })

  it('ignores the environment entirely under --ci', () => {
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = PHASES[PHASES.length - 1]
    try {
      expect(resolvePhase({ ci: true })).toBe(COMMITTED_PHASE)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
    }
  })

  it('lets the environment RAISE the phase locally', () => {
    const ahead = PHASES[PHASES.indexOf(COMMITTED_PHASE) + 1]
    if (!ahead) return
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = ahead
    try {
      expect(resolvePhase({ ci: false })).toBe(ahead)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
    }
  })

  it('REJECTS an environment phase behind the committed one', () => {
    const behindIndex = PHASES.indexOf(COMMITTED_PHASE) - 1
    if (behindIndex < 0) return // nothing is behind 'spine'
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = PHASES[behindIndex]
    try {
      expect(() => resolvePhase({ ci: false })).toThrow(/BEHIND the committed phase/)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
    }
  })

  it('REJECTS an unknown environment phase', () => {
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = 'not-a-phase'
    try {
      expect(() => resolvePhase({ ci: false })).toThrow(/not a known phase/)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
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
  const pending = { status: PENDING, detail: 'activates in the tenancy phase' }

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
      const r = { status, detail: 'd' }
      expect(settleStatus({ id: 'x', phase: 'spine' }, r)).toBe(r)
    }
  })

  it('would turn the tenancy stage red the moment that phase is raised', () => {
    // The rule, not the run. Invoking rls.run() here would spawn the entire
    // attack suite from inside a unit test -- a test that runs a test suite,
    // which is how a fast feedback loop stops being one.
    const rls = stages.find((s) => s.id === 'rls')
    expect(rls.phase).toBe('tenancy')
    const incomplete = { status: PENDING, detail: '13 assertions, 5/16 cases' }
    expect(settleStatus(rls, incomplete).status).toBe(PENDING)
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

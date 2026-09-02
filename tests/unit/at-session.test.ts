/**
 * The assistive-technology evidence gate, shown the inputs it must refuse.
 *
 * WHY THIS SUITE EXISTS, stated as the defect it closes. The gate decided the
 * whole A11y-3 question with one comparison:
 *
 *     typeof recorded !== 'number' || recorded < contract.interaction.revision
 *
 * So `{ "Dialog": { "interactionRevision": 1 } }` was a pass. No screen reader,
 * no version, no browser, no date, no tester, nothing announced -- while the
 * ledger's own header said "A session records the tool and its version because
 * 'tested with a screen reader' is not evidence", and ADR-025 required a
 * verbatim transcript per scenario. Two prose sources agreed with each other,
 * and the code agreed with neither.
 *
 * The first case below is that exact literal. It is here because a gate proves
 * nothing by passing, and this one had never been shown anything to refuse --
 * which is ADR-024's argument applied to the check that guards accessibility
 * rather than to a structural guard.
 */

import { describe, expect, it } from 'vitest'
import {
  REQUIRED_PAIRINGS,
  SUPPORTED_AT,
  sessionFailures,
  // @ts-expect-error -- untyped .mjs policy module, deliberately outside the app
  // graph. NOT the reason the old path carried ("tooling is untyped"): this
  // module is in packages/, and it is the same shape for a different cause, so
  // it gets its own sentence rather than inheriting a wrong one.
} from '../../packages/design/policy/interaction/assistive-technology.mjs'

/** One real sitting, with everything the ledger and ADR-025 promise. */
const run = (at: string, browser: string) => ({
  at: { name: at, version: '2024.4' },
  browser: { name: browser, version: '131' },
  date: '2026-09-02',
  os: 'Windows 11',
  scenarios: [
    {
      announced: 'Edit employee, dialog. Employee number, edit, blank.',
      name: 'opening moves focus to the first field',
    },
  ],
  tester: 'J. Wee',
})

/** What a satisfied obligation looks like: both required pairings, transcribed. */
const complete = {
  interactionRevision: 1,
  runs: REQUIRED_PAIRINGS.map((p: { at: string; browser: string }) => run(p.at, p.browser)),
}

describe('a recorded session', () => {
  it('is accepted when it carries what the ledger promises', () => {
    expect(sessionFailures('Dialog', complete, 1)).toEqual([])
  })

  /**
   * ABSENCE IS NOT MALFORMATION, and the gate needs them apart: an empty ledger
   * is the honest state the phase treats as a precondition, while a malformed
   * entry is a claim of coverage and fails immediately.
   */
  it('is not malformed merely by being absent', () => {
    expect(sessionFailures('Dialog', undefined, 1)).toEqual([])
  })
})

describe('the gate refuses', () => {
  it('the bare integer that used to satisfy it', () => {
    const failures = sessionFailures('Dialog', { interactionRevision: 1 }, 1)
    expect(failures.length).toBeGreaterThan(0)
    expect(failures.join('\n')).toContain('runs is empty')
  })

  it('a session with no transcript of what was said', () => {
    const noTranscript = {
      ...complete,
      runs: [{ ...run('NVDA', 'Chrome'), scenarios: [{ name: 'opens' }] }, run('JAWS', 'Chrome')],
    }
    expect(sessionFailures('Dialog', noTranscript, 1).join('\n')).toContain('announced is missing')
  })

  it('a session that exercised no scenario at all', () => {
    const empty = { ...complete, runs: [{ ...run('NVDA', 'Chrome'), scenarios: [] }] }
    expect(sessionFailures('Dialog', empty, 1).join('\n')).toContain('scenarios is empty')
  })

  it('a reader nobody can re-run, because no version was recorded', () => {
    const noVersion = {
      ...complete,
      runs: [{ ...run('NVDA', 'Chrome'), at: { name: 'NVDA' } }, run('JAWS', 'Chrome')],
    }
    expect(sessionFailures('Dialog', noVersion, 1).join('\n')).toContain('at.version is missing')
  })

  it('an unattributed result', () => {
    const anonymous = {
      ...complete,
      runs: [{ ...run('NVDA', 'Chrome'), tester: '' }, run('JAWS', 'Chrome')],
    }
    expect(sessionFailures('Dialog', anonymous, 1).join('\n')).toContain('tester is missing')
  })

  it('a screen reader outside the pairing set', () => {
    const invented = {
      ...complete,
      runs: [run('ScreenReaderPro', 'Chrome'), run('JAWS', 'Chrome')],
    }
    const failures = sessionFailures('Dialog', invented, 1).join('\n')
    expect(failures).toContain(`not one of ${SUPPORTED_AT.join(', ')}`)
  })

  /**
   * ONE READER IS NOT A RESULT. JAWS and NVDA disagree often enough that a
   * single reading cannot separate a component defect from a reader quirk --
   * which is the whole reason the pairing set has two entries rather than one.
   */
  it('a single pairing, however well transcribed', () => {
    const oneReader = { ...complete, runs: [run('NVDA', 'Chrome')] }
    expect(sessionFailures('Dialog', oneReader, 1).join('\n')).toContain('no session on JAWS')
  })

  it('evidence recorded below the contract revision it claims to describe', () => {
    // Staleness stays the CALLER's business -- `missing`, in `ledgerFailures` --
    // so this asserts the direction that is malformed rather than merely old:
    // a revision ABOVE the contract's describes a component that never shipped.
    expect(
      sessionFailures('Dialog', { ...complete, interactionRevision: 4 }, 1).join('\n'),
    ).toContain('is above the contract')
  })

  it('anything that is not an object at all', () => {
    expect(sessionFailures('Dialog', 1, 1).join('\n')).toContain('not an object')
    expect(sessionFailures('Dialog', null, 1).join('\n')).toContain('not an object')
    expect(sessionFailures('Dialog', [], 1).join('\n')).toContain('not an object')
  })
})

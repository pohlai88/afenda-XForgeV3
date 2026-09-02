/**
 * The two interaction validators whose subject is not in scope at import.
 *
 * WHY THIS FILE IS OWED, in the words of the module that owes it.
 * `policy/interaction/index.mjs` runs seven assertions on import and names the
 * two it cannot:
 *
 *   assertProfileKeyboard   takes the profile list from `contracts.ts`, which is
 *                           TypeScript. Node strips types on import, but only
 *                           dynamically, and an import-time `await` there would
 *                           make every consumer of that tree an async module for
 *                           one assertion.
 *   assertFocusSurvives     takes the state axes as its subject, and the point of
 *                           passing them is that it can be shown a vocabulary
 *                           that does not contain them. Running it in the barrel
 *                           against the module next door would make it a check on
 *                           one file's agreement with itself.
 *
 * Both constraints are real and neither is a reason to leave the validators
 * uncalled. A test has no import-time budget and can hold two vocabularies at
 * once, which is exactly what these two need. Until this file existed they were
 * falsifiable functions that nothing called -- the same as deleted, minus the
 * honesty, and `index.mjs` said so.
 *
 * WHAT THE PROFILE HALF CLOSES. `keyboard.mjs` claimed `contracts.ts` owned an
 * `INTERACTION_PROFILES` export "so the union, the runtime list and this table
 * are one fact with one owner and two checks", and claimed `PROFILE_KEYBOARD`
 * "cannot drift from `contracts.ts` in either direction". The identifier
 * appeared exactly once in the repository: inside that comment. There were four
 * copies of the eight names -- the union, `PROFILE_KEYBOARD`, `PROFILE_COVERAGE`
 * and a hand-written array in `design-contracts.test.ts` -- all agreeing, and
 * only the middle two compared to each other.
 *
 * EVERY CHECK BELOW IS SHOWN A VIOLATION. A validator that has only ever seen
 * good input is indistinguishable from one that returns early, which is ADR-024
 * applied to the thing that would report the coverage.
 */

import { describe, expect, it } from 'vitest'
import { INTERACTION_PROFILES } from '../../packages/design/policy/contracts'
import {
  assertFocusSurvives,
  assertProfileKeyboard,
  FOCUS_SURVIVES,
  PROFILE_KEYBOARD,
  STATE_AXES,
  // @ts-expect-error -- untyped .mjs policy module, deliberately outside the app
  // graph. Imported through the barrel because that is the tree's stated single
  // entry point, which also means loading this file runs the seven import-time
  // assertions `index.mjs` does hold.
} from '../../packages/design/policy/interaction/index.mjs'
import { PROCESS_STATUSES, type UnlistedWriteStatus } from '../../packages/design/policy/state'

/** The shape of a `STATE_AXES` entry, which arrives untyped from the `.mjs` tree. */
interface Axis {
  paints: boolean
  values: string[]
}

/** A keyboard table that satisfies the validator, to perturb one field at a time. */
const entry = (over: Record<string, unknown> = {}) => ({
  focus: 'ordinary tab order',
  keys: ['Tab'],
  suppliedBy: 'platform',
  ...over,
})

/**
 * The real table with one profile's entry replaced, or omitted when `over` is
 * undefined. Rebuilt rather than mutated: `PROFILE_KEYBOARD` is deep-frozen, and
 * a helper that edited a copy in place would be one `delete` away from perturbing
 * the table every other test in this file reads.
 */
const withEntry = (profile: string, over?: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(PROFILE_KEYBOARD as Record<string, unknown>)
      .map(([key, value]) => [key, key === profile ? over : value])
      .filter(([, value]) => value !== undefined),
  )

describe('the profile list and what each profile owes a keyboard', () => {
  /**
   * THE CHECK THE COMMENT PROMISED, now actually run.
   *
   * `assertProfileKeyboard` walks both directions: every profile a contract can
   * declare has a keyboard entry, and no entry names a profile that does not
   * exist. That is the whole of "one fact with one owner".
   */
  it('agree in both directions', () => {
    expect(() => assertProfileKeyboard(INTERACTION_PROFILES)).not.toThrow()
  })

  /**
   * The vacuous pass, refused. Without this the suite above would be green
   * against an empty list, having compared nothing to eight entries.
   */
  it('refuses to run against no profile list at all', () => {
    expect(() => assertProfileKeyboard([])).toThrow(/given no profile list/)
    expect(() => assertProfileKeyboard(undefined)).toThrow(/given no profile list/)
  })

  it('refuses a profile a contract can declare that owes no stated behaviour', () => {
    expect(() => assertProfileKeyboard([...INTERACTION_PROFILES, 'invented'])).toThrow(
      /'invented' is declarable by a contract and owes no stated keyboard behaviour/,
    )
  })

  /**
   * The other direction, and it is the one a deletion breaks. Dropping a profile
   * from the union leaves `PROFILE_KEYBOARD` describing something no component
   * can be -- which reads as coverage and is not.
   */
  it('refuses a keyboard entry for a profile no contract can declare', () => {
    const withoutDisclosure = INTERACTION_PROFILES.filter((p) => p !== 'disclosure')
    expect(() => assertProfileKeyboard(withoutDisclosure)).toThrow(
      /keyboard behaviour is declared for 'disclosure', which no contract can declare/,
    )
  })

  /**
   * AN EMPTY `keys` IS A FACT AND A MISSING ONE IS AN OVERSIGHT, which is the
   * distinction the validator exists to hold. `live-region` and `none` really do
   * owe no keystrokes; a profile whose author forgot the field must not read the
   * same way.
   */
  it('accepts an empty keys list and refuses an absent one', () => {
    expect(() =>
      assertProfileKeyboard(INTERACTION_PROFILES, withEntry('none', entry({ keys: [] }))),
    ).not.toThrow()

    // Written out rather than derived by removing a key, so that what is ABSENT
    // is visible in the literal.
    const noKeys = { focus: 'takes none', suppliedBy: 'platform' }
    expect(() => assertProfileKeyboard(INTERACTION_PROFILES, withEntry('none', noKeys))).toThrow(
      /declares no keys array/,
    )
  })

  it('refuses a profile that says nothing about focus', () => {
    expect(() =>
      assertProfileKeyboard(INTERACTION_PROFILES, withEntry('modal', entry({ focus: '   ' }))),
    ).toThrow(/says nothing about focus/)
  })

  /**
   * `suppliedBy` decides how much of the behaviour this repository is on the
   * hook for, so an unrecognised value is not a typo to tolerate.
   */
  it('refuses a supplier outside the closed set', () => {
    expect(() =>
      assertProfileKeyboard(
        INTERACTION_PROFILES,
        withEntry('modal', entry({ suppliedBy: 'probably-fine' })),
      ),
    ).toThrow(/is supplied by 'probably-fine'/)
  })

  it('refuses a profile with no entry at all', () => {
    expect(() =>
      assertProfileKeyboard(INTERACTION_PROFILES, withEntry('composite', undefined)),
    ).toThrow(/'composite' is declarable by a contract and owes no stated keyboard behaviour/)
  })
})

describe('the states focus must survive', () => {
  /**
   * The cross-check `FOCUS_SURVIVES` was written for: each entry names a value
   * on a real `STATE_AXES` axis, so a state renamed over there goes red here
   * rather than quietly protecting nothing.
   */
  it('are all values on a real state axis', () => {
    expect(() => assertFocusSurvives(STATE_AXES)).not.toThrow()
  })

  it('refuses to run against no axes at all', () => {
    expect(() => assertFocusSurvives(null)).toThrow(/given no state axes/)
    expect(() => assertFocusSurvives(undefined)).toThrow(/given no state axes/)
  })

  /**
   * THE FAILURE THIS EXISTS FOR, shown rather than described: a vocabulary that
   * does not contain the protected states. Passing the axes as an argument is
   * only meaningful if the function can be handed a different set.
   */
  it('refuses a vocabulary that does not contain the protected states', () => {
    const renamed = {
      ...STATE_AXES,
      selection: { paints: true, values: ['unselected', 'active'] },
    }
    expect(() => assertFocusSurvives(renamed)).toThrow(
      /focus is declared to survive 'selected', which is not a value on any state axis/,
    )
    expect(() => assertFocusSurvives({})).toThrow(/is not a value on any state axis/)
  })

  it('refuses an empty survival list, which would hold over nothing', () => {
    expect(() => assertFocusSurvives(STATE_AXES, [])).toThrow(
      /no states are declared as surviving focus/,
    )
  })

  /** Every protected state is real today, asserted from the axes rather than transcribed. */
  it('names only states the axes actually declare', () => {
    const declared = new Set(
      Object.values(STATE_AXES as Record<string, Axis>).flatMap((axis) => axis.values),
    )
    for (const state of FOCUS_SURVIVES as readonly string[]) {
      expect(declared).toContain(state)
    }
  })
})

/**
 * The one axis whose vocabulary belongs to another file.
 *
 * `process` is `paints: false`, so it mints no token and `stateFailures` never
 * walks it, and `assertStateAxes` only ever checked the table's SHAPE. That left
 * two vocabularies for one concept with no way to contradict each other, and
 * they did not even agree: the axis said `success` and `failure`, which nothing
 * in this repository produces, and omitted `conflict`, which is an entire write
 * outcome that screens render.
 *
 * The axis cannot import `state.ts` -- it is `.mjs` reading a TypeScript union,
 * the same constraint that keeps `assertProfileKeyboard` out of the barrel. So
 * the comparison lives here, which is the whole reason this file is the right
 * home for it.
 */
describe('the process axis and the statuses the application produces', () => {
  /**
   * Fetched through a lookup that THROWS rather than through an index that may
   * be undefined. Under `noUncheckedIndexedAccess` the difference is not
   * cosmetic: `axes.process?.values` would leave every assertion below passing
   * over `undefined` if the axis were ever renamed or removed, which is the
   * vacuous-green shape this whole file exists to refuse.
   */
  const axisNamed = (name: string): Axis => {
    const axis = (STATE_AXES as Record<string, Axis | undefined>)[name]
    if (axis === undefined) {
      throw new Error(`no '${name}' axis is declared -- the checks below would pass over nothing`)
    }
    return axis
  }

  const process = axisNamed('process')

  it('are the same set, in one direction and the other', () => {
    expect(new Set(process.values)).toEqual(new Set<string>(PROCESS_STATUSES))
  })

  /**
   * THE FAILURE THIS REPLACES, pinned by name so a revert is loud. Neither word
   * was ever produced by anything; they were borrowed from the validation axis
   * because the process axis had no producers of its own to borrow from.
   */
  it('no longer carry the two words nothing produced', () => {
    expect(process.values).not.toContain('success')
    expect(process.values).not.toContain('failure')
  })

  it('carry the write outcome the axis used to omit', () => {
    expect(process.values).toContain('conflict')
  })

  /**
   * Compile-time, in the direction `satisfies` cannot reach.
   *
   * `PROCESS_STATUSES` is declared `satisfies readonly (...)[]`, which refuses a
   * member that is not a real status -- how `'failure'` would have been caught.
   * It cannot refuse a status that is MISSING. `UnlistedWriteStatus` is
   * `Exclude<WriteOutcome['status'], PROCESS_STATUSES[number]>`, so a write that
   * gains a state and is not listed makes this annotation stop compiling.
   *
   * WRITTEN AS A CONDITIONAL AND NOT AS `UnlistedWriteStatus[] = []`, which was
   * the first attempt and could not fail: an empty array literal is assignable to
   * an array of ANY element type, so it stayed green with a status missing. The
   * form below collapses to `true` only while the exclusion is empty, and to
   * `false` the moment it is not -- at which point assigning `true` is an error.
   */
  it('list every status a write can be in', () => {
    const everyWriteStatusListed: UnlistedWriteStatus extends never ? true : false = true
    expect(everyWriteStatusListed).toBe(true)
  })

  /**
   * `process` is the only axis that does not paint, and that is load-bearing:
   * `paints` decides whether a missing colour role is a defect or a category
   * error, and a field with one value in practice stops being able to say so.
   * Deleting this axis -- the other way to resolve the clash -- would have taken
   * the distinction with it.
   */
  it('are the only axis that does not paint', () => {
    const unpainted = Object.entries(STATE_AXES as Record<string, Axis>)
      .filter(([, axis]) => !axis.paints)
      .map(([name]) => name)
    expect(unpainted).toEqual(['process'])
  })
})

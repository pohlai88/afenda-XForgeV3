/**
 * The two interaction validators whose subject is not in scope at import.
 *
 * `policy/interaction/index.mjs` runs its assertions on import and names the
 * two it cannot:
 *
 *   assertProfileKeyboard   takes a profile list as its subject, and the point of
 *                           passing one is that it can be shown a list the table
 *                           does not agree with.
 *   assertFocusSurvives     takes the state axes as its subject, for the same
 *                           reason: running it in the barrel against the module
 *                           next door would make it a check on one file's
 *                           agreement with itself.
 *
 * A test has no import-time budget and can hold two vocabularies at once, which
 * is exactly what these two need. Until this file existed they were falsifiable
 * functions that nothing called -- the same as deleted, minus the honesty.
 *
 * WHAT THIS FILE NO LONGER CLAIMS. It used to compare `PROFILE_KEYBOARD` with
 * the contract registry's `INTERACTION_PROFILES`, and the process axis with the
 * application's `PROCESS_STATUSES`. Both of those second sources were deleted in
 * ae4e294 and nothing declares them now, so the "agree in both directions"
 * cases went with them rather than being kept green against a list derived
 * from the very table under test. What remains is every REFUSAL the validators
 * make, each shown the violation it refuses.
 *
 * Reached through `@xforge/design/policy`, the package's declared export
 * (ADR-033), which also means loading this file runs the import-time
 * assertions `index.mjs` does hold.
 */

import {
  assertFocusSurvives,
  assertProfileKeyboard,
  FOCUS_SURVIVES,
  PROFILE_KEYBOARD,
  STATE_AXES,
  // @ts-expect-error -- untyped .mjs policy module, deliberately outside the app
  // graph.
} from '@xforge/design/policy'
import { describe, expect, it } from 'vitest'

/** The shape of a `STATE_AXES` entry, which arrives untyped from the `.mjs` tree. */
interface Axis {
  paints: boolean
  values: string[]
}

/**
 * The profiles the keyboard table describes. DERIVED from the table, so the
 * cases below test the validator's refusals -- not the table's agreement with
 * a second list, which no longer exists.
 */
const PROFILES: string[] = Object.keys(PROFILE_KEYBOARD as Record<string, unknown>)

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

describe('what each profile owes a keyboard', () => {
  it('has profiles to check', () => {
    expect(PROFILES.length).toBeGreaterThan(3)
    expect(PROFILES).toContain('modal')
  })

  it('accepts the table against its own profile list', () => {
    expect(() => assertProfileKeyboard(PROFILES)).not.toThrow()
  })

  /**
   * The vacuous pass, refused. Without this the case above would be green
   * against an empty list, having compared nothing to the table.
   */
  it('refuses to run against no profile list at all', () => {
    expect(() => assertProfileKeyboard([])).toThrow(/given no profile list/)
    expect(() => assertProfileKeyboard(undefined)).toThrow(/given no profile list/)
  })

  it('refuses a profile a contract can declare that owes no stated behaviour', () => {
    expect(() => assertProfileKeyboard([...PROFILES, 'invented'])).toThrow(
      /'invented' is declarable by a contract and owes no stated keyboard behaviour/,
    )
  })

  /**
   * The other direction, and it is the one a deletion breaks: an entry left
   * describing a profile nothing can be reads as coverage and is not.
   */
  it('refuses a keyboard entry for a profile no contract can declare', () => {
    const withoutDisclosure = PROFILES.filter((p) => p !== 'disclosure')
    expect(() => assertProfileKeyboard(withoutDisclosure)).toThrow(
      /keyboard behaviour is declared for 'disclosure', which no contract can declare/,
    )
  })

  /**
   * AN EMPTY `keys` IS A FACT AND A MISSING ONE IS AN OVERSIGHT, which is the
   * distinction the validator exists to hold.
   */
  it('accepts an empty keys list and refuses an absent one', () => {
    expect(() =>
      assertProfileKeyboard(PROFILES, withEntry('none', entry({ keys: [] }))),
    ).not.toThrow()

    // Written out rather than derived by removing a key, so that what is ABSENT
    // is visible in the literal.
    const noKeys = { focus: 'takes none', suppliedBy: 'platform' }
    expect(() => assertProfileKeyboard(PROFILES, withEntry('none', noKeys))).toThrow(
      /keys is not an array/,
    )
  })

  it('refuses a profile that says nothing about focus', () => {
    expect(() =>
      assertProfileKeyboard(PROFILES, withEntry('modal', entry({ focus: '   ' }))),
    ).toThrow(/says nothing about focus/)
  })

  /**
   * `suppliedBy` decides how much of the behaviour this repository is on the
   * hook for, so an unrecognised value is not a typo to tolerate.
   */
  it('refuses a supplier outside the closed set', () => {
    expect(() =>
      assertProfileKeyboard(PROFILES, withEntry('modal', entry({ suppliedBy: 'probably-fine' }))),
    ).toThrow(/is supplied by 'probably-fine'/)
  })

  it('refuses a profile with no entry at all', () => {
    expect(() => assertProfileKeyboard(PROFILES, withEntry('composite', undefined))).toThrow(
      /'composite' is declarable by a contract and owes no stated keyboard behaviour/,
    )
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
   * does not contain the protected states.
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

describe('the process axis', () => {
  /**
   * Fetched through a lookup that THROWS rather than through an index that may
   * be undefined. Under `noUncheckedIndexedAccess` the difference is not
   * cosmetic: `axes.process?.values` would leave every assertion below passing
   * over `undefined` if the axis were ever renamed or removed.
   */
  const axisNamed = (name: string): Axis => {
    const axis = (STATE_AXES as Record<string, Axis | undefined>)[name]
    if (axis === undefined) {
      throw new Error(`no '${name}' axis is declared -- the checks below would pass over nothing`)
    }
    return axis
  }

  const process = axisNamed('process')

  /**
   * THE FAILURE THIS REPLACES, pinned by name so a revert is loud. Neither word
   * was ever produced by anything; they were borrowed from the validation axis
   * because the process axis had no producers of its own to borrow from.
   */
  it('no longer carries the two words nothing produced', () => {
    expect(process.values).not.toContain('success')
    expect(process.values).not.toContain('failure')
  })

  it('carries the write outcome the axis used to omit', () => {
    expect(process.values).toContain('conflict')
  })

  /**
   * `process` is the only axis that does not paint, and that is load-bearing:
   * `paints` decides whether a missing colour role is a defect or a category
   * error, and a field with one value in practice stops being able to say so.
   */
  it('is the only axis that does not paint', () => {
    const unpainted = Object.entries(STATE_AXES as Record<string, Axis>)
      .filter(([, axis]) => !axis.paints)
      .map(([name]) => name)
    expect(unpainted).toEqual(['process'])
  })
})

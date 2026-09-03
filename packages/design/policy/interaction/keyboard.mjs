/**
 * INTERACTION — keyboard. What each profile owes a keyboard, who supplies it,
 * and which check would notice if it stopped.
 *
 * ── THE MEASURED PAIN THIS CLOSES (law 30) ─────────────────────────────────
 *
 * `.architecture/project-state.md` records the finding, and it is worth quoting
 * because it is the entire reason this file exists rather than being a fourth
 * table nobody reads:
 *
 *     "the property ADR-025 relies on -- a contract joining the gate by
 *      declaring what it is -- holds for the A11Y-3 obligation and does NOT hold
 *      for behavioural conformance in two of five profiles. A second `modal`
 *      contract would inherit the evidence debt automatically and inherit no
 *      conformance at all."
 *
 * That asymmetry is invisible from every direction. A component's provenance
 * header states what it owns and cannot know what covers it. The specs name
 * components and cannot know which profile they stand for. So a profile with no behavioural coverage
 * looks exactly like one with coverage, from both ends, and the only place the
 * difference existed was a table in a state document that its own author records
 * having written from memory and got wrong twice.
 *
 * IT IS DATA HERE, so a new profile cannot be added without deciding what covers
 * it. A gap stays a gap -- `assertKeyboardCoverage` does not demand coverage,
 * it demands a DECLARATION -- because a check that went red on the day it was
 * written for a debt nobody had agreed to pay is one people learn to scroll past.
 *
 * ── MEASURED, NOT TRANSCRIBED ──────────────────────────────────────────────
 *
 * The `covers` entries below were read out of the spec files on 2026-09-02, not
 * copied from the state document. Two things came back different from the prose:
 *
 *   NO e2e SUITE DERIVES ITS SUBJECTS FROM `interaction.profile`. Not two of
 *   five -- none of them. `design-system-conformance.spec.ts` names the reversal
 *   dialog by its button text; the ring test walks whatever takes focus and is
 *   profile-agnostic rather than profile-derived.
 *
 *   THE ONE DERIVATION THAT EXISTS IS A UNIT TEST. `tests/unit/design-contracts.test.ts`
 *   derives the A11y-3 debt from the profiles and refuses a contract that renders
 *   in no tree. That is a real profile-derived check and it is not a browser one.
 *
 * ── WHAT THIS MODULE DOES NOT DO ───────────────────────────────────────────
 *
 * It does not test a keystroke. Nothing here presses Tab; `keys` is a statement
 * of the obligation a profile carries, which is what makes the coverage column
 * answerable. A file that both declared the obligation and claimed to verify it
 * would be the fail-open shape ADR-024 is about.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/* -------------------------------------------------------------- profiles -- */

/**
 * Who supplies the behaviour, which is the field that decides how much risk a
 * profile carries.
 *
 *   platform      the element does it. `<button>` gives role, Enter AND Space,
 *                 and disabled semantics, and re-implementing that is how a
 *                 wrapper loses one of them
 *   library       Base UI does it -- focus traps, `aria-activedescendant`,
 *                 listbox and option roles, arrow traversal
 *   this-system   written here, and therefore proven only by what this
 *                 repository runs
 */
export const KEYBOARD_SUPPLIERS = deepFreeze(['platform', 'library', 'this-system'])

/**
 * What each interaction profile owes a keyboard.
 *
 * KEYED BY PROFILE. This table IS the profile list now: the component registry
 * that held a second copy was deleted in ae4e294, and `assertProfileKeyboard`
 * cross-checks whatever list it is handed against these keys in both directions
 * -- `tests/unit/interaction-policy.test.ts` hands it perturbed copies so that a
 * profile with no entry, and an entry for no profile, are both refused.
 *
 * THAT SENTENCE WAS WRITTEN BEFORE ANY OF IT WAS TRUE, and it is worth knowing
 * which part was the lie. The validator existed and was correct; nothing called
 * it, and the export it needed did not exist. "Cannot drift" described a
 * function with no caller. It is now called from
 * `tests/unit/interaction-policy.test.ts`, proven by planting a ninth profile
 * and watching it go red.
 */
export const PROFILE_KEYBOARD = deepFreeze({
  composite: {
    focus: 'one tab stop; focus may stay put while aria-activedescendant moves',
    keys: ['Tab', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', 'Escape'],
    suppliedBy: 'library',
  },
  'composite-grid': {
    focus: 'one tab stop, roving; two-dimensional traversal with an editor',
    keys: ['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'F2'],
    // Base UI ships no grid. Every branch is written in this repository, which
    // is why it is the profile with the least backing and the most exposure.
    suppliedBy: 'this-system',
  },
  disclosure: {
    focus: 'takes none, and does not move it -- it appears beside its trigger',
    keys: ['Escape'],
    suppliedBy: 'library',
  },
  'form-control': {
    focus: 'ordinary tab order; the name comes from a Field, validity is reported',
    keys: ['Tab'],
    suppliedBy: 'platform',
  },
  'live-region': {
    // NOT A KEYBOARD OBLIGATION AT ALL, and saying so is the point: an empty
    // `keys` list here is a fact, where an absent entry would be an oversight.
    // The risk in a live region is announcement, which is why it is A11y-3
    // gated and why no keystroke would tell you anything about it.
    focus: 'takes none; it announces, and a reader may never visit it',
    keys: [],
    suppliedBy: 'platform',
  },
  modal: {
    focus: 'trapped on open, RETURNED to the trigger on close',
    keys: ['Tab', 'Escape'],
    suppliedBy: 'library',
  },
  'native-control': {
    focus: 'ordinary tab order, supplied by the element',
    keys: ['Tab', 'Enter', 'Space'],
    suppliedBy: 'platform',
  },
  none: {
    focus: 'takes none, declares no interactive role, wires no relationship',
    keys: [],
    suppliedBy: 'platform',
  },
})

/* -------------------------------------------------------------- coverage -- */

/**
 * What actually checks each profile's behaviour, measured 2026-09-02.
 *
 * `derived` is the field the state document's table was really about: whether
 * the suite finds its subjects FROM `interaction.profile`, so a new contract is
 * covered the day it declares one -- or whether it names components, so a new
 * contract is covered the day somebody remembers.
 *
 * A profile with neither coverage nor a `gap` is refused. A profile with a `gap`
 * is an acknowledged debt, and the sentence has to say what is unproven.
 */
export const PROFILE_COVERAGE = deepFreeze({
  composite: {
    derived: false,
    gap:
      'no browser suite exercises arrow traversal or activedescendant for Combobox, the one ' +
      'authored composite (Command, DropdownMenu and Select are vendored and unexported). Base UI ' +
      'supplies the mechanics, so what is unproven is the composition',
    specs: [],
  },
  'composite-grid': {
    derived: false,
    /**
     * DORMANT, and that is a different thing from uncovered.
     *
     * No contract declares this profile, so there is nothing to cover. The
     * `names every profile that has no contracts yet` test is what turns this
     * from dormant into owed -- it went red once already, on the day two
     * contracts declared their profiles, which is exactly when somebody needed
     * telling that no conformance existed for them.
     */
    gap: 'no contract declares composite-grid, so this is dormant rather than uncovered',
    specs: [],
  },
  disclosure: {
    derived: false,
    gap:
      'no authored component is a disclosure; Tooltip is vendored and unexported (ADR-033), so ' +
      'this is dormant rather than uncovered',
    specs: [],
  },
  'form-control': {
    derived: false,
    // The row said `Input` and `Textarea`, covered by the a11y spec, until 2026-09-04:
    // neither component ever existed under src/components and the spec named neither.
    // `keyboard-coverage.test.ts` now holds every subject to an authored file.
    gap:
      'axe over the text-input and date-input stories proves the label and description ' +
      'wiring; no browser case types into a control, tabs through a Field or clears a date, ' +
      "so the platform's keyboard mechanics are unproven here",
    specs: ['e2e/design-system-conformance.spec.ts'],
    subjects: ['TextInput', 'DateInput'],
  },
  'live-region': {
    derived: false,
    gap:
      'whether a reader announces a region that did not exist a moment earlier varies by ' +
      'reader; axe finds the attribute present, which is not the question',
    specs: ['e2e/design-system-conformance.spec.ts'],
  },
  modal: {
    derived: false,
    gap:
      'no authored component is a modal; Dialog is vendored and unexported (ADR-033), so this ' +
      'is dormant rather than uncovered',
    specs: [],
  },
  'native-control': {
    derived: false,
    specs: ['e2e/design-system-conformance.spec.ts'],
    // The ring test walks whatever takes focus, so it is profile-AGNOSTIC rather
    // than profile-derived. The distinction matters: it covers a new control
    // without being told, and it would also pass a page where nothing focusable
    // rendered at all -- which is why it asserts it found more than five stops.
    subjects: ['every tab stop the product routes to'],
  },
  none: {
    derived: false,
    gap:
      'the contract registry this derived from was deleted (ae4e294) with the test that read ' +
      'it; a component owing no keys proves it by rendering nothing focusable, which nothing asserts',
    specs: [],
  },
})

/* ------------------------------------------------------------ assertions -- */

const isPlainRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isFilledString = (value) => typeof value === 'string' && value.trim().length > 0

function assertUniqueFilledStrings(values, where) {
  if (!Array.isArray(values)) {
    throw new Error(`${where} is not an array`)
  }

  const seen = new Set()
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (!isFilledString(value)) {
      throw new Error(`${where}[${i}] is not a non-empty string`)
    }
    if (seen.has(value)) {
      throw new Error(
        `${where} contains '${value}' twice -- duplication inflates obligation or coverage without adding any`,
      )
    }
    seen.add(value)
  }

  return values
}

/**
 * Every profile the registry can declare has exactly one keyboard entry, every
 * entry belongs to a declarable profile, and each entry is structurally useful.
 *
 * The earlier validator checked the two key sets but trusted too much INSIDE an
 * entry: duplicate profile names in the registry, duplicate keys, non-object
 * policies and blank key names could all make a passing table say less than it
 * appeared to. Those are configuration defects, so they fail here rather than
 * being left for a browser test to discover accidentally.
 */
export function assertProfileKeyboard(profiles, keyboard = PROFILE_KEYBOARD) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error(
      'assertProfileKeyboard was given no profile list -- with nothing to compare against, ' +
        'every entry below is consistent with itself and with nothing else',
    )
  }
  if (!isPlainRecord(keyboard)) {
    throw new Error('keyboard policy is not an object keyed by interaction profile')
  }

  assertUniqueFilledStrings(profiles, 'interaction profiles')

  for (const profile of profiles) {
    const policy = keyboard[profile]
    if (policy === undefined) {
      throw new Error(
        `profile '${profile}' is declarable by a contract and owes no stated keyboard ` +
          'behaviour -- a component could declare it and no reader would know what it promised',
      )
    }
    if (!isPlainRecord(policy)) {
      throw new Error(`profile '${profile}' keyboard policy is not an object`)
    }

    assertUniqueFilledStrings(policy.keys, `profile '${profile}'.keys`)

    if (!isFilledString(policy.focus)) {
      throw new Error(
        `profile '${profile}' says nothing about focus -- focus management is the half of a ` +
          'profile that a tree inspection cannot see, so leaving it unstated hides the risk',
      )
    }
    if (!KEYBOARD_SUPPLIERS.includes(policy.suppliedBy)) {
      throw new Error(
        `profile '${profile}' is supplied by '${policy.suppliedBy}', which is not one of ` +
          `${KEYBOARD_SUPPLIERS.join(', ')} -- that field is what says how much of this ` +
          'behaviour this repository is actually on the hook for',
      )
    }
  }

  for (const profile of Object.keys(keyboard)) {
    if (!profiles.includes(profile)) {
      throw new Error(
        `keyboard behaviour is declared for '${profile}', which no contract can declare -- an ` +
          'entry for a profile that does not exist reads as coverage and is not',
      )
    }
  }

  return keyboard
}

/**
 * Every profile that owes keyboard behaviour declares what covers it, or says
 * plainly that nothing does.
 *
 * This remains a DECLARATION gate, not a demand that every debt be paid today.
 * What changes here is that a declaration must itself be reviewable: spec and
 * subject names are real, unique strings; a covered entry says what it covers;
 * and a `derived: true` claim names both the deriving suite and the population
 * it derives over. A filename by itself is not behavioural coverage.
 */
export function assertKeyboardCoverage(coverage = PROFILE_COVERAGE, keyboard = PROFILE_KEYBOARD) {
  if (!isPlainRecord(coverage)) {
    throw new Error('keyboard coverage is not an object keyed by interaction profile')
  }
  if (!isPlainRecord(keyboard)) {
    throw new Error('keyboard policy is not an object keyed by interaction profile')
  }

  for (const profile of Object.keys(keyboard)) {
    const entry = coverage[profile]
    if (entry === undefined) {
      throw new Error(
        `profile '${profile}' declares keyboard behaviour and nothing says what checks it -- ` +
          'not even that nothing does. An undeclared gap is the one this repository measured',
      )
    }
    if (!isPlainRecord(entry)) {
      throw new Error(`coverage for '${profile}' is not an object`)
    }

    if (typeof entry.derived !== 'boolean') {
      throw new Error(
        `coverage for '${profile}' does not say whether its subjects are DERIVED from the ` +
          'profile -- which decides whether a new contract is covered the day it declares one, ' +
          'or the day somebody remembers',
      )
    }

    assertUniqueFilledStrings(entry.specs, `coverage for '${profile}'.specs`)

    if (entry.subjects !== undefined) {
      assertUniqueFilledStrings(entry.subjects, `coverage for '${profile}'.subjects`)
    }
    if (entry.gap !== undefined && !isFilledString(entry.gap)) {
      throw new Error(
        `coverage for '${profile}'.gap is present but empty -- an empty debt records nothing`,
      )
    }

    const hasSpecs = entry.specs.length > 0
    const hasGap = entry.gap !== undefined
    const hasSubjects = Array.isArray(entry.subjects) && entry.subjects.length > 0
    const covered = hasSpecs && !hasGap

    if (entry.derived && !hasSpecs) {
      throw new Error(
        `coverage for '${profile}' claims to derive its subjects but names no spec -- ` +
          'there is no executable mechanism carrying the claim',
      )
    }

    if (!(covered || hasGap)) {
      throw new Error(
        `profile '${profile}' has no covering spec and states no gap -- 'e2e/axe.ts' survived ` +
          'as an uncalled function for exactly this reason, and nothing went red',
      )
    }

    // A claimed covering suite must name its actual subjects. Without this,
    // `specs: ['some-file.spec.ts']` can pass while the file never exercises the
    // profile in question -- the same filename-as-proof failure this policy was
    // introduced to stop.
    if (covered && !hasSubjects) {
      throw new Error(
        `coverage for '${profile}' names a covering spec but no subjects -- a filename is not ` +
          'proof that the profile is exercised',
      )
    }

    if (entry.derived && !hasSubjects) {
      throw new Error(
        `coverage for '${profile}' claims to derive its subjects and names none -- that claim ` +
          'is the one this system relies on, so it does not get made without saying over what',
      )
    }
  }

  for (const profile of Object.keys(coverage)) {
    if (!Object.hasOwn(keyboard, profile)) {
      throw new Error(
        `coverage is declared for '${profile}', which owes no keyboard behaviour -- coverage ` +
          'over nothing reads exactly like coverage',
      )
    }
  }

  return coverage
}

/**
 * One callable invariant for tests and policy bootstrapping. Keeping the two
 * lower-level assertions exported is useful for mutation tests; this function
 * prevents callers that want the WHOLE keyboard policy from accidentally
 * validating only the coverage table and forgetting registry exhaustiveness.
 */
export function assertKeyboardPolicy({
  profiles,
  keyboard = PROFILE_KEYBOARD,
  coverage = PROFILE_COVERAGE,
}) {
  assertProfileKeyboard(profiles, keyboard)
  assertKeyboardCoverage(coverage, keyboard)
  return { coverage, keyboard }
}

/* --------------------------------------------------------------- policy -- */

export const keyboardPolicy = definePolicy({
  assert: assertKeyboardCoverage,
  id: 'interaction.keyboard',
  kind: 'interaction',
})

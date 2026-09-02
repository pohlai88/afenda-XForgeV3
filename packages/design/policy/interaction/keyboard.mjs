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
 * That asymmetry is invisible from every direction. `contracts.ts` states the
 * profile and cannot know what covers it. The specs name components and cannot
 * know which profile they stand for. So a profile with no behavioural coverage
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
 * KEYED BY PROFILE, and `assertProfileKeyboard` cross-checks the keys against
 * the registry's own list in both directions -- so a profile added to
 * `contracts.ts` without an entry here is a red build rather than a silent hole,
 * and an entry here for a profile no contract can declare is refused as coverage
 * over nothing.
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
      'no browser suite exercises arrow traversal or activedescendant for Command, DropdownMenu ' +
      'or Select. Base UI supplies the mechanics, so what is unproven is the composition',
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
      'Tooltip is scanned in the vocabulary suite but no check asserts what a disclosure ' +
      'announces, which is the whole of its risk and is why it is A11y-3 gated',
    specs: ['e2e/design-system-conformance.spec.ts'],
  },
  'form-control': {
    derived: false,
    specs: ['e2e/a11y-conformance.spec.ts'],
    subjects: ['Input', 'Textarea'],
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
    specs: ['e2e/design-system-conformance.spec.ts'],
    // Named individually, by the trigger's button text. A second modal contract
    // inherits the A11y-3 debt automatically and inherits none of this.
    subjects: ['Dialog'],
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
    derived: true,
    specs: ['tests/unit/design-contracts.test.ts'],
    subjects: ['every contract, from the registry'],
  },
})

/* ------------------------------------------------------------ assertions -- */

/**
 * Every profile the registry can declare has a keyboard entry, and no entry
 * names a profile that does not exist.
 *
 * TAKES THE PROFILE LIST AS AN ARGUMENT rather than restating it. `contracts.ts`
 * owns `INTERACTION_PROFILES`, and the `InteractionProfile` union is DERIVED
 * from it -- so the union and the runtime list are not two things that agree,
 * they are one declaration read two ways, and this table is checked against it.
 *
 * THE EARLIER VERSION OF THIS PARAGRAPH CLAIMED EXACTLY THAT AND WAS FALSE. It
 * read "whose exhaustiveness the TypeScript compiler checks against the
 * `InteractionProfile` union -- so the union, the runtime list and this table are
 * one fact with one owner and two checks". The export did not exist; grepped, the
 * identifier appeared once in the repository, in that sentence. There were four
 * copies of the eight names -- the union, this table, `PROFILE_COVERAGE`, and a
 * hand-written array in `tests/unit/design-contracts.test.ts` -- and only the
 * middle two were compared, by `assertKeyboardCoverage`.
 *
 * NOTE WHAT WOULD NOT HAVE BEEN ENOUGH, since the false comment described it:
 * `as const satisfies readonly InteractionProfile[]` proves every member of the
 * list is a profile and never that every profile is in the list. It is the right
 * shape for `PROFILES_REQUIRING_AT_EVIDENCE`, which is deliberately a subset,
 * and the wrong one here. Deriving the union removes the question instead of
 * checking it.
 */
export function assertProfileKeyboard(profiles, keyboard = PROFILE_KEYBOARD) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error(
      'assertProfileKeyboard was given no profile list -- with nothing to compare against, ' +
        'every entry below is consistent with itself and with nothing else',
    )
  }

  for (const profile of profiles) {
    const policy = keyboard[profile]
    if (policy === undefined) {
      throw new Error(
        `profile '${profile}' is declarable by a contract and owes no stated keyboard ` +
          'behaviour -- a component could declare it and no reader would know what it promised',
      )
    }

    if (!Array.isArray(policy.keys)) {
      throw new Error(
        `profile '${profile}' declares no keys array -- an EMPTY array is a fact ('this profile ` +
          "owes no keystrokes'), and a missing one is an oversight. They must not look alike",
      )
    }
    if (typeof policy.focus !== 'string' || policy.focus.trim() === '') {
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
 * IT DOES NOT DEMAND COVERAGE. It demands that the absence be written down, with
 * a sentence saying what is unproven. That is the difference between a debt this
 * repository has decided to carry and one it has not noticed.
 */
export function assertKeyboardCoverage(coverage = PROFILE_COVERAGE, keyboard = PROFILE_KEYBOARD) {
  for (const profile of Object.keys(keyboard)) {
    const entry = coverage[profile]
    if (entry === undefined) {
      throw new Error(
        `profile '${profile}' declares keyboard behaviour and nothing says what checks it -- ` +
          'not even that nothing does. An undeclared gap is the one this repository measured',
      )
    }

    if (typeof entry.derived !== 'boolean') {
      throw new Error(
        `coverage for '${profile}' does not say whether its subjects are DERIVED from the ` +
          'profile -- which decides whether a new contract is covered the day it declares one, ' +
          'or the day somebody remembers',
      )
    }

    if (!Array.isArray(entry.specs)) {
      throw new Error(`coverage for '${profile}' names no specs array`)
    }

    const covered = entry.specs.length > 0 && entry.gap === undefined
    if (!covered && (typeof entry.gap !== 'string' || entry.gap.trim() === '')) {
      throw new Error(
        `profile '${profile}' has no covering spec and states no gap -- 'e2e/axe.ts' survived ` +
          'as an uncalled function for exactly this reason, and nothing went red',
      )
    }

    // A DERIVED SUITE HAS TO SAY WHAT IT DERIVES OVER. "Derived" is the strongest
    // claim in this table -- it is the property ADR-025 rests on -- so a bare
    // `true` with no subject named would be the claim without the mechanism.
    if (entry.derived && (!Array.isArray(entry.subjects) || entry.subjects.length === 0)) {
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

/* --------------------------------------------------------------- policy -- */

export const keyboardPolicy = definePolicy({
  assert: assertKeyboardCoverage,
  id: 'interaction.keyboard',
  kind: 'interaction',
})

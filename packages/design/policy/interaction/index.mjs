/**
 * THE INTERACTION POLICIES. What this design system does to a keyboard, to
 * focus, and to a screen reader — one domain per file, and the only place each
 * is stated.
 *
 * ── THE THREE PRINCIPLES, INHERITED ────────────────────────────────────────
 *
 * `foundations/index.mjs`'s, unchanged, because this tree is its sibling rather
 * than a different kind of thing:
 *
 * 1. SINGLE AUTHORITY, WHICH IS NOT ONE FILE. `index.mjs` is the only entry
 *    point anything imports, so the authority is unchanged and the review
 *    surface is per-domain.
 *
 * 2. FAIL CLOSED. Nothing here assumes a default for input it does not
 *    recognise. An unknown profile is not quietly ungated; a missing coverage
 *    entry is not quietly covered.
 *
 * 3. EVERY TABLE VALIDATES ITSELF, AND EVERY VALIDATOR IS FALSIFIABLE. Each
 *    table has an assertion, and each TAKES ITS SUBJECT AS AN ARGUMENT. A
 *    validator that can only read the frozen constant beside it cannot be shown
 *    a violation, so its passing means "today's data happens to be clean" --
 *    indistinguishable from being broken.
 *
 * ── WHAT IS GOVERNED ───────────────────────────────────────────────────────
 *
 *   states                 five axes that compose, and the one word refused
 *   focus                  one indicator, and it is an outline
 *   keyboard               what each profile owes, and what checks it
 *   accessibility          the WCAG floors, and the three levels of evidence
 *   assistive-technology   what a recorded session must contain
 *
 * ── WHY THE FOUNDATIONS TREE IS THE SIBLING AND NOT THE PARENT ─────────────
 *
 * A foundation answers "what may a value BE" and is checked against
 * `tokens.json`. These answer "what must a component DO", and their subject is
 * `packages/design/policy/contracts.ts`. Two of the five touch no token at all.
 * Folding them into `foundations/` would put a policy with no token beside eight
 * that have nothing else, and the registry's own comment about ordering meaning
 * nothing would stop being true -- `keyboard.mjs` genuinely depends on the
 * contract registry in a way no foundation depends on anything.
 *
 * ── WHAT THIS TREE GOVERNS, AND WHAT IT STILL DOES NOT ─────────────────────
 *
 * ACCESSIBILITY IS NOW LOAD-BEARING, and it became so by SUBTRACTION rather than
 * by gaining a caller. `foundations/color.mjs` -- the token kernel's colour
 * module, moved -- declared its own copy of the three contrast ratios and the
 * 24px target floor. Both copies agreed, which is what a duplicated fact does
 * right up until it stops. The copy is deleted; `color.mjs` imports
 * `ACCESSIBILITY_POLICY` from here, `minimumFor` resolves every colour role's
 * ratio through this table, and the generator reaches `assertTargetMinimum`
 * through the policy barrel. A wrong number here now fails the build.
 *
 * `assertAccessibilityPolicy()` therefore runs at the bottom of this file and
 * runs FIRST across the whole policy tree: `color.mjs` importing the floors is
 * what puts this module earlier in the graph, so a broken floor is reported as a
 * broken floor rather than as a colour role pointing at nothing.
 *
 * THE OTHER FOUR ARE STILL CHECKED ON IMPORT AND NOWHERE ELSE. `stateFailures`
 * and `focusFailures` are written to be called by the generator and are not
 * called by it.
 *
 * ASSISTIVE-TECHNOLOGY IS NOW THE A11Y-3 STAGE, AND THE ROUTE MATTERS MORE THAN
 * THE CLAIM. `tooling/verify/stages.mjs` runs
 * `packages/design/policy/interaction/assistive-technology.mjs` as a subprocess
 * and reads all four categories from `ledgerFailures`. It is the only
 * implementation: `tooling/verify/lib/at-session.mjs` and `at-evidence.mjs` are
 * deleted, and `tests/unit/at-session.test.ts` points here.
 *
 * THIS SECTION HELD THE ACCURATE HALF OF A CONTRADICTION, and that is why it is
 * rewritten rather than simply updated. It read: two files, one obligation,
 * agreeing, and "which of the two survives is open" -- while
 * `assistive-technology.mjs`'s own header, one directory away, said the deletion
 * had already happened. Both described the same fact; one was right. The
 * duplication was found by reading them against each other, which is the review
 * prompt in CLAUDE.md working, and is worth recording because no guard here
 * reads a header.
 *
 * WHAT THE DELETION FLUSHED OUT. The surviving module had never been executed:
 * its CLI block computed `ROOT` at the depth it had in `tooling/verify/lib/`,
 * three levels up rather than four, and resolved
 * `packages/packages/design/policy/contracts.ts`. Import-time checking could not
 * see it, because the block is guarded by `argv[1]`. The stage now invokes it,
 * so that class of defect is a red stage from here on rather than a file nobody
 * runs.
 */

export * from './accessibility.mjs'
export * from './assistive-technology.mjs'
export * from './focus.mjs'
export * from './keyboard.mjs'
export * from './states.mjs'

import { assertPolicyRegistry } from '../define-policy.mjs'
import {
  accessibilityPolicy,
  assertA11yLevels,
  assertAccessibilityPolicy,
} from './accessibility.mjs'
import { assertAtPairings, assistiveTechnologyPolicy } from './assistive-technology.mjs'
import { assertFocusIndicator, focusPolicy } from './focus.mjs'
import { assertKeyboardCoverage, keyboardPolicy } from './keyboard.mjs'
import {
  assertProhibitedNames,
  assertStateAxes,
  assertStateColorRoles,
  assertStateLayers,
  statesPolicy,
} from './states.mjs'

/**
 * Every interaction policy, in one registry.
 *
 * ORDER IS ALPHABETICAL AND MEANS NOTHING, deliberately -- the same reasoning
 * `foundations/index.mjs` records. Each policy's `assert` reads only its own
 * table, so an ordering here would imply a dependency that does not exist and
 * would then have to be maintained.
 */
export const INTERACTION_POLICIES = assertPolicyRegistry([
  accessibilityPolicy,
  assistiveTechnologyPolicy,
  focusPolicy,
  keyboardPolicy,
  statesPolicy,
])

/*
 * EVERY TABLE, CHECKED ON IMPORT. A kernel that checks its subject but not its
 * own configuration is still fail-open, and "someone calls it" is not a
 * guarantee.
 *
 * TWO ARE ABSENT, and they are named rather than quietly skipped -- the same
 * treatment `foundations/index.mjs` gives `assertDensityAxis`, which is a
 * comparison worth stating carefully now that it has been checked: that one runs
 * nowhere either, and the sentence claiming it ran was corrected in the same pass
 * as this. So the shared treatment is the DISCLOSURE, not a shared home.
 *
 *   assertProfileKeyboard   takes the profile list from `contracts.ts`, which is
 *                           TypeScript. Node strips types on import, but only
 *                           dynamically, and an import-time `await` here would
 *                           make every consumer of this tree an async module for
 *                           one assertion.
 *   assertFocusSurvives     takes the state axes as its subject, and the point of
 *                           passing them is that it can be shown a vocabulary
 *                           that does not contain them. Running it here against
 *                           the module next door would make it a check on one
 *                           file's agreement with itself.
 *
 * Both are the SAME class of omission: an assertion whose subject is not in
 * scope at import. Neither is optional, and BOTH NOW RUN in
 * `tests/unit/interaction-policy.test.ts` -- which this paragraph named as their
 * home before the file existed, making two falsifiable validators look held
 * while they were dead. The file has landed and calls both, with each shown a
 * violation rather than only good input.
 *
 * A TEST IS THE RIGHT HOME AND NOT A WORKAROUND. It has no import-time budget,
 * so it can `await import` the TypeScript registry, and it can hold two
 * vocabularies at once -- which is the entire reason these validators take their
 * subject as an argument. Running them here, against the module next door, would
 * make them checks on one file's agreement with itself.
 *
 * PROVEN BY PLANTING, not by passing. A ninth profile added to
 * `INTERACTION_PROFILES` with no keyboard entry now fails with "profile
 * 'tree-grid' is declarable by a contract and owes no stated keyboard
 * behaviour". Before the profile list was exported and this validator called,
 * that same edit produced no red build anywhere in the repository.
 *
 * `assertDensityAxis` in `foundations/index.mjs` is still the genuine remaining
 * case of this shape, and the comparison that paragraph draws now holds in one
 * direction only: it runs nowhere, and these two do.
 */
assertAccessibilityPolicy()
assertA11yLevels()
assertAtPairings()
assertStateAxes()
assertProhibitedNames()
assertStateLayers()
assertStateColorRoles()
assertFocusIndicator()
assertKeyboardCoverage()

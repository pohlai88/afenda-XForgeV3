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
 * `packages/design/src/contracts.ts`. Two of the five touch no token at all.
 * Folding them into `foundations/` would put a policy with no token beside eight
 * that have nothing else, and the registry's own comment about ordering meaning
 * nothing would stop being true -- `keyboard.mjs` genuinely depends on the
 * contract registry in a way no foundation depends on anything.
 *
 * ── AND WHAT THIS TREE DOES NOT YET GOVERN ─────────────────────────────────
 *
 * ONE OF THE FIVE IS WIRED INTO A GATE TODAY, and it is worth saying which:
 * `assistive-technology.mjs` IS the A11y-3 stage, invoked by
 * `tooling/verify/stages.mjs` and covered by `tests/unit/at-session.test.ts`.
 *
 * The other four are checked on import and by the unit suite, and nothing in the
 * GENERATOR reads them yet -- the token pipeline still runs through
 * `tooling/design-system/token-policy/`. `stateFailures` and `focusFailures` are
 * written to be called by it and are not called by it, which is stated here
 * rather than left to be discovered, because a policy tree nobody imports is the
 * exact shape ADR-024 is about. `foundations/` is in the same position and its
 * own header says as much.
 */

export * from './accessibility.mjs'
export * from './assistive-technology.mjs'
export * from './focus.mjs'
export * from './keyboard.mjs'
export * from './states.mjs'

import { assertPolicyRegistry } from '../foundations/contract.mjs'
import { accessibilityPolicy, assertA11yLevels } from './accessibility.mjs'
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
 * treatment `foundations/index.mjs` gives `assertDensityAxis`:
 *
 *   assertProfileKeyboard   takes the profile list from `contracts.ts`, which is
 *                           TypeScript. Node strips types on import, but only
 *                           dynamically, and an import-time `await` here would
 *                           make every consumer of this tree an async module for
 *                           one assertion. It runs in the unit suite, where the
 *                           registry is already in scope.
 *   assertFocusSurvives     takes the state axes as its subject, and the point of
 *                           passing them is that it can be shown a vocabulary
 *                           that does not contain them. Running it here against
 *                           the module next door would make it a check on one
 *                           file's agreement with itself.
 *
 * Both are the SAME class of omission: an assertion whose subject is not in
 * scope at import. Neither is optional, AND NEITHER IS CURRENTLY RUN ANYWHERE --
 * no caller, no suite, no stage. This paragraph named
 * `tests/unit/interaction-policy.test.ts` as their home before that file existed,
 * which made two falsifiable validators look held while they were dead. A
 * validator nothing calls is the same as a deleted one, minus the honesty; the
 * file is owed, and until it lands this is what is true.
 */
assertA11yLevels()
assertAtPairings()
assertStateAxes()
assertProhibitedNames()
assertStateLayers()
assertStateColorRoles()
assertFocusIndicator()
assertKeyboardCoverage()

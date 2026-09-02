/**
 * THE DESIGN POLICY. One entry point, over four trees, and the only thing a
 * consumer outside this directory imports.
 *
 * ── WHAT THIS FILE IS FOR ──────────────────────────────────────────────────
 *
 * There were TWO policy authorities until this commit: a token kernel in
 * `tooling/design-system/token-policy/` that the generator ran, and this tree,
 * which was scaffolded beside it and governed two domains. They overlapped in
 * five places — colour, elevation, the Tailwind bridge, the naming grammar and
 * the accessibility floors — and in every one of them the two copies agreed.
 *
 * That agreement is the whole hazard. `CLAUDE.md` names it: *a fact acquires a
 * second source; the two agree, and go on agreeing, until they do not, and
 * nothing complains in between.* Five appearances were on the list already. This
 * merge removes five more before they got their turn.
 *
 * Every duplicate was resolved by DELETING one side, never by forwarding:
 *
 *   colour       kernel `colour.mjs` won  -> `foundations/color.mjs`. The M3
 *                scaffold it replaced named surfaces no token in this system has
 *   elevation    kernel `form.mjs` won    -> `foundations/elevation.mjs`, renamed
 *                at last, as that file said it should be
 *   tailwind     kernel `tailwind.mjs` won -> `projection/tailwind.mjs`. The
 *                scaffold declared namespaces the generator never emitted
 *   identity     kernel `vocabulary.mjs` won. `projection/identity.mjs` is gone;
 *                naming is the grammar every projection shares, not a target
 *   floors       `interaction/accessibility.mjs` won — the strict superset — and
 *                colour imports the table back
 *
 * ── THE FOUR TREES, AND WHY THEY ARE FOUR ──────────────────────────────────
 *
 *   vocabulary   the kernel underneath the other three: naming grammar, value
 *                shapes, tiers, lifecycle, contract versions. Not a foundation.
 *                It sits ABOVE the trees rather than inside one, and every module
 *                in all three imports it directly. The `foundations/shared.mjs`
 *                seam that used to stand in front of it was deleted in the same
 *                pass: it existed to state the reach out of `packages/` into
 *                `tooling/` exactly once, and that boundary no longer exists
 *   foundations  "what may a value BE" — checked against `tokens.json`
 *   interaction  "what must a component DO" — checked against `contracts.ts`
 *   projection   "what does a name BECOME" — checked against the generator's own
 *                output
 *
 * ── ORDER IS LOAD-BEARING AND IS NOT STATED HERE ───────────────────────────
 *
 * This barrel runs NO assertions, and that is deliberate rather than an omission.
 * ES modules evaluate every import before the importing module's body, so any
 * sequence written here would run last — after every table it was meant to
 * precede. A list in this file would read correct and be wrong.
 *
 * Each module asserts its own tables instead, and the graph enforces what a list
 * would only describe:
 *
 *   vocabulary.mjs                everything depends on it, so it runs first
 *   interaction/accessibility     `color.mjs` imports the floors, so it runs
 *                                 before colour without either file saying so
 *   foundations/index.mjs         kinds -> alpha -> roles -> elevation, in that
 *                                 order, because those tables reference each other
 *   projection/index.mjs          Tailwind last: the only vocabulary here that
 *                                 belongs to another system
 *
 * ── WHAT IS STILL NOT GOVERNED ─────────────────────────────────────────────
 *
 * Named rather than left to be found, because a barrel is exactly where coverage
 * gets over-read:
 *
 *   lifecycle enforcement  the states are declared and validated; no lint, no
 *                          registry, no compatibility gate consumes them
 *   projection/css.mjs     a complete CSS emitter with no caller. The generator
 *                          assembles blocks itself, so that is one obligation
 *                          with two implementations — the thing this file exists
 *                          to stop. Whichever survives, the other is deleted
 *   interaction, mostly    four of five policies are checked on import and by the
 *                          unit suite, and by nothing else
 *   a TypeScript projection   `token-names.json` is the only manifest
 */

export * from './foundations/index.mjs'
export * from './interaction/index.mjs'
export * from './projection/index.mjs'
export * from './vocabulary.mjs'

import { assertPolicyRegistry } from './foundations/contract.mjs'
import { FOUNDATION_POLICIES } from './foundations/index.mjs'
import { INTERACTION_POLICIES } from './interaction/index.mjs'
import { PROJECTION_POLICIES } from './projection/index.mjs'

/**
 * Every policy in the system, in one registry.
 *
 * `assertPolicyRegistry` refuses a duplicate id across the three trees, which is
 * the one invariant no single tree can check about itself.
 */
export const DESIGN_POLICIES = assertPolicyRegistry([
  ...FOUNDATION_POLICIES,
  ...INTERACTION_POLICIES,
  ...PROJECTION_POLICIES,
])

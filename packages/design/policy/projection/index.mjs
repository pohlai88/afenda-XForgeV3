/**
 * THE PROJECTIONS. What this design system's vocabulary becomes when it leaves
 * this repository — a CSS custom property, a Tailwind namespace, a token path —
 * one target per file, and the only place each is stated.
 *
 * ── THE THREE PRINCIPLES, INHERITED ────────────────────────────────────────
 *
 * `foundations/index.mjs`'s, unchanged, because this tree is its sibling rather
 * than a different kind of thing:
 *
 * 1. SINGLE AUTHORITY, WHICH IS NOT ONE FILE. `index.mjs` is the only entry
 *    point anything imports, so the authority is unchanged and the review
 *    surface is per-target.
 *
 * 2. FAIL CLOSED. Nothing here assumes a default for input it does not
 *    recognise. An unknown group does not quietly project to a default
 *    namespace; a name that collides is not quietly the last one written.
 *
 * 3. EVERY TABLE VALIDATES ITSELF, AND EVERY VALIDATOR IS FALSIFIABLE. Each
 *    table has an assertion, and each TAKES ITS SUBJECT AS AN ARGUMENT. A
 *    validator that can only read the frozen constant beside it cannot be shown
 *    a violation, so its passing means "today's data happens to be clean" --
 *    indistinguishable from being broken.
 *
 * ── WHAT IS GOVERNED ───────────────────────────────────────────────────────
 *
 *   identity    the naming grammar, and that a path projects to exactly one name
 *   css         the serialized value, and the axes a mode may vary on
 *   tailwind    the namespace map, and the utilities it may not shadow
 *
 * ── WHY THIS IS A THIRD TREE AND NOT PART OF EITHER ────────────────────────
 *
 * A foundation answers "what may a value BE" and is checked against
 * `tokens.json`. An interaction policy answers "what must a component DO" and is
 * checked against `contracts.ts`. These answer "what does a name BECOME", and
 * their subject is neither -- it is the output of `tooling/generators/tokens.mjs`.
 * `tailwind.mjs` is the only file in the whole policy tree whose vocabulary
 * belongs to another system, which is why its assertions run last.
 *
 * ── AND WHAT THIS TREE DOES NOT YET GOVERN ─────────────────────────────────
 *
 * NOTHING IMPORTS THIS TREE TODAY. The generator still projects names through
 * `tooling/design-system/token-policy/tailwind.mjs`, and the three policies here
 * are checked on import and nowhere else. That is stated rather than left to be
 * discovered, because a policy tree nobody imports is the exact shape ADR-024 is
 * about -- and both sibling indexes say the same of themselves.
 */

export * from './css.mjs'
export * from './identity.mjs'
export * from './tailwind.mjs'

import { assertPolicyRegistry } from '../foundations/contract.mjs'
import { assertCssModes, cssPolicy } from './css.mjs'
import { assertIdentityConfiguration, identityPolicy } from './identity.mjs'
import { assertTailwindPolicy, tailwindPolicy } from './tailwind.mjs'

/**
 * Every projection policy, in one registry.
 *
 * ORDER IS ALPHABETICAL AND MEANS NOTHING, deliberately -- the same reasoning
 * both sibling indexes record. Each policy's `assert` reads only its own table,
 * so an ordering here would imply a dependency that does not exist and would
 * then have to be maintained.
 */
export const PROJECTION_POLICIES = assertPolicyRegistry([cssPolicy, identityPolicy, tailwindPolicy])

/*
 * EVERY TABLE, CHECKED ON IMPORT. A kernel that checks its subject but not its
 * own configuration is still fail-open, and "someone calls it" is not a
 * guarantee.
 *
 * FOUR ARE ABSENT, and they are named rather than quietly skipped -- the same
 * treatment both siblings give their own omissions. All four take TOKEN PATHS as
 * their subject, and there are no token paths at import time:
 *
 *   assertTokenPath           one path, from the caller walking `tokens.json`
 *   assertUniqueCssNames      every path at once; injectivity is a property of
 *                             the whole set, so a partial set cannot show it
 *   assertTailwindProjection  every path, against the namespace map
 *   assertNoUtilityShadowing  every path, against the contested families
 *
 * They are the generator's to run, over a real token file. Passing them a
 * synthetic set here would make them checks on this file's agreement with
 * itself, which is principle 3 inverted.
 *
 * TAILWIND RUNS LAST, because it is the only projection that leaves this
 * repository's vocabulary for another system's -- so a failure there should be
 * read after every rule about the vocabulary itself has passed. That is the
 * ordering `token-policy/index.mjs` already records for the same reason.
 */
assertIdentityConfiguration()
assertCssModes()
assertTailwindPolicy()

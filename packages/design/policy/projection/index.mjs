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
 *   css         the serialized value, and the axes a mode may vary on
 *   tailwind    the namespace map, and the utilities it may not shadow
 *
 * IDENTITY IS NOT A THIRD FILE ANY MORE, and its absence is the point. This
 * index listed `identity.mjs` -- the naming grammar, and that a path projects to
 * exactly one name -- while `../vocabulary.mjs` held the SAME grammar and was the
 * copy the generator actually ran. Two implementations of "what does this token
 * path become", differing in two ways nobody had compared: the local one required
 * at least two path segments and did not resolve the tier.
 *
 * The vocabulary's copy won, because it was the one under test and under load.
 * `identity.mjs` is deleted rather than left forwarding, and `css.mjs` reaches
 * `cssNameOf`, `cssReferenceOf` and `assertUniqueCssNames` through the vocabulary
 * directly. Naming is not a projection TARGET; it is the grammar every target
 * shares, which is why it sits above this tree rather than inside it.
 *
 * ── WHY THIS IS A THIRD TREE AND NOT PART OF EITHER ────────────────────────
 *
 * A foundation answers "what may a value BE" and is checked against
 * `tokens.json`. An interaction policy answers "what must a component DO" and is
 * checked against `contracts.ts`. These answer "what does a name BECOME", and
 * their subject is neither -- it is the output of
 * `packages/design/policy/generators/tokens.mjs`. `tailwind.mjs` is the only file
 * in the whole policy tree whose vocabulary belongs to another system, which is
 * why its assertions run last.
 *
 * ── WHAT THIS TREE GOVERNS TODAY ───────────────────────────────────────────
 *
 * TAILWIND IS WIRED AND CSS IS NOT, and the asymmetry is stated rather than left
 * to be discovered. This header used to read "NOTHING IMPORTS THIS TREE TODAY",
 * which was true of the scaffold that stood here. `tailwind.mjs` IS the token
 * kernel's Tailwind bridge, moved -- the generator imports `tailwindNameOf`,
 * `UNPROJECTED`, `assertTailwindProjection`, `assertNoUtilityShadowing` and
 * `assertExclusionsAreCurrent` through the policy barrel, and every namespace in
 * `generated/tailwind-theme.css` is projected by it.
 *
 * `css.mjs` is still checked on import and by nothing else. Its emitters --
 * `emitCssBlock`, `emitRootTokens`, `emitModeTokens` -- are written to be called
 * by the generator and are not called by it: the generator has its own
 * `declarations()` and block assembly, which predates this file. That is one fact
 * with two implementations, and it is named here rather than left for the next
 * reader to find. Whichever survives, the other is deleted; a projection nobody
 * imports is the exact shape ADR-024 is about.
 */

export * from './css.mjs'
export * from './tailwind.mjs'

import { assertPolicyRegistry } from '../foundations/contract.mjs'
import { assertCssModes, cssPolicy } from './css.mjs'
import { assertTailwindTables, tailwindPolicy } from './tailwind.mjs'

/**
 * Every projection policy, in one registry.
 *
 * ORDER IS ALPHABETICAL AND MEANS NOTHING, deliberately -- the same reasoning
 * both sibling indexes record. Each policy's `assert` reads only its own table,
 * so an ordering here would imply a dependency that does not exist and would
 * then have to be maintained.
 */
export const PROJECTION_POLICIES = assertPolicyRegistry([cssPolicy, tailwindPolicy])

/*
 * EVERY TABLE, CHECKED ON IMPORT. A kernel that checks its subject but not its
 * own configuration is still fail-open, and "someone calls it" is not a
 * guarantee.
 *
 * FIVE ARE ABSENT, and they are named rather than quietly skipped -- the same
 * treatment both siblings give their own omissions. All five take TOKEN PATHS as
 * their subject, and there are no token paths at import time:
 *
 *   assertTokenPath             one path, from the caller walking `tokens.json`
 *   assertUniqueCssNames        every path at once; injectivity is a property of
 *                               the whole set, so a partial set cannot show it
 *   assertTailwindProjection    every path, against the namespace map
 *   assertNoUtilityShadowing    every path, against the contested prefixes
 *   assertExclusionsAreCurrent  every path, against the exclusion list
 *
 * They are the generator's to run, over a real token file -- and it does run all
 * five. Passing them a synthetic set here would make them checks on this file's
 * agreement with itself, which is principle 3 inverted.
 *
 * TAILWIND RUNS LAST, because it is the only projection that leaves this
 * repository's vocabulary for another system's -- so a failure there should be
 * read after every rule about the vocabulary itself has passed.
 */
assertCssModes()
assertTailwindTables()

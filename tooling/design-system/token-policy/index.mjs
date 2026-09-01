/**
 * THE TOKEN POLICY. The canonical facts about design tokens, and the only place
 * they are stated. Every generator, guard and test derives from here.
 *
 * ── THE THREE PRINCIPLES ───────────────────────────────────────────────────
 *
 * 1. SINGLE AUTHORITY. A fact is stated once and read everywhere else. Two of
 *    these facts used to have two homes: the component ceiling lived in the
 *    generator and again as a hardcoded `12` in `tokens.test.ts`, and the tier
 *    map lived in the generator and again as a `semantic|component` allowlist
 *    inside a guard. Both pairs were correct on the day they were written, which
 *    is the only day that shape of defect is ever correct.
 *
 *    SINGLE AUTHORITY IS NOT ONE FILE, which is why this is a package. The
 *    monolith reached 1100 lines and was still growing a domain at a time; the
 *    boundaries below already existed as section banners. `index.mjs` is the only
 *    entry point anything imports, so the authority is unchanged and the review
 *    surface is per-domain.
 *
 * 2. FAIL CLOSED. Nothing here assumes a default for input it does not
 *    recognise. An unknown group is not quietly a primitive; an unknown policy
 *    kind is not quietly the weaker threshold; an unrecognised value is not
 *    quietly free of alpha. A policy kernel that guesses is one a typo defeats.
 *
 * 3. EVERY TABLE VALIDATES ITSELF, AND EVERY VALIDATOR IS FALSIFIABLE. A table
 *    of rules is configuration, and unvalidated configuration is where the
 *    interesting failures live -- `kind: 'txet'` silently downgraded a text role
 *    to the UI threshold and the generator reported green. So each table has an
 *    assertion, all of them run at the bottom of this file, and each one TAKES
 *    ITS SUBJECT AS AN ARGUMENT. A validator that can only read the frozen
 *    constant beside it cannot be shown a violation, so its passing means
 *    "today's data happens to be clean" -- indistinguishable from being broken.
 *
 * ── WHAT THIS POLICY GOVERNS ───────────────────────────────────────────────
 *
 *   contract      versions, and the lifecycle a token ID may be in
 *   tiers         classification, aliasing edges, component ceiling
 *   identity      naming grammar, CSS projection, injectivity
 *   values        shapes per type, serialization, unit conversion
 *   accessibility the interactive target floor
 *   colour        roles, composition contexts, derived pairs, alpha
 *   typography    rank, size and leading floors, hierarchy under density
 *   motion        the reduced-motion answer every role owes
 *   elevation     layers, and what may separate one from another
 *
 * Colour remains the most developed, because colour is where the defects were.
 * The rest are governed in proportion to what they actually render: typography
 * and motion have consumers and now have rules; a fourth elevation layer does
 * not exist and is not invented here.
 *
 * ── WHAT IT STILL DOES NOT GOVERN ──────────────────────────────────────────
 *
 *   lifecycle enforcement   the states are declared and validated, but nothing
 *                           consumes them yet: no lint, no registry, no
 *                           compatibility gate. Declared is not enforced, and
 *                           saying so is the point.
 *   tracking / letter-spacing   no token, no consumer
 *   a TypeScript projection     token-names.json is the only manifest; a `.d.ts`
 *                           is a ten-line addition the day a component needs a
 *                           token name in TS rather than in CSS
 */

export * from './accessibility.mjs'
export * from './color.mjs'
export * from './contract.mjs'
export * from './elevation.mjs'
export * from './freeze.mjs'
export * from './identity.mjs'
export * from './motion.mjs'
export * from './tiers.mjs'
export * from './typography.mjs'
export * from './values.mjs'

import { assertAccessibilityPolicy } from './accessibility.mjs'
import { assertAlphaPermissions, assertColorPolicyKinds, assertPolicyRegistry } from './color.mjs'
import { assertContractVersions, assertLifecycleRegistry } from './contract.mjs'
import { assertElevationLayers } from './elevation.mjs'
import { assertMotionRoles } from './motion.mjs'
import { assertGroupNamesProjectUnambiguously } from './tiers.mjs'
import { assertTypographyRoles } from './typography.mjs'
import { assertValueShapeRegistry } from './values.mjs'

// Every table above, checked on import. A kernel that checks tokens but not its
// own configuration is still fail-open, and "someone calls it" is not a
// guarantee.
//
// ORDER IS DELIBERATE, cheapest and most foundational first: the kinds table is
// validated before the role registry that classifies against it, so a broken
// threshold is reported as a broken threshold rather than as a puzzling role.
// Elevation runs last because it reaches across into the colour registry, and a
// failure there should name the colour problem first. The version pair runs
// before all of it: it depends on nothing, and a malformed contract version is
// the one failure here that a reader should not have to reach a colour role to
// hear about.
assertContractVersions()
// Before the colour tables, because every measuring colour kind now resolves its
// ratio through this one. A broken floor should be reported as a broken floor
// rather than as a colour kind pointing at nothing.
assertAccessibilityPolicy()
assertGroupNamesProjectUnambiguously()
assertLifecycleRegistry()
assertValueShapeRegistry()
assertColorPolicyKinds()
assertAlphaPermissions()
assertPolicyRegistry()
assertTypographyRoles()
assertMotionRoles()
assertElevationLayers()

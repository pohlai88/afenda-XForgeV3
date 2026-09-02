/**
 * THE FOUNDATIONS. The canonical facts about how this design system looks,
 * one domain per file, and the only place each is stated.
 *
 * ── THE THREE PRINCIPLES, INHERITED ────────────────────────────────────────
 *
 * These are `tooling/design-system/token-policy/index.mjs`'s, unchanged, because
 * this tree is that kernel decomposed rather than a replacement for it:
 *
 * 1. SINGLE AUTHORITY, WHICH IS NOT ONE FILE. A fact is stated once and read
 *    everywhere else. `index.mjs` is the only entry point anything imports, so
 *    the authority is unchanged and the review surface is per-domain.
 *
 * 2. FAIL CLOSED. Nothing here assumes a default for input it does not
 *    recognise. An unknown off-grid kind is not quietly permitted; a density
 *    mode missing from the resolved set is not quietly skipped. A policy kernel
 *    that guesses is one a typo defeats.
 *
 * 3. EVERY TABLE VALIDATES ITSELF, AND EVERY VALIDATOR IS FALSIFIABLE. Each
 *    table has an assertion, all of them run at the bottom of this file, and each
 *    TAKES ITS SUBJECT AS AN ARGUMENT. A validator that can only read the frozen
 *    constant beside it cannot be shown a violation, so its passing means
 *    "today's data happens to be clean" -- indistinguishable from being broken.
 *
 * ── WHAT IS GOVERNED ───────────────────────────────────────────────────────
 *
 *   typography  rank, size and leading floors, hierarchy under density
 *   spacing     the relationship ladder, the 4px grid, the frame that holds still
 *   density     the axis itself: symmetry, exclusivity, the type prohibition
 *   sizing      how big a thing is, and which things may sit off the grid
 *   radius      four roles as a nesting order
 *   stacking    rendering order, which is not elevation
 *   motion      the reduced-motion answer every role owes -- THE ONE DOMAIN
 *               THIS TREE ACTUALLY GOVERNS. `tooling/generators/tokens.mjs`
 *               imports `MOTION_ROLES` and `motionFailures` from this barrel,
 *               and the kernel's copy was deleted in the same commit rather
 *               than left forwarding. It moved first because it could be proven
 *               identical: same exports, four tables byte-for-byte, and matching
 *               failures over inputs that discriminate. Every other domain here
 *               is still checked only on import and by the unit suite
 *   layout      window classes, reading ceilings, the application shell
 *
 * ── PRESENT ON DISK, DELIBERATELY NOT EXPORTED ─────────────────────────────
 *
 * Two domains have a file in this directory that this index does not re-export,
 * so nothing can reach them. The kernel still governs both:
 *
 *   colour      `color.mjs` sits here; `token-policy/colour.mjs` GOVERNS -- the
 *               largest domain, ~1100 lines, and it owns the WCAG target floor
 *               several files here deliberately defer to. TWO COLOUR TABLES NOW
 *               EXIST AND ONE IS WIRED, which is a second source waiting rather
 *               than a completed extraction
 *   elevation   `elevation.mjs` sits here; `token-policy/form.mjs` GOVERNS,
 *               because `assertElevationLayers` reads `COLOR_ROLE_POLICIES`. It
 *               moves after colour, and at that point form.mjs is empty and is
 *               deleted rather than renamed
 *
 * And one has no file here and is not meant to:
 *
 *   tiers       `token-policy/vocabulary.mjs` -- naming grammar, value shapes,
 *               lifecycle. Not a foundation; the kernel underneath them.
 *               `shared.mjs` is the single seam that reaches it
 *
 * ── ELEVEN MORE FILES EXIST HERE THAT THIS INDEX REFUSES ───────────────────
 *
 * They were scaffolded, they load, and nothing exports them. The refusal is
 * per-domain and checkable rather than a preference:
 *
 *   grid, adaptive-layout   zero tokens, and zero `grid-cols-*` / `col-span-*` /
 *                           responsive variants in the product. Folded into
 *                           `layout.mjs` the day columns exist
 *   breakpoints, containers,
 *   shell                   real tokens, but one domain -- they are `layout.mjs`
 *   shape                   duplicate of `radius`
 *   shadow, compositing     duplicate of `elevation`. form.mjs says it outright:
 *                           "LAYER IS STRUCTURE; SHADOW IS ONE EXPRESSION OF IT.
 *                            The two get equated..."
 *   typeset                 the one entry with NO file on disk. Zero tokens, and
 *                           already refused on law 30 by
 *                           `.claude/skills/typeset/references/xforge.md` until a
 *                           renderer emits a tree no component authored
 *   iconography, border     one token each; they live in `sizing.mjs` until a
 *                           second gives them something to order
 *   target-size             a MOVE out of `colour.mjs`, not a new domain
 *
 * A foundation governing zero tokens is a policy file that can only ever pass,
 * which is ADR-024's failure and the phrase `form.mjs` uses twice: *vocabulary
 * with no consumer*.
 *
 * THAT THE FILES ARE ON DISK IS ITSELF THE DEFECT THIS HEADER ONCE HID. It read
 * "ARE NOT BUILT" over a directory where `ls` said otherwise -- a claim and its
 * subject disagreeing with nothing to catch it, which is the shape CLAUDE.md
 * names. Whether the eleven are deleted, or folded into the domains named beside
 * them, is open. That none of them is reachable today is not.
 */

export * from './contract.mjs'
export * from './density.mjs'
export * from './layout.mjs'
export * from './motion.mjs'
export * from './radius.mjs'
export * from './sizing.mjs'
export * from './spacing.mjs'
export * from './stacking.mjs'
export * from './typography.mjs'

import { assertPolicyRegistry } from './contract.mjs'
import { densityPolicy } from './density.mjs'
import { assertLayoutRoles, layoutPolicy } from './layout.mjs'
import { assertMotionRoles, motionPolicy } from './motion.mjs'
import { assertRadiusRoles, radiusPolicy } from './radius.mjs'
import { assertSizeRoles, sizingPolicy } from './sizing.mjs'
import { assertSpacingRoles, spacingPolicy } from './spacing.mjs'
import { assertLayerRoles, stackingPolicy } from './stacking.mjs'
import { assertTypographyRoles, typographyPolicy } from './typography.mjs'

/**
 * Every foundation policy, in one registry.
 *
 * ORDER IS ALPHABETICAL AND MEANS NOTHING, deliberately. The token kernel's
 * import-time order is load-bearing -- the kinds table before the roles that
 * classify against it -- because those tables reference each other. These do not:
 * each foundation's `assert` reads only its own table, so an ordering here would
 * imply a dependency that does not exist and would have to be maintained.
 */
export const FOUNDATION_POLICIES = assertPolicyRegistry([
  densityPolicy,
  layoutPolicy,
  motionPolicy,
  radiusPolicy,
  sizingPolicy,
  spacingPolicy,
  stackingPolicy,
  typographyPolicy,
])

/*
 * EVERY TABLE, CHECKED ON IMPORT. A kernel that checks tokens but not its own
 * configuration is still fail-open, and "someone calls it" is not a guarantee.
 *
 * DENSITY IS THE ONE EXCEPTION, and it is stated rather than quietly skipped.
 * `assertDensityAxis` takes the `$modes` DECLARATIONS, not a role table -- density
 * declares no roles, so there is nothing beside it to self-check. It runs where
 * `tokens.json` is in scope: the unit suite and the generator.
 *
 * That is the same reasoning `form.mjs` records for `assertTypographyTokens`,
 * which is also absent from its kernel's import-time list: every synthetic source
 * in the unit suite declares the two or three tokens its case needs, so asserting
 * against a real token file at import would fail them for not being one.
 */
assertTypographyRoles()
assertSpacingRoles()
assertSizeRoles()
assertRadiusRoles()
assertLayerRoles()
assertMotionRoles()
assertLayoutRoles()

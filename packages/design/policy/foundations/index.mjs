/**
 * THE FOUNDATIONS. The canonical facts about how this design system looks,
 * one domain per file, and the only place each is stated.
 *
 * ── THE THREE PRINCIPLES, INHERITED ────────────────────────────────────────
 *
 * These were the token kernel's, and they are unchanged because this tree is
 * that kernel decomposed rather than a replacement for it. The kernel itself is
 * gone: `tooling/design-system/token-policy/` was deleted once every domain it
 * held had moved here, so these principles no longer have a second home to be
 * inherited FROM. They are stated here because they still govern:
 *
 * 1. SINGLE AUTHORITY, WHICH IS NOT ONE FILE. A fact is stated once and read
 *    everywhere else. Nothing outside `foundations/` imports a file inside it:
 *    this barrel is the domain's entry point and `../index.mjs` is the system's,
 *    so the authority is unchanged and the review surface stays per-domain.
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
 *   colour      role policies, alpha permission, distinctness, contrast floors
 *   density     the axis itself: symmetry, exclusivity, the type prohibition
 *   elevation   layers as structure, and the means each may use to separate
 *   layout      window classes, reading ceilings, the application shell
 *   motion      the reduced-motion answer every role owes
 *   radius      four roles as a nesting order
 *   sizing      how big a thing is, and which things may sit off the grid
 *   spacing     the relationship ladder, the 4px grid, the frame that holds still
 *   stacking    rendering order, which is not elevation
 *   typography  rank, size and leading floors, hierarchy under density
 *
 * ALL NINE ARE GOVERNED FROM HERE, and that is what changed. This list carried a
 * "GOVERNED FROM HERE" marker on two lines for as long as motion and typography
 * were the only domains that had finished moving and the rest still answered to
 * the kernel. The marker is deleted rather than extended to every line, because a
 * qualifier true of all nine discriminates nothing: there is no second file left
 * for a domain to answer to.
 *
 * `../generators/tokens.mjs` and `packages/design/tests/tokens.test.ts` read them
 * through `../index.mjs`. Every domain moved on the same evidence -- identical
 * exports, identical tables, identical failures over inputs that discriminate
 * between the rules -- and the generator then emitted byte-identical output, which
 * is the part that proves the wiring rather than the code. The one line that did
 * change was a comment naming the generator's own old path.
 *
 * TYPOGRAPHY ARRIVED SMALLER THAN IT LEFT, and that is what moving is for. It
 * shed `LEADING_GRID_PX`, which stood beside `spacing.mjs`'s `GRID_PX` -- the 4px
 * grid written twice. Two more duplicates fell out of the same pass, both found
 * by the barrel rather than by reading: `ASSUMED_ROOT_PX` in spacing AND
 * typography, `DENSITY_ORDER` in density AND spacing. `export *` DROPS a name two
 * modules define instead of reporting it, so all three were missing from this
 * index while looking present in the files -- a duplicate that deletes the fact
 * from the only sanctioned entry point.
 *
 * THAT HAZARD NOW REACHES ONE LEVEL HIGHER, and nothing catches it. `../index.mjs`
 * re-exports this barrel beside three siblings, so a name defined in two TREES
 * disappears exactly as silently as one defined in two files here. No guard reads
 * for it. A scan for names exported by more than one policy module is the check,
 * and it returns none today -- which is a measurement, not a guarantee.
 *
 * ── COLOUR AND ELEVATION ARRIVED, AND THE SECOND SOURCES LEFT ──────────────
 *
 * This section used to be headed "PRESENT ON DISK, DELIBERATELY NOT EXPORTED",
 * and it named two domains whose file sat in this directory while the token
 * kernel in `tooling/design-system/` actually governed them. That kernel is gone
 * -- deleted, not forwarded -- and both domains are exported below:
 *
 *   colour      `color.mjs` IS the kernel's `colour.mjs`, moved. The M3-flavoured
 *               scaffold that stood here was the unwired half of a duplicated
 *               fact, and it was deleted rather than merged: it named surfaces
 *               (`surface-container-highest`) that no token in this system has
 *               and no generator ever read
 *   elevation   `elevation.mjs` IS the kernel's `form.mjs`, moved and renamed at
 *               last. `form.mjs` said of itself that it would be "DELETED at that
 *               point rather than renamed" once colour moved; colour moved in the
 *               same commit as this, so it is renamed here and the name is now
 *               honest about what the file holds
 *
 * THE ACCESSIBILITY FLOORS DID NOT COME WITH COLOUR, and that is the one part of
 * the merge worth reading twice. `colour.mjs` and `interaction/accessibility.mjs`
 * BOTH declared the three contrast ratios and the 24px target, and they agreed --
 * which is what a duplicated fact does until it stops. The interaction copy won
 * because it is the strict superset, and `color.mjs` imports the table back.
 *
 * And one domain has no file here and is not meant to:
 *
 *   tiers       `../vocabulary.mjs` -- naming grammar, value shapes, lifecycle.
 *               Not a foundation; the kernel underneath all three trees, which is
 *               why it sits above them rather than in one. Every file here
 *               imports it DIRECTLY.
 *
 * THERE WAS A `shared.mjs` BETWEEN THEM, AND DELETING IT IS PART OF THIS MERGE.
 * It re-exported `deepFreeze`, `tierOf` and `toPixels` so that the reach out of
 * `packages/` into `tooling/` was stated in exactly one file -- which was the
 * right shape while the vocabulary lived in another tree, because a seam is worth
 * having when it guards a boundary.
 *
 * The boundary went away when the kernel moved, and the seam became a second path
 * to the same three functions. It showed as disagreement rather than as breakage:
 * `color.mjs` and `elevation.mjs` imported `../vocabulary.mjs` directly while
 * twenty siblings went through `shared.mjs`, and its own header still claimed to
 * be "the single seam" over a `projection/tailwind.mjs` that had stopped using it.
 * A claim and its subject disagreeing, with nothing able to catch it.
 *
 * So there is one path now. The file anticipated this ending in its own words:
 * it said it would collapse to nothing and its consumers would import the kernel
 * directly, and that is what happened.
 *
 * ── ELEVEN MORE FILES EXIST HERE THAT THIS INDEX REFUSES ───────────────────
 *
 * They were scaffolded, they load, and nothing exports them. The refusal is
 * per-domain and checkable rather than a preference:
 *
 *   grid, adaptive-layout   zero tokens, and zero `grid-cols-*` / `col-span-*` /
 *                           responsive variants in the product. Folded into
 *                           `layout.mjs` the day columns exist
 *   breakpoints, container,
 *   shell                   real tokens, but one domain -- they are `layout.mjs`
 *   shape                   duplicate of `radius`
 *   shadow, compositing     duplicate of `elevation`. That file says it outright:
 *                           "LAYER IS STRUCTURE; SHADOW IS ONE EXPRESSION OF IT.
 *                            The two get equated..."
 *   typeset                 the one entry with NO file on disk. Zero tokens, and
 *                           already refused on law 30 by
 *                           `.claude/skills/typeset/references/xforge.md` until a
 *                           renderer emits a tree no component authored
 *   iconography, border     one token each; they live in `sizing.mjs` until a
 *                           second gives them something to order
 *   target-size             a MOVE out of `color.mjs`, not a new domain -- and one
 *                           that is now half-done, since the floors it would hold
 *                           are in `interaction/accessibility.mjs` instead
 *
 * A foundation governing zero tokens is a policy file that can only ever pass,
 * which is ADR-024's failure and the phrase `elevation.mjs` uses twice: the
 * problem is vocabulary with no consumer.
 *
 * THAT THE FILES ARE ON DISK IS ITSELF THE DEFECT THIS HEADER ONCE HID. It read
 * "ARE NOT BUILT" over a directory where `ls` said otherwise -- a claim and its
 * subject disagreeing with nothing to catch it, which is the shape CLAUDE.md
 * names. Whether the eleven are deleted, or folded into the domains named beside
 * them, is open. That none of them is reachable today is not.
 */

export * from './color.mjs'
export * from './contract.mjs'
export * from './density.mjs'
export * from './elevation.mjs'
export * from './layout.mjs'
export * from './motion.mjs'
export * from './radius.mjs'
export * from './sizing.mjs'
export * from './spacing.mjs'
export * from './stacking.mjs'
export * from './typography.mjs'

import {
  assertAlphaPermissions,
  assertColorPolicyKinds,
  assertColorRoleRegistry,
  colorPolicy,
} from './color.mjs'
import { assertPolicyRegistry } from './contract.mjs'
import { densityPolicy } from './density.mjs'
import { assertElevationLayers, elevationPolicy } from './elevation.mjs'
import { assertLayoutRoles, layoutPolicy } from './layout.mjs'
import { assertMotionRoles, motionPolicy } from './motion.mjs'
import { assertRadiusRoles, radiusPolicy } from './radius.mjs'
import { assertSizeRoles, sizingPolicy } from './sizing.mjs'
import { assertSpacingRoles, spacingPolicy } from './spacing.mjs'
import { assertLayerRoles, stackingPolicy } from './stacking.mjs'
import { assertTypographyRoles, typographyPolicy } from './typography.mjs'

/**
/**
 * Every foundation policy, in one registry.
 *
 * ORDER IS ALPHABETICAL AND MEANS NOTHING, deliberately -- this is the REGISTRY,
 * not the assertion sequence below it. Registration checks a policy's contract
 * and its id's uniqueness, and neither depends on what registered before it.
 *
 * THE ASSERTIONS ARE A DIFFERENT MATTER NOW, and the distinction is worth
 * keeping straight because this comment used to be able to say both trees were
 * order-free. The token kernel's order was load-bearing -- the kinds table before
 * the roles that classify against it -- and colour arrived carrying exactly that
 * dependency. So the registry stays alphabetical and the assertion block states
 * its own order and why.
 */
export const FOUNDATION_POLICIES = assertPolicyRegistry([
  colorPolicy,
  densityPolicy,
  elevationPolicy,
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
 * That is the same reasoning `elevation.mjs` records for `assertTypographyTokens`,
 * which is also absent: every synthetic source in the unit suite declares the two
 * or three tokens its case needs, so asserting against a real token file at
 * import would fail them for not being one.
 *
 * THE LAST THREE ARE ORDERED AND THE REST ARE NOT. Colour's three tables
 * reference each other, and the sequence is the token kernel's, kept because the
 * reason for it survived the move:
 *
 *   assertColorPolicyKinds     the kinds table, before the roles that classify
 *                              against it -- so a broken threshold is reported as
 *                              a broken threshold rather than as a puzzling role
 *   assertAlphaPermissions     which kinds may carry alpha, read from that table
 *   assertColorRoleRegistry    the roles themselves
 *   assertElevationLayers      LAST, because it reaches across into the colour
 *                              registry, and a failure there should name the
 *                              colour problem first
 *
 * `assertAccessibilityPolicy` runs BEFORE all of these and does not appear here:
 * it belongs to `../interaction/index.mjs`, and `color.mjs` importing the floors
 * from that module is what puts it earlier in the graph. The one ordering this
 * tree cannot state itself is the one the module system already guarantees.
 */
assertTypographyRoles()
assertSpacingRoles()
assertSizeRoles()
assertRadiusRoles()
assertLayerRoles()
assertMotionRoles()
assertLayoutRoles()
assertColorPolicyKinds()
assertAlphaPermissions()
assertColorRoleRegistry()
assertElevationLayers()

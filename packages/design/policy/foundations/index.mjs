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
 * ── THE ELEVEN ARE DELETED, AND SO IS THE ENFORCEMENT THAT NEVER RAN ───────
 *
 * This section used to list eleven files that existed here and that nothing
 * exported -- `grid`, `adaptive-layout`, `breakpoints`, `container`, `shell`,
 * `shape`, `shadow`, `compositing`, `iconography`, `border`, `target-size` --
 * and it closed by saying whether they were deleted or folded in was open.
 *
 * It is not open any more. They are deleted. A foundation governing zero tokens
 * is a policy file that can only ever pass, which is ADR-024's failure and the
 * phrase `elevation.mjs` uses twice: vocabulary with no consumer.
 *
 * SEVEN FUNCTIONS WENT WITH THEM, AND THEY ARE THE MORE IMPORTANT HALF, because
 * they did not live in unreachable files. They lived in the six domains this
 * barrel exports, and were exported alongside the tables that look enforced:
 *
 *   densityFailures, spacingFailures, spacingDensityFailures, layoutFailures,
 *   radiusFailures, sizingFailures, stackingFailures
 *
 * Each took a resolved mode set and returned a list of violations, in the same
 * shape as `typographyFailures` and `motionFailures` -- which the generator
 * calls. These were called by NOTHING. Not the generator, not the unit suite,
 * not each other. Measured by planting violations rather than by reading:
 * `space.4` at 15px, off the 4px grid that `spacing.mjs` spent 490 lines on,
 * generated cleanly; so did `radius-sm` set larger than `radius-lg`, inverting
 * the nesting order that is the whole of `radius.mjs`.
 *
 * DELETING THEM DOES NOT RESTORE THE CHECKS, AND THAT IS THE POINT OF SAYING SO
 * HERE. Nothing was enforcing spacing, radius, sizing, stacking, layout or
 * density against `tokens.json` before this commit, and nothing is now. What
 * changed is that the tree no longer LOOKS like it does. The four constants only
 * those functions read -- `FRAMEWORK_BREAKPOINTS_PX`, `READING_BAND_CHARACTERS`,
 * `PX_PER_CHARACTER`, `LAYER_GAP` -- went too, for the same reason.
 *
 * WHAT REMAINS IN THOSE SIX FILES IS A TABLE AND A SELF-CHECK, and the
 * distinction is the one this header opened with: an `assert*Roles` proves the
 * table is internally coherent, which is a real check on a real subject. It is
 * not a check on a token, and it never was. The two used to sit side by side
 * exported from one file, which is precisely why the missing half went unnoticed.
 *
 * The three domains that ARE checked against tokens -- colour, typography,
 * motion, plus elevation's layers and accessibility's floors -- are checked
 * because the generator imports their failure functions and calls them. That is
 * the only mechanism here that governs anything, and it is worth stating plainly
 * so the next reader does not infer coverage from a policy file's existence.
 */

export * from './color.mjs'
export * from './density.mjs'
export * from './elevation.mjs'
export * from './layout.mjs'
export * from './motion.mjs'
export * from './radius.mjs'
export * from './sizing.mjs'
export * from './spacing.mjs'
export * from './stacking.mjs'
export * from './typography.mjs'

import { assertPolicyRegistry } from '../define-policy.mjs'
import {
  assertAlphaPermissions,
  assertColorPolicyKinds,
  assertColorRoleRegistry,
  colorPolicy,
} from './color.mjs'
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
 * declares no roles, so there is nothing beside it to self-check.
 *
 * THIS PARAGRAPH USED TO END "it runs where `tokens.json` is in scope: the unit
 * suite and the generator", AND THAT WAS FALSE. It ran in neither. Nothing called
 * it, and the sentence was the only thing suggesting otherwise -- so the omission
 * it was written to disclose read as a disclosed omission rather than as an
 * absent check, which is worse than saying nothing.
 *
 * It was also SPENT. `interaction/index.mjs` justified two omissions of its own
 * as "the same treatment `foundations/index.mjs` gives `assertDensityAxis`" --
 * a control traded away for one that had never executed. No guard reads a
 * sentence, so this is corrected here and there rather than caught.
 *
 * `assertDensityAxis` still runs nowhere. It is a real, falsifiable function
 * taking its subject as an argument, and it is `densityPolicy`'s `assert`, so it
 * survives the deletion below -- but nothing invokes it, and that is now what
 * this paragraph says.
 *
 * The same holds for `assertTypographyTokens`, which is absent from the list for
 * a reason that IS true: every synthetic source in the unit suite declares the
 * two or three tokens its case needs, so asserting against a real token file at
 * import would fail them for not being one. It is called by the generator, which
 * is where a real token file exists.
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

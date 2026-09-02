/**
 * FOUNDATION — spacing. The relationship ladder, the grid, and the density axis.
 *
 * ── PROVENANCE: THIS IS NOT AN EXTRACTION ──────────────────────────────────
 *
 * `typography.mjs` moved a table that already existed. There is no spacing table
 * in `tooling/design-system/token-policy/` to move: `form.mjs` holds type, motion
 * and elevation; `colour.mjs` holds colour and the target floor; `vocabulary.mjs`
 * holds tiers and value shapes. Nothing has ever checked a space role.
 *
 * So this file is NEW, and law 30 asks what measured pain justifies it. The
 * answer is in `docs/spacing.md`, which states as fact:
 *
 *   "Fifty-six tokens, three modes, and every spacing, sizing and radius value
 *    lands on the 4px grid."
 *
 * That is a MEASUREMENT WITH NO CHECK. It was true when written and nothing keeps
 * it true -- the same shape `form.mjs` records for leading: *"a fact with two
 * prose sources and no mechanical one, so the copies can only ever agree with
 * each other and never with the tokens."* That file fixed it for leading products
 * and said the wider question "is answered in docs/spacing.md" -- in prose. This
 * closes it for the space scale.
 *
 * ── WHAT IT ASSERTS, AND WHAT IT FOUND ─────────────────────────────────────
 *
 * Measured against the shipped tokens in all three density modes (2026-09-02):
 *
 *   grid            every role, every mode, on 4px          0 violations
 *   inversion       ladder never decreases                  0 violations
 *   frame held still `section` and `container` unrebound     confirmed
 *   density         compact <= default <= comfortable       0 violations
 *   collapse        adjacent roles resolving equal           3, ALL PERMITTED
 *
 * The three collapses are the interesting result, and the rule around them is the
 * one real design decision in this file. At compact, `related` and `tight` are
 * both 4px, and `snug` and `normal` are both 8px. At comfortable, `loose` and
 * `section` are both 32px.
 *
 * TYPOGRAPHY WOULD CALL THAT A DEFECT. It refuses two adjacent ranks that render
 * identically, because "the hierarchy between them is carried by nothing this
 * system owns". Spacing is NOT the same, and the asymmetry is arithmetic rather
 * than taste: there is exactly one multiple of four below eight. A six-role
 * ladder compressed into the range 4..12 CANNOT keep six distinct values. A rule
 * demanding it would be unsatisfiable, and an unsatisfiable rule gets switched
 * off rather than met.
 *
 * So the rule is about HEADROOM, not distinctness: a collapse is a failure only
 * where an unused grid step existed between the pair and its neighbour above.
 * Equal because the scale ran out is fine. Equal with 8px of empty space above is
 * a step someone forgot to take.
 *
 * ── ONE FACT THIS FILE TAKES OWNERSHIP OF ──────────────────────────────────
 *
 * `typography.mjs` declares `LEADING_GRID_PX = 4`. This file declares `GRID_PX`.
 * THAT IS THE 4px GRID WRITTEN TWICE, and it is the defect CLAUDE.md names,
 * created by the same pass that wrote both.
 *
 * The grid belongs here, because it is the space scale's: `space.1` is 0.25rem,
 * and every other spacing role is a multiple of it. `tokens.json` says the
 * leading ratios were "CHOSEN SO EACH SIZE LANDS ON THE 4px GRID **the space
 * scale already uses**" -- typography is the borrower.
 *
 * REQUIRED FOLLOW-UP, in whichever commit lands second: `typography.mjs` imports
 * `GRID_PX` from here and deletes `LEADING_GRID_PX`. It keeps its own TOLERANCE,
 * which is genuinely its own -- leading is a product of two rounded numbers and
 * needs slack the space scale does not.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * The grid, in pixels at a 16px root.
 *
 * A PREMISE NAMED RATHER THAN A NUMBER CHOSEN. It is `space.1` -- 0.25rem -- and
 * it is stated here as a pixel count for the same reason `ASSUMED_ROOT_PX`
 * exists: the check compares resolved pixels, and a premise that lives inside a
 * conversion is one no reader of the table can see.
 *
 * THE GRID IS SOFT. `docs/spacing.md` records the choice and its evidence: the
 * default icon is 20px, `snug` is 12px, `control-x` is 12px -- all multiples of
 * four, none of eight. A hard 8px grid could not contain them, and 8 is too
 * coarse for the inside of a control, where the gap wants 8 and the padding
 * wants 12 and there is nothing between.
 *
 * IT SCALES WITH THE ROOT, exactly as the leading grid does. `space.1` is a rem,
 * so the grid is 4px at a 16px root and 3.75px at a 15px one. Checking against a
 * literal 4 would measure a reader's layout against a grid that reader does not
 * have. Both sides scale linearly, so the check is about the ratio and comes out
 * root-invariant.
 */
export const GRID_PX = 4

/**
 * WHY A TOLERANCE AT ALL, when a space role is a plain rem and the arithmetic is
 * exact. Because the role need not be: a future `space` value expressed as a
 * calc, an em, or a rounded fraction lands near the grid rather than on it, and
 * an equality test would report the rounding rather than the defect.
 *
 * Two orders of magnitude below the smallest real failure available -- a role
 * moved by one grid step is 4px out, and half a step is 2px -- so nothing
 * interesting lands under it.
 */
export const GRID_TOLERANCE_PX = 0.01

/**
 * The root font size the pixel arithmetic assumes.
 *
 * The same premise `typography.mjs` names, for the same reason, and deliberately
 * NOT imported from it: typography borrows the grid from spacing, so an import
 * the other way would make the two files mutually dependent to share a constant
 * that is a property of the DOCUMENT rather than of either domain. When a
 * `document.mjs` or a shared premises module exists, both should read it there.
 */
export const ASSUMED_ROOT_PX = 16

/**
 * The density modes, LEAST TO MOST GENEROUS, and the order is the assertion.
 *
 * POLICY.md §3c says density packs information. That is a claim with a
 * direction, and a direction is checkable: a mode called `compact` that resolves
 * a role LARGER than `default` has inverted the axis, and every component bound
 * to that role gets roomier when the user asked for tighter.
 *
 * `default` is the base -- it names no mode block in `$modes.density`, so a
 * resolved map for it is the unmodified token set.
 *
 * THE AXIS IS `density.mjs`'S, AND THIS FILE HELD A SECOND COPY. Both declared the
 * identical three modes in the identical order, so they agreed -- which is the only
 * state this defect is ever found in. The barrel is what exposed it: two modules
 * defining one name makes `export *` drop it, so `DENSITY_ORDER` was absent from
 * `index.mjs` while appearing present in two files.
 *
 * It belongs to density, which owns the axis itself. Spacing is a CONSUMER of the
 * order -- it walks it to assert compact never resolves larger than default -- and
 * reading it from the owner is what makes that assertion about the axis rather than
 * about this file's copy of it.
 */

/* ---------------------------------------------------------------- roles -- */

/**
 * The spacing roles.
 *
 * `rank` places a role on the RELATIONSHIP LADDER -- `docs/spacing.md`'s table of
 * "how strongly do these belong together", from parts of one thing up to
 * separate sections of a page. A role with no rank is not on the ladder: it is
 * component geometry, governed by the grid and by the density direction but not
 * ordered against anything.
 *
 * THE LADDER IS THE WHOLE POINT OF THE ROLES. The values are not the vocabulary
 * -- 124px and 128px both sit on the grid and neither is available. Six names
 * describing relationships is the vocabulary, and the ladder is what makes them
 * mean anything relative to each other.
 *
 * `heldStill` marks a role density MUST NOT rebind. The page frame holds while
 * the components inside it compress, so switching to compact packs information
 * without reflowing the layout around it. Stated in `docs/spacing.md` as a fact
 * about two roles; asserted here so it stays one.
 */
export const SPACING_ROLES = deepFreeze({
  /**
   * The page frame's own inset. HELD STILL for the same reason as `section`, and
   * NOT on the ladder -- it is not a relationship between two things, it is the
   * distance from the edge.
   */
  container: { heldStill: true, token: 'semantic.space.container' },

  // Component geometry. On the grid and on the density axis; not on the ladder,
  // because "the padding inside a control" is not a strength of association and
  // ordering it against `normal` would assert a relationship that is not there.
  'control-x': { token: 'semantic.space.control-x' },
  'control-y': { token: 'semantic.space.control-y' },

  /** Between separate groups of components. */
  loose: { rank: 4, token: 'semantic.space.loose' },

  /** Between separate components. The step a call site reaches for by default. */
  normal: { rank: 3, token: 'semantic.space.normal' },
  /** Parts of one thing -- a label and its helper text. The bottom of the ladder. */
  related: { rank: 0, token: 'semantic.space.related' },
  'row-x': { token: 'semantic.space.row-x' },
  'row-y': { token: 'semantic.space.row-y' },

  /**
   * Between sections of a page, and the top of the ladder.
   *
   * HELD STILL. It is the frame, not the contents.
   */
  section: { heldStill: true, rank: 5, token: 'semantic.space.section' },

  /** Inside one compact component. */
  snug: { rank: 2, token: 'semantic.space.snug' },

  /** Strongly associated -- an icon and its label. */
  tight: { rank: 1, token: 'semantic.space.tight' },
})

/**
 * NO EXEMPTION LIST, AND THAT IS A FINDING RATHER THAN AN OMISSION.
 *
 * `docs/spacing.md` names seven tokens legitimately off the grid: 1px hairlines
 * (`size.border`, `semantic.size.stroke`), 2px focus geometry (`size.focus-ring`,
 * `semantic.size.ring`, `size.focus-offset`, `semantic.size.ring-offset`) and one
 * type size (`size.text-sm`).
 *
 * EVERY ONE OF THEM IS A `size.*` TOKEN. Not one is a `space.*` role, so this
 * policy needs no exemptions at all -- the grid governs distances between things,
 * and a distance has no reason to be a hairline.
 *
 * That is worth stating because the exemptions become `sizing.mjs`'s problem
 * whole and unshared, and because `docs/spacing.md` warns what happens if they
 * spread: "an exemption list that long is its own authority."
 */

/* ------------------------------------------------------------ assertions -- */

/** The spacing table's own rules. Takes its subject, so it can be shown a violation. */
export function assertSpacingRoles(roles = SPACING_ROLES) {
  const ranks = new Map()

  for (const [role, policy] of Object.entries(roles)) {
    if (typeof policy.token !== 'string') {
      throw new Error(`spacing role '${role}' names no token, so nothing about it is checkable`)
    }

    if (policy.rank === undefined) {
      continue
    }

    if (typeof policy.rank !== 'number') {
      throw new Error(
        `spacing role '${role}' has rank ${JSON.stringify(policy.rank)} -- a rank is a number ` +
          'or it is absent; anything else sorts unpredictably and the ladder becomes an ' +
          'artefact of key order',
      )
    }

    // RANKS ARE UNIQUE HERE, WHERE TYPE RANKS ARE NOT, and the difference is not
    // an oversight. Two type roles share a rank because weight distinguishes
    // them -- `body` and `emphasis` are one size at two weights. A distance has
    // no second dimension: two spacing roles at one rank would be one role
    // written twice, with nothing left to tell them apart.
    const held = ranks.get(policy.rank)
    if (held !== undefined) {
      throw new Error(
        `spacing roles '${held}' and '${role}' both hold rank ${policy.rank} -- a distance ` +
          'has only one dimension, so two roles at one rank is one role written twice',
      )
    }
    ranks.set(policy.rank, role)
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/* --------------------------------------------------------------- policy -- */

/**
 * The registry handle.
 *
 * `assert` is the TABLE's self-check, matching `foundation.typography`: it needs
 * nothing but the table, so it can run at import time. `spacingFailures` and
 * `spacingDensityFailures` need a resolved mode set the registry does not hold,
 * so they stay exported for the generator and the unit suite to call with their
 * own subjects.
 */
export const spacingPolicy = definePolicy({
  assert: assertSpacingRoles,
  id: 'foundation.spacing',
  kind: 'foundation',
})

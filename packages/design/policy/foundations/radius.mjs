/**
 * FOUNDATION — radius. Four roles that name what a corner belongs to.
 *
 * ── WHY THE NAMES ARE NOT SIZES ────────────────────────────────────────────
 *
 * A t-shirt scale -- sm, md, lg, xl -- says how round a corner is and nothing
 * about what it is rounding. This system's four say what the thing IS: a precise
 * mark, a control, a container, an overlay. The value follows from the role, so a
 * component chooses by naming what it is rather than by picking a number that
 * looked right.
 *
 * THE COST OF THE OTHER WAY IS RECORDED IN THE TOKEN BRIDGE, which closed
 * Tailwind's `--radius-*` namespace over exactly this:
 *
 *   "The pair that made it dangerous: `rounded-xl` is a Tailwind default of 12px
 *    and `radius.container` is also 12px. They agreed, nothing kept them
 *    agreeing, and a reader could not tell which of the two scales any class
 *    belonged to."
 *
 * Two scales on one prefix, agreeing until one moved. Closing the namespace
 * removed the foreign half; this file governs what is left.
 *
 * `rounded-full` and `rounded-none` survive as computed utilities rather than
 * theme keys, and that asymmetry is wanted: both are semantic. One names an
 * intrinsically round object, the other names structure.
 *
 * ── THE LADDER IS A NESTING ORDER ──────────────────────────────────────────
 *
 * Rank here is not prominence, as it is in typography, nor strength of
 * association, as in spacing. It is CONTAINMENT: a control sits inside a
 * container, which sits inside an overlay. An inner corner must be tighter than
 * the corner it sits within, or the inner shape appears to bulge out of its
 * parent at the join -- the one radius defect a reader notices without being able
 * to name it.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/* ---------------------------------------------------------------- roles -- */

export const RADIUS_ROLES = deepFreeze({
  /** 12px. A surface holding other things -- a card, a panel, a row group. */
  container: { rank: 2, token: 'semantic.radius.container' },

  /** 8px. Anything a person operates: buttons, inputs, selects. */
  control: { rank: 1, token: 'semantic.radius.control' },

  /** 16px. A dialog or sheet, which floats above everything and reads as separate. */
  overlay: { rank: 3, token: 'semantic.radius.overlay' },
  /** 4px. A checkbox, a swatch, an inline code span -- a mark, not a surface. */
  precise: { rank: 0, token: 'semantic.radius.precise' },
})

/* ------------------------------------------------------------ assertions -- */

/** The radius table's own rules. */
export function assertRadiusRoles(roles = RADIUS_ROLES) {
  const ranks = new Map()

  for (const [role, policy] of Object.entries(roles)) {
    if (typeof policy.token !== 'string') {
      throw new Error(`radius role '${role}' names no token, so nothing about it is checkable`)
    }
    if (typeof policy.rank !== 'number') {
      throw new Error(
        `radius role '${role}' has no rank -- the ladder is a nesting order, and a role ` +
          'outside it cannot be checked against what it sits inside',
      )
    }

    const held = ranks.get(policy.rank)
    if (held !== undefined) {
      throw new Error(
        `radius roles '${held}' and '${role}' both hold rank ${policy.rank} -- containment is ` +
          'a single order, so two roles at one rank leaves it undecided which sits inside which',
      )
    }
    ranks.set(policy.rank, role)
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/* --------------------------------------------------------------- policy -- */

export const radiusPolicy = definePolicy({
  assert: assertRadiusRoles,
  id: 'foundation.radius',
  kind: 'foundation',
})

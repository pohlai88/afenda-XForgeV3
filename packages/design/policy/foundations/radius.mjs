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

import { definePolicy } from './contract.mjs'
import { deepFreeze, toPixels } from './shared.mjs'
import { ASSUMED_ROOT_PX, GRID_PX, GRID_TOLERANCE_PX } from './spacing.mjs'

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

const ladderOf = (roles) => Object.entries(roles).sort(([, a], [, b]) => a.rank - b.rank)

/**
 * Every radius failure, in every mode.
 *
 * DENSITY DOES NOT REBIND RADIUS, and that is worth stating rather than assuming:
 * `$modes.density` touches eleven tokens and not one is a radius. A corner is not
 * information to be packed. So these checks are per-mode only because the
 * generator hands modes over -- the expectation is that every mode agrees, and
 * `density.mjs` is what would notice if one stopped.
 */
export function radiusFailures(resolvedByMode, roles = RADIUS_ROLES, rootPx = ASSUMED_ROOT_PX) {
  const failures = []
  const scale = rootPx / ASSUMED_ROOT_PX
  const grid = GRID_PX * scale
  const tolerance = GRID_TOLERANCE_PX * scale

  for (const [label, resolved] of resolvedByMode) {
    const pixels = new Map()

    for (const [role, policy] of Object.entries(roles)) {
      const raw = resolved.get(policy.token)
      if (raw === undefined) {
        continue
      }
      if (typeof raw !== 'string') {
        failures.push(`${label}: ${role} is ${JSON.stringify(raw)}, which is not a dimension`)
        continue
      }

      let px
      try {
        px = toPixels(raw, { rootPx })
      } catch (error) {
        failures.push(`${label}: ${role} ${error.message}`)
        continue
      }
      if (px === null) {
        continue
      }
      pixels.set(role, px)

      const off = Math.abs(px - Math.round(px / grid) * grid)
      if (off > tolerance) {
        failures.push(
          `${label}: ${role} is ${px}px, ${off.toFixed(2)}px off the ${grid}px grid -- a corner ` +
            'is the size of a thing, and sizes sit on the grid unless they are a hairline, ' +
            'focus geometry or type',
        )
      }
    }

    const ladder = ladderOf(roles).filter(([role]) => pixels.has(role))

    for (let i = 1; i < ladder.length; i += 1) {
      const [innerRole] = ladder[i - 1]
      const [outerRole] = ladder[i]
      const inner = pixels.get(innerRole)
      const outer = pixels.get(outerRole)

      if (inner > outer) {
        failures.push(
          `${label}: '${innerRole}' (${inner}px) is rounder than '${outerRole}' (${outer}px), ` +
            'which contains it -- an inner corner tighter than its parent is what keeps the ' +
            'inner shape from appearing to bulge out at the join',
        )
        continue
      }

      // TWO ROLES AT ONE VALUE IS ONE ROLE WRITTEN TWICE. Unlike spacing, there is
      // no headroom argument available: the radius scale is not compressed by any
      // axis and has the whole grid to spread across, so a collision is a choice.
      if (inner === outer) {
        failures.push(
          `${label}: '${innerRole}' and '${outerRole}' are both ${inner}px -- nothing ` +
            'compresses the radius scale, so two roles at one value is one role written twice ' +
            'and a reader cannot tell which a corner belongs to',
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

export const radiusPolicy = definePolicy({
  assert: assertRadiusRoles,
  id: 'foundation.radius',
  kind: 'foundation',
})

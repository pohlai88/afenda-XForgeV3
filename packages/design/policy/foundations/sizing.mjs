/**
 * FOUNDATION — sizing. How big a thing is, and which things are allowed off the grid.
 *
 * ── THE DIVISION FROM SPACING ──────────────────────────────────────────────
 *
 * `spacing.mjs` governs the distance BETWEEN things. This governs the size OF
 * things — and the split matters because it is exactly where the 4px grid stops
 * applying cleanly.
 *
 * `docs/spacing.md` names seven tokens legitimately off the grid, and every one
 * of them is a `size.*`:
 *
 *   1px  size.border, semantic.size.stroke          a hairline is a device-pixel
 *                                                   rule, not a distance
 *   2px  size.focus-ring, semantic.size.ring        ring thickness -- a 4px ring
 *                                                   is not more visible, it is
 *                                                   fatter, and starts covering
 *                                                   the control it marks
 *   2px  size.focus-offset, semantic.size.ring-offset  the gap keeping the ring
 *                                                   off the border it surrounds
 *   14px size.text-sm                               a type size, governed by its
 *                                                   own scale and hierarchy proof
 *
 * NOT ONE IS A `space.*` ROLE. That is why `spacing.mjs` carries no exemption
 * list at all, and why the whole exemption problem lands here, whole and
 * unshared. `docs/spacing.md` states the consequence of letting it spread: *"an
 * exemption list that long is its own authority."*
 *
 * ── EXEMPTIONS ARE DECLARED, NOT INFERRED ──────────────────────────────────
 *
 * The rule is not "these four values are allowed off the grid". It is that a role
 * OFF the grid must name WHICH KIND of thing it is, from a closed set of three.
 * A new 3px value is then either a hairline, focus geometry, or type -- or it is
 * a mistake, and it says so at the point it is added rather than being discovered
 * later in a table nobody re-reads.
 *
 * That is `docs/spacing.md`'s own instruction turned into a mechanism: *"State
 * this when adding a token. A new value off the 4px grid is either one of these
 * three kinds, or it is a mistake."*
 *
 * ── WHAT IT DELIBERATELY DOES NOT ASSERT ───────────────────────────────────
 *
 * THE WCAG 2.5.8 TARGET FLOOR. `colour.mjs` owns it -- `TARGET_MINIMUM_PX = 24`,
 * `assertTargetMinimum`, checked in every mode, and both `tokens.json`
 * descriptions say so outright. `control.min-size` resolving to 32px at compact
 * clears it, and that is enforced there. One floor, one file.
 *
 * THE GRID CONSTANT. Imported from `spacing.mjs`, because the grid is the space
 * scale's: `space.1` is 0.25rem and everything else is a multiple of it.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze, toPixels } from './shared.mjs'
import { ASSUMED_ROOT_PX, GRID_PX, GRID_TOLERANCE_PX } from './spacing.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * The kinds of thing that may sit off the 4px grid. A closed set of three.
 *
 * The pattern behind it, stated once so the set does not grow by precedent: the
 * grid governs DISTANCES between things and the SIZE of things. It does not
 * govern the thickness of lines, or type. A rule claiming those would either
 * force 1px borders to 4px or need a list, and the list becomes the authority.
 */
export const OFF_GRID_KINDS = deepFreeze(['hairline', 'focus', 'type'])

/**
 * The coarser grid the control ladder is held to.
 *
 * `docs/spacing.md`: *"Where it costs nothing, prefer 8. The control ladder is
 * 32 / 40 / 48 across the three densities -- every step a multiple of 8 -- because
 * a control's height is what neighbouring rows align against, and that is
 * precisely where the coarser grid earns its keep."*
 *
 * A CLAIM WITH NO CHECK until now. It is stated for controls only; the icon
 * ladder is 16 / 20 / 24, deliberately on the 4px grid, because an icon aligns
 * inside a control rather than against a row.
 */
export const CONTROL_GRID_PX = 8

/* ---------------------------------------------------------------- roles -- */

/**
 * The size roles.
 *
 * `offGrid` declares the KIND, and its presence is what permits a value off the
 * grid. A role without it is held to the grid; a role with it is required to
 * actually be off the grid, because an exemption nothing uses is an exemption
 * that will be reached for later by something that does not need it.
 *
 * `grid` overrides the default 4px with a coarser one for roles that align
 * against something bigger than themselves.
 */
export const SIZE_ROLES = deepFreeze({
  /**
   * 32 / 40 / 48 across the density axis. Held to the 8px grid because a
   * control's height is what neighbouring rows align against.
   *
   * Its WCAG floor is `colour.mjs`'s, not this file's.
   */
  'control-min-size': { grid: CONTROL_GRID_PX, token: 'semantic.control.min-size' },

  /**
   * 16 / 20 / 24. On the 4px grid deliberately -- an icon aligns INSIDE a
   * control, so the coarser grid buys nothing and would cost the 20px step.
   */
  'icon-size': { fitsInside: 'control-min-size', token: 'semantic.icon.size' },

  /** 2px. Thicker is not more visible, only fatter, and it covers what it marks. */
  ring: { offGrid: 'focus', token: 'semantic.size.ring' },

  /** 2px. The gap that keeps the ring off the border it surrounds. */
  'ring-offset': { offGrid: 'focus', token: 'semantic.size.ring-offset' },
  /** 1px. A device-pixel rule. Rounding it to 4 makes it a bar. */
  stroke: { offGrid: 'hairline', token: 'semantic.size.stroke' },

  /** 24px. The WCAG 2.5.8 floor as a token. Measured against elsewhere; on the grid here. */
  'target-minimum': { token: 'semantic.target.minimum' },
})

/* ------------------------------------------------------------ assertions -- */

/** The sizing table's own rules. */
export function assertSizeRoles(roles = SIZE_ROLES) {
  for (const [role, policy] of Object.entries(roles)) {
    if (typeof policy.token !== 'string') {
      throw new Error(`size role '${role}' names no token, so nothing about it is checkable`)
    }

    if (policy.offGrid !== undefined && !OFF_GRID_KINDS.includes(policy.offGrid)) {
      throw new Error(
        `size role '${role}' claims to be off the grid as '${policy.offGrid}' -- the kinds are ` +
          `${OFF_GRID_KINDS.join(', ')}. A fourth kind is how an exemption list becomes its ` +
          'own authority, so adding one is a change to this policy rather than to a role',
      )
    }

    if (policy.grid !== undefined && policy.offGrid !== undefined) {
      throw new Error(
        `size role '${role}' both declares a grid of ${policy.grid} and exempts itself from ` +
          'the grid -- one of the two is not being applied, and which one is decided by the ' +
          'order of the checks rather than by anything anyone wrote',
      )
    }

    if (policy.fitsInside !== undefined && roles[policy.fitsInside] === undefined) {
      throw new Error(
        `size role '${role}' must fit inside '${policy.fitsInside}', which is not a size role ` +
          '-- the containment is then never checked and reads as if it were',
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

const pixelOf = (raw, rootPx) => {
  if (raw === undefined) {
    return { px: null, why: null }
  }
  if (typeof raw !== 'string') {
    return { px: null, why: `is ${JSON.stringify(raw)}, which is not a dimension` }
  }
  try {
    const px = toPixels(raw, { rootPx })
    return px === null
      ? { px: null, why: `is '${raw}', a rem with no usable root size to measure it against` }
      : { px, why: null }
  } catch (error) {
    return { px: null, why: error.message }
  }
}

/**
 * Every sizing failure, in every mode.
 *
 * Three questions: is it on whichever grid it answers to, is a declared
 * exemption actually being used, and does a thing that must fit inside another
 * still fit once density has moved both.
 */
export function sizingFailures(resolvedByMode, roles = SIZE_ROLES, rootPx = ASSUMED_ROOT_PX) {
  const failures = []
  const scale = rootPx / ASSUMED_ROOT_PX
  const tolerance = GRID_TOLERANCE_PX * scale

  for (const [label, resolved] of resolvedByMode) {
    const pixels = new Map()

    for (const [role, policy] of Object.entries(roles)) {
      const { px, why } = pixelOf(resolved.get(policy.token), rootPx)
      if (why !== null) {
        failures.push(`${label}: ${role} ${why}`)
        continue
      }
      if (px === null) {
        continue
      }
      pixels.set(role, px)

      const grid = (policy.grid ?? GRID_PX) * scale
      const off = Math.abs(px - Math.round(px / grid) * grid)

      if (policy.offGrid === undefined) {
        if (off > tolerance) {
          failures.push(
            `${label}: ${role} is ${px}px, ${off.toFixed(2)}px off the ${grid}px grid, and ` +
              `declares no exemption -- a value off the grid is a ${OFF_GRID_KINDS.join(', a ')}, ` +
              'or it is a mistake',
          )
        }
        continue
      }

      // AN EXEMPTION THAT IS NOT BEING USED. The role says it is a hairline or
      // focus geometry, and it landed on the grid anyway -- so either the value
      // moved and the exemption is now cover for nothing, or it never needed one.
      // Either way the next off-grid value inherits a licence nobody re-examined.
      if (off <= tolerance) {
        failures.push(
          `${label}: ${role} is ${px}px, which is ON the ${grid}px grid, while declaring the ` +
            `'${policy.offGrid}' exemption -- an exemption in use by nothing is a licence the ` +
            'next value will inherit without anyone re-deciding it',
        )
      }
    }

    // CONTAINMENT, which only density can break. An icon at 24px inside a 48px
    // control is fine; the same icon inside a 32px compact control is the failure,
    // and it can only appear when the two roles move by different amounts.
    for (const [role, policy] of Object.entries(roles)) {
      if (policy.fitsInside === undefined) {
        continue
      }
      const inner = pixels.get(role)
      const outer = pixels.get(policy.fitsInside)
      if (inner === undefined || outer === undefined) {
        continue
      }
      if (inner >= outer) {
        failures.push(
          `${label}: ${role} is ${inner}px inside ${policy.fitsInside} at ${outer}px -- the ` +
            'two move on the same density axis and have moved into each other, so the ' +
            'control has nothing left around its content',
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

export const sizingPolicy = definePolicy({
  assert: assertSizeRoles,
  id: 'foundation.sizing',
  kind: 'foundation',
})

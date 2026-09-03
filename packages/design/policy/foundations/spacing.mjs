/**
 * FOUNDATION — spacing. Semantic relationships on a 4px rhythm.
 *
 * ── M3-ALIGNED WITHOUT BECOMING A NUMERIC API ───────────────────────────────
 *
 * Material 3 is useful here as a RHYTHM and component-layout reference, not as
 * the public vocabulary of an enterprise design system. Afenda therefore keeps
 * semantic spacing roles:
 *
 *   related → tight → snug → normal → loose → section
 *
 * plus component geometry:
 *
 *   control-x / control-y
 *   row-x / row-y
 *   container
 *
 * Components name the relationship they are expressing rather than choosing a
 * number that looks right.
 *
 * The base rhythm is 4px at a 16px root (`space.1 = 0.25rem`). It is deliberately
 * softer than an 8px-only grid because 4 / 8 / 12 / 16 are all useful inside
 * dense controls and align well with Material's component geometry.
 *
 * ── DOMAIN VS AXIS ──────────────────────────────────────────────────────────
 *
 * Spacing owns:
 *
 *   • whether semantic space tokens exist and are dimensions
 *   • whether resolved distances land on the grid
 *   • whether the relationship ladder is ordered
 *   • whether an adjacent collapse is forced by available grid headroom
 *   • which spacing roles density may move and which it must hold still
 *
 * Density owns:
 *
 *   • the compact → default → comfortable axis
 *   • symmetry of mode membership
 *   • cross-domain allowlisting
 *   • monotonic direction for every density-owned token
 *
 * The bridge is explicit: `assertSpacingDensityMembership()` consumes the set of
 * token paths the density owner says it rebinds. No copy of `DENSITY_ORDER` lives
 * here and no circular spacing↔density import is required.
 *
 * ── ADAPTIVE LAYOUT IS SEPARATE ─────────────────────────────────────────────
 *
 * `container` and `section` are held still UNDER DENSITY. That does not mean a
 * responsive/adaptive layout may never change page gutters or section cadence.
 * Window-size adaptation is a separate axis. A compact viewport is not compact
 * density, and a wide viewport is not comfortable density.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'

/* ------------------------------------------------------------- premises -- */

/** 4px at the named root; equivalent to `space.1 = 0.25rem`. */
export const GRID_PX = 4

/** Numeric slack for conversion/rounding only, not a visual exemption. */
export const GRID_TOLERANCE_PX = 0.01

/** Named premise used when converting rem-based space tokens to pixels. */
export const ASSUMED_ROOT_PX = 16

/* ---------------------------------------------------------------- roles -- */

export const SPACING_ROLES = deepFreeze({
  /**
   * Page-frame inset. Density holds it still; adaptive layout may own a separate
   * viewport-sensitive decision.
   */
  container: {
    heldStill: true,
    token: 'semantic.space.container',
  },

  /** Horizontal / vertical internal geometry of an interactive control. */
  'control-x': { token: 'semantic.space.control-x' },
  'control-y': { token: 'semantic.space.control-y' },

  /** Between separate groups of components. */
  loose: {
    rank: 5,
    token: 'semantic.space.loose',
  },

  /** Parts of one thing: label + helper, icon + supporting metadata, etc. */
  /**
   * THE ZERO IS A WORD (ADR-034 step 9). Closing the numeric spacing scale -- Tailwind's
   * `--spacing` multiplier -- takes `m-0` and `p-0` with `p-13`, because every one of them
   * is `calc(var(--spacing) * n)`. A heading's margin reset and a list's padding reset are
   * designed absences of space, and a design language that cannot say "none" cannot close
   * its scale. Held still: zero is zero in every density.
   */
  none: {
    heldStill: true,
    rank: 0,
    token: 'semantic.space.none',
  },

  /** Default separation between separate components. */
  normal: {
    rank: 4,
    token: 'semantic.space.normal',
  },

  related: {
    rank: 1,
    token: 'semantic.space.related',
  },

  /** Row geometry, not relationship strength. */
  'row-x': { token: 'semantic.space.row-x' },
  'row-y': { token: 'semantic.space.row-y' },

  /**
   * Between page sections. Held still under density so packing components does
   * not make the page frame itself breathe in and out.
   */
  section: {
    heldStill: true,
    rank: 6,
    token: 'semantic.space.section',
  },

  /** Inside one compact component. */
  snug: {
    rank: 3,
    token: 'semantic.space.snug',
  },

  /** Strongly associated: icon + label, value + unit, etc. */
  tight: {
    rank: 2,
    token: 'semantic.space.tight',
  },
})

/* --------------------------------------------------------------- helpers -- */

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const orderedRelationshipRoles = (roles) =>
  Object.entries(roles)
    .filter(([, policy]) => policy.rank !== undefined)
    .sort(([, a], [, b]) => a.rank - b.rank)

const pixelSpace = (raw, rootPx) => {
  if (typeof raw !== 'string') {
    return {
      px: null,
      why: `${JSON.stringify(raw)} is not a dimension`,
    }
  }

  try {
    const px = toPixels(raw, { rootPx })

    return px === null
      ? {
          px: null,
          why: `'${raw}' cannot be measured with root ${rootPx}px`,
        }
      : { px }
  } catch (error) {
    return {
      px: null,
      why: error instanceof Error ? error.message : String(error),
    }
  }
}

/* ------------------------------------------------------------ assertions -- */

/**
 * The semantic spacing table's own rules.
 */
export function assertSpacingRoles(roles = SPACING_ROLES) {
  if (!isRecord(roles)) {
    throw new Error('spacing roles must be an object')
  }

  const entries = Object.entries(roles)

  if (entries.length === 0) {
    throw new Error('no spacing roles are declared -- an empty space vocabulary governs nothing')
  }

  const ranks = new Map()
  const tokens = new Map()

  for (const [role, policy] of entries) {
    if (!isRecord(policy)) {
      throw new Error(`spacing role '${role}' has no policy object`)
    }

    if (typeof policy.token !== 'string' || policy.token.trim() === '') {
      throw new Error(`spacing role '${role}' names no token, so nothing about it is checkable`)
    }

    const sameToken = tokens.get(policy.token)
    if (sameToken !== undefined) {
      throw new Error(
        `spacing roles '${sameToken}' and '${role}' both name '${policy.token}' -- two semantic ` +
          'names pointing at one token are one role written twice',
      )
    }
    tokens.set(policy.token, role)

    if (policy.heldStill !== undefined && policy.heldStill !== true) {
      throw new Error(
        `spacing role '${role}' declares heldStill=${JSON.stringify(policy.heldStill)} -- omit the ` +
          'field for density-responsive roles; the field exists only to state the fixed exception',
      )
    }

    if (policy.rank === undefined) {
      continue
    }

    if (!Number.isInteger(policy.rank) || policy.rank < 0) {
      throw new Error(
        `spacing role '${role}' has rank ${JSON.stringify(policy.rank)} -- relationship rank must ` +
          'be a non-negative integer',
      )
    }

    const held = ranks.get(policy.rank)
    if (held !== undefined) {
      throw new Error(
        `spacing roles '${held}' and '${role}' both hold rank ${policy.rank} -- distance has one ` +
          'dimension, so two roles at one rank are indistinguishable by policy',
      )
    }

    ranks.set(policy.rank, role)
  }

  // Relationship rank is a vocabulary ladder, not an arbitrary identifier.
  const orderedRanks = [...ranks.keys()].sort((a, b) => a - b)

  for (let index = 0; index < orderedRanks.length; index += 1) {
    if (orderedRanks[index] !== index) {
      throw new Error(
        'spacing relationship ranks must be contiguous from 0 -- found ' +
          `${orderedRanks.join(', ')}, so rank ${index} is missing`,
      )
    }
  }

  return roles
}

/**
 * Every governed semantic spacing token must exist and be a dimension.
 */
export function assertSpacingTokens(tokens, roles = SPACING_ROLES) {
  if (!(tokens instanceof Map)) {
    throw new Error('spacing token validation requires a Map of token paths')
  }

  for (const [role, policy] of Object.entries(roles)) {
    const token = tokens.get(policy.token)

    if (!token) {
      throw new Error(
        `spacing role '${role}' names '${policy.token}', which does not exist -- the role would ` +
          'remain documented while no token carries its grid/relationship obligation',
      )
    }

    if (token.type !== 'dimension') {
      throw new Error(
        `spacing role '${role}' names '${policy.token}', which is a ${token.type} and must be a dimension`,
      )
    }
  }

  return roles
}

/**
 * Bridge the spacing domain to the density axis without importing it.
 *
 * Pass the UNION of token paths rebound by density. `density.mjs` owns how that
 * set is derived and proves symmetry across compact/comfortable. Spacing only
 * proves whether its own members are correct:
 *
 *   heldStill     → must NOT be rebound
 *   everything else in semantic.space.* → must be rebound
 */
export function assertSpacingDensityMembership(densityReboundPaths, roles = SPACING_ROLES) {
  const paths =
    densityReboundPaths instanceof Set ? densityReboundPaths : new Set(densityReboundPaths ?? [])

  for (const [role, policy] of Object.entries(roles)) {
    const participates = paths.has(policy.token)

    if (policy.heldStill === true && participates) {
      throw new Error(
        `spacing role '${role}' is held still under density but '${policy.token}' is rebound by ` +
          'the density axis',
      )
    }

    if (policy.heldStill !== true && !participates) {
      throw new Error(
        `spacing role '${role}' is density-responsive but '${policy.token}' is absent from the ` +
          'density axis -- it would silently fall back to default in every density mode',
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Every spacing-domain failure across every resolved mode.
 *
 * Proves:
 *   • positive measurable dimensions
 *   • 4px-grid alignment (scaled with the root)
 *   • non-decreasing relationship ladder
 *   • adjacent collapse only when the grid has no unused step to spend
 *
 * It does NOT re-prove compact/default/comfortable direction; density owns that
 * cross-domain invariant.
 */
export function spacingFailures(resolvedByMode, roles = SPACING_ROLES, rootPx = ASSUMED_ROOT_PX) {
  const failures = []

  if (!(resolvedByMode instanceof Map)) {
    return ['spacing evaluation requires resolvedByMode to be a Map']
  }

  if (!(typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0)) {
    return [`spacing evaluation root is ${JSON.stringify(rootPx)} -- rootPx must be positive`]
  }

  const scale = rootPx / ASSUMED_ROOT_PX
  const grid = GRID_PX * scale
  const tolerance = GRID_TOLERANCE_PX * scale
  const ordered = orderedRelationshipRoles(roles)

  for (const [label, resolved] of resolvedByMode) {
    if (!(resolved instanceof Map)) {
      failures.push(`${label}: resolved spacing tokens are not a Map`)
      continue
    }

    const measured = new Map()

    for (const [role, policy] of Object.entries(roles)) {
      const raw = resolved.get(policy.token)

      // Token existence/type is asserted separately against the canonical
      // registry. This keeps synthetic resolved maps usable in focused tests.
      if (raw === undefined) {
        continue
      }

      const { px, why } = pixelSpace(raw, rootPx)

      if (px === null) {
        failures.push(`${label}: ${role} spacing ${why}`)
        continue
      }

      if (!(px > 0)) {
        failures.push(
          `${label}: ${role} resolves to ${px}px -- semantic space roles represent a real ` +
            'distance; structural zero belongs at the component/layout expression layer',
        )
        continue
      }

      measured.set(role, px)

      const off = Math.abs(px - Math.round(px / grid) * grid)

      if (off > tolerance) {
        failures.push(
          `${label}: ${role} resolves to ${px}px, ${off.toFixed(2)}px off the ${grid}px grid`,
        )
      }
    }

    // The semantic relationship ladder must never invert.
    for (let index = 1; index < ordered.length; index += 1) {
      const [lowerRole] = ordered[index - 1]
      const [upperRole] = ordered[index]
      const lowerPx = measured.get(lowerRole)
      const upperPx = measured.get(upperRole)

      if (lowerPx === undefined || upperPx === undefined) {
        continue
      }

      if (lowerPx > upperPx + tolerance) {
        failures.push(
          `${label}: spacing ladder inverts -- '${lowerRole}'=${lowerPx}px but ` +
            `'${upperRole}'=${upperPx}px even though ${lowerRole} ranks below ${upperRole}`,
        )
      }
    }

    /**
     * Collapse is not automatically a defect.
     *
     * At compact density a six-role 4px-grid ladder can run out of distinct
     * values. Equality is accepted when there is no unused grid step before the
     * next larger relationship. It is refused when headroom existed and the
     * scale simply failed to use it.
     *
     * Top-rank equality is permitted because there is no larger relationship
     * above it from which to infer unused headroom.
     */
    for (let index = 1; index < ordered.length; index += 1) {
      const [lowerRole] = ordered[index - 1]
      const [upperRole] = ordered[index]
      const lowerPx = measured.get(lowerRole)
      const upperPx = measured.get(upperRole)

      if (
        lowerPx === undefined ||
        upperPx === undefined ||
        Math.abs(lowerPx - upperPx) > tolerance
      ) {
        continue
      }

      const next = ordered[index + 1]

      if (next === undefined) {
        continue
      }

      const [nextRole] = next
      const nextPx = measured.get(nextRole)

      if (nextPx === undefined) {
        continue
      }

      if (nextPx - upperPx > grid + tolerance) {
        failures.push(
          `${label}: '${lowerRole}' and '${upperRole}' collapse at ${upperPx}px while ` +
            `'${nextRole}' is ${nextPx}px -- at least one ${grid}px grid step is unused, so ` +
            'this collapse is not forced by density',
        )
      }
    }
  }

  return failures
}

/**
 * Density-specific spacing failures that are genuinely spacing's responsibility:
 * roles marked `heldStill` must resolve identically across density positions.
 *
 * Direction for fluid roles remains density.mjs's responsibility.
 */
export function spacingDensityFailures(
  resolvedByDensity,
  roles = SPACING_ROLES,
  rootPx = ASSUMED_ROOT_PX,
) {
  const failures = []

  if (!(resolvedByDensity instanceof Map)) {
    return ['spacing density evaluation requires resolvedByDensity to be a Map']
  }

  if (!(typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0)) {
    return [
      `spacing density evaluation root is ${JSON.stringify(rootPx)} -- rootPx must be positive`,
    ]
  }

  const fixed = Object.entries(roles).filter(([, policy]) => policy.heldStill === true)

  for (const [role, policy] of fixed) {
    let baseline = null
    let baselineMode = null

    for (const [mode, resolved] of resolvedByDensity) {
      if (!(resolved instanceof Map)) {
        failures.push(`${mode}: resolved spacing tokens are not a Map`)
        continue
      }

      const raw = resolved.get(policy.token)

      if (raw === undefined) {
        continue
      }

      const { px, why } = pixelSpace(raw, rootPx)

      if (px === null) {
        failures.push(`${mode}: ${role} spacing ${why}`)
        continue
      }

      if (baseline === null) {
        baseline = px
        baselineMode = mode
        continue
      }

      if (Math.abs(px - baseline) > GRID_TOLERANCE_PX) {
        failures.push(
          `${mode}: held-still spacing role '${role}' is ${px}px but ${baselineMode} resolves ` +
            `it to ${baseline}px -- density may pack contents, not the page frame`,
        )
      }
    }
  }

  return failures
}

/**
 * Composite structural entry point for suites with the token registry and the
 * density rebound set available.
 */
export function assertSpacingModel(tokens, densityReboundPaths, roles = SPACING_ROLES) {
  assertSpacingRoles(roles)
  assertSpacingTokens(tokens, roles)
  assertSpacingDensityMembership(densityReboundPaths, roles)

  return roles
}

/* --------------------------------------------------------------- policy -- */

export const spacingPolicy = definePolicy({
  assert: assertSpacingRoles,
  id: 'foundation.spacing',
  kind: 'foundation',
})

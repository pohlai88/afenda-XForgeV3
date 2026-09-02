/**
 * FOUNDATION — sizing. Visual geometry, line geometry and accessibility target floors.
 *
 * ── THE DIVISION FROM SPACING ───────────────────────────────────────────────
 *
 * `spacing.mjs` governs distance BETWEEN things. This file governs the size OF
 * things. Both share the same base 4px rhythm, but sizing is where deliberate
 * exceptions exist:
 *
 *   hairline        1px rules
 *   focus geometry  2px ring / offset
 *
 * Typography is NOT a sizing exception anymore. A text size may also happen to
 * live under a primitive `size.*` namespace, but semantic typography belongs to
 * `typography.mjs`. Keeping `type` as an active sizing exemption would make two
 * foundations own the same fact.
 *
 * ── M3-ALIGNED VISUAL SIZE VS INTERACTION TARGET ────────────────────────────
 *
 * Material 3 distinguishes a component's VISUAL bounds from the minimum
 * INTERACTIVE region around it. A compact visual control may therefore be
 * smaller than the touch target reserved for it.
 *
 * Afenda keeps that separation explicit:
 *
 *   control-min-size   → visual geometry, density-responsive
 *   target-minimum     → accessibility floor, density-invariant
 *
 * This file does NOT force the two tokens to be equal. It also does not import a
 * 48px Material recommendation as an Afenda law. Accessibility/input policy owns
 * the required target floor; sizing only proves that the floor token is valid
 * geometry and that density does not redefine the meaning of visual size.
 *
 * ── GRID MODEL ──────────────────────────────────────────────────────────────
 *
 * Ordinary visual sizes sit on spacing's 4px rhythm.
 *
 * Controls use a coarser 8px rhythm because neighbouring row heights align to
 * them. Icons stay on the 4px rhythm because 16 / 20 / 24 is the useful ladder
 * inside those controls.
 *
 * Off-grid roles must DECLARE why they are off-grid, and must actually resolve
 * off-grid. An unused exemption is refused: it would otherwise become precedent
 * for the next arbitrary value.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'
import { ASSUMED_ROOT_PX, GRID_PX, GRID_TOLERANCE_PX } from './spacing.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * Preserved export for compatibility.
 *
 * `type` remains listed because primitive migration/audit code may still use the
 * historical vocabulary, but semantic SIZE_ROLES are forbidden from claiming
 * it: typography owns type.
 */
export const OFF_GRID_KINDS = deepFreeze(['hairline', 'focus', 'type'])

/** Off-grid kinds that this sizing domain itself may assign to semantic roles. */
export const SIZING_OFF_GRID_KINDS = deepFreeze(['hairline', 'focus'])

/** Historical off-grid category now delegated to another foundation. */
export const DELEGATED_OFF_GRID_KINDS = deepFreeze({
  type: 'foundation.typography',
})

/**
 * Coarser visual-control rhythm: 8px at the named root.
 *
 * This is a multiple of the 4px base grid, not a competing grid.
 */
export const CONTROL_GRID_PX = 8

/** The semantic kind of size a role describes. */
export const SIZE_ROLE_KINDS = deepFreeze(['visual', 'focus-geometry', 'hairline', 'target-floor'])

/* ---------------------------------------------------------------- roles -- */

export const SIZE_ROLES = deepFreeze({
  /**
   * Visual control box: 32 / 40 / 48 across density today.
   *
   * This is not the interaction hit target. Material-style target expansion may
   * reserve a larger interactive region around a smaller visual control.
   */
  'control-min-size': {
    grid: CONTROL_GRID_PX,
    kind: 'visual',
    token: 'semantic.control.min-size',
  },

  /**
   * Visual icon box: 16 / 20 / 24. It must fit strictly inside the visual
   * control box so internal padding is carried by real geometry.
   */
  'icon-size': {
    fitsInside: 'control-min-size',
    kind: 'visual',
    token: 'semantic.icon.size',
  },

  /** Focus ring thickness. */
  ring: {
    kind: 'focus-geometry',
    offGrid: 'focus',
    token: 'semantic.size.ring',
  },

  /** Gap between the focus ring and the boundary it surrounds. */
  'ring-offset': {
    kind: 'focus-geometry',
    offGrid: 'focus',
    token: 'semantic.size.ring-offset',
  },

  /** Device-pixel-like structural rule. */
  stroke: {
    kind: 'hairline',
    offGrid: 'hairline',
    token: 'semantic.size.stroke',
  },

  /**
   * Accessibility minimum target floor.
   *
   * It is on the base grid here. The actual minimum value and any input-modality
   * policy belong to accessibility, not sizing.
   */
  'target-minimum': {
    kind: 'target-floor',
    token: 'semantic.target.minimum',
  },
})

/* --------------------------------------------------------------- helpers -- */

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const pixelSize = (raw, rootPx) => {
  if (typeof raw !== 'string') {
    return {
      px: null,
      why: `${JSON.stringify(raw)} is not a dimension`,
    }
  }

  try {
    const px = toPixels(raw, { rootPx })
    return px === null
      ? { px: null, why: `'${raw}' cannot be measured with root ${rootPx}px` }
      : { px }
  } catch (error) {
    return {
      px: null,
      why: error instanceof Error ? error.message : String(error),
    }
  }
}

const distanceFromGrid = (px, grid) => Math.abs(px - Math.round(px / grid) * grid)

/* ------------------------------------------------------------ assertions -- */

/** The sizing table's own structural rules. */
export function assertSizeRoles(roles = SIZE_ROLES) {
  if (!isRecord(roles)) {
    throw new Error('size roles must be an object')
  }

  const entries = Object.entries(roles)

  if (entries.length === 0) {
    throw new Error('no size roles are declared -- an empty sizing model governs nothing')
  }

  const tokens = new Map()

  for (const [role, policy] of entries) {
    if (!isRecord(policy)) {
      throw new Error(`size role '${role}' has no policy object`)
    }

    if (typeof policy.token !== 'string' || policy.token.trim() === '') {
      throw new Error(`size role '${role}' names no token, so nothing about it is checkable`)
    }

    const sameToken = tokens.get(policy.token)
    if (sameToken !== undefined) {
      throw new Error(
        `size roles '${sameToken}' and '${role}' both name '${policy.token}' -- two semantic ` +
          'roles pointing at one size token are one fact with two names',
      )
    }
    tokens.set(policy.token, role)

    if (!SIZE_ROLE_KINDS.includes(policy.kind)) {
      throw new Error(
        `size role '${role}' has kind '${policy.kind}' -- choose from ` +
          SIZE_ROLE_KINDS.join(', '),
      )
    }

    if (policy.offGrid !== undefined) {
      if (!OFF_GRID_KINDS.includes(policy.offGrid)) {
        throw new Error(
          `size role '${role}' claims off-grid kind '${policy.offGrid}' -- the historical kinds are ` +
            OFF_GRID_KINDS.join(', '),
        )
      }

      if (!SIZING_OFF_GRID_KINDS.includes(policy.offGrid)) {
        const owner = DELEGATED_OFF_GRID_KINDS[policy.offGrid] ?? 'another foundation'
        throw new Error(
          `size role '${role}' claims off-grid kind '${policy.offGrid}', which is delegated to ` +
            `${owner} -- semantic sizing may not reclaim another foundation's exception`,
        )
      }
    }

    if (policy.grid !== undefined) {
      if (!(typeof policy.grid === 'number' && Number.isFinite(policy.grid) && policy.grid > 0)) {
        throw new Error(
          `size role '${role}' declares grid ${JSON.stringify(policy.grid)} -- a grid must be a ` +
            'positive finite pixel premise',
        )
      }

      if (policy.offGrid !== undefined) {
        throw new Error(
          `size role '${role}' both declares grid ${policy.grid}px and exempts itself from the grid`,
        )
      }

      const multiple = policy.grid / GRID_PX
      if (Math.abs(multiple - Math.round(multiple)) > 1e-9) {
        throw new Error(
          `size role '${role}' declares ${policy.grid}px grid, which is not an integer multiple ` +
            `of the ${GRID_PX}px base rhythm`,
        )
      }
    }

    if (policy.kind === 'focus-geometry' && policy.offGrid !== 'focus') {
      throw new Error(
        `size role '${role}' is focus geometry and must explicitly declare offGrid: 'focus'`,
      )
    }

    if (policy.kind === 'hairline' && policy.offGrid !== 'hairline') {
      throw new Error(
        `size role '${role}' is a hairline and must explicitly declare offGrid: 'hairline'`,
      )
    }

    if (
      (policy.kind === 'visual' || policy.kind === 'target-floor') &&
      policy.offGrid !== undefined
    ) {
      throw new Error(
        `size role '${role}' is ${policy.kind} and may not exempt ordinary geometry from the grid`,
      )
    }

    if (policy.fitsInside !== undefined) {
      if (typeof policy.fitsInside !== 'string' || policy.fitsInside.trim() === '') {
        throw new Error(`size role '${role}' names an invalid fitsInside role`)
      }

      if (policy.fitsInside === role) {
        throw new Error(`size role '${role}' cannot fit inside itself`)
      }

      if (roles[policy.fitsInside] === undefined) {
        throw new Error(
          `size role '${role}' must fit inside '${policy.fitsInside}', which is not a size role`,
        )
      }

      if (policy.kind !== 'visual' || roles[policy.fitsInside].kind !== 'visual') {
        throw new Error(
          `size role '${role}' uses fitsInside across non-visual geometry -- containment here is ` +
            'reserved for visual boxes, not target floors, rings or hairlines',
        )
      }
    }
  }

  // Refuse containment cycles, including longer A -> B -> C -> A chains.
  for (const role of Object.keys(roles)) {
    const visited = new Set([role])
    let current = roles[role].fitsInside

    while (current !== undefined) {
      if (visited.has(current)) {
        throw new Error(
          `size containment cycles through '${current}' -- fitsInside must terminate at an outer visual box`,
        )
      }

      visited.add(current)
      current = roles[current]?.fitsInside
    }
  }

  return roles
}

/** Every governed size token must exist and be a dimension. */
export function assertSizeTokens(tokens, roles = SIZE_ROLES) {
  if (!(tokens instanceof Map)) {
    throw new Error('size token validation requires a Map of token paths')
  }

  for (const [role, policy] of Object.entries(roles)) {
    const token = tokens.get(policy.token)

    if (!token) {
      throw new Error(
        `size role '${role}' names '${policy.token}', which does not exist -- its grid and ` +
          'containment rules would govern nothing',
      )
    }

    if (token.type !== 'dimension') {
      throw new Error(
        `size role '${role}' names '${policy.token}', which is a ${token.type} and must be a dimension`,
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Every sizing-domain failure across every resolved mode.
 *
 * Proves:
 *   • all governed sizes resolve to positive geometry
 *   • ordinary roles sit on the base/custom grid
 *   • declared off-grid roles really are off-grid
 *   • visual containment (`icon-size` inside `control-min-size`) is strict
 *
 * This does NOT assert density direction; density owns compact/default/comfortable.
 * It does NOT assert the accessibility target number; accessibility owns that floor.
 */
export function sizingFailures(resolvedByMode, roles = SIZE_ROLES, rootPx = ASSUMED_ROOT_PX) {
  const failures = []

  if (!(resolvedByMode instanceof Map)) {
    return ['sizing evaluation requires resolvedByMode to be a Map']
  }

  if (!(typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0)) {
    return [`sizing evaluation root is ${JSON.stringify(rootPx)} -- rootPx must be positive`]
  }

  const scale = rootPx / ASSUMED_ROOT_PX
  const baseGrid = GRID_PX * scale
  const tolerance = GRID_TOLERANCE_PX * scale

  for (const [label, resolved] of resolvedByMode) {
    if (!(resolved instanceof Map)) {
      failures.push(`${label}: resolved size tokens are not a Map`)
      continue
    }

    const measured = new Map()

    for (const [role, policy] of Object.entries(roles)) {
      const raw = resolved.get(policy.token)

      // Canonical token existence/type is checked by assertSizeTokens. Skipping
      // absent values keeps focused synthetic resolved maps usable.
      if (raw === undefined) {
        continue
      }

      const { px, why } = pixelSize(raw, rootPx)

      if (px === null) {
        failures.push(`${label}: ${role} size ${why}`)
        continue
      }

      if (!(px > 0)) {
        failures.push(`${label}: ${role} resolves to ${px}px -- size roles must be positive`)
        continue
      }

      measured.set(role, px)

      if (policy.offGrid !== undefined) {
        const off = distanceFromGrid(px, baseGrid)

        if (off <= tolerance) {
          failures.push(
            `${label}: '${role}' declares offGrid: '${policy.offGrid}' but resolves to ${px}px, ` +
              `which sits on the ${baseGrid}px base grid -- an exemption nothing uses becomes precedent`,
          )
        }

        continue
      }

      const declaredGrid = (policy.grid ?? GRID_PX) * scale
      const off = distanceFromGrid(px, declaredGrid)

      if (off > tolerance) {
        failures.push(
          `${label}: '${role}' resolves to ${px}px, ${off.toFixed(2)}px off its ` +
            `${declaredGrid}px grid`,
        )
      }
    }

    for (const [role, policy] of Object.entries(roles)) {
      if (policy.fitsInside === undefined) {
        continue
      }

      const innerPx = measured.get(role)
      const outerPx = measured.get(policy.fitsInside)

      if (innerPx === undefined || outerPx === undefined) {
        continue
      }

      if (!(innerPx + tolerance < outerPx)) {
        failures.push(
          `${label}: '${role}' is ${innerPx}px and must fit strictly inside ` +
            `'${policy.fitsInside}' at ${outerPx}px -- equal visual boxes leave no internal geometry`,
        )
      }
    }
  }

  return failures
}

/**
 * Prove that target-floor geometry remains conceptually separate from visual
 * geometry. This is intentionally a SHAPE check, not a numeric accessibility
 * threshold.
 *
 * It refuses future table edits that alias the target floor to the visual-control
 * token or make one contain the other through `fitsInside`.
 */
export function assertVisualTargetSeparation(roles = SIZE_ROLES) {
  const visual = roles['control-min-size']
  const target = roles['target-minimum']

  if (!(visual && target)) {
    throw new Error(
      "visual/target separation requires both 'control-min-size' and 'target-minimum' roles",
    )
  }

  if (visual.token === target.token) {
    throw new Error(
      `control visual size and interaction target floor both name '${visual.token}' -- Material-style ` +
        'target expansion requires them to remain independently bindable',
    )
  }

  if (visual.fitsInside === 'target-minimum' || target.fitsInside === 'control-min-size') {
    throw new Error(
      'visual control size and target floor must not be coupled through fitsInside -- the target ' +
        'is an interaction/accessibility envelope, not a visual parent box',
    )
  }

  return roles
}

/** Composite structural entry point for suites with the token registry. */
export function assertSizingModel(tokens, roles = SIZE_ROLES) {
  assertSizeRoles(roles)
  assertVisualTargetSeparation(roles)
  assertSizeTokens(tokens, roles)

  return roles
}

/* --------------------------------------------------------------- policy -- */

export const sizingPolicy = definePolicy({
  assert: assertSizeRoles,
  id: 'foundation.sizing',
  kind: 'foundation',
})

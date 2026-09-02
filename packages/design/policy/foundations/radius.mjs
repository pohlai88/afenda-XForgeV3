/**
 * FOUNDATION — radius. Four semantic roles, one containment ladder, mechanically proved.
 *
 * ── THE MODEL ───────────────────────────────────────────────────────────────
 *
 * Radius is not a t-shirt scale. Components do not choose `sm`, `md`, `lg` or
 * whichever number looks right. They name what the corner BELONGS TO:
 *
 *   precise   → a mark
 *   control   → something a person operates
 *   container → a surface that holds other things
 *   overlay   → a surface that floats above the application
 *
 * The values currently resolve to the same useful core ladder Material 3 uses
 * at 4 / 8 / 12 / 16px, but those measurements are not the API. The semantic
 * role is the API.
 *
 * `rounded-none` and `rounded-full` remain structural utilities rather than
 * members of this ladder:
 *
 *   none → a seam or structural edge must stay square
 *   full → the object is intrinsically circular / pill-shaped
 *
 * ── THE INVARIANT ───────────────────────────────────────────────────────────
 *
 * Rank means CONTAINMENT. An inner corner must be strictly tighter than the
 * corner around it:
 *
 *   precise < control < container < overlay
 *
 * The previous policy recorded that fact in prose and rank, but never resolved
 * the tokens and proved the values. That meant this was legal:
 *
 *   precise=4, control=16, container=8, overlay=12
 *
 * The table still looked valid because every rank was unique. `radiusFailures`
 * closes that gap by evaluating the actual resolved token values in every mode.
 *
 * ── MODES ──────────────────────────────────────────────────────────────────
 *
 * Radius is foundation geometry. Density changes spacing and control height;
 * appearance changes colour; neither silently changes what kind of object a
 * corner belongs to. The evaluator therefore proves that each semantic radius
 * resolves to the same rendered size across modes.
 *
 * If Afenda ever intentionally introduces a brand whose geometry changes, that
 * should be an explicit policy decision rather than an accidental mode rebind.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'
import { ASSUMED_ROOT_PX } from './spacing.mjs'

/* ---------------------------------------------------------------- roles -- */

export const RADIUS_ROLES = deepFreeze({
  /** A surface holding other things: card, panel, row group, chart or filter container. */
  container: {
    rank: 2,
    token: 'semantic.radius.container',
  },

  /** Anything a person operates: button, input, select, combobox, segmented control. */
  control: {
    rank: 1,
    token: 'semantic.radius.control',
  },

  /** A floating surface: dialog, sheet, command palette or comparable overlay shell. */
  overlay: {
    rank: 3,
    token: 'semantic.radius.overlay',
  },
  /** A mark, not a surface: checkbox, swatch, compact badge geometry, inline code. */
  precise: {
    rank: 0,
    token: 'semantic.radius.precise',
  },
})

/**
 * Small numeric slack for comparing converted dimensions across modes.
 *
 * This is not a visual tolerance. It only prevents representational floating
 * point noise from turning two equivalent dimensions into a false mode-drift
 * failure.
 */
export const RADIUS_MODE_TOLERANCE_PX = 0.001

/* ------------------------------------------------------------ assertions -- */

/**
 * The radius table's own structural rules.
 *
 * This function deliberately validates only facts the table itself can prove.
 * Token existence/type belongs to `assertRadiusTokens`; resolved-value ordering
 * and mode invariance belong to `radiusFailures`.
 */
export function assertRadiusRoles(roles = RADIUS_ROLES) {
  if (roles === null || typeof roles !== 'object' || Array.isArray(roles)) {
    throw new Error('radius roles must be an object')
  }

  const entries = Object.entries(roles)
  if (entries.length === 0) {
    throw new Error('no radius roles are declared -- an empty ladder proves no containment')
  }

  const ranks = new Map()
  const tokens = new Map()

  for (const [role, policy] of entries) {
    if (policy === null || typeof policy !== 'object' || Array.isArray(policy)) {
      throw new Error(`radius role '${role}' has no policy object`)
    }

    if (typeof policy.token !== 'string' || policy.token.trim() === '') {
      throw new Error(`radius role '${role}' names no token, so nothing about it is checkable`)
    }

    if (!Number.isInteger(policy.rank) || policy.rank < 0) {
      throw new Error(
        `radius role '${role}' has rank ${JSON.stringify(policy.rank)} -- containment rank must ` +
          'be a non-negative integer',
      )
    }

    const heldRank = ranks.get(policy.rank)
    if (heldRank !== undefined) {
      throw new Error(
        `radius roles '${heldRank}' and '${role}' both hold rank ${policy.rank} -- containment ` +
          'is a single order, so two roles at one rank leaves it undecided which sits inside which',
      )
    }
    ranks.set(policy.rank, role)

    const heldToken = tokens.get(policy.token)
    if (heldToken !== undefined) {
      throw new Error(
        `radius roles '${heldToken}' and '${role}' both name '${policy.token}' -- two semantic ` +
          'roles pointing at one token cannot form a containment distinction',
      )
    }
    tokens.set(policy.token, role)
  }

  return roles
}

/**
 * Every role token must exist and be a dimension.
 *
 * A misspelled policy path must fail here. Otherwise the token can continue to
 * exist and render while the policy silently loses its grip on it.
 *
 * `tokens` is the registry Map used by the design-system policy suite:
 *   Map<tokenPath, { type, ... }>
 */
export function assertRadiusTokens(tokens, roles = RADIUS_ROLES) {
  if (!(tokens instanceof Map)) {
    throw new Error('radius token validation requires a Map of token paths')
  }

  for (const [role, policy] of Object.entries(roles)) {
    const token = tokens.get(policy.token)

    if (!token) {
      throw new Error(
        `radius role '${role}' names '${policy.token}', which does not exist -- the containment ` +
          'ladder would stop governing that role while the component could keep rendering',
      )
    }

    if (token.type !== 'dimension') {
      throw new Error(
        `radius role '${role}' names '${policy.token}', which is a ${token.type} and must be a ` +
          'dimension -- radius can only be compared after it resolves to geometry',
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Convert a resolved radius literal to pixels without throwing away the reason a
 * value could not be measured.
 */
const pixelRadius = (raw, rootPx) => {
  if (typeof raw !== 'string') {
    return {
      px: null,
      why: `is ${JSON.stringify(raw)}, which is not a dimension`,
    }
  }

  try {
    const px = toPixels(raw, { rootPx })

    return px === null
      ? {
          px: null,
          why: `is '${raw}', a rem with no usable root size to measure it against`,
        }
      : { px }
  } catch (error) {
    return {
      px: null,
      why: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Roles from innermost to outermost. */
const byContainment = (roles) => Object.entries(roles).sort(([, a], [, b]) => a.rank - b.rank)

/**
 * Every resolved radius failure across every mode.
 *
 * `resolvedByMode` is:
 *   Map<modeLabel, Map<tokenPath, literal>>
 *
 * It proves three things the table cannot prove by inspection:
 *
 *   1. every governed role resolves to a measurable positive dimension
 *   2. containment is STRICT: every outer role is rounder than the one inside it
 *   3. foundation geometry is invariant across modes
 */
export function radiusFailures(resolvedByMode, roles = RADIUS_ROLES, rootPx = ASSUMED_ROOT_PX) {
  const failures = []

  if (!(resolvedByMode instanceof Map)) {
    return ['radius evaluation requires resolvedByMode to be a Map']
  }

  if (!(typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0)) {
    return [`radius evaluation root is ${JSON.stringify(rootPx)} -- rootPx must be positive`]
  }

  const ordered = byContainment(roles)
  const baseline = new Map()
  let baselineLabel = null

  for (const [label, resolved] of resolvedByMode) {
    if (!(resolved instanceof Map)) {
      failures.push(`${label}: resolved radius tokens are not a Map`)
      continue
    }

    const measured = new Map()

    for (const [role, policy] of ordered) {
      const raw = resolved.get(policy.token)

      if (raw === undefined) {
        failures.push(
          `${label}: radius role '${role}' names '${policy.token}', which does not resolve in this mode`,
        )
        continue
      }

      const { px, why } = pixelRadius(raw, rootPx)

      if (px === null) {
        failures.push(`${label}: ${role} radius ${why}`)
        continue
      }

      if (!(px > 0)) {
        failures.push(
          `${label}: ${role} resolves to ${px}px -- semantic radius roles must be positive; ` +
            '`none` is structural and deliberately outside the radius ladder',
        )
        continue
      }

      measured.set(role, px)

      // The first usable mode becomes the rendered-geometry baseline. Compare
      // pixels rather than raw strings so equivalent `0.5rem` and `8px` values
      // do not create a false drift.
      if (baselineLabel === null) {
        baseline.set(role, px)
      } else if (baseline.has(role)) {
        const expected = baseline.get(role)
        const drift = Math.abs(px - expected)

        if (drift > RADIUS_MODE_TOLERANCE_PX) {
          failures.push(
            `${label}: ${role} radius is ${px}px but ${baselineLabel} resolves it to ${expected}px ` +
              '-- radius is foundation geometry and must not drift across modes',
          )
        }
      }
    }

    if (baselineLabel === null) {
      baselineLabel = label
    }

    // The actual containment invariant. Strict inequality is intentional:
    // equality means two semantic roles have collapsed into one visible shape.
    for (let index = 1; index < ordered.length; index += 1) {
      const [innerRole] = ordered[index - 1]
      const [outerRole] = ordered[index]
      const innerPx = measured.get(innerRole)
      const outerPx = measured.get(outerRole)

      // Missing / invalid values were already reported above.
      if (innerPx === undefined || outerPx === undefined) {
        continue
      }

      if (!(innerPx < outerPx)) {
        const relation = innerPx === outerPx ? 'the same radius as' : 'a larger radius than'

        failures.push(
          `${label}: '${innerRole}' (${innerPx}px) has ${relation} '${outerRole}' (${outerPx}px) ` +
            '-- an inner corner must be strictly tighter than the corner around it',
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

/**
 * The registry handle stays intentionally small and backward-compatible.
 *
 * The import-time assertion can only validate the role table. Token existence
 * and resolved values require subjects owned by the registry/generator/test
 * suite, so `assertRadiusTokens` and `radiusFailures` remain exported evaluators.
 */
export const radiusPolicy = definePolicy({
  assert: assertRadiusRoles,
  id: 'foundation.radius',
  kind: 'foundation',
})

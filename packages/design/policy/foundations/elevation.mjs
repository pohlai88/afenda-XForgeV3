/**
 * FOUNDATION — elevation. Structural layers and how they remain distinguishable.
 *
 * ── THE MODEL ───────────────────────────────────────────────────────────────
 *
 * Elevation is not "bigger shadow = higher layer".
 *
 * Afenda treats layer as STRUCTURE and shadow as only one possible expression.
 * For a long-session data product, the preferred separation order is:
 *
 *   spacing → surface → boundary → scrim → shadow
 *
 * Shadow is deliberately fragile: forced-colors and low-contrast rendering can
 * remove or erase it. It may reinforce a separation; it may never be the only
 * means by which a non-base layer remains distinguishable.
 *
 * The product currently needs only three structural layers:
 *
 *   base   → the page itself
 *   panel  → grouped content that remains on the page
 *   above  → floating / interrupting UI such as menus, sheets and dialogs
 *
 * Rank means structural distance from the page. It is NOT z-index, NOT shadow
 * strength and NOT a surface colour.
 *
 * ── WHAT THIS UPGRADE PROVES ────────────────────────────────────────────────
 *
 * The previous table already enforced the central "shadow is never enough"
 * rule. This version additionally proves:
 *
 *   • every layer names a non-empty elevation token path
 *   • every layer has a non-negative integer rank
 *   • ranks are unique AND contiguous from 0
 *   • every separation list is an array with no duplicates
 *   • every declared separation means is known
 *   • every non-base layer has at least one robust separator
 *   • painted separation means still have governed colour roles
 *   • every surface still has a governed colour role
 *   • every referenced semantic elevation token exists in the token registry
 *
 * It intentionally does NOT assert a shadow token type. The current value
 * vocabulary does not establish one; inventing that contract here would make
 * this policy stricter than the repository it is meant to govern.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'
import { COLOR_ROLE_POLICIES } from './color.mjs'

/* ------------------------------------------------------------- separation -- */

/**
 * Closed set of ways one layer can be told apart from the one beneath it.
 *
 * `shadow` is admitted so the policy can explicitly refuse it as the sole
 * separator. `spacing` is admitted because distance itself is robust.
 */
export const SEPARATION_MEANS = deepFreeze(['boundary', 'scrim', 'shadow', 'spacing', 'surface'])

/**
 * Means that are not sufficient by themselves.
 *
 * Deriving robust means from the fragile set keeps one fact in one place.
 */
const FRAGILE_MEANS = deepFreeze(['shadow'])

const ROBUST_MEANS = deepFreeze(SEPARATION_MEANS.filter((means) => !FRAGILE_MEANS.includes(means)))

/**
 * Separation means implemented by a single colour role.
 *
 * Boundary intentionally does not live here: which border role paints it is a
 * per-layer fact, not a universal mapping.
 */
const MEANS_PAINTED_BY_ROLE = deepFreeze({
  scrim: 'color.scrim',
})

/* ---------------------------------------------------------------- layers -- */

export const ELEVATION_LAYERS = deepFreeze({
  above: {
    elevation: 'semantic.elevation.floating',
    rank: 2,
    reason: 'a menu, sheet or dialog, which reads as interrupting the page rather than joining it',
    separatedBy: ['scrim', 'shadow', 'surface'],
    surface: 'color.surface-container',
  },
  base: {
    elevation: 'semantic.elevation.flat',
    rank: 0,
    reason: 'the page itself, which nothing sits beneath',
    separatedBy: [],
    surface: 'color.surface',
  },

  panel: {
    elevation: 'semantic.elevation.flat',
    rank: 1,
    reason: 'a card or panel, which groups content without leaving the page',
    separatedBy: ['boundary', 'surface'],
    surface: 'color.surface-lowest',
  },
})

/* ------------------------------------------------------------ assertions -- */

/**
 * Validate the layer model using only facts available in the table and colour
 * policy. Token existence is checked separately by `assertElevationTokens`.
 */
export function assertElevationLayers(layers = ELEVATION_LAYERS, roles = COLOR_ROLE_POLICIES) {
  if (layers === null || typeof layers !== 'object' || Array.isArray(layers)) {
    throw new Error('elevation layers must be an object')
  }

  const entries = Object.entries(layers)

  if (entries.length === 0) {
    throw new Error(
      'the elevation model was proven over zero layers -- an empty table satisfies every ' +
        'relational rule while describing no product structure',
    )
  }

  for (const means of FRAGILE_MEANS) {
    if (!SEPARATION_MEANS.includes(means)) {
      throw new Error(
        `'${means}' is named as fragile but is not one of ${SEPARATION_MEANS.join(', ')} -- ` +
          'the fragile set would stop excluding the means it exists to disqualify',
      )
    }
  }

  for (const [means, painter] of Object.entries(MEANS_PAINTED_BY_ROLE)) {
    if (!SEPARATION_MEANS.includes(means)) {
      throw new Error(`painted separation means '${means}' is not declared in SEPARATION_MEANS`)
    }

    if (typeof painter !== 'string' || painter.trim() === '') {
      throw new Error(`painted separation means '${means}' names no colour role`)
    }
  }

  const ranks = new Map()

  for (const [layer, policy] of entries) {
    if (policy === null || typeof policy !== 'object' || Array.isArray(policy)) {
      throw new Error(`elevation layer '${layer}' has no policy object`)
    }

    if (typeof policy.elevation !== 'string' || policy.elevation.trim() === '') {
      throw new Error(
        `elevation layer '${layer}' names no semantic elevation token, so its expression is ungoverned`,
      )
    }

    if (!Number.isInteger(policy.rank) || policy.rank < 0) {
      throw new Error(
        `elevation layer '${layer}' has rank ${JSON.stringify(policy.rank)} -- rank must be a ` +
          'non-negative integer because it is a structural ladder',
      )
    }

    const held = ranks.get(policy.rank)
    if (held !== undefined) {
      throw new Error(
        `elevation layers '${held}' and '${layer}' both hold rank ${policy.rank} -- two layers ` +
          'at one structural rank have no order',
      )
    }
    ranks.set(policy.rank, layer)

    if (typeof policy.reason !== 'string' || policy.reason.trim() === '') {
      throw new Error(`elevation layer '${layer}' must say what renders there`)
    }

    if (typeof policy.surface !== 'string' || policy.surface.trim() === '') {
      throw new Error(`elevation layer '${layer}' names no surface colour role`)
    }

    if (!roles[policy.surface]) {
      throw new Error(
        `elevation layer '${layer}' paints with '${policy.surface}', which has no colour ` +
          'policy -- a layer on an ungoverned surface is one whose contrast nothing measures',
      )
    }

    if (!Array.isArray(policy.separatedBy)) {
      throw new Error(`elevation layer '${layer}' separatedBy is not an array`)
    }

    const seenMeans = new Set()

    for (const means of policy.separatedBy) {
      if (seenMeans.has(means)) {
        throw new Error(
          `elevation layer '${layer}' lists separation means '${means}' more than once`,
        )
      }
      seenMeans.add(means)

      if (!SEPARATION_MEANS.includes(means)) {
        throw new Error(
          `elevation layer '${layer}' is separated by '${means}', which is not one of ` +
            `${SEPARATION_MEANS.join(', ')}`,
        )
      }

      const painter = MEANS_PAINTED_BY_ROLE[means]
      if (painter !== undefined && !roles[painter]) {
        throw new Error(
          `elevation layer '${layer}' is separated by '${means}', which is painted by colour ` +
            `role '${painter}' -- and that role does not exist`,
        )
      }
    }

    if (policy.rank === 0) {
      if (policy.separatedBy.length > 0) {
        throw new Error(
          `elevation layer '${layer}' is rank 0 and names a separation -- there is nothing ` +
            'beneath the base layer to separate it from',
        )
      }
      continue
    }

    if (policy.separatedBy.length === 0) {
      throw new Error(
        `elevation layer '${layer}' names no separation -- a layer indistinguishable from ` +
          'the one beneath it is not a layer',
      )
    }

    if (!policy.separatedBy.some((means) => ROBUST_MEANS.includes(means))) {
      throw new Error(
        `elevation layer '${layer}' is separated only by ${policy.separatedBy.join(' and ')} -- ` +
          'shadow may reinforce separation but may never be the only boundary',
      )
    }
  }

  if (!ranks.has(0)) {
    throw new Error(
      `no elevation layer is at rank 0 -- the declared ranks are ${[...ranks.keys()]
        .sort((a, b) => a - b)
        .join(', ')}`,
    )
  }

  // Rank is a conceptual ladder, not an arbitrary identifier. Missing numbers
  // imply phantom structural layers the model does not define.
  const orderedRanks = [...ranks.keys()].sort((a, b) => a - b)

  for (let index = 0; index < orderedRanks.length; index += 1) {
    if (orderedRanks[index] !== index) {
      throw new Error(
        `elevation ranks must be contiguous from 0 -- found ${orderedRanks.join(', ')}, ` +
          `so rank ${index} is missing and the ladder contains a phantom level`,
      )
    }
  }

  return layers
}

/**
 * Prove that every semantic elevation path named by the layer model exists.
 *
 * Deliberately checks existence only. The current repository does not establish
 * a single elevation/shadow `$type` contract, so guessing one here would create
 * a new source of truth rather than validate the existing one.
 */
export function assertElevationTokens(tokens, layers = ELEVATION_LAYERS) {
  if (!(tokens instanceof Map)) {
    throw new Error('elevation token validation requires a Map of token paths')
  }

  for (const [layer, policy] of Object.entries(layers)) {
    const token = tokens.get(policy.elevation)

    if (!token) {
      throw new Error(
        `elevation layer '${layer}' names '${policy.elevation}', which does not exist -- the ` +
          'layer would retain its structural claim while losing its governed elevation expression',
      )
    }
  }

  return layers
}

/**
 * Composite entry point for suites that have both the colour policy and token
 * registry available.
 */
export function assertElevationModel(
  tokens,
  layers = ELEVATION_LAYERS,
  roles = COLOR_ROLE_POLICIES,
) {
  assertElevationLayers(layers, roles)
  assertElevationTokens(tokens, layers)

  return layers
}

/* --------------------------------------------------------------- policy -- */

/**
 * Registry handle remains backward-compatible. Import-time assertion validates
 * the table; token existence requires the registry Map and therefore stays an
 * exported assertion for the generator/unit suite.
 */
export const elevationPolicy = definePolicy({
  assert: assertElevationLayers,
  id: 'foundation.elevation',
  kind: 'foundation',
})

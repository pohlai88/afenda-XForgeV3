/**
 * FOUNDATION — density. A spatial compression axis, not a visual theme or layout breakpoint.
 *
 * ── M3-ALIGNED MODEL ────────────────────────────────────────────────────────
 *
 * Material's useful lesson is not a particular "density number". It is the
 * separation of concerns:
 *
 *   • adaptive/window size decides LAYOUT
 *   • typography remains readable and independently scalable
 *   • visual bounds may become denser for precise-pointer/keyboard work
 *   • interactive target safety is not something density is allowed to erase
 *
 * Afenda therefore treats density as a SPATIAL axis. It may rebind only the
 * spatial semantic domains explicitly admitted below. Everything else is
 * forbidden by default rather than waiting for a growing denylist.
 *
 * The conceptual order is:
 *
 *   compact → default → comfortable
 *
 * `default` is the unmodified token set and therefore has no declaration block.
 *
 * ── WHAT THIS FILE PROVES ───────────────────────────────────────────────────
 *
 * Declaration-time:
 *
 *   1. the declared modes are exactly compact + comfortable
 *   2. both modes rebind the exact same token set
 *   3. every rebound token belongs to a density-owned spatial namespace
 *   4. density and theme never rebind the same token
 *   5. density never declares typography/layout/colour/motion/etc by accident
 *
 * Resolution-time:
 *
 *   6. every governed value is measurable geometry
 *   7. compact <= default <= comfortable for every rebound token
 *   8. every rebound token actually changes across the axis
 *
 * Magnitude remains owned by the underlying domain. This file does not decide
 * whether 8px is the correct space or 32px is the correct visual control size;
 * it proves only membership and direction.
 *
 * ── TOUCH TARGETS ───────────────────────────────────────────────────────────
 *
 * Material 3's current Compose implementation preserves a recommended 48dp
 * minimum interactive region even when the visual element is smaller. Afenda
 * should model that as a separate interaction-target token, not by preventing
 * compact VISUAL controls.
 *
 * This file therefore protects target-like namespaces from density, but does
 * not duplicate an accessibility floor. The floor remains accessibility
 * policy's authority.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'
import { ASSUMED_ROOT_PX } from './spacing.mjs'

/* ------------------------------------------------------------- premises -- */

/** Least to most spatially generous. `default` has no declaration block. */
export const DENSITY_ORDER = deepFreeze(['compact', 'default', 'comfortable'])

/** The two mode blocks that must actually exist in `$modes.density`. */
export const DENSITY_DECLARED_MODES = deepFreeze(['compact', 'comfortable'])

/**
 * Density is fail-closed: only spatial domains admitted here may be rebound.
 *
 * `semantic.control.*` remains admitted for drop-in compatibility with the
 * current `semantic.control.min-size`. The recommended follow-up is to separate
 * visual control bounds from the interaction hit target, then keep the latter
 * outside this allowlist.
 */
export const DENSITY_MAY_REBIND = deepFreeze([
  'semantic.space.',
  'semantic.control.',
  'semantic.icon.',
])

/**
 * Preserved export, now expanded as documentation and better error text.
 *
 * The allowlist above is the enforcement. This list identifies especially
 * important forbidden families so a violation explains WHICH axis it tried to
 * smuggle into density.
 */
export const DENSITY_MAY_NOT_REBIND = deepFreeze([
  'semantic.type.',
  'semantic.leading.',
  'semantic.weight.',
  'semantic.font.',
  'semantic.tracking.',
  'semantic.radius.',
  'semantic.color.',
  'semantic.motion.',
  'semantic.elevation.',
  'semantic.layer.',
  'semantic.layout.',
  'semantic.breakpoint.',
  'semantic.target.',
  'semantic.hit-target.',
])

/** Floating-point slack for rem/px conversion comparisons. */
export const DENSITY_TOLERANCE_PX = 0.001

/* --------------------------------------------------------------- helpers -- */

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Every token path a mode block rebinds, flattened.
 *
 * The mode source is DTCG-shaped nested data. `$*` metadata is never a token
 * path. A node carrying `$value` is a token and terminates traversal.
 */
const reboundPaths = (block, prefix = '') => {
  if (!isRecord(block)) {
    throw new Error(`density mode block at '${prefix || '<root>'}' is not an object`)
  }

  const out = []

  for (const [key, value] of Object.entries(block)) {
    if (key.startsWith('$')) {
      continue
    }

    if (!isRecord(value)) {
      // A mode declaration is expected to rebind token objects, not contain
      // arbitrary scalar leaves. Ignore nothing silently.
      throw new Error(
        `density mode '${prefix + key}' is ${JSON.stringify(value)} -- rebound leaves must be token objects`,
      )
    }

    if (value.$value !== undefined) {
      out.push(prefix + key)
      continue
    }

    out.push(...reboundPaths(value, `${prefix + key}.`))
  }

  return out
}

export { reboundPaths }

const declaredModes = (modes) => Object.entries(modes).filter(([mode]) => !mode.startsWith('$'))

const densityPaths = (densityModes) => {
  const entries = declaredModes(densityModes)
  return new Set(entries.flatMap(([, block]) => reboundPaths(block)))
}

const dimensionPx = (raw, rootPx) => {
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

/* ------------------------------------------------------------ assertions -- */

/**
 * Declaration-time axis invariants.
 *
 * `densityModes` and `themeModes` are the raw mode declaration blocks, not
 * resolved maps. Symmetry/exclusivity depend on knowing what was explicitly
 * rebound rather than what value happened to result.
 */
export function assertDensityAxis(densityModes, themeModes = {}) {
  if (!isRecord(densityModes)) {
    throw new Error('density modes must be an object')
  }

  if (!isRecord(themeModes)) {
    throw new Error('theme modes must be an object')
  }

  const entries = declaredModes(densityModes)
  const names = entries.map(([mode]) => mode).sort()
  const expected = [...DENSITY_DECLARED_MODES].sort()

  if (entries.length < 2) {
    throw new Error(
      `density declares ${entries.length} mode${entries.length === 1 ? '' : 's'} -- compact and ` +
        'comfortable must both exist around the unmodified default',
    )
  }

  const missingModes = expected.filter((mode) => !names.includes(mode))
  const extraModes = names.filter((mode) => !expected.includes(mode))

  if (missingModes.length > 0 || extraModes.length > 0) {
    throw new Error(
      `density mode declarations must be exactly ${DENSITY_DECLARED_MODES.join(' + ')} -- ` +
        `missing (${missingModes.join(', ') || 'nothing'}), unexpected ` +
        `(${extraModes.join(', ') || 'nothing'}). 'default' is the unmodified token set and ` +
        'must not have its own block',
    )
  }

  const density = new Map(entries.map(([mode, block]) => [mode, new Set(reboundPaths(block))]))

  const [reference, ...rest] = [...density.entries()]

  if (reference[1].size === 0) {
    throw new Error(
      `density mode '${reference[0]}' rebinds no tokens -- an axis that moves nothing is only a selector`,
    )
  }

  // Symmetry: every declared density mode owns the exact same token membership.
  for (const [mode, paths] of rest) {
    const missing = [...reference[1]].filter((path) => !paths.has(path))
    const extra = [...paths].filter((path) => !reference[1].has(path))

    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `density modes '${reference[0]}' and '${mode}' rebind different tokens -- ` +
          `${mode} is missing (${missing.join(', ') || 'nothing'}) and adds ` +
          `(${extra.join(', ') || 'nothing'}). Every governed role must participate in the ` +
          'whole axis rather than falling back to default on one side',
      )
    }
  }

  const all = new Set(reference[1])

  // Fail closed: spatial namespaces are admitted; every other foundation stays
  // invariant under density unless this policy itself is consciously extended.
  for (const path of all) {
    const allowed = DENSITY_MAY_REBIND.some((prefix) => path.startsWith(prefix))

    if (!allowed) {
      const forbidden = DENSITY_MAY_NOT_REBIND.find((prefix) => path.startsWith(prefix))
      const reason =
        forbidden === undefined
          ? `it is outside the admitted spatial namespaces ${DENSITY_MAY_REBIND.join(', ')}`
          : `it belongs to '${forbidden}', which is not the density axis`

      throw new Error(
        `density rebinds '${path}' -- ${reason}. Density compresses spatial affordances; it ` +
          'does not become a theme, type scale, shape system, motion system or layout breakpoint',
      )
    }
  }

  // Theme and density selectors have equal specificity in the generated CSS.
  // One token on both axes would therefore be resolved by output order.
  const theme = new Set(declaredModes(themeModes).flatMap(([, block]) => reboundPaths(block)))

  const contested = [...all].filter((path) => theme.has(path))

  if (contested.length > 0) {
    throw new Error(
      `${contested.join(', ')} rebound by BOTH theme and density -- equal-specificity selectors ` +
        'make generator order the hidden third rule. One semantic token belongs to one axis',
    )
  }

  return densityModes
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Resolution-time density failures.
 *
 * `resolvedByDensity`:
 *   Map<'compact'|'default'|'comfortable', Map<tokenPath, literal>>
 *
 * `densityModes` is also passed because the resolved maps contain every token;
 * the declarations tell us which token membership this axis actually owns.
 *
 * Direction is non-decreasing:
 *
 *   compact <= default <= comfortable
 *
 * Base may legitimately equal one side, but compact and comfortable may not be
 * equal: rebinding a token without changing it means the axis claims ownership
 * of a role it does not actually move.
 */
export function densityFailures(resolvedByDensity, densityModes, rootPx = ASSUMED_ROOT_PX) {
  const failures = []

  if (!(resolvedByDensity instanceof Map)) {
    return ['density evaluation requires resolvedByDensity to be a Map']
  }

  if (!isRecord(densityModes)) {
    return ['density evaluation requires raw density mode declarations']
  }

  if (!(typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0)) {
    return [`density evaluation root is ${JSON.stringify(rootPx)} -- rootPx must be positive`]
  }

  const paths = densityPaths(densityModes)

  for (const mode of DENSITY_ORDER) {
    if (!(resolvedByDensity.get(mode) instanceof Map)) {
      failures.push(`density resolution has no '${mode}' token Map`)
    }
  }

  if (failures.length > 0) {
    return failures
  }

  for (const path of paths) {
    const measured = []

    for (const mode of DENSITY_ORDER) {
      const resolved = resolvedByDensity.get(mode)
      const raw = resolved.get(path)

      if (raw === undefined) {
        failures.push(`${mode}: density-owned token '${path}' does not resolve`)
        measured.push([mode, null])
        continue
      }

      const { px, why } = dimensionPx(raw, rootPx)

      if (px === null) {
        failures.push(`${mode}: density-owned token '${path}' ${why}`)
        measured.push([mode, null])
        continue
      }

      measured.push([mode, px])
    }

    if (measured.some(([, px]) => px === null)) {
      continue
    }

    for (let index = 1; index < measured.length; index += 1) {
      const [lowerMode, lowerPx] = measured[index - 1]
      const [upperMode, upperPx] = measured[index]

      if (lowerPx > upperPx + DENSITY_TOLERANCE_PX) {
        failures.push(
          `'${path}' inverts density: ${lowerMode}=${lowerPx}px, ${upperMode}=${upperPx}px -- ` +
            `the axis order is ${DENSITY_ORDER.join(' < ')}`,
        )
      }
    }

    const compactPx = measured[0][1]
    const comfortablePx = measured[measured.length - 1][1]

    if (Math.abs(compactPx - comfortablePx) <= DENSITY_TOLERANCE_PX) {
      failures.push(
        `'${path}' is rebound by density but compact and comfortable both resolve to ` +
          `${compactPx}px -- a no-op token does not belong to the axis`,
      )
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

/**
 * Density has no role table of its own. Its import-time subject is the raw mode
 * declaration because membership is the thing this axis owns.
 */
export const densityPolicy = definePolicy({
  assert: assertDensityAxis,
  id: 'foundation.density',
  kind: 'foundation',
})

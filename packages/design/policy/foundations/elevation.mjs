/**
 * FOUNDATION — elevation.
 *
 * M3 defines six elevation levels: 0, 1, 3, 6, 8 and 12dp.
 * Elevation is semantic depth. It is NOT z-index and it is NOT synonymous with shadow.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze } from './shared.mjs'

export const ELEVATION_LEVELS = deepFreeze({
  level0: 0,
  level1: 1,
  level2: 3,
  level3: 6,
  level4: 8,
  level5: 12,
})

/**
 * Afenda semantic depth roles mapped onto the M3 level scale.
 * Level 4/5 are deliberately exceptional rather than normal panel styling.
 */
export const ELEVATION_ROLES = deepFreeze({
  dragged: { level: 'level4', surface: 'surface-container-highest' },
  flat: { level: 'level0', surface: 'surface' },
  floating: { level: 'level2', surface: 'surface-container' },
  maximum: { level: 'level5', surface: 'surface-container-highest' },
  overlay: { level: 'level3', surface: 'surface-container-high' },
  raised: { level: 'level1', surface: 'surface-container-low' },
})

export function elevationOf(role, roles = ELEVATION_ROLES, levels = ELEVATION_LEVELS) {
  const policy = roles[role]
  if (!policy) {
    throw new Error(`unknown elevation role '${role}'`)
  }
  const value = levels[policy.level]
  if (value === undefined) {
    throw new Error(`elevation role '${role}' names unknown level '${policy.level}'`)
  }
  return value
}

export function assertElevation(levels = ELEVATION_LEVELS, roles = ELEVATION_ROLES) {
  const expected = [0, 1, 3, 6, 8, 12]
  const actual = Object.values(levels)
  if (actual.length !== expected.length || actual.some((v, i) => v !== expected[i])) {
    throw new Error(`M3 elevation levels must remain ${expected.join(', ')}dp`)
  }

  for (const [name, role] of Object.entries(roles)) {
    if (!(role.level in levels)) {
      throw new Error(`elevation role '${name}' names unknown level`)
    }
    if (typeof role.surface !== 'string' || role.surface.trim() === '') {
      throw new Error(`elevation role '${name}' names no surface role`)
    }
  }
  return roles
}

export const elevationPolicy = definePolicy({
  assert: assertElevation,
  id: 'foundation.elevation',
  kind: 'foundation',
})

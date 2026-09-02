/**
 * FOUNDATION — target size.
 *
 * M3 uses a 48dp minimum touch target even when the visible control is smaller.
 * Web fine-pointer operation additionally records the WCAG 2.2 24px floor so dense
 * ERP controls can remain compact without pretending a mouse and a finger are equal.
 */

import { deepFreeze } from '../vocabulary.mjs'
import { definePolicy } from './contract.mjs'

export const TARGET_FLOORS = deepFreeze({
  pointer: 24,
  touch: 48,
})

export const TARGET_PROFILES = deepFreeze({
  coarse: { minimum: 'touch' },
  fine: { minimum: 'pointer' },
})

export const TARGET_RULES = deepFreeze({
  compactControl: { profile: 'fine', visualMayBeSmaller: true },
  iconButton: { profile: 'coarse', visualMayBeSmaller: true },
  touchControl: { profile: 'coarse', visualMayBeSmaller: false },
})

export function minimumTarget(profile, profiles = TARGET_PROFILES, floors = TARGET_FLOORS) {
  const policy = profiles[profile]
  if (!policy) {
    throw new Error(`unknown target profile '${profile}'`)
  }
  const value = floors[policy.minimum]
  if (!Number.isFinite(value)) {
    throw new Error(`target profile '${profile}' resolves to missing floor '${policy.minimum}'`)
  }
  return value
}

export function assertTargetSize(
  floors = TARGET_FLOORS,
  profiles = TARGET_PROFILES,
  rules = TARGET_RULES,
) {
  if (floors.touch < 48) {
    throw new Error(`touch target floor is ${floors.touch}px -- M3 requires at least 48dp`)
  }
  if (floors.pointer < 24) {
    throw new Error(`pointer target floor is ${floors.pointer}px -- it may not be below 24px`)
  }

  for (const [name, profile] of Object.entries(profiles)) {
    if (!(profile.minimum in floors)) {
      throw new Error(`target profile '${name}' names unknown floor '${profile.minimum}'`)
    }
  }

  for (const [name, rule] of Object.entries(rules)) {
    if (!(rule.profile in profiles)) {
      throw new Error(`target rule '${name}' names unknown profile '${rule.profile}'`)
    }
    if (typeof rule.visualMayBeSmaller !== 'boolean') {
      throw new Error(`target rule '${name}' does not state visualMayBeSmaller`)
    }
  }

  return rules
}

export const targetSizePolicy = definePolicy({
  assert: assertTargetSize,
  id: 'foundation.target-size',
  kind: 'foundation',
})

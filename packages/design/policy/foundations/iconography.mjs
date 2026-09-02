/**
 * FOUNDATION — iconography.
 *
 * M3-inspired icon sizing and semantics, implemented for the shadcn/Lucide stack.
 * Material Symbols' variable-font axes are intentionally not modeled because this
 * product does not need them to govern Lucide SVG icons.
 */

import { deepFreeze } from '../vocabulary.mjs'
import { definePolicy } from './contract.mjs'

export const ICON_SIZES = deepFreeze({
  compact: 16,
  display: 48,
  large: 32,
  small: 20,
  standard: 24,
})

export const ICON_STYLE = deepFreeze({
  family: 'lucide',
  fill: 'none',
  linecap: 'round',
  linejoin: 'round',
  strokeWidth: 2,
})

export const ICON_ROLES = deepFreeze({
  control: { purpose: 'productive controls in dense UI', size: 'small' },
  illustrative: { purpose: 'small illustrative symbols, not controls', size: 'display' },
  inline: { purpose: 'supporting content beside text', size: 'compact' },
  prominent: { purpose: 'high-emphasis empty states or large actions', size: 'large' },
  standard: { purpose: 'standalone iconography and standard actions', size: 'standard' },
})

export const ICON_USAGE = deepFreeze({
  action: { accessibleNameRequired: true, decorative: false },
  decorative: { accessibleNameRequired: false, decorative: true },
  status: { accessibleNameRequired: false, decorative: false, textOrLabelRequired: true },
})

export function assertIconography(sizes = ICON_SIZES, roles = ICON_ROLES, usage = ICON_USAGE) {
  const values = Object.values(sizes)
  if (values.length === 0 || values.some((v) => !Number.isFinite(v) || v <= 0)) {
    throw new Error('icon sizes must be a non-empty set of positive numbers')
  }
  if (new Set(values).size !== values.length) {
    throw new Error('icon sizes must be unique -- duplicate sizes create duplicate vocabulary')
  }
  if (sizes.standard !== 24) {
    throw new Error(
      `standard icon size is ${sizes.standard}px -- M3's standard icon baseline is 24`,
    )
  }

  for (const [name, role] of Object.entries(roles)) {
    if (!(role.size in sizes)) {
      throw new Error(`icon role '${name}' names unknown size '${role.size}'`)
    }
    if (typeof role.purpose !== 'string' || role.purpose.trim() === '') {
      throw new Error(`icon role '${name}' must state its purpose`)
    }
  }

  for (const [name, rule] of Object.entries(usage)) {
    if (typeof rule.decorative !== 'boolean') {
      throw new Error(`icon usage '${name}' does not state whether it is decorative`)
    }
    if (rule.decorative && rule.accessibleNameRequired) {
      throw new Error(`icon usage '${name}' is decorative and may not require an accessible name`)
    }
  }

  return roles
}

export const iconographyPolicy = definePolicy({
  assert: assertIconography,
  id: 'foundation.iconography',
  kind: 'foundation',
})

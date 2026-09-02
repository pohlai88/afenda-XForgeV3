/**
 * FOUNDATION — border.
 *
 * M3 supplies semantic outline / outline-variant colors. This web policy adds the
 * minimal stroke-width grammar needed by shadcn/Tailwind components.
 */

import { deepFreeze } from '../vocabulary.mjs'
import { definePolicy } from './contract.mjs'

export const BORDER_WIDTHS = deepFreeze({
  none: 0,
  standard: 1,
  strong: 2,
})

export const BORDER_ROLES = deepFreeze({
  boundary: { color: 'outline', width: 'standard' },
  divider: { color: 'outline-variant', width: 'standard' },
  error: { color: 'error', width: 'strong' },
  selected: { color: 'primary', width: 'strong' },
  strong: { color: 'outline', width: 'strong' },
})

export const BORDER_RULES = deepFreeze({
  dividerMayBeSoleControlBoundary: false,
  focusOwnedElsewhere: true,
  rawWidthInComponents: false,
})

export function assertBorder(widths = BORDER_WIDTHS, roles = BORDER_ROLES) {
  if (widths.none !== 0 || widths.standard !== 1 || widths.strong < widths.standard) {
    throw new Error('border widths must preserve none < standard <= strong')
  }

  for (const [name, role] of Object.entries(roles)) {
    if (!(role.width in widths)) {
      throw new Error(`border role '${name}' names unknown width '${role.width}'`)
    }
    if (typeof role.color !== 'string' || role.color.trim() === '') {
      throw new Error(`border role '${name}' names no semantic color`)
    }
  }
  return roles
}

export const borderPolicy = definePolicy({
  assert: assertBorder,
  id: 'foundation.border',
  kind: 'foundation',
})

/**
 * FOUNDATION — shape.
 *
 * Current Material 3 / Material 3 Expressive corner scale.
 * Shape owns canonical corner geometry and semantic shape use.
 */

import { deepFreeze } from '../vocabulary.mjs'
import { definePolicy } from './contract.mjs'

export const SHAPE_CORNERS = deepFreeze({
  'extra-extra-large': 48,
  'extra-large': 28,
  'extra-large-increased': 32,
  'extra-small': 4,
  full: 'full',
  large: 16,
  'large-increased': 20,
  medium: 12,
  none: 0,
  small: 8,
})

export const SHAPE_ROLES = deepFreeze({
  card: 'medium',
  chip: 'small',
  dialog: 'extra-large',
  drawer: 'large',
  field: 'extra-small',
  menu: 'extra-small',
  pane: 'large',
  pill: 'full',
  sheet: 'extra-large',
  snackbar: 'extra-small',
})

export function assertShape(corners = SHAPE_CORNERS, roles = SHAPE_ROLES) {
  const numeric = Object.entries(corners).filter(([, value]) => typeof value === 'number')
  let previous = -1
  for (const [name, value] of numeric) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`shape corner '${name}' is not a non-negative number`)
    }
    if (value <= previous) {
      throw new Error(`shape corner '${name}' (${value}px) does not increase from ${previous}px`)
    }
    previous = value
  }
  if (corners.full !== 'full') {
    throw new Error("shape 'full' must remain geometry-relative rather than a fake fixed radius")
  }

  for (const [role, corner] of Object.entries(roles)) {
    if (!(corner in corners)) {
      throw new Error(`shape role '${role}' names unknown corner '${corner}'`)
    }
  }
  return roles
}

export const shapePolicy = definePolicy({
  assert: assertShape,
  id: 'foundation.shape',
  kind: 'foundation',
})

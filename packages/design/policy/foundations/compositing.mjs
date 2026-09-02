/**
 * FOUNDATION — compositing.
 *
 * Compositing is exceptional because opacity creates a rendered color that the
 * ordinary token graph cannot measure. M3 scrims are the canonical allowed case.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze } from './shared.mjs'

export const COMPOSITING_ROLES = deepFreeze({
  scrim: {
    alpha: 0.32,
    color: 'scrim',
    purpose: 'obscure content behind a modal surface',
  },
  'shadow-ambient': {
    alpha: 'token',
    color: 'shadow',
    purpose: 'ambient shadow ink controlled by the shadow token',
  },
  'shadow-key': {
    alpha: 'token',
    color: 'shadow',
    purpose: 'near shadow ink controlled by the shadow token',
  },
})

export const COMPOSITING_RULES = deepFreeze({
  alphaColorMayBeMeasuredForContrast: false,
  arbitrarySemanticOpacity: false,
  disabledOpacity: false,
})

export function assertCompositing(roles = COMPOSITING_ROLES) {
  for (const [name, role] of Object.entries(roles)) {
    if (
      role.alpha !== 'token' &&
      (!Number.isFinite(role.alpha) || role.alpha <= 0 || role.alpha > 1)
    ) {
      throw new Error(`compositing role '${name}' has invalid alpha '${role.alpha}'`)
    }
    if (typeof role.color !== 'string' || role.color.trim() === '') {
      throw new Error(`compositing role '${name}' names no color role`)
    }
    if (typeof role.purpose !== 'string' || role.purpose.trim() === '') {
      throw new Error(`compositing role '${name}' must state its purpose`)
    }
  }
  if (roles.scrim?.alpha !== 0.32) {
    throw new Error(`scrim alpha is ${roles.scrim?.alpha} -- M3 elevation guidance uses 32%`)
  }
  return roles
}

export const compositingPolicy = definePolicy({
  assert: assertCompositing,
  id: 'foundation.compositing',
  kind: 'foundation',
})

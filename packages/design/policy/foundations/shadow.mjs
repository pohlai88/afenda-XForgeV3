/**
 * FOUNDATION — shadow.
 *
 * M3 treats shadow elevation separately from tonal elevation and recommends using
 * shadow only when visual separation genuinely needs it. Exact box-shadow geometry
 * stays in tokens.json; this module governs when semantic shadow roles may exist.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze } from './shared.mjs'

export const SHADOW_ROLES = deepFreeze({
  dragged: { elevation: 'dragged', token: 'semantic.shadow.dragged' },
  floating: { elevation: 'floating', token: 'semantic.shadow.floating' },
  modal: { elevation: 'overlay', token: 'semantic.shadow.modal' },
  none: { elevation: 'flat', token: null },
  overlay: { elevation: 'overlay', token: 'semantic.shadow.overlay' },
  raised: { elevation: 'raised', token: 'semantic.shadow.raised' },
})

export const SHADOW_RULES = deepFreeze({
  mayBeSoleMeansOfSeparation: false,
  persistentSurfaceRequiresShadow: false,
  shadowChangesStackingOrder: false,
})

export function assertShadow(roles = SHADOW_ROLES) {
  if (roles.none?.token !== null) {
    throw new Error("shadow role 'none' must emit no shadow token")
  }

  const tokens = new Set()
  for (const [name, role] of Object.entries(roles)) {
    if (name === 'none') {
      continue
    }
    if (typeof role.token !== 'string' || !role.token.startsWith('semantic.shadow.')) {
      throw new Error(`shadow role '${name}' must name a semantic.shadow.* token`)
    }
    if (tokens.has(role.token)) {
      throw new Error(`shadow token '${role.token}' is claimed by more than one semantic role`)
    }
    tokens.add(role.token)
    if (typeof role.elevation !== 'string') {
      throw new Error(`shadow role '${name}' names no elevation role`)
    }
  }
  return roles
}

export const shadowPolicy = definePolicy({
  assert: assertShadow,
  id: 'foundation.shadow',
  kind: 'foundation',
})

/**
 * FOUNDATION — container.
 *
 * M3 adaptive layout is fluid and pane-oriented rather than a single universal
 * web max-width. Afenda therefore governs container INTENT here and keeps exact
 * max-width values in tokens.json.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze } from './shared.mjs'

export const CONTAINER_ROLES = deepFreeze({
  content: {
    mode: 'bounded',
    purpose: 'ordinary page content that should not stretch indefinitely',
    token: 'semantic.container.content',
  },
  form: {
    mode: 'bounded',
    purpose: 'focused forms where very long controls reduce comprehension',
    token: 'semantic.container.form',
  },
  reading: {
    mode: 'bounded',
    purpose: 'long-form prose and policy/document reading',
    token: 'semantic.container.reading',
  },
  wide: {
    mode: 'bounded',
    purpose: 'analytics and broad business content that still needs a ceiling',
    token: 'semantic.container.wide',
  },
  workspace: {
    mode: 'fluid',
    purpose: 'data grids, list-detail and multi-pane operating workspaces',
    token: null,
  },
})

export function assertContainers(roles = CONTAINER_ROLES) {
  const modes = new Set(['bounded', 'fluid'])
  for (const [name, role] of Object.entries(roles)) {
    if (!modes.has(role.mode)) {
      throw new Error(`container '${name}' has unknown mode '${role.mode}'`)
    }
    if (role.mode === 'bounded') {
      if (typeof role.token !== 'string' || !role.token.startsWith('semantic.container.')) {
        throw new Error(`bounded container '${name}' must name semantic.container.*`)
      }
    } else if (role.token !== null) {
      throw new Error(`fluid container '${name}' must not pretend to have a max-width token`)
    }
    if (typeof role.purpose !== 'string' || role.purpose.trim() === '') {
      throw new Error(`container '${name}' must state its purpose`)
    }
  }
  return roles
}

export const containerPolicy = definePolicy({
  assert: assertContainers,
  id: 'foundation.container',
  kind: 'foundation',
})

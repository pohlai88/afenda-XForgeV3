/**
 * FOUNDATION — shell.
 *
 * M3-derived application chrome for an enterprise web shell.
 * Navigation dimensions use current Material 3 wide-rail/drawer geometry where
 * applicable; pane/content widths remain separate policies.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze } from './shared.mjs'

export const SHELL_DIMENSIONS = deepFreeze({
  appBar: 64,
  modalDrawerMax: 360,
  navigationCollapsed: 96,
  navigationExpandedMax: 360,
  navigationExpandedMin: 220,
})

export const SHELL_PRESENTATION = deepFreeze({
  compact: {
    navigation: 'modal',
    panes: 'single',
  },
  expanded: {
    navigation: 'rail',
    panes: 'adaptive',
  },
  'extra-large': {
    navigation: 'wide-rail',
    panes: 'adaptive',
  },
  large: {
    navigation: 'wide-rail',
    panes: 'adaptive',
  },
  medium: {
    navigation: 'rail',
    panes: 'single',
  },
})

export const SHELL_RULES = deepFreeze({
  resizingPreservesRouteAndSelection: true,
  shellDimensionsMayBeFeatureLocal: false,
  shellOutsideContentGrid: true,
})

export function assertShell(dimensions = SHELL_DIMENSIONS, presentation = SHELL_PRESENTATION) {
  for (const [name, value] of Object.entries(dimensions)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`shell dimension '${name}' is invalid`)
    }
  }

  if (dimensions.navigationExpandedMin >= dimensions.navigationExpandedMax) {
    throw new Error('expanded navigation minimum must be smaller than its maximum')
  }
  if (dimensions.navigationExpandedMax !== dimensions.modalDrawerMax) {
    throw new Error('wide navigation and drawer maximums should share the M3 360px ceiling')
  }

  const classes = ['compact', 'medium', 'expanded', 'large', 'extra-large']
  for (const name of classes) {
    if (!presentation[name]) {
      throw new Error(`shell has no '${name}' presentation`)
    }
  }
  return presentation
}

export const shellPolicy = definePolicy({
  assert: assertShell,
  id: 'foundation.shell',
  kind: 'foundation',
})

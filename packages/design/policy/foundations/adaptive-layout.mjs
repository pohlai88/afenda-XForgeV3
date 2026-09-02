/**
 * FOUNDATION — adaptive layout.
 *
 * Based on Material 3 canonical list-detail and supporting-pane behavior:
 * compact/medium show one pane at a time; expanded and larger can show related
 * panes side by side. Resizing changes presentation, not business/navigation state.
 */

import { deepFreeze } from '../vocabulary.mjs'
import { definePolicy } from './contract.mjs'

export const ADAPTIVE_LAYOUTS = deepFreeze({
  feed: {
    compact: ['feed'],
    expanded: ['feed'],
    'extra-large': ['feed'],
    large: ['feed'],
    medium: ['feed'],
    preserveSelection: true,
  },
  'list-detail': {
    compact: ['list|detail'],
    expanded: ['list', 'detail'],
    'extra-large': ['list', 'detail', 'extra?'],
    large: ['list', 'detail'],
    medium: ['list|detail'],
    preserveSelection: true,
  },

  'supporting-pane': {
    compact: ['main|supporting'],
    expanded: ['main', 'supporting'],
    'extra-large': ['main', 'supporting', 'extra?'],
    large: ['main', 'supporting'],
    medium: ['main|supporting'],
    preserveSelection: true,
  },
})

export const ADAPTIVE_RULES = deepFreeze({
  adaptSurroundingInterfaceBeforePrimaryTask: true,
  optionalPaneMayBecomeOverlay: true,
  preserveBusinessStateAcrossResize: true,
  resizeIsNavigation: false,
})

const CLASSES = ['compact', 'medium', 'expanded', 'large', 'extra-large']

export function assertAdaptiveLayout(layouts = ADAPTIVE_LAYOUTS) {
  for (const [name, layout] of Object.entries(layouts)) {
    for (const size of CLASSES) {
      if (!Array.isArray(layout[size]) || layout[size].length === 0) {
        throw new Error(`adaptive layout '${name}' has no presentation for '${size}'`)
      }
    }
    if (layout.preserveSelection !== true) {
      throw new Error(`adaptive layout '${name}' must preserve selection/state across resize`)
    }
  }

  for (const name of ['list-detail', 'supporting-pane']) {
    const layout = layouts[name]
    if (layout.compact.length !== 1 || layout.medium.length !== 1) {
      throw new Error(`M3 '${name}' must collapse to one pane at compact and medium widths`)
    }
    if (layout.expanded.length < 2) {
      throw new Error(`M3 '${name}' must expose both primary panes at expanded width`)
    }
  }

  return layouts
}

export const adaptiveLayoutPolicy = definePolicy({
  assert: assertAdaptiveLayout,
  id: 'foundation.adaptive-layout',
  kind: 'foundation',
})

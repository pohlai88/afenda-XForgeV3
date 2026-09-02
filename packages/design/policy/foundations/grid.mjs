/**
 * FOUNDATION — grid.
 *
 * Material's layout model is columns + gutters + margins. Afenda follows the M3
 * 4/8/12 progression and adds a deliberate 16-column enterprise tier at large
 * desktop widths for dense ERP workspaces.
 */

import { deepFreeze } from '../vocabulary.mjs'
import { definePolicy } from './contract.mjs'

export const BASELINE_GRID_PX = 4

export const LAYOUT_GRID = deepFreeze({
  compact: { columns: 4, gutter: 16, margin: 16 },
  expanded: { columns: 12, gutter: 24, margin: 24 },
  'extra-large': { columns: 16, gutter: 24, margin: 32 },

  // Afenda enterprise extension beyond M3's 12-column large-screen baseline.
  large: { columns: 16, gutter: 24, margin: 24 },
  medium: { columns: 8, gutter: 24, margin: 24 },
})

export function assertGrid(grid = LAYOUT_GRID, baseline = BASELINE_GRID_PX) {
  const expectedClasses = ['compact', 'medium', 'expanded', 'large', 'extra-large']
  for (const name of expectedClasses) {
    if (!grid[name]) {
      throw new Error(`layout grid has no '${name}' window class`)
    }
  }

  for (const [name, rule] of Object.entries(grid)) {
    if (!Number.isInteger(rule.columns) || rule.columns < 1) {
      throw new Error(`grid '${name}' has invalid column count '${rule.columns}'`)
    }
    for (const field of ['gutter', 'margin']) {
      const value = rule[field]
      if (!Number.isFinite(value) || value <= 0 || value % baseline !== 0) {
        throw new Error(
          `grid '${name}' ${field} ${value}px is not a positive ${baseline}px-grid multiple`,
        )
      }
    }
  }

  if (grid.compact.columns !== 4 || grid.medium.columns !== 8 || grid.expanded.columns !== 12) {
    throw new Error('compact/medium/expanded must preserve the Material 4/8/12 grid progression')
  }
  return grid
}

export const gridPolicy = definePolicy({
  assert: assertGrid,
  id: 'foundation.grid',
  kind: 'foundation',
})

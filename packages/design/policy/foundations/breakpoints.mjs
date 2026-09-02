/**
 * FOUNDATION — breakpoints.
 *
 * M3/Android adaptive window-width classes:
 * compact <600, medium 600-839, expanded 840-1199,
 * large 1200-1599, extra-large >=1600.
 *
 * Tailwind v4 projection uses rem equivalents so the named classes replace its
 * defaults rather than coexisting with an unrelated breakpoint system.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze } from './shared.mjs'

export const WINDOW_WIDTH_CLASSES = deepFreeze({
  compact: { css: '0rem', materialDp: 0 },
  expanded: { css: '52.5rem', materialDp: 840 },
  'extra-large': { css: '100rem', materialDp: 1600 },
  large: { css: '75rem', materialDp: 1200 },
  medium: { css: '37.5rem', materialDp: 600 },
})

export const WINDOW_HEIGHT_CLASSES = deepFreeze({
  compact: { materialDp: 0 },
  expanded: { materialDp: 900 },
  medium: { materialDp: 480 },
})

export const TAILWIND_BREAKPOINTS = deepFreeze({
  expanded: '--breakpoint-expanded',
  'extra-large': '--breakpoint-extra-large',
  large: '--breakpoint-large',
  medium: '--breakpoint-medium',
})

export function windowClassFor(width, classes = WINDOW_WIDTH_CLASSES) {
  if (!Number.isFinite(width) || width < 0) {
    throw new Error(`window width must be non-negative, received ${width}`)
  }
  return (
    Object.entries(classes)
      .filter(([, value]) => width >= value.materialDp)
      .at(-1)?.[0] ?? 'compact'
  )
}

export function assertBreakpoints(width = WINDOW_WIDTH_CLASSES, height = WINDOW_HEIGHT_CLASSES) {
  const widthValues = Object.values(width).map((v) => v.materialDp)
  const expectedWidth = [0, 600, 840, 1200, 1600]
  if (widthValues.some((v, i) => v !== expectedWidth[i])) {
    throw new Error(`width classes must preserve M3 adaptive bounds ${expectedWidth.join(', ')}`)
  }

  const heightValues = Object.values(height).map((v) => v.materialDp)
  const expectedHeight = [0, 480, 900]
  if (heightValues.some((v, i) => v !== expectedHeight[i])) {
    throw new Error(`height classes must preserve M3 adaptive bounds ${expectedHeight.join(', ')}`)
  }

  for (const [name, value] of Object.entries(width)) {
    if (typeof value.css !== 'string' || !/^\d+(?:\.\d+)?rem$/.test(value.css)) {
      throw new Error(`width class '${name}' has invalid Tailwind/CSS projection '${value.css}'`)
    }
  }
  return width
}

export const breakpointsPolicy = definePolicy({
  assert: assertBreakpoints,
  id: 'foundation.breakpoints',
  kind: 'foundation',
})

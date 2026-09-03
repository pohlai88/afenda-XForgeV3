/**
 * Grid — two-dimensional layout on the spacing roles.
 *
 * Red before grid.tsx existed (2026-09-04): the gallery had one layout word, Stack, and
 * showed fifteen components as a 6,000px column because of it.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GRID_COLUMNS, Grid, type GridProps } from '../src/components/grid'

const columns = Object.keys(GRID_COLUMNS).map(Number) as (keyof typeof GRID_COLUMNS)[]

describe('Grid lays children out in columns, on the gap roles', () => {
  it('owns a closed set of column counts, and it is small', () => {
    expect(columns.length).toBeGreaterThanOrEqual(2)
    expect(columns.length).toBeLessThanOrEqual(4)
    for (const n of columns) {
      expect(Number.isInteger(n) && n >= 1).toBe(true)
    }
  })

  it.each(columns)('%s columns renders a grid with that many tracks, stamped as data', (n) => {
    const html = renderToStaticMarkup(createElement(Grid, { columns: n }, 'x'))
    expect(html).toMatch(/^<div\b/)
    expect(html).toMatch(/class="[^"]*\bgrid\b/)
    expect(html).toMatch(new RegExp(`class="[^"]*\\bgrid-cols-${n}\\b`))
    expect(html).toContain('data-slot="grid"')
    expect(html).toContain(`data-columns="${n}"`)
  })

  it('gap is a role, never a number, and defaults to normal', () => {
    expect(renderToStaticMarkup(createElement(Grid, null, 'x'))).toMatch(
      /class="[^"]*\bgap-normal\b/,
    )
    expect(renderToStaticMarkup(createElement(Grid, { gap: 'tight' }, 'x'))).toMatch(
      /class="[^"]*\bgap-tight\b/,
    )
    expect(renderToStaticMarkup(createElement(Grid, { gap: 'loose' }, 'x'))).toMatch(
      /class="[^"]*\bgap-loose\b/,
    )
  })

  it('forwards native attributes and admits no className', () => {
    const html = renderToStaticMarkup(createElement(Grid, { 'aria-label': 'tiles', id: 't' }, 'x'))
    expect(html).toContain('aria-label="tiles"')
    expect(html).toContain('id="t"')
    // @ts-expect-error -- className is not a prop of the Target (ADR-031 Decision 12)
    const illegal: GridProps = { className: 'grid-cols-12' }
    expect(illegal).toBeTypeOf('object')
  })
})

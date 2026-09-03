/**
 * Swatch — one colour role shown as itself: the fill with its companion ink on it, or the
 * stroke drawn round the page ground.
 *
 * Red before swatch.tsx existed (2026-09-04): the only way to see a colour role was to
 * find a component wearing it, and eight roles no authored component wears at all.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SWATCH_ROLES, Swatch, type SwatchProps, type SwatchRole } from '../src/components/swatch'

const render = (colour: SwatchRole) => renderToStaticMarkup(createElement(Swatch, { colour }))

describe('the roles a swatch can show are derived from the STYLE tree', () => {
  it('is a population: fills and strokes at rest', () => {
    const names = Object.keys(SWATCH_ROLES)
    expect(names.length).toBeGreaterThan(10)
    expect(names).toContain('accent.primary')
    expect(names).toContain('surface.default')
    expect(names).toContain('outline.variant')
  })

  it('leaves out fills that exist only under a state, which the components that own them show', () => {
    const names = Object.keys(SWATCH_ROLES)
    expect(names).not.toContain('interaction.checked')
    expect(names).not.toContain('state.disabled')
    for (const [name, role] of Object.entries(SWATCH_ROLES)) {
      for (const cls of [role.fill, role.ink, role.stroke ?? '']) {
        expect(cls, `${name}: ${cls}`).not.toContain(':')
      }
    }
  })
})

describe('Swatch shows a role as itself', () => {
  it('a fill with a companion ink: the fill, the ink, a sample glyph, stamped as data', () => {
    const html = render('accent.primary')
    expect(html).toContain('data-slot="swatch"')
    expect(html).toContain('data-colour="accent.primary"')
    expect(html).toMatch(/class="[^"]*\bbg-primary\b/)
    expect(html).toMatch(/class="[^"]*\btext-on-primary\b/)
    expect(html).toContain('Aa')
  })

  it('a fill with no companion ink wears the page ink, which is what text on it will wear', () => {
    const html = render('surface.default')
    expect(html).toMatch(/class="[^"]*\bbg-surface\b/)
    expect(html).toMatch(/class="[^"]*\btext-on-surface\b/)
  })

  it('a stroke is drawn round the page ground, in its own colour', () => {
    const html = render('outline.variant')
    expect(html).toMatch(/class="[^"]*\bborder-outline-variant\b/)
    expect(html).toMatch(/class="[^"]*\bbg-surface\b/)
    expect(html).toMatch(/class="[^"]*\bborder-stroke\b/)
  })

  it('refuses a role that is not in the tree, and admits no className', () => {
    // @ts-expect-error -- a state fill is not a swatch role
    const stateFill: SwatchProps = { colour: 'interaction.checked' }
    expect(stateFill).toBeTypeOf('object')
    // @ts-expect-error -- not a role at all
    const nonsense: SwatchProps = { colour: 'brand.blue' }
    expect(nonsense).toBeTypeOf('object')
    // @ts-expect-error -- className is not a prop of the Target (ADR-031 Decision 12)
    const illegal: SwatchProps = { className: 'bg-red-500', colour: 'accent.primary' }
    expect(illegal).toBeTypeOf('object')
  })
})

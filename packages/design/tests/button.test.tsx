/**
 * Button's Target and its translation to the adaptee (ADR-031 Adapter schema).
 *
 * MUTATION WATCHED GO RED, 2026-09-03: with `outline` removed from `BUTTON_VARIANT`
 * the second case failed to compile at the call site in `resource-boundary.tsx`
 * (`variant="outline"`), which is the exhaustiveness the schema wants — one table
 * feeds the prop type and the translation, so there is no second list to drift.
 *
 * JSX-free: `createElement` + `renderToStaticMarkup`, node environment.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BUTTON_VARIANT, Button } from '../src/components/button'

const variants = Object.keys(BUTTON_VARIANT) as (keyof typeof BUTTON_VARIANT)[]

describe('Button adapts Xforge vocabulary onto the primitive', () => {
  it('owns at least the two variants a screen uses', () => {
    expect(variants).toContain('primary')
    expect(variants).toContain('outline')
  })

  it.each(variants)('%s renders a real button and stamps the axis as data', (variant) => {
    const html = renderToStaticMarkup(createElement(Button, { variant }, 'Save'))
    expect(html).toMatch(/^<button\b/)
    expect(html).toContain(`data-variant="${variant}"`)
    expect(html).toContain('>Save</button>')
  })

  it('defaults to primary and forwards native attributes', () => {
    const html = renderToStaticMarkup(
      createElement(Button, { disabled: true, type: 'submit' }, 'Go'),
    )
    expect(html).toContain('data-variant="primary"')
    expect(html).toContain('type="submit"')
    expect(html).toContain('disabled=""')
  })
})

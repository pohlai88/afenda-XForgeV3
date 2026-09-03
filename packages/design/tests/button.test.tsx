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
import { BUTTON_VARIANT, Button, type ButtonProps } from '../src/components/button'

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

  it('meets the control floor: h-control is on every button', () => {
    // `h-control` (min-block-size: the control minimum) was defined in globals.css as the
    // WCAG 2.5.8 floor and consumed by nothing, so Tailwind never emitted it; upstream's
    // `h-8` set every button at 32px under a 40px floor. Found by the design-sync preview,
    // 2026-09-03. Red before the Adapter carried the class.
    for (const variant of variants) {
      expect(renderToStaticMarkup(createElement(Button, { variant }, 'Go'))).toMatch(
        /class="[^"]*\bh-control\b/,
      )
    }
    // The Target has no className (ADR-031 Decision 12): a screen cannot argue with the
    // floor, or paint the button, from a call site. The refusal is the type.
    // @ts-expect-error -- className is not a prop of the Target
    const illegal: ButtonProps = { className: 'w-full' }
    expect(illegal).toBeTypeOf('object')
  })

  it('each variant renders its own fill and ink from the STYLE tree', () => {
    // The recipe is Xforge's (ADR-034 step 8): primary is the primary action fill, outline
    // is the page surface with the border stroke. Neither word is upstream's.
    const primary = renderToStaticMarkup(createElement(Button, { variant: 'primary' }, 'Go'))
    expect(primary).toMatch(/class="[^"]*\bbg-primary\b/)
    expect(primary).toMatch(/class="[^"]*\btext-primary-foreground\b/)
    const outline = renderToStaticMarkup(createElement(Button, { variant: 'outline' }, 'Go'))
    expect(outline).toMatch(/class="[^"]*\bborder-border\b/)
    expect(outline).toMatch(/class="[^"]*\bbg-background\b/)
    expect(outline).not.toMatch(/class="[^"]*\bbg-primary\b/)
  })

  it('does not expose the adaptee size axis', () => {
    // @ts-expect-error -- the Target has no size axis (Decision 4)
    renderToStaticMarkup(createElement(Button, { size: 'sm' }, 'Go'))
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
